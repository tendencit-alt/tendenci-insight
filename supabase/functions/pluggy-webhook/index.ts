// Pluggy Webhook — recebe eventos de items/transactions
// Público (sem JWT). Valida via HMAC SHA-256 com PLUGGY_WEBHOOK_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const PLUGGY_BASE_URL = Deno.env.get("PLUGGY_BASE_URL") ?? "https://api.pluggy.ai";
const PLUGGY_CLIENT_ID = Deno.env.get("PLUGGY_CLIENT_ID")!;
const PLUGGY_CLIENT_SECRET = Deno.env.get("PLUGGY_CLIENT_SECRET")!;
const WEBHOOK_SECRET = Deno.env.get("PLUGGY_WEBHOOK_SECRET")!;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function hmacSha256Hex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

async function audit(tenantId: string | null, eventType: string, recordId: string, metadata: unknown) {
  try {
    await admin.from("audit_log").insert({
      tenant_id: tenantId,
      table_name: "bank_connections",
      record_id: recordId,
      event_type: "pluggy_webhook_received",
      event_source: "edge_function",
      field_name: eventType,
      metadata,
    });
  } catch (_) { /* best-effort */ }
}

async function resolveTenantByItem(itemId: string): Promise<string | null> {
  const { data } = await admin
    .from("bank_connections")
    .select("tenant_id")
    .eq("pluggy_item_id", itemId)
    .maybeSingle();
  return data?.tenant_id ?? null;
}

async function upsertAccountsForItem(apiKey: string, connectionId: string, tenantId: string, itemId: string) {
  const accounts = await pluggyGet(apiKey, `/accounts?itemId=${itemId}`);
  const rows = (accounts.results ?? []).map((a: any) => ({
    connection_id: connectionId,
    tenant_id: tenantId,
    pluggy_account_id: a.id,
    account_type: (a.type ?? "CHECKING").toUpperCase(),
    account_subtype: a.subtype ?? null,
    agency: a.bankData?.transferNumber?.split("/")?.[1] ?? null,
    account_number: a.number ?? null,
    balance: a.balance ?? 0,
    currency_code: a.currencyCode ?? "BRL",
    marketing_name: a.marketingName ?? null,
    owner_name: a.owner ?? null,
  }));
  if (rows.length === 0) return;
  await admin.from("bank_accounts").upsert(rows, { onConflict: "pluggy_account_id" });
}

async function upsertTransactionsForAccount(apiKey: string, accountId: string, tenantId: string, pluggyAccountId: string, from?: string) {
  const q = from ? `&from=${from}` : "";
  const txs = await pluggyGet(apiKey, `/transactions?accountId=${pluggyAccountId}&pageSize=500${q}`);
  const rows = (txs.results ?? []).map((t: any) => ({
    account_id: accountId,
    tenant_id: tenantId,
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
  if (rows.length === 0) return;
  await admin.from("bank_transactions").upsert(rows, { onConflict: "pluggy_transaction_id" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rawBody = await req.text();

  // Valida HMAC
  const sig = req.headers.get("x-webhook-signature") ?? req.headers.get("X-Webhook-Signature");
  if (WEBHOOK_SECRET) {
    const expected = await hmacSha256Hex(WEBHOOK_SECRET, rawBody);
    if (!sig || sig.toLowerCase() !== expected.toLowerCase()) {
      console.warn("[pluggy-webhook] invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("bad json", { status: 400, headers: corsHeaders });
  }

  const eventType: string = payload.event ?? payload.eventType ?? "unknown";
  const itemId: string | undefined = payload.itemId ?? payload.item?.id;

  try {
    if (!itemId) {
      await audit(null, eventType, "unknown", payload);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = await resolveTenantByItem(itemId);
    await audit(tenantId, eventType, itemId, payload);

    const apiKey = await pluggyAuth();

    if (eventType === "item/created" || eventType === "item/updated") {
      const item = await pluggyGet(apiKey, `/items/${itemId}`);
      const statusMap: Record<string, string> = {
        UPDATED: "active",
        LOGIN_ERROR: "login_required",
        OUTDATED: "outdated",
        WAITING_USER_INPUT: "login_required",
        UPDATING: "active",
        CREATING: "pending",
      };
      const status = statusMap[item.status] ?? (item.error ? "error" : "active");

      if (!tenantId) {
        // item/created sem registro local — só audita, frontend cria via upsert manual
        return new Response(JSON.stringify({ ok: true, warning: "no_tenant_mapping" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: conn } = await admin
        .from("bank_connections")
        .upsert(
          {
            tenant_id: tenantId,
            pluggy_item_id: itemId,
            pluggy_connector_id: item.connector?.id ?? 0,
            bank_name: item.connector?.name ?? "Banco",
            bank_logo_url: item.connector?.imageUrl ?? null,
            status,
            last_sync_at: new Date().toISOString(),
            last_error_message: item.error?.message ?? null,
          },
          { onConflict: "pluggy_item_id" },
        )
        .select("id")
        .single();

      if (conn?.id) await upsertAccountsForItem(apiKey, conn.id, tenantId, itemId);
    } else if (eventType === "item/error") {
      await admin
        .from("bank_connections")
        .update({ status: "error", last_error_message: payload.error?.message ?? "Erro Pluggy" })
        .eq("pluggy_item_id", itemId);
    } else if (eventType === "item/login_required" || eventType === "item/waiting_user_input") {
      await admin.from("bank_connections").update({ status: "login_required" }).eq("pluggy_item_id", itemId);
    } else if (eventType === "transactions/created" || eventType === "transactions/updated") {
      const { data: accounts } = await admin
        .from("bank_accounts")
        .select("id, tenant_id, pluggy_account_id, connection_id, bank_connections!inner(pluggy_item_id)")
        .eq("bank_connections.pluggy_item_id", itemId);
      for (const acc of accounts ?? []) {
        try {
          await upsertTransactionsForAccount(apiKey, acc.id, acc.tenant_id, acc.pluggy_account_id);
        } catch (e) {
          console.error("[pluggy-webhook] tx upsert failed", acc.pluggy_account_id, e);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[pluggy-webhook] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
