import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/asaas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("ASAAS_WEBHOOK_SECRET");
    const provided = req.headers.get("asaas-access-token") ?? req.headers.get("Asaas-Access-Token");
    if (secret && provided !== secret) {
      return json({ error: "invalid_signature" }, 401);
    }

    const event = await req.json().catch(() => null) as any;
    if (!event?.event) return json({ error: "bad_payload" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const customerId = event?.payment?.customer ?? event?.subscription?.customer ?? null;
    const subId = event?.payment?.subscription ?? event?.subscription?.id ?? null;

    let tenantId: string | null = null;
    if (subId) {
      const { data } = await admin.from("tenant_subscriptions").select("tenant_id").eq("asaas_subscription_id", subId).maybeSingle();
      tenantId = data?.tenant_id ?? null;
    }
    if (!tenantId && customerId) {
      const { data } = await admin.from("tenant_subscriptions").select("tenant_id").eq("asaas_customer_id", customerId).maybeSingle();
      tenantId = data?.tenant_id ?? null;
    }

    let newStatus: string | null = null;
    let emailTemplate: string | null = null;

    switch (event.event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        newStatus = "active";
        emailTemplate = "subscription_paid";
        break;
      case "PAYMENT_OVERDUE":
        newStatus = "past_due";
        emailTemplate = "subscription_overdue";
        break;
      case "SUBSCRIPTION_DELETED":
      case "SUBSCRIPTION_CANCELED":
        newStatus = "canceled";
        emailTemplate = "subscription_canceled";
        break;
      default:
        // Ignora demais eventos
        return json({ ok: true, ignored: event.event });
    }

    if (tenantId && newStatus) {
      const patch: Record<string, any> = { status: newStatus };
      if (newStatus === "active") {
        patch.current_period_start = new Date().toISOString();
        patch.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      await admin.from("tenant_subscriptions").update(patch).eq("tenant_id", tenantId);

      // send email best-effort
      if (emailTemplate) {
        const { data: tenant } = await admin.from("tenants").select("contact_email, name").eq("id", tenantId).maybeSingle();
        if (tenant?.contact_email) {
          admin.functions.invoke("send-email", {
            body: {
              template_id: emailTemplate,
              to: tenant.contact_email,
              tenant_id: tenantId,
              variables: { empresa: tenant.name },
            },
          }).catch((e) => console.warn("send-email failed", e));
        }
      }
    }

    // audit
    try {
      await admin.from("audit_log").insert({
        action: `asaas_webhook_${event.event.toLowerCase()}`,
        tenant_id: tenantId,
        metadata: { event_id: event.id, raw: event },
      });
    } catch (_) { /* tabela pode não existir; ignorar */ }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
