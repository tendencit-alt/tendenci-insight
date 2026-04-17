import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PermissionDenialRecord } from "@/components/smart-permissions/types";

interface Filters {
  module?: string;
  permissionKey?: string;
  sinceDays?: number;
}

export function usePermissionDenials(filters: Filters = {}) {
  return useQuery({
    queryKey: ["rbac-denials", filters],
    queryFn: async () => {
      let q = supabase
        .from("rbac_permission_denials")
        .select("id,user_id,tenant_id,permission_key,module,context,attempted_at")
        .order("attempted_at", { ascending: false })
        .limit(500);

      if (filters.module) q = q.eq("module", filters.module);
      if (filters.permissionKey) q = q.eq("permission_key", filters.permissionKey);
      if (filters.sinceDays) {
        const since = new Date(Date.now() - filters.sinceDays * 86400000).toISOString();
        q = q.gte("attempted_at", since);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PermissionDenialRecord[];
    },
    staleTime: 30_000,
  });
}

export function useDenialAnalytics(sinceDays = 30) {
  const { data: denials = [], isLoading } = usePermissionDenials({ sinceDays });

  const byPermission: Record<string, number> = {};
  const byModule: Record<string, number> = {};
  const byUser: Record<string, number> = {};

  denials.forEach((d) => {
    byPermission[d.permission_key] = (byPermission[d.permission_key] || 0) + 1;
    if (d.module) byModule[d.module] = (byModule[d.module] || 0) + 1;
    if (d.user_id) byUser[d.user_id] = (byUser[d.user_id] || 0) + 1;
  });

  const top = (obj: Record<string, number>, n = 5) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

  return {
    isLoading,
    total: denials.length,
    topPermissions: top(byPermission, 8),
    topModules: top(byModule, 6),
    topUsers: top(byUser, 6),
    raw: denials,
  };
}
