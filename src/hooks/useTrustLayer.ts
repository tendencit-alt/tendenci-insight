import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───
export type ConfidenceLevel = "alta" | "média" | "baixa";
export type MaturityLevel = "básico" | "intermediário" | "avançado";

export interface TrustMetric {
  label: string;
  value: number; // 0-100 %
  level: ConfidenceLevel;
}

export interface FreshnessItem {
  label: string;
  lastUpdate: string | null; // ISO date
  ageLabel: string; // "há 2h", "há 3 dias"
  fresh: boolean;
}

export interface KpiConfidence {
  kpi: string;
  level: ConfidenceLevel;
  reason: string;
}

export interface TrustData {
  reconciliation: TrustMetric;
  classification: TrustMetric;
  cadastralQuality: TrustMetric;
  forecastCoverage: TrustMetric;
  maturity: { level: MaturityLevel; score: number };
  freshness: FreshnessItem[];
  kpiConfidence: KpiConfidence[];
  overallScore: number; // 0-100
}

function toLevel(pct: number): ConfidenceLevel {
  return pct >= 80 ? "alta" : pct >= 50 ? "média" : "baixa";
}

function ageLabel(isoDate: string | null): { label: string; fresh: boolean } {
  if (!isoDate) return { label: "Sem dados", fresh: false };
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const hours = diffMs / 3600000;
  if (hours < 1) return { label: `há ${Math.round(hours * 60)}min`, fresh: true };
  if (hours < 24) return { label: `há ${Math.round(hours)}h`, fresh: true };
  const days = Math.round(hours / 24);
  return { label: `há ${days} dia(s)`, fresh: days <= 3 };
}

export function useTrustLayer() {
  return useQuery({
    queryKey: ["trust-layer"],
    queryFn: async (): Promise<TrustData> => {
      // 1. Reconciliation %
      const [totalBankR, reconciledR] = await Promise.all([
        supabase.from("fin_bank_transactions").select("id", { count: "exact", head: true }),
        supabase.from("fin_bank_transactions").select("id", { count: "exact", head: true }).eq("status", "reconciled"),
      ]);
      const totalBank = totalBankR.count || 0;
      const reconciled = reconciledR.count || 0;
      const reconPct = totalBank > 0 ? Math.round((reconciled / totalBank) * 100) : 0;

      // 2. Classification %
      const [totalLedgerR, classifiedR] = await Promise.all([
        supabase.from("fin_ledger_entries").select("id", { count: "exact", head: true }),
        supabase.from("fin_ledger_entries").select("id", { count: "exact", head: true }).not("category_name", "is", null),
      ]);
      const totalLedger = totalLedgerR.count || 0;
      const classified = classifiedR.count || 0;
      const classPct = totalLedger > 0 ? Math.round((classified / totalLedger) * 100) : 0;

      // 3. Cadastral quality - categories, cost centers, projects filled
      const [catCountR, ccCountR, projCountR] = await Promise.all([
        supabase.from("fin_categories").select("id", { count: "exact", head: true }).eq("active", true) as any,
        supabase.from("cost_center_tags").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("operational_projects").select("id", { count: "exact", head: true }) as any,
      ]);
      const catCount = (catCountR as any).count || 0;
      const ccCount = ccCountR.count || 0;
      const projCount = (projCountR as any).count || 0;
      // Score: 33% for having categories, 33% for cost centers, 33% for projects
      let cadastralScore = 0;
      if (catCount >= 5) cadastralScore += 34;
      else if (catCount > 0) cadastralScore += 15;
      if (ccCount >= 3) cadastralScore += 33;
      else if (ccCount > 0) cadastralScore += 15;
      if (projCount >= 1) cadastralScore += 33;
      else cadastralScore += 0;
      cadastralScore = Math.min(100, cadastralScore);

      // 4. Forecast coverage - % of payables/receivables with status CONFIRMADO vs total
      const [totalPayR, confirmedPayR, totalRecR, confirmedRecR] = await Promise.all([
        supabase.from("fin_payables").select("id", { count: "exact", head: true }).in("status", ["ABERTO", "CONFIRMADO", "VENCIDO"]),
        supabase.from("fin_payables").select("id", { count: "exact", head: true }).eq("status", "CONFIRMADO"),
        supabase.from("fin_receivables").select("id", { count: "exact", head: true }).in("status", ["ABERTO", "CONFIRMADO", "VENCIDO"]),
        supabase.from("fin_receivables").select("id", { count: "exact", head: true }).eq("status", "CONFIRMADO"),
      ]);
      const totalForecastBase = (totalPayR.count || 0) + (totalRecR.count || 0);
      const confirmedForecastBase = (confirmedPayR.count || 0) + (confirmedRecR.count || 0);
      const forecastPct = totalForecastBase > 0 ? Math.round((confirmedForecastBase / totalForecastBase) * 100) : 0;

      // 5. Data freshness
      const [lastBankR, lastOrderR, lastLedgerR] = await Promise.all([
        supabase.from("fin_bank_transactions").select("created_at").order("created_at", { ascending: false }).limit(1),
        supabase.from("orders").select("updated_at").order("updated_at", { ascending: false }).limit(1),
        supabase.from("fin_ledger_entries").select("created_at").order("created_at", { ascending: false }).limit(1),
      ]);

      const lastBank = lastBankR.data?.[0]?.created_at || null;
      const lastOrder = (lastOrderR.data as any)?.[0]?.updated_at || null;
      const lastLedger = lastLedgerR.data?.[0]?.created_at || null;

      const bankAge = ageLabel(lastBank);
      const orderAge = ageLabel(lastOrder);
      const ledgerAge = ageLabel(lastLedger);

      const freshness: FreshnessItem[] = [
        { label: "Extratos bancários", lastUpdate: lastBank, ageLabel: bankAge.label, fresh: bankAge.fresh },
        { label: "Pedidos", lastUpdate: lastOrder, ageLabel: orderAge.label, fresh: orderAge.fresh },
        { label: "Lançamentos (DRE)", lastUpdate: lastLedger, ageLabel: ledgerAge.label, fresh: ledgerAge.fresh },
      ];

      // 6. Maturity score
      let maturityScore = 0;
      if (reconPct >= 80) maturityScore += 25;
      else if (reconPct >= 40) maturityScore += 10;
      if (classPct >= 80) maturityScore += 25;
      else if (classPct >= 40) maturityScore += 10;
      if (cadastralScore >= 80) maturityScore += 25;
      else if (cadastralScore >= 40) maturityScore += 10;
      if (forecastPct >= 60) maturityScore += 25;
      else if (forecastPct >= 30) maturityScore += 10;
      const maturityLevel: MaturityLevel = maturityScore >= 75 ? "avançado" : maturityScore >= 40 ? "intermediário" : "básico";

      // 7. KPI confidence
      const kpiConfidence: KpiConfidence[] = [
        {
          kpi: "Caixa Projetado",
          level: toLevel(Math.round((reconPct + forecastPct) / 2)),
          reason: reconPct >= 80 && forecastPct >= 60
            ? "Baseado em dados conciliados e confirmados"
            : reconPct < 50
            ? "Conciliação bancária incompleta"
            : "Poucos títulos confirmados",
        },
        {
          kpi: "Resultado Previsto",
          level: toLevel(Math.round((classPct + forecastPct) / 2)),
          reason: classPct >= 80
            ? "Lançamentos bem classificados"
            : "Classificação de lançamentos incompleta",
        },
        {
          kpi: "Meta Mensal",
          level: toLevel(Math.round((forecastPct + cadastralScore) / 2)),
          reason: forecastPct >= 60
            ? "Previsão baseada em dados confirmados"
            : "Dados insuficientes para previsão confiável",
        },
      ];

      // Overall
      const overallScore = Math.round((reconPct + classPct + cadastralScore + forecastPct) / 4);

      return {
        reconciliation: { label: "Conciliação Bancária", value: reconPct, level: toLevel(reconPct) },
        classification: { label: "Lançamentos Classificados", value: classPct, level: toLevel(classPct) },
        cadastralQuality: { label: "Qualidade Cadastral", value: cadastralScore, level: toLevel(cadastralScore) },
        forecastCoverage: { label: "Cobertura Forecast", value: forecastPct, level: toLevel(forecastPct) },
        maturity: { level: maturityLevel, score: maturityScore },
        freshness,
        kpiConfidence,
        overallScore,
      };
    },
    refetchInterval: 300000,
    staleTime: 120000,
  });
}
