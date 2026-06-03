import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auditStub } from "@/lib/audit-stub";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useProfileTypes() {
  return useQuery({
    queryKey: ["profile-types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profile_types").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProfileTypePermissions(profileTypeId?: string) {
  return useQuery({
    queryKey: ["profile-type-permissions", profileTypeId],
    enabled: !!profileTypeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profile_type_permissions").select("*").eq("profile_type_id", profileTypeId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateProfilePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await (supabase as any).from("profile_type_permissions").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile-type-permissions"] }); toast.success("Permissão atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCriticalPermissions(profileTypeId?: string) {
  return useQuery({
    queryKey: ["critical-permissions", profileTypeId],
    enabled: !!profileTypeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("rbac_critical_permissions").select("*").eq("profile_type_id", profileTypeId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useScopeRestrictions(profileTypeId?: string) {
  return useQuery({
    queryKey: ["scope-restrictions", profileTypeId],
    enabled: !!profileTypeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("rbac_scope_restrictions").select("*").eq("profile_type_id", profileTypeId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePermissionAudit() {
  return useQuery({
    queryKey: ["permission-audit"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("rbac_permission_audit").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAccessLogs() {
  return useQuery({
    queryKey: ["access-audit-log"],
    queryFn: async () => {
      const { data, error } = await auditStub().select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUsersWithProfiles() {
  return useQuery({
    queryKey: ["users-with-profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profiles").select("id, full_name, email, role, is_owner, profile_type_id, tenant_id, profile_types(name, display_name, color)").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
