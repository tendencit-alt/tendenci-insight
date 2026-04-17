import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PermissionCatalogEntry } from "@/components/smart-permissions/types";

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["rbac-permission-catalog"],
    queryFn: async (): Promise<PermissionCatalogEntry[]> => {
      const { data, error } = await supabase
        .from("rbac_permission_catalog")
        .select("permission_key,label,module,description,default_blocked_message,is_critical")
        .order("module")
        .order("label");
      if (error) throw error;
      return (data ?? []) as PermissionCatalogEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function getCatalogEntry(
  catalog: PermissionCatalogEntry[] | undefined,
  key: string
): PermissionCatalogEntry | undefined {
  return catalog?.find((c) => c.permission_key === key);
}
