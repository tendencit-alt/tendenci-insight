import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BudgetVersionLabel = "base" | "revisado" | "forecast_rolling";

export const VERSION_LABELS: Record<BudgetVersionLabel, string> = {
  base: "Orçamento Base",
  revisado: "Orçamento Revisado",
  forecast_rolling: "Forecast Rolling",
};

interface BudgetFilters {
  year: number;
  month: number;
  versionLabel?: BudgetVersionLabel;
  costCenterId?: string | null;
  projectId?: string | null;
}

export interface BudgetEntry {
  id: string;
  year: number;
  month: number;
  chart_account_id: string;
  cost_center_id: string | null;
  project_id: string | null;
  amount: number;
  version: number;
  version_label: string;
  budget_type: string;
  notes: string | null;
}

/**
 * Fetches budget entries for a given period and version.
 * Returns a map of chart_account_id → total budgeted amount.
 */
export function useBudgetData(filters: BudgetFilters) {
  return useQuery({
    queryKey: ["fin-budget-data", filters.year, filters.month, filters.versionLabel, filters.costCenterId, filters.projectId],
    queryFn: async () => {
      let query = supabase
        .from("fin_budgets")
        .select("id, year, month, chart_account_id, cost_center_id, project_id, amount, version, version_label, budget_type, notes")
        .eq("year", filters.year)
        .eq("month", filters.month);

      if (filters.versionLabel) {
        query = query.eq("version_label", filters.versionLabel);
      }
      if (filters.costCenterId) {
        query = query.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by chart_account_id
      const byAccount = new Map<string, number>();
      const entries = (data || []) as BudgetEntry[];
      
      entries.forEach((e) => {
        const current = byAccount.get(e.chart_account_id) || 0;
        byAccount.set(e.chart_account_id, current + Number(e.amount));
      });

      return { entries, byAccount };
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetches budget totals for a full year (all months) for comparison.
 */
export function useBudgetYearData(year: number, versionLabel: BudgetVersionLabel = "base") {
  return useQuery({
    queryKey: ["fin-budget-year", year, versionLabel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_budgets")
        .select("month, chart_account_id, amount")
        .eq("year", year)
        .eq("version_label", versionLabel);

      if (error) throw error;

      // Map: month → chart_account_id → amount
      const byMonth = new Map<number, Map<string, number>>();
      (data || []).forEach((e: any) => {
        if (!byMonth.has(e.month)) byMonth.set(e.month, new Map());
        const m = byMonth.get(e.month)!;
        m.set(e.chart_account_id, (m.get(e.chart_account_id) || 0) + Number(e.amount));
      });

      return byMonth;
    },
    staleTime: 5 * 60 * 1000,
  });
}
