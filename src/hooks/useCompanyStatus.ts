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
  healthScore: number; // 0-100
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

      // ── Parallel queries ──
      const [
        cashRes,
        revenueRes,
        expenseRes,
        prevRevenueRes,
        prevExpenseRes,
        openOrdersRes,
        overduePayRes,
        overdueRecRes,
        goalRes,
      ] = await Promise.all([
        // Cash balance from bank accounts
        supabase.from("fin_bank_accounts").select("current_balance").eq("active", true),
        // Revenue this month (ledger credit entries)
        supabase.from("fin_ledger_entries").select("amount").eq("entry_type", "credit").gte("competence_date", monthStart).lte("competence_date", monthEnd),
        // Expenses this month
        supabase.from("fin_ledger_entries").select("amount").eq("entry_type", "debit").gte("competence_date", monthStart).lte("competence_date", monthEnd),
        // Previous month revenue
        supabase.from("fin_ledger_entries").select("amount").eq("entry_type", "credit").gte("competence_date", prevMonthStart).lte("competence_date", prevMonthEnd),
        // Previous month expenses
        supabase.from("fin_ledger_entries").select("amount").eq("entry_type", "debit").gte("competence_date", prevMonthStart).lte("competence_date", prevMonthEnd),
        // Open orders
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["rascunho", "pendente_aprovacao", "aprovado", "liberado_producao", "em_producao"]),
        // Overdue payables
        supabase.from("fin_payables").select("id, amount", { count: "exact" }).in("status", ["ABERTO", "VENCIDO"]).lt("due_date", today),
        // Overdue receivables
        supabase.from("fin_receivables").select("id", { count: "exact", head: true }).in("status", ["ABERTO", "VENCIDO"]).lt("due_date", today),
        // Revenue goal
        supabase.from("executive_kpi_snapshots").select("valor_atual, valor_meta").eq("kpi_name", "receita_mes").order("data_snapshot", { ascending: false }).limit(1),
      ]);

      // ── Calculate values ──
      const cashBalance = cashRes.data?.reduce((s, r) => s + Number(r.current_balance || 0), 0) || 0;
      const revenue = revenueRes.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const expenses = expenseRes.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const monthlyResult = revenue - expenses;
      const prevRevenue = prevRevenueRes.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const prevExpenses = prevExpenseRes.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const prevResult = prevRevenue - prevExpenses;

      const openOrders = openOrdersRes.count || 0;
      const overduePayCount = overduePayRes.count || 0;
      const overduePayAmount = overduePayRes.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const overdueRecCount = overdueRecRes.count || 0;

      const goalActual = goalRes.data?.[0]?.valor_atual || revenue;
      const goalTarget = goalRes.data?.[0]?.valor_meta || 0;
      const goalPct = goalTarget > 0 ? (goalActual / goalTarget) * 100 : 0;

      // ── Trends ──
      const resultTrend: TrendDirection = monthlyResult > prevResult ? "up" : monthlyResult < prevResult ? "down" : "stable";
      const revenueTrend: TrendDirection = revenue > prevRevenue ? "up" : revenue < prevRevenue ? "down" : "stable";

      // ── Health score (0-100) ──
      let healthScore = 100;
      if (cashBalance < 0) healthScore -= 30;
      else if (cashBalance < 10000) healthScore -= 10;
      if (monthlyResult < 0) healthScore -= 25;
      if (overduePayCount > 5) healthScore -= 20;
      else if (overduePayCount > 0) healthScore -= 10;
      if (overdueRecCount > 5) healthScore -= 15;
      else if (overdueRecCount > 0) healthScore -= 5;
      if (goalPct < 50) healthScore -= 10;
      healthScore = Math.max(0, Math.min(100, healthScore));

      const health: HealthStatus = healthScore >= 70 ? "estavel" : healthScore >= 40 ? "atencao" : "risco";

      return {
        cashBalance: {
          label: "Saldo Caixa",
          value: cashBalance,
          formatted: fmt(cashBalance),
          trend: cashBalance > 0 ? "up" : "down",
        },
        monthlyResult: {
          label: "Resultado Mês",
          value: monthlyResult,
          formatted: fmt(monthlyResult),
          trend: resultTrend,
          trendLabel: resultTrend === "up" ? "acima do anterior" : resultTrend === "down" ? "abaixo do anterior" : "estável",
        },
        openOrders: {
          label: "Pedidos Abertos",
          value: openOrders,
          formatted: String(openOrders),
          trend: "stable",
        },
        overduePayables: {
          label: "Contas Vencidas",
          value: overduePayCount,
          formatted: overduePayCount > 0 ? `${overduePayCount} (${fmt(overduePayAmount)})` : "0",
          trend: overduePayCount > 0 ? "down" : "up",
        },
        goalProgress: {
          label: "Meta vs Realizado",
          value: goalPct,
          formatted: `${goalPct.toFixed(0)}%`,
          trend: goalPct >= 80 ? "up" : goalPct >= 50 ? "stable" : "down",
          trendLabel: goalPct >= 100 ? "meta atingida" : `faltam ${(100 - goalPct).toFixed(0)}%`,
        },
        health,
        healthScore,
      };
    },
    refetchInterval: 120000,
    staleTime: 60000,
  });
}
