import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

// ─── Types ───
export interface VarianceDriver {
  category: string;
  label: string;
  amount: number;
  formatted: string;
  pctImpact: number; // % of total variance explained
  direction: "positive" | "negative";
}

export interface TopImpact {
  type: "negative" | "positive" | "unstable";
  label: string;
  description: string;
  amount: number;
  formatted: string;
}

export interface Anomaly {
  id: string;
  title: string;
  description: string;
  severity: "warning" | "critical";
  metric: string;
  deviation: number; // % deviation from average
}

export interface HistoricalComparison {
  metric: string;
  current: number;
  average: number;
  pctChange: number;
  formatted: { current: string; average: string };
  direction: "up" | "down" | "stable";
}

export interface MonthBreakdownItem {
  category: string;
  amount: number;
  formatted: string;
  pctOfTotal: number;
  vsLastMonth: number; // % change
}

export interface ExplainabilityData {
  naturalLanguage: string;
  drivers: VarianceDriver[];
  topImpacts: TopImpact[];
  anomalies: Anomaly[];
  historicalComparisons: HistoricalComparison[];
  monthBreakdown: {
    revenue: MonthBreakdownItem[];
    expenses: MonthBreakdownItem[];
  };
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

export function useExplainabilityLayer() {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const query = useQuery({
    queryKey: ["explainability-layer"],
    queryFn: async (): Promise<ExplainabilityData> => {
      const now = new Date();
      const ms = format(startOfMonth(now), "yyyy-MM-dd");
      const me = format(endOfMonth(now), "yyyy-MM-dd");

      // Build date ranges for last 6 months
      const ranges = Array.from({ length: 6 }, (_, i) => {
        const m = subMonths(now, i);
        return { start: format(startOfMonth(m), "yyyy-MM-dd"), end: format(endOfMonth(m), "yyyy-MM-dd"), idx: i };
      });

      type AR = { data: { amount: number | null; category_name?: string | null; description?: string | null }[] | null };

      // Fetch ledger entries by category for current and previous month
      const ledgerByCat = async (et: string, d1: string, d2: string) =>
        (supabase.from("fin_ledger_entries").select("amount, category_name, description") as any)
          .eq("entry_type", et).gte("competence_date", d1).lte("competence_date", d2) as Promise<AR>;

      const [curCredR, curDebR, prevCredR, prevDebR] = await Promise.all([
        ledgerByCat("credit", ranges[0].start, ranges[0].end),
        ledgerByCat("debit", ranges[0].start, ranges[0].end),
        ledgerByCat("credit", ranges[1].start, ranges[1].end),
        ledgerByCat("debit", ranges[1].start, ranges[1].end),
      ]);

      // Aggregate by category
      const aggByCat = (rows: AR["data"]) => {
        const map: Record<string, number> = {};
        rows?.forEach((r) => {
          const cat = r.category_name || "Sem categoria";
          map[cat] = (map[cat] || 0) + Number(r.amount || 0);
        });
        return map;
      };

      const curRev = aggByCat(curCredR.data);
      const curExp = aggByCat(curDebR.data);
      const prevRev = aggByCat(prevCredR.data);
      const prevExp = aggByCat(prevDebR.data);

      const totalCurRev = Object.values(curRev).reduce((s, v) => s + v, 0);
      const totalCurExp = Object.values(curExp).reduce((s, v) => s + v, 0);
      const totalPrevRev = Object.values(prevRev).reduce((s, v) => s + v, 0);
      const totalPrevExp = Object.values(prevExp).reduce((s, v) => s + v, 0);
      const curResult = totalCurRev - totalCurExp;
      const prevResult = totalPrevRev - totalPrevExp;
      const resultDelta = curResult - prevResult;

      // ── Variance Drivers ──
      const drivers: VarianceDriver[] = [];
      const allCats = new Set([...Object.keys(curRev), ...Object.keys(prevRev), ...Object.keys(curExp), ...Object.keys(prevExp)]);

      allCats.forEach((cat) => {
        const revDelta = (curRev[cat] || 0) - (prevRev[cat] || 0);
        const expDelta = (curExp[cat] || 0) - (prevExp[cat] || 0);
        const netDelta = revDelta - expDelta;
        if (Math.abs(netDelta) > 100) {
          const absTotal = Math.abs(resultDelta) || 1;
          drivers.push({
            category: cat,
            label: netDelta > 0 ? `Melhora em ${cat}` : `Piora em ${cat}`,
            amount: netDelta,
            formatted: fmt(Math.abs(netDelta)),
            pctImpact: Math.round((Math.abs(netDelta) / absTotal) * 100),
            direction: netDelta > 0 ? "positive" : "negative",
          });
        }
      });
      drivers.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

      // ── Top 3 Impacts ──
      const topImpacts: TopImpact[] = [];
      const negDrivers = drivers.filter((d) => d.direction === "negative");
      const posDrivers = drivers.filter((d) => d.direction === "positive");

      if (negDrivers[0]) {
        topImpacts.push({
          type: "negative",
          label: negDrivers[0].category,
          description: `Impacto negativo de ${negDrivers[0].formatted}`,
          amount: negDrivers[0].amount,
          formatted: negDrivers[0].formatted,
        });
      }
      if (posDrivers[0]) {
        topImpacts.push({
          type: "positive",
          label: posDrivers[0].category,
          description: `Impacto positivo de ${posDrivers[0].formatted}`,
          amount: posDrivers[0].amount,
          formatted: posDrivers[0].formatted,
        });
      }

      // Most unstable = highest variance coefficient across months
      // Simplified: category with highest abs pct change
      const allWithChange = drivers.filter((d) => d.pctImpact > 5);
      if (allWithChange.length > 0) {
        const unstable = allWithChange.reduce((a, b) => (a.pctImpact > b.pctImpact ? a : b));
        if (!topImpacts.find((t) => t.label === unstable.category)) {
          topImpacts.push({
            type: "unstable",
            label: unstable.category,
            description: `Variação de ${unstable.pctImpact}% no resultado`,
            amount: unstable.amount,
            formatted: unstable.formatted,
          });
        }
      }

      // ── Historical Comparisons (up to 6 months) ──
      const fetchMonthTotals = async (monthIdx: number) => {
        const r = ranges[monthIdx];
        if (!r) return { rev: 0, exp: 0 };
        const [revR, expR] = await Promise.all([
          ledgerByCat("credit", r.start, r.end),
          ledgerByCat("debit", r.start, r.end),
        ]);
        const rev = revR.data?.reduce((s, row) => s + Number(row.amount || 0), 0) || 0;
        const exp = expR.data?.reduce((s, row) => s + Number(row.amount || 0), 0) || 0;
        return { rev, exp };
      };

      // Fetch months 2-5 for averages (0=current, 1=prev already fetched)
      const [m2, m3, m4, m5] = await Promise.all([
        fetchMonthTotals(2), fetchMonthTotals(3), fetchMonthTotals(4), fetchMonthTotals(5),
      ]);

      const historicalRevs = [totalPrevRev, m2.rev, m3.rev].filter((v) => v > 0);
      const historicalExps = [totalPrevExp, m2.exp, m3.exp].filter((v) => v > 0);
      const avgRev3 = historicalRevs.length > 0 ? historicalRevs.reduce((s, v) => s + v, 0) / historicalRevs.length : 0;
      const avgExp3 = historicalExps.length > 0 ? historicalExps.reduce((s, v) => s + v, 0) / historicalExps.length : 0;
      const avgResult3 = avgRev3 - avgExp3;

      const historicalRevs6 = [totalPrevRev, m2.rev, m3.rev, m4.rev, m5.rev].filter((v) => v > 0);
      const avgRev6 = historicalRevs6.length > 0 ? historicalRevs6.reduce((s, v) => s + v, 0) / historicalRevs6.length : 0;
      const curMargin = totalCurRev > 0 ? ((totalCurRev - totalCurExp) / totalCurRev) * 100 : 0;
      const avgMargin6 = avgRev6 > 0
        ? historicalRevs6.reduce((s, v, i) => {
            const exp = [totalPrevExp, m2.exp, m3.exp, m4.exp, m5.exp].filter((e) => e > 0)[i] || 0;
            return s + ((v - exp) / v) * 100;
          }, 0) / historicalRevs6.length
        : 0;

      const comparisons: HistoricalComparison[] = [];
      if (avgResult3 > 0 || totalCurRev > 0) {
        const pctChg = avgResult3 !== 0 ? ((curResult - avgResult3) / Math.abs(avgResult3)) * 100 : 0;
        comparisons.push({
          metric: "Resultado vs Média 3M",
          current: curResult,
          average: avgResult3,
          pctChange: pctChg,
          formatted: { current: fmt(curResult), average: fmt(avgResult3) },
          direction: pctChg > 2 ? "up" : pctChg < -2 ? "down" : "stable",
        });
      }
      if (avgMargin6 > 0 || curMargin > 0) {
        const pctChg = avgMargin6 !== 0 ? curMargin - avgMargin6 : 0;
        comparisons.push({
          metric: "Margem vs Média 6M",
          current: curMargin,
          average: avgMargin6,
          pctChange: pctChg,
          formatted: { current: `${curMargin.toFixed(1)}%`, average: `${avgMargin6.toFixed(1)}%` },
          direction: pctChg > 1 ? "up" : pctChg < -1 ? "down" : "stable",
        });
      }
      if (avgRev6 > 0 || totalCurRev > 0) {
        const pctChg = avgRev6 !== 0 ? ((totalCurRev - avgRev6) / avgRev6) * 100 : 0;
        comparisons.push({
          metric: "Receita vs Tendência",
          current: totalCurRev,
          average: avgRev6,
          pctChange: pctChg,
          formatted: { current: fmt(totalCurRev), average: fmt(avgRev6) },
          direction: pctChg > 2 ? "up" : pctChg < -2 ? "down" : "stable",
        });
      }

      // ── Anomaly Detection (>2 std-dev from 3-month average) ──
      const anomalies: Anomaly[] = [];
      const allExpCats = new Set([...Object.keys(curExp), ...Object.keys(prevExp)]);

      // Simple anomaly: any expense category >50% above previous month
      allExpCats.forEach((cat) => {
        const cur = curExp[cat] || 0;
        const prev = prevExp[cat] || 0;
        if (prev > 0 && cur > prev * 1.5 && cur > 500) {
          const dev = ((cur - prev) / prev) * 100;
          anomalies.push({
            id: `anom-exp-${cat}`,
            title: `Despesa fora do padrão: ${cat}`,
            description: `${fmt(cur)} vs ${fmt(prev)} no mês anterior (+${dev.toFixed(0)}%)`,
            severity: dev > 100 ? "critical" : "warning",
            metric: cat,
            deviation: dev,
          });
        }
      });

      // Revenue drop anomaly
      if (totalPrevRev > 0 && totalCurRev < totalPrevRev * 0.7) {
        const dev = ((totalPrevRev - totalCurRev) / totalPrevRev) * 100;
        anomalies.push({
          id: "anom-rev-drop",
          title: "Queda abrupta de receita",
          description: `Receita caiu ${dev.toFixed(0)}% vs mês anterior`,
          severity: dev > 40 ? "critical" : "warning",
          metric: "Receita",
          deviation: dev,
        });
      }

      anomalies.sort((a, b) => b.deviation - a.deviation);

      // ── Month Breakdown ──
      const revBreakdown: MonthBreakdownItem[] = Object.entries(curRev)
        .map(([cat, amt]) => ({
          category: cat,
          amount: amt,
          formatted: fmt(amt),
          pctOfTotal: totalCurRev > 0 ? (amt / totalCurRev) * 100 : 0,
          vsLastMonth: prevRev[cat] ? ((amt - prevRev[cat]) / prevRev[cat]) * 100 : 0,
        }))
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

      const expBreakdown: MonthBreakdownItem[] = Object.entries(curExp)
        .map(([cat, amt]) => ({
          category: cat,
          amount: amt,
          formatted: fmt(amt),
          pctOfTotal: totalCurExp > 0 ? (amt / totalCurExp) * 100 : 0,
          vsLastMonth: prevExp[cat] ? ((amt - prevExp[cat]) / prevExp[cat]) * 100 : 0,
        }))
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

      // ── Natural Language Explanation ──
      const parts: string[] = [];
      if (resultDelta < 0) {
        parts.push("Resultado caiu");
        if (negDrivers.length > 0) {
          const top2 = negDrivers.slice(0, 2).map((d) => d.category.toLowerCase());
          parts.push(`devido a ${top2.join(" e ")}`);
        }
      } else if (resultDelta > 0) {
        parts.push("Resultado melhorou");
        if (posDrivers.length > 0) {
          const top2 = posDrivers.slice(0, 2).map((d) => d.category.toLowerCase());
          parts.push(`impulsionado por ${top2.join(" e ")}`);
        }
      } else {
        parts.push("Resultado estável comparado ao mês anterior");
      }
      if (anomalies.length > 0) {
        parts.push(`— ${anomalies.length} anomalia(s) detectada(s)`);
      }
      const naturalLanguage = parts.join(" ") + ".";

      return {
        naturalLanguage,
        drivers: drivers.slice(0, 8),
        topImpacts: topImpacts.slice(0, 3),
        anomalies: anomalies.slice(0, 5),
        historicalComparisons: comparisons,
        monthBreakdown: { revenue: revBreakdown.slice(0, 10), expenses: expBreakdown.slice(0, 10) },
      };
    },
    refetchInterval: 300000,
    staleTime: 120000,
  });

  return { ...query, showBreakdown, setShowBreakdown };
}
