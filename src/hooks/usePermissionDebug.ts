import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EvaluatePermissionInput {
  target_user_id?: string | null;
  target_profile_type_id?: string | null;
  tenant_id?: string | null;
  module?: string | null;
  action?: string | null;
  permission_key?: string | null;
}

export interface EvaluatePermissionResult {
  decision: "allowed" | "denied";
  reason: string;
  profile_name: string | null;
  user_name: string | null;
  trace: { step: string; outcome: "pass" | "fail" | "info"; detail: string; data?: unknown }[];
  requested?: { module?: string | null; action?: string | null; permission_key?: string | null };
}

export function useEvaluatePermission() {
  return useMutation({
    mutationFn: async (input: EvaluatePermissionInput) => {
      const { data, error } = await supabase.functions.invoke("evaluate-permission", { body: input });
      if (error) throw error;
      return data as EvaluatePermissionResult;
    },
  });
}

export function useProfileDiff(profileA?: string | null, profileB?: string | null) {
  return useQuery({
    queryKey: ["profile-diff", profileA, profileB],
    enabled: !!profileA && !!profileB && profileA !== profileB,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("diff_profile_critical_permissions", {
        _profile_a: profileA!,
        _profile_b: profileB!,
      });
      if (error) throw error;
      return (data ?? []) as {
        permission_key: string;
        module: string;
        label: string;
        allowed_a: boolean;
        allowed_b: boolean;
      }[];
    },
  });
}

export function usePermissionRecommendations() {
  return useQuery({
    queryKey: ["permission-recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rbac_permission_recommendations")
        .select("*")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAnalyzeFriction() {
  // Edge function `analyze-permission-friction` and the underlying denial telemetry
  // were removed when the /auditoria-permissoes module was retired (C2 cleanup).
  // Keep the hook signature so callers don't break; it's a no-op now.
  return useMutation({
    mutationFn: async () => {
      return {
        top_denials: [] as { permission_key: string; module: string | null; n: number; distinct_users: number }[],
        ai_insights: null as string | null,
      };
    },
  });
}

export function useAllProfileTypes() {
  return useQuery({
    queryKey: ["all-profile-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_types")
        .select("id, name, display_name, description")
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTenantsList() {
  return useQuery({
    queryKey: ["debug-tenants-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUsersByTenant(tenantId?: string | null) {
  return useQuery({
    queryKey: ["debug-users-by-tenant", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, profile_type_id")
        .eq("tenant_id", tenantId!)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
