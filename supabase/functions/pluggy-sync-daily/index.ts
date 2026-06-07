// Pluggy Sync Daily — fallback de sincronização diária.
// Para cada bank_connection ativa: refresh status + transações desde last_sync_at.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const PLUGGY_BASE_URL = Deno.env.get("PLUGGY_BASE_URL") ?? "https://api.pluggy.ai";
const PLUGGY_CLIENT_ID = Deno.env.get("PLUGGY_CLIENT_ID")!;
const PLUGGY_CLIENT_SECRET = Deno.env.get("PLUGGY_CLIENT_SECRET")!;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function pluggyAuth(): Promise<string> {
  const r = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET }),
  });
  if (!r.ok) throw new Error(`pluggy auth failed: ${r.status}`);
  const { apiKey } = await r.json();
  return apiKey;
}

async function pluggyGet(apiKey: string, path: string) {
  const r = await fetch(`${PLUGGY_BASE_URL}${path}`, {
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(`pluggy GET ${path} failed: ${r.status}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const summary = { connections: 0, ok: 0, failed: 0, errors: [] as string[] };

  try {
    const apiKey = await pluggyAuth();
    const { data: conns } = await admin
      .from("bank_connections")
      .select("id, tenant_id, pluggy_item_id, last_sync_at")
      .in("status", ["active", "outdated", "login_required"]);

    summary.connections = conns?.length ?? 0;

    for (const c of conns ?? []) {
      try {
        const item = await pluggyGet(apiKey, `/items/${c.pluggy_item_id}`);
        const statusMap: Record<string, string> = {
          UPDATED: "active",
          LOGIN_ERROR: "login_required",
          OUTDATED: "outdated",
          WAITING_USER_INPUT: "login_required",
          UPDATING: "active",
        };
        const status = statusMap[item.status] ?? "active";

        await admin
          .from("bank_connections")
          .update({
            status,
            last_sync_at: new Date().toISOString(),
            last_error_message: item.error?.message ?? null,
          })
          .eq("id", c.id);

        const accounts = await pluggyGet(apiKey, `/accounts?itemId=${c.pluggy_item_id}`);
        for (const a of accounts.results ?? []) {
          const { data: acc } = await admin
            .from("bank_accounts")
            .upsert(
              {
                connection_id: c.id,
                tenant_id: c.tenant_id,
                pluggy_account_id: a.id,
                account_type: (a.type ?? "CHECKING").toUpperCase(),
                account_subtype: a.subtype ?? null,
                balance: a.balance ?? 0,
                currency_code: a.currencyCode ?? "BRL",
                marketing_name: a.marketingName ?? null,
                owner_name: a.owner ?? null,
                account_number: a.number ?? null,
              },
              { onConflict: "pluggy_account_id" },
            )
            .select("id")
            .single();

          const from = c.last_sync_at
            ? new Date(c.last_sync_at).toISOString().substring(0, 10)
            : new Date(Date.now() - 90 * 86400 * 1000).toISOString().substring(0, 10);
          const txs = await pluggyGet(
            apiKey,
            `/transactions?accountId=${a.id}&from=${from}&pageSize=500`,
          );
          const rows = (txs.results ?? []).map((t: any) => ({
            account_id: acc!.id,
            tenant_id: c.tenant_id,
            pluggy_transaction_id: t.id,
            date: t.date?.substring(0, 10),
            amount: t.amount,
            description: t.description ?? "",
            category: t.category ?? null,
            category_id: t.categoryId ?? null,
            merchant_name: t.merchant?.name ?? null,
            payment_data: t.paymentData ?? null,
            raw_payload: t,
          }));
          if (rows.length > 0) {
            await admin
              .from("bank_transactions")
              .upsert(rows, { onConflict: "pluggy_transaction_id" });
          }
        }

        summary.ok++;
      } catch (e) {
        summary.failed++;
        summary.errors.push(`${c.pluggy_item_id}: ${String(e)}`);
        console.error("[pluggy-sync-daily] item failed", c.pluggy_item_id, e);
      }
    }
  } catch (e) {
    console.error("[pluggy-sync-daily] fatal", e);
    return new Response(JSON.stringify({ error: String(e), summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
