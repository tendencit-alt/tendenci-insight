// Edge function: simulate-permissions
// Returns the effective critical permissions a target profile/user would have.
// Owner-only: caller must hold the 'owner' profile.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  target_user_id?: string | null;
  target_profile_type_id?: string | null;
}

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

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const callerId = userData.user.id;

    // Service-role client to read across tenants
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is Owner (via is_owner flag, role column, or profile_types.name)
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("is_owner, role, profile_type_id, profile_types(name)")
      .eq("id", callerId)
      .maybeSingle();

    const isOwner =
      callerProfile?.is_owner === true ||
      callerProfile?.role === "owner" ||
      (callerProfile?.profile_types as { name: string } | null)?.name === "owner";
    if (!isOwner) return json({ error: "Owner only" }, 403);

    const body = (await req.json().catch(() => ({}))) as Body;

    // Resolve target profile_type_id
    let targetProfileTypeId = body.target_profile_type_id ?? null;
    let targetUserName: string | null = null;

    if (body.target_user_id) {
      const { data: target } = await admin
        .from("profiles")
        .select("id, full_name, email, profile_type_id")
        .eq("id", body.target_user_id)
        .single();
      targetProfileTypeId = target?.profile_type_id ?? null;
      targetUserName = (target?.full_name as string | null) ?? (target?.email as string | null);
    }

    if (!targetProfileTypeId) {
      return json({ error: "Provide target_user_id or target_profile_type_id" }, 400);
    }

    const { data: profileType } = await admin
      .from("profile_types")
      .select("name, display_name")
      .eq("id", targetProfileTypeId)
      .single();

    const { data: perms } = await admin
      .from("rbac_critical_permissions")
      .select("permission_key, allowed")
      .eq("profile_type_id", targetProfileTypeId);

    const map: Record<string, boolean> = {};
    perms?.forEach((p: { permission_key: string; allowed: boolean }) => {
      map[p.permission_key] = !!p.allowed;
    });

    // Owner profile: grant everything implicitly
    if (profileType?.name === "owner") {
      const { data: catalog } = await admin
        .from("rbac_permission_catalog")
        .select("permission_key");
      catalog?.forEach((c: { permission_key: string }) => (map[c.permission_key] = true));
    }

    return json({
      permissions: map,
      profile_name: profileType?.display_name ?? profileType?.name ?? null,
      user_name: targetUserName,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
