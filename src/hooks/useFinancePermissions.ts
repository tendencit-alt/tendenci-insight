import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFinancePermissions() {
  const { data: userPermissions, isLoading } = useQuery({
    queryKey: ["fin-user-permissions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user's finance profile
      const { data: mapping } = await supabase
        .from("fin_user_finance_profiles")
        .select("finance_profile_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mapping) return null;

      // Get all permissions for that profile
      const { data: perms } = await supabase
        .from("fin_profile_permissions")
        .select("permission_key, allowed")
        .eq("profile_id", mapping.finance_profile_id);

      const permMap: Record<string, boolean> = {};
      perms?.forEach((p: any) => { permMap[p.permission_key] = p.allowed; });
      return permMap;
    },
  });

  const can = (permission: string): boolean => {
    if (!userPermissions) return true; // No profile assigned = full access (admin default)
    return userPermissions[permission] ?? false;
  };

  return { can, isLoading, hasProfile: !!userPermissions };
}
