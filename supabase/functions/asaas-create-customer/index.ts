import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { asaasFetch, getAsaasKey, corsHeaders } from "../_shared/asaas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

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

    // tenant via profile
    const { data: profile } = await admin.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) return json({ error: "no_tenant" }, 400);

    const { data: tenant } = await admin.from("tenants").select("id, name, cnpj, contact_email").eq("id", tenantId).maybeSingle();
    if (!tenant) return json({ error: "tenant_not_found" }, 404);

    const { data: sub } = await admin.from("tenant_subscriptions").select("id, asaas_customer_id").eq("tenant_id", tenantId).maybeSingle();
    if (sub?.asaas_customer_id) {
      return json({ customer_id: sub.asaas_customer_id, reused: true });
    }

    const customer = await asaasFetch("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: tenant.name,
        cpfCnpj: (tenant.cnpj ?? "").replace(/\D/g, ""),
        email: tenant.contact_email ?? undefined,
        externalReference: tenantId,
      }),
    });

    await admin.from("tenant_subscriptions").update({ asaas_customer_id: customer.id }).eq("tenant_id", tenantId);
    return json({ customer_id: customer.id });
  } catch (e) {
    console.error(e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
