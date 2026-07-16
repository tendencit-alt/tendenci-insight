import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { asaasFetch, getAsaasKey, corsHeaders } from "../_shared/asaas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // getUser em vez de getClaims: getClaims não existe no supabase-js@2.45.0
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    if (!getAsaasKey()) {
      return json({ error: "ASAAS_API_KEY_MISSING", message: "Configure ASAAS_API_KEY em Supabase secrets" }, 200);
    }

    const { plan_slug, billing_type } = await req.json().catch(() => ({} as any));
    if (!plan_slug) return json({ error: "plan_slug_required" }, 400);

    const { data: profile } = await admin.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) return json({ error: "no_tenant" }, 400);

    const { data: plan } = await admin.from("subscription_plans").select("*").eq("slug", plan_slug).eq("is_active", true).maybeSingle();
    if (!plan) return json({ error: "plan_not_found" }, 404);

    const { data: sub } = await admin.from("tenant_subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (!sub?.asaas_customer_id) {
      return json({ error: "missing_asaas_customer", message: "Crie cliente Asaas antes" }, 400);
    }

    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 1);

    const subscription = await asaasFetch("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        customer: sub.asaas_customer_id,
        billingType: billing_type ?? "BOLETO",
        value: Number(plan.preco_mensal),
        cycle: "MONTHLY",
        nextDueDate: nextDue.toISOString().slice(0, 10),
        description: `Assinatura ${plan.nome}`,
        externalReference: tenantId,
      }),
    });

    await admin.from("tenant_subscriptions").update({
      asaas_subscription_id: subscription.id,
      plan_slug: plan_slug,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("tenant_id", tenantId);

    return json({ subscription_id: subscription.id });
  } catch (e) {
    console.error(e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
