import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { FinanceiroKPIs } from "./FinanceiroKPIs";
import { FinanceiroCharts } from "./FinanceiroCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FinanceiroDashboardProps {
  filters: FinanceiroFiltersState;
}

export function FinanceiroDashboard({ filters }: FinanceiroDashboardProps) {
  const dateField = filters.regime === "CAIXA" ? "cash_date" : "competence_date";

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
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

  // Fetch payables summary
  const { data: payablesSummary, isLoading: payablesLoading } = useQuery({
    queryKey: ["fin-payables-summary"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_payables")
        .select("status, amount, paid_amount, due_date")
        .neq("status", "CANCELADO");

      const today = new Date();
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const abertas = data?.filter(d => d.status === "ABERTO") || [];
      const vencidas = data?.filter(d => d.status === "VENCIDO") || [];

      return {
        abertasCount: abertas.length,
        abertasValor: abertas.reduce((sum, d) => sum + Number(d.amount) - Number(d.paid_amount || 0), 0),
        vencidasCount: vencidas.length,
        vencidasValor: vencidas.reduce((sum, d) => sum + Number(d.amount) - Number(d.paid_amount || 0), 0),
        aVencer7d: abertas.filter(d => new Date(d.due_date) <= in7Days).length,
        aVencer15d: abertas.filter(d => new Date(d.due_date) <= in15Days).length,
        aVencer30d: abertas.filter(d => new Date(d.due_date) <= in30Days).length,
      };
    },
  });

  // Fetch receivables summary
  const { data: receivablesSummary, isLoading: receivablesLoading } = useQuery({
    queryKey: ["fin-receivables-summary"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_receivables")
        .select("status, amount, received_amount, due_date")
        .neq("status", "CANCELADO");

      const today = new Date();
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const abertas = data?.filter(d => d.status === "ABERTO") || [];
      const vencidas = data?.filter(d => d.status === "VENCIDO") || [];

      return {
        abertasCount: abertas.length,
        abertasValor: abertas.reduce((sum, d) => sum + Number(d.amount) - Number(d.received_amount || 0), 0),
        vencidasCount: vencidas.length,
        vencidasValor: vencidas.reduce((sum, d) => sum + Number(d.amount) - Number(d.received_amount || 0), 0),
        aVencer7d: abertas.filter(d => new Date(d.due_date) <= in7Days).length,
        aVencer15d: abertas.filter(d => new Date(d.due_date) <= in15Days).length,
        aVencer30d: abertas.filter(d => new Date(d.due_date) <= in30Days).length,
      };
    },
  });

  const isLoading = metricsLoading || payablesLoading || receivablesLoading;

  return (
    <div className="space-y-6">
      <FinanceiroKPIs metrics={metrics} isLoading={isLoading} />

      <FinanceiroCharts filters={filters} />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Contas a Pagar Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
              Contas a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payablesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Em Aberto</span>
                  <span className="font-semibold">
                    {payablesSummary?.abertasCount || 0} títulos - R$ {(payablesSummary?.abertasValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-red-600">
                  <span className="text-sm">Vencidas</span>
                  <span className="font-semibold">
                    {payablesSummary?.vencidasCount || 0} títulos - R$ {(payablesSummary?.vencidasValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    7d: {payablesSummary?.aVencer7d || 0}
                  </span>
                  <span>15d: {payablesSummary?.aVencer15d || 0}</span>
                  <span>30d: {payablesSummary?.aVencer30d || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contas a Receber Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-500" />
              Contas a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receivablesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Em Aberto</span>
                  <span className="font-semibold">
                    {receivablesSummary?.abertasCount || 0} títulos - R$ {(receivablesSummary?.abertasValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-orange-600">
                  <span className="text-sm">Vencidas</span>
                  <span className="font-semibold">
                    {receivablesSummary?.vencidasCount || 0} títulos - R$ {(receivablesSummary?.vencidasValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    7d: {receivablesSummary?.aVencer7d || 0}
                  </span>
                  <span>15d: {receivablesSummary?.aVencer15d || 0}</span>
                  <span>30d: {receivablesSummary?.aVencer30d || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
