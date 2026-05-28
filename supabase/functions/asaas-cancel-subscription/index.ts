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

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    // admin check
    const { data: profile } = await admin.from("profiles").select("tenant_id, role").eq("id", userId).maybeSingle();
    if (!profile?.tenant_id) return json({ error: "no_tenant" }, 400);
    const isAdmin = ["admin", "owner"].includes(String(profile.role ?? ""));
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const { data: sub } = await admin.from("tenant_subscriptions").select("*").eq("tenant_id", profile.tenant_id).maybeSingle();
    if (!sub) return json({ error: "subscription_not_found" }, 404);

    if (getAsaasKey() && sub.asaas_subscription_id) {
      try { await asaasFetch(`/subscriptions/${sub.asaas_subscription_id}`, { method: "DELETE" }); }
      catch (e) { console.warn("asaas cancel failed", e); }
    }

    await admin.from("tenant_subscriptions").update({ status: "canceled" }).eq("tenant_id", profile.tenant_id);
    return json({ canceled: true });
  } catch (e) {
    console.error(e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
