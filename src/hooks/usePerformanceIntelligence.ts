import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

// ─── Types ───
export type DiagnosticSeverity = "positivo" | "neutro" | "atencao" | "critico";

export interface DiagnosticItem {
  id: string;
  title: string;
  description: string;
  severity: DiagnosticSeverity;
  value?: string;
  delta?: number; // % change
  category: "margem" | "caixa" | "crescimento" | "risco" | "eficiencia";
}

export interface CostRankItem {
  name: string;
  amount: number;
  pctOfTotal: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: "alto" | "medio" | "baixo";
  category: string;
}

export interface PerformanceData {
  diagnostics: DiagnosticItem[];
  costRanking: CostRankItem[];
  recommendations: Recommendation[];
  overallScore: number; // 0-100
  marginHealth: number;
  cashHealth: number;
  growthHealth: number;
  riskLevel: DiagnosticSeverity;
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

export function usePerformanceIntelligence() {
  return useQuery({
    queryKey: ["performance-intelligence"],
    queryFn: async (): Promise<PerformanceData> => {
      const now = new Date();
      const ms = format(startOfMonth(now), "yyyy-MM-dd");
      const me = format(endOfMonth(now), "yyyy-MM-dd");
      const pms = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const pme = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const p2ms = format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd");
      const p2me = format(endOfMonth(subMonths(now, 2)), "yyyy-MM-dd");
      const today = format(now, "yyyy-MM-dd");

      type AR = { data: { amount: number | null }[] | null };
      const ledgerQ = (et: string, d1: string, d2: string) =>
        (supabase.from("fin_ledger_entries").select("amount") as any)
          .eq("entry_type", et).gte("competence_date", d1).lte("competence_date", d2) as Promise<AR>;

      // ── Parallel fetches ──
      const [
        curRevR, curExpR, prevRevR, prevExpR, prev2RevR, prev2ExpR,
        cashRes, overdueRecRes, overduePayRes,
        topExpRes,
      ] = await Promise.all([
        ledgerQ("credit", ms, me),
        ledgerQ("debit", ms, me),
        ledgerQ("credit", pms, pme),
        ledgerQ("debit", pms, pme),
        ledgerQ("credit", p2ms, p2me),
        ledgerQ("debit", p2ms, p2me),
        supabase.from("fin_bank_accounts").select("opening_balance").eq("active", true),
        supabase.from("fin_receivables").select("amount").in("status", ["ABERTO", "VENCIDO"]).lt("due_date", today),
        supabase.from("fin_payables").select("amount").in("status", ["ABERTO", "VENCIDO"]).lt("due_date", today),
        (supabase.from("fin_ledger_entries").select("description, amount") as any)
          .eq("entry_type", "debit").gte("competence_date", ms).lte("competence_date", me)
          .order("amount", { ascending: false }).limit(50),
      ]);

      const sum = (d: AR) => (d?.data || []).reduce((s, r) => s + Number(r.amount || 0), 0);
      const sumB = (d: any) => (d?.data || []).reduce((s: number, r: any) => s + Number(r.opening_balance || 0), 0);

      const curRev = sum(curRevR);
      const curExp = sum(curExpR);
      const prevRev = sum(prevRevR);
      const prevExp = sum(prevExpR);
      const prev2Rev = sum(prev2RevR);
      const _prev2Exp = sum(prev2ExpR);
      const currentCash = sumB(cashRes);
      const overdueRec = sum(overdueRecRes as any);
      const overdueRecCount = overdueRecRes.data?.length || 0;
      const overduePay = sum(overduePayRes as any);

      const curResult = curRev - curExp;
      const prevResult = prevRev - prevExp;
      const curMargin = curRev > 0 ? (curResult / curRev) * 100 : 0;
      const prevMargin = prevRev > 0 ? (prevResult / prevRev) * 100 : 0;
      const revGrowth = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;
      const prevRevGrowth = prev2Rev > 0 ? ((prevRev - prev2Rev) / prev2Rev) * 100 : 0;

      const diagnostics: DiagnosticItem[] = [];

      // ── Margin Diagnostics ──
      const marginDelta = curMargin - prevMargin;
      if (marginDelta < -5) {
        diagnostics.push({
          id: "margin-drop", title: "Margem em queda significativa",
          description: `Margem caiu de ${prevMargin.toFixed(1)}% para ${curMargin.toFixed(1)}%. Verifique custos variáveis.`,
          severity: "critico", value: `${curMargin.toFixed(1)}%`, delta: marginDelta, category: "margem",
        });
      } else if (marginDelta < -2) {
        diagnostics.push({
          id: "margin-pressure", title: "Margem sob pressão",
          description: `Margem recuou ${Math.abs(marginDelta).toFixed(1)}pp vs mês anterior.`,
          severity: "atencao", value: `${curMargin.toFixed(1)}%`, delta: marginDelta, category: "margem",
        });
      } else if (marginDelta > 2) {
        diagnostics.push({
          id: "margin-improve", title: "Margem em melhoria",
          description: `Margem subiu ${marginDelta.toFixed(1)}pp vs mês anterior.`,
          severity: "positivo", value: `${curMargin.toFixed(1)}%`, delta: marginDelta, category: "margem",
        });
      }

      // ── Cash Diagnostics ──
      if (overdueRecCount > 0) {
        diagnostics.push({
          id: "cash-overdue-rec", title: `${overdueRecCount} recebíveis em atraso`,
          description: `Total de ${fmt(overdueRec)} em atraso impacta liquidez.`,
          severity: overdueRec > currentCash * 0.3 ? "critico" : "atencao",
          value: fmt(overdueRec), category: "caixa",
        });
      }
      if (currentCash < 0) {
        diagnostics.push({
          id: "cash-negative", title: "Saldo de caixa negativo",
          description: `Saldo atual: ${fmt(currentCash)}. Ação imediata necessária.`,
          severity: "critico", value: fmt(currentCash), category: "caixa",
        });
      } else if (curExp > 0 && currentCash < curExp * 0.5) {
        diagnostics.push({
          id: "cash-low-runway", title: "Caixa abaixo de 15 dias de operação",
          description: `Saldo ${fmt(currentCash)} cobre menos de meio mês de despesas.`,
          severity: "atencao", value: fmt(currentCash), category: "caixa",
        });
      }

      // ── Growth Diagnostics ──
      if (revGrowth > 10) {
        diagnostics.push({
          id: "growth-strong", title: "Crescimento forte de receita",
          description: `Receita cresceu ${revGrowth.toFixed(1)}% vs mês anterior.`,
          severity: "positivo", value: pct(revGrowth), delta: revGrowth, category: "crescimento",
        });
      } else if (revGrowth < -10) {
        diagnostics.push({
          id: "growth-decline", title: "Queda significativa de receita",
          description: `Receita caiu ${Math.abs(revGrowth).toFixed(1)}% vs mês anterior.`,
          severity: "critico", value: pct(revGrowth), delta: revGrowth, category: "crescimento",
        });
      }
      // Acceleration
      if (prevRevGrowth !== 0 && revGrowth > prevRevGrowth + 5) {
        diagnostics.push({
          id: "growth-accel", title: "Crescimento acelerando",
          description: `Crescimento de ${revGrowth.toFixed(1)}% vs ${prevRevGrowth.toFixed(1)}% anterior.`,
          severity: "positivo", category: "crescimento",
        });
      }

      // ── Risk Diagnostics ──
      let riskScore = 100;
      if (currentCash < 0) riskScore -= 30;
      else if (curExp > 0 && currentCash < curExp) riskScore -= 15;
      if (curMargin < 5) riskScore -= 20;
      else if (curMargin < 10) riskScore -= 10;
      if (overdueRec > curRev * 0.2) riskScore -= 15;
      if (revGrowth < -15) riskScore -= 15;
      if (overduePay > 0) riskScore -= 5;
      riskScore = Math.max(0, Math.min(100, riskScore));

      if (riskScore < 40) {
        diagnostics.push({
          id: "risk-high", title: "Risco financeiro elevado",
          description: "Múltiplos indicadores negativos detectados. Revisão urgente recomendada.",
          severity: "critico", value: `Score: ${riskScore}`, category: "risco",
        });
      } else if (riskScore < 70) {
        diagnostics.push({
          id: "risk-moderate", title: "Risco financeiro moderado",
          description: "Alguns indicadores requerem atenção.",
          severity: "atencao", value: `Score: ${riskScore}`, category: "risco",
        });
      }

      // ── Cost Ranking ──
      const expEntries: { description: string; amount: number }[] = topExpRes.data || [];
      const grouped = new Map<string, number>();
      for (const e of expEntries) {
        const key = (e.description || "Sem descrição").substring(0, 40);
        grouped.set(key, (grouped.get(key) || 0) + Number(e.amount || 0));
      }
      const costRanking: CostRankItem[] = [...grouped.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({
          name,
          amount,
          pctOfTotal: curExp > 0 ? (amount / curExp) * 100 : 0,
        }));

      // ── Recommendations ──
      const recommendations: Recommendation[] = [];
      if (curMargin < 15 && curExp > 0) {
        recommendations.push({
          id: "rec-reduce-variable", title: "Revisar custos variáveis",
          description: "Margem abaixo de 15%. Analise comissões, fretes e antecipações.",
          impact: "alto", category: "margem",
        });
      }
      if (overdueRecCount > 3) {
        recommendations.push({
          id: "rec-collection", title: "Intensificar cobrança",
          description: `${overdueRecCount} títulos em atraso totalizam ${fmt(overdueRec)}.`,
          impact: "alto", category: "caixa",
        });
      }
      if (revGrowth < 0 && curRev > 0) {
        recommendations.push({
          id: "rec-revenue-action", title: "Ações para recuperar faturamento",
          description: `Receita em queda de ${Math.abs(revGrowth).toFixed(1)}%. Avalie promoções ou prospecção.`,
          impact: "medio", category: "crescimento",
        });
      }
      if (curExp > prevExp * 1.15 && prevExp > 0) {
        recommendations.push({
          id: "rec-expense-control", title: "Controlar despesas operacionais",
          description: `Despesas cresceram ${(((curExp - prevExp) / prevExp) * 100).toFixed(1)}% vs mês anterior.`,
          impact: "medio", category: "margem",
        });
      }
      if (currentCash > 0 && curExp > 0 && currentCash / curExp < 1.5) {
        recommendations.push({
          id: "rec-cash-reserve", title: "Aumentar reserva de caixa",
          description: "Runway abaixo de 45 dias. Considere reduzir antecipações ou postergar investimentos.",
          impact: "alto", category: "caixa",
        });
      }

      // ── Health Scores ──
      const marginHealth = Math.min(100, Math.max(0, curMargin * 4));
      const cashHealth = Math.min(100, Math.max(0, riskScore));
      const growthHealth = Math.min(100, Math.max(0, 50 + revGrowth * 2));
      const overallScore = Math.round((marginHealth + cashHealth + growthHealth) / 3);
      const riskLevel: DiagnosticSeverity = riskScore >= 70 ? "positivo" : riskScore >= 40 ? "atencao" : "critico";

      return {
        diagnostics, costRanking, recommendations,
        overallScore, marginHealth, cashHealth, growthHealth, riskLevel,
      };
    },
    refetchInterval: 300000,
    staleTime: 120000,
  });
}
