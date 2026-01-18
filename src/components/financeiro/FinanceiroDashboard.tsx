import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { FinanceiroKPIs } from "./FinanceiroKPIs";
import { FinanceiroCharts } from "./FinanceiroCharts";
import { format } from "date-fns";

interface FinanceiroDashboardProps {
  filters: FinanceiroFiltersState;
}

export function FinanceiroDashboard({ filters }: FinanceiroDashboardProps) {
  const dateField = "cash_date";

  // Fetch dashboard metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["fin-dashboard-metrics", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      let query = supabase
        .from("fin_ledger_entries")
        .select("type, amount, status")
        .neq("status", "CANCELADO")
        .gte(dateField, dateFrom)
        .lte(dateField, dateTo);

      if (filters.bankAccountId) {
        query = query.eq("bank_account_id", filters.bankAccountId);
      }
      if (filters.costCenterId) {
        query = query.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }

      const { data } = await query;

      const entradas = data?.filter(d => d.type === "RECEITA").reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      const saidas = data?.filter(d => d.type === "DESPESA").reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      // Get bank account balances
      const { data: accounts } = await supabase
        .from("fin_bank_accounts")
        .select("opening_balance")
        .eq("active", true);

      const saldoInicial = accounts?.reduce((sum, a) => sum + Number(a.opening_balance || 0), 0) || 0;

      return {
        entradas,
        saidas,
        resultado: entradas - saidas,
        saldoConsolidado: saldoInicial + entradas - saidas,
      };
    },
  });

  return (
    <div className="space-y-6">
      <FinanceiroKPIs metrics={metrics} isLoading={isLoading} />

      <FinanceiroCharts filters={filters} />
    </div>
  );
}
