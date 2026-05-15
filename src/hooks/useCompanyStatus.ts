import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export type TrendDirection = "up" | "down" | "stable";
export type HealthStatus = "estavel" | "atencao" | "risco";

export interface CompanyKPI {
  label: string;
  value: number;
  formatted: string;
  trend: TrendDirection;
  trendLabel?: string;
}

export interface CompanyStatus {
  cashBalance: CompanyKPI;
  monthlyResult: CompanyKPI;
  openOrders: CompanyKPI;
  overduePayables: CompanyKPI;
  goalProgress: CompanyKPI;
  health: HealthStatus;
  healthScore: number;
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function useCompanyStatus() {
  return useQuery({
    queryKey: ["company-status-cockpit"],
    queryFn: async (): Promise<CompanyStatus> => {
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
      const prevMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

      const cashRes = await supabase
        .from("fin_bank_accounts")
        .select("opening_balance")
        .eq("active", true) as unknown as { data: { opening_balance: number | null }[] | null };

      type FlowRow = { amount: number | null; entry_type?: string | null; type?: string | null; chart_account?: { grupo_fluxo: string | null } | null };
      type FlowRes = { data: FlowRow[] | null };
      const ledger = () =>
        supabase
          .from("fin_ledger_entries")
          .select("amount, entry_type, type, chart_account:fin_chart_accounts(grupo_fluxo)") as any;
      const revenueRes: FlowRes = await ledger().gte("competence_date", monthStart).lte("competence_date", monthEnd);
      const expenseRes: FlowRes = revenueRes; // same dataset, classified below
      const prevRevenueRes: FlowRes = await ledger().gte("competence_date", prevMonthStart).lte("competence_date", prevMonthEnd);
      const prevExpenseRes: FlowRes = prevRevenueRes;

      const sumByFlow = (rows: FlowRow[] | null | undefined, kind: "ENTRADA" | "SAIDA") => {
        if (!rows) return 0;
        return rows.reduce((s, r) => {
          const gf: string | null = r.chart_account?.grupo_fluxo ?? null;
          let isMatch = false;
          if (gf) {
            // Suporta valores compostos (OPERACIONAL_ENTRADA, FINANCIAMENTO_SAIDA, etc.)
            // NAO_CAIXA é ignorado nos KPIs de caixa.
            if (gf === "NAO_CAIXA") isMatch = false;
            else isMatch = kind === "ENTRADA" ? gf.endsWith("_ENTRADA") || gf === "ENTRADA"
                                              : gf.endsWith("_SAIDA")  || gf === "SAIDA";
          } else {
            // Fallback antigo enquanto contas não tiverem grupo_fluxo classificado
            if (kind === "ENTRADA") isMatch = r.entry_type === "credit" || r.type === "RECEITA";
            else isMatch = r.entry_type === "debit" || r.type === "DESPESA";
          }
          return isMatch ? s + Number(r.amount || 0) : s;
        }, 0);
      };

      const openOrdersRes = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["rascunho", "pendente_aprovacao", "aprovado", "liberado_producao", "em_producao"]);

      const overduePayRes = await supabase
        .from("fin_payables")
        .select("id, amount", { count: "exact" })
        .in("status", ["ABERTO", "VENCIDO"])
        .lt("due_date", today);

      const overdueRecRes = await supabase
        .from("fin_receivables")
        .select("id", { count: "exact", head: true })
        .in("status", ["ABERTO", "VENCIDO"])
        .lt("due_date", today);

      // Calculate
      const cashBalance = cashRes.data?.reduce((s, r) => s + Number(r.opening_balance || 0), 0) || 0;
      const revenue = sumByFlow(revenueRes.data, "ENTRADA");
      const expenses = sumByFlow(expenseRes.data, "SAIDA");
      const monthlyResult = revenue - expenses;
      const prevRevenue = sumByFlow(prevRevenueRes.data, "ENTRADA");
      const prevExpenses = sumByFlow(prevExpenseRes.data, "SAIDA");
      const prevResult = prevRevenue - prevExpenses;

      const openOrders = openOrdersRes.count || 0;
      const overduePayCount = overduePayRes.count || 0;
      const overduePayAmount = overduePayRes.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const overdueRecCount = overdueRecRes.count || 0;

      const goalPct = prevRevenue > 0 ? (revenue / prevRevenue) * 100 : 0;
      const resultTrend: TrendDirection = monthlyResult > prevResult ? "up" : monthlyResult < prevResult ? "down" : "stable";

      // Health score (0-100)
      let healthScore = 100;
      if (cashBalance < 0) healthScore -= 30;
      else if (cashBalance < 10000) healthScore -= 10;
      if (monthlyResult < 0) healthScore -= 25;
      if (overduePayCount > 5) healthScore -= 20;
      else if (overduePayCount > 0) healthScore -= 10;
      if (overdueRecCount > 5) healthScore -= 15;
      else if (overdueRecCount > 0) healthScore -= 5;
      healthScore = Math.max(0, Math.min(100, healthScore));
      const health: HealthStatus = healthScore >= 70 ? "estavel" : healthScore >= 40 ? "atencao" : "risco";

      return {
        cashBalance: { label: "Saldo Caixa", value: cashBalance, formatted: fmt(cashBalance), trend: cashBalance > 0 ? "up" as const : "down" as const },
        monthlyResult: { label: "Resultado Mês", value: monthlyResult, formatted: fmt(monthlyResult), trend: resultTrend, trendLabel: resultTrend === "up" ? "acima do anterior" : resultTrend === "down" ? "abaixo do anterior" : "estável" },
        openOrders: { label: "Pedidos Abertos", value: openOrders, formatted: String(openOrders), trend: "stable" as const },
        overduePayables: { label: "Contas Vencidas", value: overduePayCount, formatted: overduePayCount > 0 ? `${overduePayCount} (${fmt(overduePayAmount)})` : "0", trend: overduePayCount > 0 ? "down" as const : "up" as const },
        goalProgress: { label: "Meta vs Realizado", value: goalPct, formatted: `${goalPct.toFixed(0)}%`, trend: goalPct >= 80 ? "up" as const : goalPct >= 50 ? "stable" as const : "down" as const, trendLabel: goalPct >= 100 ? "acima do mês anterior" : `${(100 - goalPct).toFixed(0)}% abaixo` },
        health,
        healthScore,
      };
    },
    refetchInterval: 120000,
    staleTime: 60000,
  });
}
