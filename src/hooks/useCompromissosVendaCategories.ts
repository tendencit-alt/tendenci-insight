import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";

const PARENT_CODE = "2.2";

export interface CompromissoCategory {
  id: string; // chart_account_id
  code: string;
  name: string;
  active: boolean;
  defaultPercentage: number;
}

export interface CompromissoState {
  chart_account_id: string;
  habilitado: boolean;
  percentual: number;
  valor: number;
  responsavel_id: string;
}

export function useCompromissosVendaCategories(enabled = true) {
  const { activeTenantId } = useActiveTenant();
  return useQuery({
    queryKey: ["compromissos-venda-categories", activeTenantId],
    enabled: enabled && !!activeTenantId,
    queryFn: async () => {
      // 1. Find parent account 2.2 for the active tenant
      const { data: parent } = await supabase
        .from("fin_chart_accounts")
        .select("id")
        .eq("code", PARENT_CODE)
        .eq("active", true)
        .eq("tenant_id", activeTenantId!)
        .maybeSingle();

      if (!parent) return [];

      // 2. Get children
      const { data: children } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name")
        .eq("parent_id", parent.id)
        .eq("active", true)
        .order("code");

      if (!children?.length) return [];

      // 3. Get configs (RLS scopes to active tenant)
      const { data: configs } = await supabase
        .from("fin_strategic_resource_account_configs" as any)
        .select("chart_account_id, active, default_percentage");

      const configMap = new Map<string, { active: boolean; default_percentage: number }>();
      ((configs ?? []) as any[]).forEach((c: any) => {
        if (c.chart_account_id) configMap.set(c.chart_account_id, c);
      });

      return children.map((child): CompromissoCategory => {
        const cfg = configMap.get(child.id);
        return {
          id: child.id,
          code: child.code,
          name: child.name,
          active: cfg?.active ?? false,
          defaultPercentage: Number(cfg?.default_percentage) || 0,
        };
      });
    },
    staleTime: 60_000,
  });
}

/** Build initial state from categories */
export function buildInitialCompromissos(
  categories: CompromissoCategory[],
  total: number = 0
): CompromissoState[] {
  return categories.map((cat) => ({
    chart_account_id: cat.id,
    habilitado: true,
    percentual: cat.defaultPercentage,
    valor: total * (cat.defaultPercentage / 100),
    responsavel_id: "",
  }));
}
