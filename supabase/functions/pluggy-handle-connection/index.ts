// Pluggy Handle Connection — recebe itemId do widget, busca dados do Pluggy
// e popula bank_connections + bank_accounts (idempotente via ON CONFLICT).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const PLUGGY_BASE_URL = Deno.env.get("PLUGGY_BASE_URL") ?? "https://api.pluggy.ai";
const PLUGGY_CLIENT_ID = Deno.env.get("PLUGGY_CLIENT_ID")!;
const PLUGGY_CLIENT_SECRET = Deno.env.get("PLUGGY_CLIENT_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
    if (!tenantId) return json({ error: "Tenant não encontrado" }, 403);

    const body = await req.json().catch(() => ({}));
    const itemId: string | undefined = body?.itemId;
    if (!itemId) return json({ error: "itemId é obrigatório" }, 400);

    // Pluggy auth
    const authRes = await fetch(`${PLUGGY_BASE_URL}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET }),
    });
    if (!authRes.ok) {
      console.error("[handle-connection] auth failed", await authRes.text());
      return json({ error: "Falha ao autenticar no Pluggy" }, 500);
    }
    const { apiKey } = await authRes.json();
    const apiHeaders = { "X-API-KEY": apiKey, "Content-Type": "application/json" };

    // Fetch item
    const itemRes = await fetch(`${PLUGGY_BASE_URL}/items/${itemId}`, { headers: apiHeaders });
    if (!itemRes.ok) {
      console.error("[handle-connection] item fetch failed", await itemRes.text());
      return json({ error: "Não foi possível carregar a conexão" }, 502);
    }
    const item = await itemRes.json();
    const connector = item.connector ?? {};
    const status = mapStatus(item.status);

    // Upsert bank_connections
    const { data: conn, error: connErr } = await admin
      .from("bank_connections")
      .upsert({
        tenant_id: tenantId,
        pluggy_item_id: item.id,
        pluggy_connector_id: connector.id ?? 0,
        bank_name: connector.name ?? "Banco",
        bank_logo_url: connector.imageUrl ?? null,
        status,
        last_sync_at: new Date().toISOString(),
        last_error_message: item.executionStatus === "ERROR" ? (item.error?.message ?? null) : null,
        created_by: userId,
      }, { onConflict: "pluggy_item_id" })
      .select()
      .single();

    if (connErr) {
      console.error("[handle-connection] upsert connection error", connErr);
      return json({ error: "Erro ao salvar conexão" }, 500);
    }

    // Fetch accounts
    const accRes = await fetch(`${PLUGGY_BASE_URL}/accounts?itemId=${itemId}`, { headers: apiHeaders });
    if (!accRes.ok) {
      console.error("[handle-connection] accounts fetch failed", await accRes.text());
      return json({ connectionId: conn.id, accountsCount: 0, warning: "Contas não puderam ser carregadas" });
    }
    const accountsBody = await accRes.json();
    const accounts = accountsBody.results ?? [];

    let inserted = 0;
    for (const a of accounts) {
      const { error: aErr } = await admin
        .from("bank_accounts")
        .upsert({
          tenant_id: tenantId,
          connection_id: conn.id,
          pluggy_account_id: a.id,
          account_type: (a.type ?? "CHECKING").toUpperCase(),
          account_subtype: a.subtype ?? null,
          agency: a.bankData?.transferNumber?.split("/")?.[1] ?? null,
          account_number: a.number ?? null,
          balance: a.balance ?? 0,
          currency_code: a.currencyCode ?? "BRL",
          marketing_name: a.marketingName ?? a.name ?? null,
          owner_name: a.owner ?? null,
        }, { onConflict: "pluggy_account_id" });
      if (aErr) console.error("[handle-connection] account upsert", aErr);
      else inserted++;
    }

    // Audit log (best-effort)
    try {
      await admin.from("audit_log").insert({
        tenant_id: tenantId,
        action: "bank_connection_linked",
        entity_type: "bank_connection",
        entity_id: conn.id,
        user_id: userId,
        metadata: { bank_name: conn.bank_name, accounts: inserted, pluggy_item_id: item.id },
      });
    } catch (_) { /* ignore */ }

    return json({ connectionId: conn.id, accountsCount: inserted, bankName: conn.bank_name, status });
  } catch (e) {
    console.error("[handle-connection] unexpected", e);
    return json({ error: "Erro inesperado" }, 500);
  }
});

function mapStatus(s: string | undefined): string {
  switch ((s ?? "").toUpperCase()) {
    case "UPDATED": return "active";
    case "LOGIN_ERROR":
    case "WAITING_USER_INPUT": return "login_required";
    case "OUTDATED": return "outdated";
    case "CREATING":
    case "UPDATING": return "pending";
    case "ERROR": return "error";
    default: return "pending";
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
