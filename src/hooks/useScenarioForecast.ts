import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { format, addDays, startOfMonth, endOfMonth } from "date-fns";

// ─── Types ───
export type ScenarioType = "conservador" | "realista" | "agressivo";

export interface CashProjection {
  label: string;
  days: number;
  value: number;
  formatted: string;
  isNegative: boolean;
}

export interface MonthForecast {
  revenueRealized: number;
  expenseRealized: number;
  revenuePending: number;
  expensePending: number;
  projectedResult: number;
  projectedMargin: number;
  dayOfMonth: number;
  daysInMonth: number;
}

export interface ScenarioResult {
  type: ScenarioType;
  factor: number;
  projectedRevenue: number;
  projectedExpense: number;
  projectedResult: number;
  projectedMargin: number;
  cashPosition30d: number;
}

export interface CostImpactSimulation {
  currentMargin: number;
  currentEbitda: number;
  currentResult: number;
  simulatedMargin: number;
  simulatedEbitda: number;
  simulatedResult: number;
  deltaMargin: number;
  deltaEbitda: number;
  deltaResult: number;
}

export interface LoanSimulation {
  monthlyInterest: number;
  monthlyCashImpact: number;
  annualResultImpact: number;
}

export interface RevenueTargetCalc {
  requiredRevenue: number;
  currentRevenue: number;
  gap: number;
  feasible: boolean;
}

export interface DelayImpact {
  overdueCount: number;
  overdueAmount: number;
  adjustedCash7d: number;
  adjustedCash30d: number;
}

export interface ScenarioForecastData {
  monthForecast: MonthForecast;
  cashProjections: CashProjection[];
  scenarios: ScenarioResult[];
  delayImpact: DelayImpact;
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const SCENARIO_FACTORS: Record<ScenarioType, { revMul: number; expMul: number }> = {
  conservador: { revMul: 0.85, expMul: 1.10 },
  realista: { revMul: 1.0, expMul: 1.0 },
  agressivo: { revMul: 1.20, expMul: 0.95 },
};

export function useScenarioForecast() {
  return useQuery({
    queryKey: ["scenario-forecast-engine"],
    queryFn: async (): Promise<ScenarioForecastData> => {
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const ms = format(startOfMonth(now), "yyyy-MM-dd");
      const me = format(endOfMonth(now), "yyyy-MM-dd");
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      // ── Parallel data fetches ──
      const [
        cashRes, recPendRes, payPendRes,
        revRealRes, expRealRes,
        overdueRecRes,
      ] = await Promise.all([
        supabase.from("fin_bank_accounts").select("opening_balance").eq("active", true),
        supabase.from("fin_receivables").select("amount").in("status", ["ABERTO", "CONFIRMADO"]).gte("due_date", today),
        supabase.from("fin_payables").select("amount").in("status", ["ABERTO", "CONFIRMADO"]).gte("due_date", today),
        (supabase.from("fin_ledger_entries").select("amount") as any).eq("entry_type", "credit").gte("competence_date", ms).lte("competence_date", me),
        (supabase.from("fin_ledger_entries").select("amount") as any).eq("entry_type", "debit").gte("competence_date", ms).lte("competence_date", me),
        supabase.from("fin_receivables").select("amount").in("status", ["ABERTO", "VENCIDO"]).lt("due_date", today),
      ]);

      const sum = (d: any) => (d?.data || []).reduce((s: number, r: any) => s + Number(r.amount || r.opening_balance || 0), 0);

      const currentCash = sum(cashRes);
      const revenuePending = sum(recPendRes);
      const expensePending = sum(payPendRes);
      const revenueRealized = sum(revRealRes);
      const expenseRealized = sum(expRealRes);
      const overdueAmount = sum(overdueRecRes);
      const overdueCount = overdueRecRes.data?.length || 0;

      // ── Month Forecast ──
      const resultSoFar = revenueRealized - expenseRealized;
      const projectedResult = dayOfMonth > 0 ? (resultSoFar / dayOfMonth) * daysInMonth : 0;
      const projectedRevenue = dayOfMonth > 0 ? (revenueRealized / dayOfMonth) * daysInMonth : 0;
      const projectedMargin = projectedRevenue > 0 ? ((projectedResult / projectedRevenue) * 100) : 0;

      const monthForecast: MonthForecast = {
        revenueRealized, expenseRealized, revenuePending, expensePending,
        projectedResult, projectedMargin, dayOfMonth, daysInMonth,
      };

      // ── Cash Projections (7, 15, 30, 60 days) ──
      const horizons = [7, 15, 30, 60];
      // Fetch payables/receivables for each horizon
      const cashProjections: CashProjection[] = [];
      for (const d of horizons) {
        const endDate = format(addDays(now, d), "yyyy-MM-dd");
        const [recH, payH] = await Promise.all([
          supabase.from("fin_receivables").select("amount").in("status", ["ABERTO", "CONFIRMADO"]).gte("due_date", today).lte("due_date", endDate),
          supabase.from("fin_payables").select("amount").in("status", ["ABERTO", "CONFIRMADO"]).gte("due_date", today).lte("due_date", endDate),
        ]);
        const projected = currentCash + sum(recH) - sum(payH);
        cashProjections.push({
          label: `${d} dias`,
          days: d,
          value: projected,
          formatted: fmt(projected),
          isNegative: projected < 0,
        });
      }

      // ── Scenarios ──
      const scenarios: ScenarioResult[] = (["conservador", "realista", "agressivo"] as ScenarioType[]).map(type => {
        const f = SCENARIO_FACTORS[type];
        const sRev = projectedRevenue * f.revMul;
        const sExp = (dayOfMonth > 0 ? (expenseRealized / dayOfMonth) * daysInMonth : 0) * f.expMul;
        const sResult = sRev - sExp;
        const sMargin = sRev > 0 ? (sResult / sRev) * 100 : 0;
        const cp30 = cashProjections.find(c => c.days === 30);
        const sCash = (cp30?.value || currentCash) * (type === "conservador" ? 0.9 : type === "agressivo" ? 1.1 : 1.0);
        return {
          type,
          factor: f.revMul,
          projectedRevenue: sRev,
          projectedExpense: sExp,
          projectedResult: sResult,
          projectedMargin: Math.round(sMargin * 100) / 100,
          cashPosition30d: sCash,
        };
      });

      // ── Delay Impact ──
      const cp7 = cashProjections.find(c => c.days === 7);
      const cp30 = cashProjections.find(c => c.days === 30);
      const delayImpact: DelayImpact = {
        overdueCount,
        overdueAmount,
        adjustedCash7d: (cp7?.value || currentCash) - overdueAmount,
        adjustedCash30d: (cp30?.value || currentCash) - overdueAmount,
      };

      return { monthForecast, cashProjections, scenarios, delayImpact };
    },
    refetchInterval: 300000,
    staleTime: 120000,
  });
}

// ── Client-side simulators ──
export function useCostImpactSimulator() {
  const [commissionDelta, setCommissionDelta] = useState(0);
  const [freightDelta, setFreightDelta] = useState(0);
  const [materialDelta, setMaterialDelta] = useState(0);
  const [variableDelta, setVariableDelta] = useState(0);

  const simulate = (currentRevenue: number, currentExpenses: number, currentVariableCosts: number): CostImpactSimulation => {
    const totalDeltaPct = (commissionDelta + freightDelta + materialDelta + variableDelta) / 100;
    const newVariableCosts = currentVariableCosts * (1 + totalDeltaPct);
    const currentMargin = currentRevenue - currentVariableCosts;
    const simulatedMargin = currentRevenue - newVariableCosts;
    const fixedCosts = currentExpenses - currentVariableCosts;
    const currentEbitda = currentMargin - fixedCosts;
    const simulatedEbitda = simulatedMargin - fixedCosts;
    return {
      currentMargin, currentEbitda, currentResult: currentEbitda,
      simulatedMargin, simulatedEbitda, simulatedResult: simulatedEbitda,
      deltaMargin: simulatedMargin - currentMargin,
      deltaEbitda: simulatedEbitda - currentEbitda,
      deltaResult: simulatedEbitda - currentEbitda,
    };
  };

  return {
    commissionDelta, setCommissionDelta,
    freightDelta, setFreightDelta,
    materialDelta, setMaterialDelta,
    variableDelta, setVariableDelta,
    simulate,
  };
}

export function useLoanSimulator() {
  const [principal, setPrincipal] = useState(0);
  const [annualRate, setAnnualRate] = useState(0);
  const [termMonths, setTermMonths] = useState(12);

  const result = useMemo((): LoanSimulation => {
    const monthlyRate = annualRate / 12 / 100;
    const monthlyInterest = principal * monthlyRate;
    const monthlyPayment = termMonths > 0 && monthlyRate > 0
      ? principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1)
      : termMonths > 0 ? principal / termMonths : 0;
    return {
      monthlyInterest: Math.round(monthlyInterest * 100) / 100,
      monthlyCashImpact: Math.round(monthlyPayment * 100) / 100,
      annualResultImpact: Math.round(monthlyInterest * 12 * 100) / 100,
    };
  }, [principal, annualRate, termMonths]);

  return { principal, setPrincipal, annualRate, setAnnualRate, termMonths, setTermMonths, result };
}

export function useRevenueTargetCalc() {
  const [targetProfit, setTargetProfit] = useState(0);

  const calculate = (currentRevenue: number, currentExpenses: number, marginPct: number): RevenueTargetCalc => {
    const effectiveMargin = marginPct > 0 ? marginPct / 100 : 0.3;
    const requiredRevenue = effectiveMargin > 0 ? (currentExpenses + targetProfit) / effectiveMargin : 0;
    const gap = requiredRevenue - currentRevenue;
    return {
      requiredRevenue: Math.round(requiredRevenue * 100) / 100,
      currentRevenue,
      gap: Math.round(gap * 100) / 100,
      feasible: gap <= currentRevenue * 0.5,
    };
  };

  return { targetProfit, setTargetProfit, calculate };
}
