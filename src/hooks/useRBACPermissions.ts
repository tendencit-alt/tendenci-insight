import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

export function useRBACPermissions() {
  const { user } = useAuth();
  const { isMaster } = usePermissions();

  const { data: criticalPermissions, isLoading } = useQuery({
    queryKey: ["rbac-critical-permissions", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get user's profile_type_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_type_id")
        .eq("id", user.id)
        .single();

      if (!profile?.profile_type_id) return null;

      // Get critical permissions for this profile type
      const { data: perms } = await supabase
        .from("rbac_critical_permissions")
        .select("permission_key, allowed")
        .eq("profile_type_id", profile.profile_type_id);

      const permMap: Record<string, boolean> = {};
      perms?.forEach((p: any) => {
        permMap[p.permission_key] = p.allowed;
      });
      return permMap;
    },
    enabled: !!user,
  });

  const hasCritical = (key: string): boolean => {
    if (isMaster) return true;
    if (!criticalPermissions) return false;
    return criticalPermissions[key] ?? false;
  };

  return { hasCritical, isLoading, criticalPermissions };
}
