import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, service);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: isOwner } = await admin.rpc("is_owner");
    // is_owner uses auth.uid() server-side; rpc above runs as service_role so re-check via user client
    const { data: ownerCheck } = await userClient.rpc("is_owner");
    if (!ownerCheck) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { tenant_id, subscription_id, action_type, reason, new_plan_id, discount } = body;

    if (!tenant_id || !action_type || !reason || reason.length < 5) {
      return new Response(JSON.stringify({ error: "tenant_id, action_type and reason (>=5 chars) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let beforeState: any = null;
    let afterState: any = null;

    // Capture current subscription
    if (subscription_id) {
      const { data: sub } = await admin.from("subscriptions").select("*").eq("id", subscription_id).maybeSingle();
      beforeState = sub;
    }

    switch (action_type) {
      case "activate":
        if (subscription_id) await admin.from("subscriptions").update({ status: "active" }).eq("id", subscription_id);
        break;
      case "suspend":
        if (subscription_id) await admin.from("subscriptions").update({ status: "suspended" }).eq("id", subscription_id);
        break;
      case "pause_billing":
        if (subscription_id) await admin.from("subscriptions").update({ status: "trial" }).eq("id", subscription_id);
        break;
      case "change_plan":
        if (subscription_id && new_plan_id) {
          await admin.from("subscriptions").update({ plan_id: new_plan_id }).eq("id", subscription_id);
        }
        break;
      case "apply_discount":
        if (discount) {
          await admin.from("billing_discounts").insert({
            tenant_id, subscription_id, discount_type: discount.type,
            value: discount.value, ends_at: discount.ends_at ?? null,
            reason, created_by: user.id,
          });
        }
        break;
      case "grant_temporary_access":
        if (subscription_id) {
          await admin.from("subscriptions").update({ status: "active" }).eq("id", subscription_id);
        }
        break;
      default:
        return new Response(JSON.stringify({ error: `unknown action_type: ${action_type}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (subscription_id) {
      const { data: sub } = await admin.from("subscriptions").select("*").eq("id", subscription_id).maybeSingle();
      afterState = sub;
    }

    await admin.from("subscription_actions_log").insert({
      tenant_id, subscription_id, action_type, reason,
      before_state: beforeState, after_state: afterState, performed_by: user.id,
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("billing-ops-action error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
