import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import type { Database } from "@/integrations/supabase/types";

export type OrderResponsible = Database["public"]["Tables"]["order_responsibles"]["Row"] & {
  full_name: string;
  chart_account_id: string | null;
};
export type OrderResponsibleType = Database["public"]["Enums"]["order_responsible_type"];

export function useOrderResponsibles(enabled = true) {
  const { activeTenantId } = useActiveTenant();
  const query = useQuery({
    queryKey: ["order-responsibles", activeTenantId],
    enabled: enabled && !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_responsibles")
        .select("id, name, type, chart_account_id, is_active, supplier_id, tenant_id, created_at, updated_at")
        .eq("tenant_id", activeTenantId!)
        .order("name");

      if (error) throw error;
      return (data ?? []).map((item: any) => ({ ...item, full_name: item.name })) as OrderResponsible[];
    },
  });

  const responsibles: OrderResponsible[] = query.data ?? [];

  const grouped = useMemo(
    () => ({
      vendedores: responsibles.filter((item) => item.type === "vendedor"),
      orcamentistas: responsibles.filter((item) => item.type === "orcamentista"),
      projetistas: responsibles.filter((item) => item.type === "projetista"),
      montadores: responsibles.filter((item) => item.type === "montador"),
      producoes: responsibles.filter((item) => item.type === "producao"),
    }),
    [responsibles],
  );

  /** Returns active responsibles linked to a given compromisso (chart account) */
  const byChartAccount = (chartAccountId: string) =>
    responsibles.filter((r) => r.is_active && r.chart_account_id === chartAccountId);

  return {
    ...query,
    responsibles,
    byChartAccount,
    ...grouped,
  };
}
