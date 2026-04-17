import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActionRequest {
  action: string;
  target_tenant_id?: string;
  target_user_id?: string;
  reason: string;
  payload?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verifica se é Owner
    const { data: profile } = await admin
      .from("profiles")
      .select("is_owner")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_owner) {
      return new Response(JSON.stringify({ error: "Forbidden: Owner only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ActionRequest = await req.json();
    if (!body.action || !body.reason || body.reason.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Action and reason (min 5 chars) are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let beforeState: Record<string, unknown> | null = null;
    let afterState: Record<string, unknown> | null = null;
    let category = "tenant";

    switch (body.action) {
      case "suspend_tenant": {
        if (!body.target_tenant_id) throw new Error("target_tenant_id required");
        const { data: before } = await admin.from("tenants").select("active").eq("id", body.target_tenant_id).single();
        beforeState = before;
        await admin.from("tenants").update({ active: false }).eq("id", body.target_tenant_id);
        await admin.from("subscriptions").update({ status: "suspended" }).eq("tenant_id", body.target_tenant_id);
        afterState = { active: false, status: "suspended" };
        break;
      }
      case "activate_tenant": {
        if (!body.target_tenant_id) throw new Error("target_tenant_id required");
        const { data: before } = await admin.from("tenants").select("active").eq("id", body.target_tenant_id).single();
        beforeState = before;
        await admin.from("tenants").update({ active: true }).eq("id", body.target_tenant_id);
        await admin.from("subscriptions").update({ status: "active" }).eq("tenant_id", body.target_tenant_id);
        afterState = { active: true, status: "active" };
        break;
      }
      case "change_plan": {
        if (!body.target_tenant_id || !body.payload?.new_plan_id) throw new Error("target_tenant_id and new_plan_id required");
        const { data: before } = await admin.from("tenants").select("plan_id").eq("id", body.target_tenant_id).single();
        beforeState = before;
        await admin.from("tenants").update({ plan_id: body.payload.new_plan_id as string }).eq("id", body.target_tenant_id);
        await admin.from("subscriptions").update({ plan_id: body.payload.new_plan_id as string }).eq("tenant_id", body.target_tenant_id);
        afterState = { plan_id: body.payload.new_plan_id };
        break;
      }
      case "toggle_module": {
        category = "module";
        if (!body.target_tenant_id || !body.payload?.flag_id) throw new Error("target_tenant_id and flag_id required");
        const enabled = Boolean(body.payload.enabled);
        const { data: before } = await admin
          .from("feature_flag_overrides")
          .select("enabled")
          .eq("tenant_id", body.target_tenant_id)
          .eq("flag_id", body.payload.flag_id as string)
          .maybeSingle();
        beforeState = before;
        await admin.from("feature_flag_overrides").upsert(
          {
            tenant_id: body.target_tenant_id,
            flag_id: body.payload.flag_id as string,
            enabled,
          },
          { onConflict: "tenant_id,flag_id" },
        );
        afterState = { enabled };
        break;
      }
      case "deactivate_user": {
        category = "user";
        if (!body.target_user_id) throw new Error("target_user_id required");
        await admin.auth.admin.updateUserById(body.target_user_id, { ban_duration: "876000h" });
        afterState = { banned: true };
        break;
      }
      case "reactivate_user": {
        category = "user";
        if (!body.target_user_id) throw new Error("target_user_id required");
        await admin.auth.admin.updateUserById(body.target_user_id, { ban_duration: "none" });
        afterState = { banned: false };
        break;
      }
      case "reset_user_password": {
        category = "user";
        if (!body.target_user_id) throw new Error("target_user_id required");
        const { data: u } = await admin.auth.admin.getUserById(body.target_user_id);
        if (u?.user?.email) {
          await admin.auth.admin.generateLink({ type: "recovery", email: u.user.email });
          afterState = { password_reset_sent_to: u.user.email };
        }
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${body.action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    await admin.from("saas_admin_action_log").insert({
      actor_id: user.id,
      target_tenant_id: body.target_tenant_id ?? null,
      target_user_id: body.target_user_id ?? null,
      action_type: body.action,
      action_category: category,
      reason: body.reason,
      before_state: beforeState,
      after_state: afterState,
      metadata: body.payload ?? {},
    });

    return new Response(JSON.stringify({ ok: true, before: beforeState, after: afterState }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("saas-admin-action error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
