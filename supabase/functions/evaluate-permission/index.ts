// Owner-only: evaluate-permission
// Returns a structured trace explaining why a (user|profile, module, action) is allowed or denied.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  target_user_id?: string | null;
  target_profile_type_id?: string | null;
  tenant_id?: string | null;
  module?: string | null;
  action?: string | null;        // ex: 'view' | 'create' | 'edit' | 'approve' | 'delete' | 'configure'
  permission_key?: string | null; // optional explicit critical key
}

type TraceStep = {
  step: string;
  outcome: "pass" | "fail" | "info";
  detail: string;
  data?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    // getUser em vez de getClaims: getClaims não existe no supabase-js@2.45.0
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: caller } = await admin
      .from("profiles")
      .select("profile_type_id, profile_types!inner(name)")
      .eq("id", callerId)
      .single();
    const isOwner = (caller?.profile_types as { name: string } | null)?.name === "owner";
    if (!isOwner) return json({ error: "Owner only" }, 403);

    const body = (await req.json().catch(() => ({}))) as Body;
    const trace: TraceStep[] = [];

    // 1) Resolve target profile + tenant
    let profileTypeId = body.target_profile_type_id ?? null;
    let profileName: string | null = null;
    let displayName: string | null = null;
    let tenantId = body.tenant_id ?? null;
    let userName: string | null = null;

    if (body.target_user_id) {
      const { data: u } = await admin
        .from("profiles")
        .select("id, full_name, email, profile_type_id, tenant_id")
        .eq("id", body.target_user_id)
        .single();
      if (!u) return json({ error: "Target user not found" }, 404);
      profileTypeId = u.profile_type_id;
      tenantId = tenantId ?? (u.tenant_id as string | null);
      userName = (u.full_name as string | null) ?? (u.email as string | null);
      trace.push({
        step: "target_user",
        outcome: "info",
        detail: `Usuário-alvo resolvido: ${userName ?? body.target_user_id}`,
        data: { user_id: u.id, tenant_id: tenantId },
      });
    }

    if (!profileTypeId) {
      return json({ error: "Provide target_user_id or target_profile_type_id" }, 400);
    }

    const { data: pt } = await admin
      .from("profile_types")
      .select("name, display_name, description")
      .eq("id", profileTypeId)
      .single();
    profileName = pt?.name ?? null;
    displayName = pt?.display_name ?? pt?.name ?? null;
    trace.push({
      step: "profile_base",
      outcome: "info",
      detail: `Perfil base: ${displayName ?? profileName}`,
      data: { profile_type_id: profileTypeId, name: profileName },
    });

    // 2) Owner short-circuit
    if (profileName === "owner") {
      trace.push({
        step: "owner_grant",
        outcome: "pass",
        detail: "Perfil Owner concede acesso global implicitamente.",
      });
      return json({
        decision: "allowed",
        reason: "Owner global access",
        profile_name: displayName,
        user_name: userName,
        trace,
      });
    }

    // 3) Critical permission check (when permission_key provided)
    if (body.permission_key) {
      const { data: cp } = await admin
        .from("rbac_critical_permissions")
        .select("allowed, permission_label")
        .eq("profile_type_id", profileTypeId)
        .eq("permission_key", body.permission_key)
        .maybeSingle();

      if (!cp) {
        trace.push({
          step: "critical_permission",
          outcome: "fail",
          detail: `Permissão crítica '${body.permission_key}' não definida para este perfil → negada por default.`,
        });
        return finalDeny(trace, body, displayName, userName);
      }
      trace.push({
        step: "critical_permission",
        outcome: cp.allowed ? "pass" : "fail",
        detail: `Permissão crítica '${body.permission_key}' = ${cp.allowed ? "permitida" : "bloqueada"}.`,
      });
      if (!cp.allowed) return finalDeny(trace, body, displayName, userName);
    }

    // 4) Module access via permissions table (if module provided)
    if (body.module) {
      const { data: modPerm } = await admin
        .from("permissions")
        .select("can_view, can_create, can_edit, can_delete, can_approve, can_configure")
        .eq("profile_type_id", profileTypeId)
        .eq("module", body.module)
        .maybeSingle();

      if (!modPerm) {
        trace.push({
          step: "module_access",
          outcome: "fail",
          detail: `Sem registro de acesso ao módulo '${body.module}' para este perfil.`,
        });
        return finalDeny(trace, body, displayName, userName);
      }

      const action = (body.action ?? "view").toLowerCase();
      const map: Record<string, boolean> = {
        view: !!modPerm.can_view,
        create: !!modPerm.can_create,
        edit: !!modPerm.can_edit,
        delete: !!modPerm.can_delete,
        approve: !!modPerm.can_approve,
        configure: !!modPerm.can_configure,
      };
      const allowed = map[action] ?? false;
      trace.push({
        step: "module_action",
        outcome: allowed ? "pass" : "fail",
        detail: `Ação '${action}' no módulo '${body.module}' = ${allowed ? "permitida" : "bloqueada"}.`,
        data: map,
      });
      if (!allowed) return finalDeny(trace, body, displayName, userName);
    }

    // 5) Scope restrictions (informational)
    const { data: scopes } = await admin
      .from("rbac_scope_restrictions")
      .select("scope_type, scope_mode, allowed_ids")
      .eq("profile_type_id", profileTypeId);
    if (scopes && scopes.length > 0) {
      trace.push({
        step: "scope_restrictions",
        outcome: "info",
        detail: `Existem ${scopes.length} restrição(ões) de escopo aplicáveis.`,
        data: { scopes },
      });
    }

    return json({
      decision: "allowed",
      reason: "Todas as verificações passaram.",
      profile_name: displayName,
      user_name: userName,
      trace,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function finalDeny(trace: TraceStep[], body: Body, profile: string | null, user: string | null) {
  return json({
    decision: "denied",
    reason: trace.filter((t) => t.outcome === "fail").pop()?.detail ?? "Acesso negado.",
    profile_name: profile,
    user_name: user,
    requested: { module: body.module, action: body.action, permission_key: body.permission_key },
    trace,
  });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
