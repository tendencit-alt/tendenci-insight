import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, addDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

// ─── Types ───
export type RiskLevel = "baixo" | "moderado" | "alto";
export type TrendSignal = "acelerando" | "desacelerando" | "estabilizando" | "comprimindo";

export interface Projection {
  label: string;
  value: number;
  formatted: string;
  isNegative: boolean;
}

export interface TrendIndicator {
  metric: string;
  signal: TrendSignal;
  description: string;
}

export interface PredictiveAlert {
  id: string;
  title: string;
  description: string;
  severity: "warning" | "danger";
}

export interface PredictiveData {
  projections: {
    cash7d: Projection;
    cash30d: Projection;
    monthResult: Projection;
    goalPct: Projection;
  };
  riskLevel: RiskLevel;
  riskScore: number; // 0-100 (lower = more risk)
  trends: TrendIndicator[];
  alerts: PredictiveAlert[];
  healthScore: number; // 0-100
}

export interface SimulatorResult {
  currentResult: number;
  simulatedResult: number;
  delta: number;
  formatted: string;
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function usePredictiveLayer() {
  return useQuery({
    queryKey: ["predictive-layer"],
    queryFn: async (): Promise<PredictiveData> => {
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const d7 = format(addDays(now, 7), "yyyy-MM-dd");
      const d30 = format(addDays(now, 30), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
      const prevMS = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const prevME = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const prev2MS = format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd");
      const prev2ME = format(endOfMonth(subMonths(now, 2)), "yyyy-MM-dd");

      // Current cash balance
      const cashRes = await supabase
        .from("fin_bank_accounts")
        .select("opening_balance")
        .eq("active", true) as unknown as { data: { opening_balance: number | null }[] | null };
      const currentCash = cashRes.data?.reduce((s, r) => s + Number(r.opening_balance || 0), 0) || 0;

      // Upcoming payables (7d and 30d)
      const pay7Res = await supabase
        .from("fin_payables")
        .select("amount")
        .in("status", ["ABERTO", "CONFIRMADO"])
        .gte("due_date", today)
        .lte("due_date", d7);
      const pay7 = pay7Res.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;

      const pay30Res = await supabase
        .from("fin_payables")
        .select("amount")
        .in("status", ["ABERTO", "CONFIRMADO"])
        .gte("due_date", today)
        .lte("due_date", d30);
      const pay30 = pay30Res.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;

      // Upcoming receivables (7d and 30d)
      const rec7Res = await supabase
        .from("fin_receivables")
        .select("amount")
        .in("status", ["ABERTO", "CONFIRMADO"])
        .gte("due_date", today)
        .lte("due_date", d7);
      const rec7 = rec7Res.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;

      const rec30Res = await supabase
        .from("fin_receivables")
        .select("amount")
        .in("status", ["ABERTO", "CONFIRMADO"])
        .gte("due_date", today)
        .lte("due_date", d30);
      const rec30 = rec30Res.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;

      // Projected cash
      const cash7d = currentCash + rec7 - pay7;
      const cash30d = currentCash + rec30 - pay30;

      // Revenue & expenses for current, prev, prev-2 months (for trends)
      const ledgerQ = (et: string, d1: string, d2: string) =>
        (supabase.from("fin_ledger_entries").select("amount") as any)
          .eq("entry_type", et).gte("competence_date", d1).lte("competence_date", d2);

      type AR = { data: { amount: number | null }[] | null };
      const [curRevR, curExpR, prevRevR, prevExpR, prev2RevR, prev2ExpR] = await Promise.all([
        ledgerQ("credit", monthStart, monthEnd) as Promise<AR>,
        ledgerQ("debit", monthStart, monthEnd) as Promise<AR>,
        ledgerQ("credit", prevMS, prevME) as Promise<AR>,
        ledgerQ("debit", prevMS, prevME) as Promise<AR>,
        ledgerQ("credit", prev2MS, prev2ME) as Promise<AR>,
        ledgerQ("debit", prev2MS, prev2ME) as Promise<AR>,
      ]);

      const curRev = curRevR.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const curExp = curExpR.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const prevRev = prevRevR.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const prevExp = prevExpR.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const prev2Rev = prev2RevR.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const prev2Exp = prev2ExpR.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;

      const curResult = curRev - curExp;
      const prevResult = prevRev - prevExp;
      const curMargin = curRev > 0 ? ((curRev - curExp) / curRev) * 100 : 0;
      const prevMargin = prevRev > 0 ? ((prevRev - prevExp) / prevRev) * 100 : 0;

      // Day-weighted projection for month result
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const projectedMonthResult = dayOfMonth > 0 ? (curResult / dayOfMonth) * daysInMonth : 0;

      // Goal % (compare to prev month)
      const goalPct = prevRev > 0 ? (curRev / prevRev) * 100 : 0;

      // Overdue counts
      const overduePayRes = await supabase
        .from("fin_payables")
        .select("id", { count: "exact", head: true })
        .in("status", ["ABERTO", "VENCIDO"])
        .lt("due_date", today);
      const overdueRecRes = await supabase
        .from("fin_receivables")
        .select("id", { count: "exact", head: true })
        .in("status", ["ABERTO", "VENCIDO"])
        .lt("due_date", today);
      const overduePay = overduePayRes.count || 0;
      const overdueRec = overdueRecRes.count || 0;

      // ── Risk Score (100 = low risk, 0 = high risk) ──
      let riskScore = 100;
      if (cash7d < 0) riskScore -= 30;
      else if (cash7d < 5000) riskScore -= 15;
      if (cash30d < 0) riskScore -= 20;
      if (overduePay > 5) riskScore -= 15;
      else if (overduePay > 0) riskScore -= 5;
      if (overdueRec > 5) riskScore -= 10;
      else if (overdueRec > 0) riskScore -= 3;
      if (pay30 > rec30 * 1.3) riskScore -= 10;
      riskScore = Math.max(0, Math.min(100, riskScore));
      const riskLevel: RiskLevel = riskScore >= 70 ? "baixo" : riskScore >= 40 ? "moderado" : "alto";

      // ── Trends ──
      const trends: TrendIndicator[] = [];
      // Revenue trend (3-month)
      if (prev2Rev > 0 && prevRev > 0) {
        const prevGrowth = (prevRev - prev2Rev) / prev2Rev;
        const curGrowth = prevRev > 0 ? (curRev - prevRev) / prevRev : 0;
        if (curGrowth > prevGrowth + 0.05) {
          trends.push({ metric: "Receita", signal: "acelerando", description: "Crescimento acelerado vs meses anteriores" });
        } else if (curGrowth < prevGrowth - 0.05) {
          trends.push({ metric: "Receita", signal: "desacelerando", description: "Crescimento desacelerando" });
        }
      }
      // Margin trend
      if (prevMargin > 0 && curMargin < prevMargin - 2) {
        trends.push({ metric: "Margem", signal: "comprimindo", description: `${curMargin.toFixed(1)}% vs ${prevMargin.toFixed(1)}% anterior` });
      }
      // Cash trend
      if (Math.abs(cash30d - currentCash) < currentCash * 0.05 && currentCash > 0) {
        trends.push({ metric: "Caixa", signal: "estabilizando", description: "Saldo projetado estável" });
      }

      // ── Predictive Alerts ──
      const alerts: PredictiveAlert[] = [];
      if (cash7d < 0) {
        alerts.push({ id: "cash-neg-7d", title: "Caixa ficará negativo em 7 dias", description: `Saldo projetado: ${fmt(cash7d)}`, severity: "danger" });
      } else if (cash30d < 0) {
        alerts.push({ id: "cash-neg-30d", title: "Caixa ficará negativo em 30 dias", description: `Saldo projetado: ${fmt(cash30d)}`, severity: "warning" });
      }
      if (goalPct < 60 && dayOfMonth > 15) {
        alerts.push({ id: "goal-miss", title: "Meta não será atingida", description: `Apenas ${goalPct.toFixed(0)}% do mês anterior alcançado`, severity: dayOfMonth > 20 ? "danger" : "warning" });
      }
      if (curMargin < 10 && curRev > 0) {
        alerts.push({ id: "margin-low", title: "Margem abaixo do objetivo", description: `Margem atual: ${curMargin.toFixed(1)}%`, severity: curMargin < 5 ? "danger" : "warning" });
      }

      // ── Health Score (0-100) ──
      let healthScore = 100;
      if (currentCash < 0) healthScore -= 25;
      else if (currentCash < 10000) healthScore -= 10;
      if (curResult < 0) healthScore -= 20;
      if (overduePay > 5) healthScore -= 15;
      else if (overduePay > 0) healthScore -= 5;
      if (overdueRec > 3) healthScore -= 10;
      if (goalPct < 50) healthScore -= 10;
      if (alerts.length > 0) healthScore -= alerts.length * 5;
      healthScore = Math.max(0, Math.min(100, healthScore));

      return {
        projections: {
          cash7d: { label: "Caixa 7 dias", value: cash7d, formatted: fmt(cash7d), isNegative: cash7d < 0 },
          cash30d: { label: "Caixa 30 dias", value: cash30d, formatted: fmt(cash30d), isNegative: cash30d < 0 },
          monthResult: { label: "Resultado Projetado", value: projectedMonthResult, formatted: fmt(projectedMonthResult), isNegative: projectedMonthResult < 0 },
          goalPct: { label: "Meta Prevista", value: goalPct, formatted: `${goalPct.toFixed(0)}%`, isNegative: goalPct < 60 },
        },
        riskLevel,
        riskScore,
        trends,
        alerts,
        healthScore,
      };
    },
    refetchInterval: 300000,
    staleTime: 120000,
  });
}

// ── Quick Executive Simulator (client-side only) ──
export function useSimulator() {
  const [revenueChange, setRevenueChange] = useState(0); // % change
  const [expenseChange, setExpenseChange] = useState(0); // % change

  const simulate = (currentRevenue: number, currentExpenses: number): SimulatorResult => {
    const newRevenue = currentRevenue * (1 + revenueChange / 100);
    const newExpenses = currentExpenses * (1 + expenseChange / 100);
    const currentResult = currentRevenue - currentExpenses;
    const simulatedResult = newRevenue - newExpenses;
    const delta = simulatedResult - currentResult;
    return {
      currentResult,
      simulatedResult,
      delta,
      formatted: fmt(simulatedResult),
    };
  };

  return { revenueChange, setRevenueChange, expenseChange, setExpenseChange, simulate };
}
