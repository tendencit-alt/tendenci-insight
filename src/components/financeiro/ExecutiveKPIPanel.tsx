import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Minus, DollarSign, PieChart, Wallet,
  Gauge, ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatKpiNumber, isKpiValid, KPI_EMPTY } from "@/lib/formatKpi";

interface Props {
  filters: FinanceiroFiltersState;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtCompact = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmt(v);
};
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

export function ExecutiveKPIPanel({ filters }: Props) {
  const dateFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
  const dateTo = filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
  const currentYear = (filters.dateFrom || new Date()).getFullYear();
  const currentMonth = (filters.dateFrom || new Date()).getMonth() + 1;

  // Chart accounts
  const { data: chartAccounts } = useQuery({
    queryKey: ["kpi-chart-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("fin_chart_accounts").select("id, code, name, nature").eq("active", true);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // DRE entries (competence)
  const { data: dreEntries, isLoading: loadDre } = useQuery({
    queryKey: ["kpi-dre", dateFrom, dateTo, filters.costCenterId, filters.projectId],
    queryFn: async () => {
      let q = supabase.from("fin_ledger_entries").select("chart_account_id, amount")
        .neq("status", "CANCELADO").gte("competence_date", dateFrom).lte("competence_date", dateTo)
        .not("competence_date", "is", null);
      if (filters.costCenterId) q = q.eq("cost_center_id", filters.costCenterId);
      if (filters.projectId) q = q.eq("project_id", filters.projectId);
      const { data } = await q;
      return data || [];
    },
  });

  // YTD entries
  const { data: ytdEntries } = useQuery({
    queryKey: ["kpi-ytd", currentYear, filters.costCenterId, filters.projectId],
    queryFn: async () => {
      const ytdFrom = `${currentYear}-01-01`;
      let q = supabase.from("fin_ledger_entries").select("chart_account_id, amount")
        .neq("status", "CANCELADO").gte("competence_date", ytdFrom).lte("competence_date", dateTo)
        .not("competence_date", "is", null);
      if (filters.costCenterId) q = q.eq("cost_center_id", filters.costCenterId);
      if (filters.projectId) q = q.eq("project_id", filters.projectId);
      const { data } = await q;
      return data || [];
    },
  });

  // Cash balance
  const { data: cashBalance } = useQuery({
    queryKey: ["kpi-cash-balance", filters.bankAccountId],
    queryFn: async () => {
      let q = supabase.from("fin_bank_accounts").select("opening_balance").eq("active", true);
      if (filters.bankAccountId) q = q.eq("id", filters.bankAccountId);
      const { data } = await q;
      const openBal = (data || []).reduce((s, a: any) => s + Number(a.opening_balance || 0), 0);

      // Add all realized cash movements
      const { data: cashEntries } = await supabase.from("fin_ledger_entries")
        .select("amount, type").neq("status", "CANCELADO").not("cash_date", "is", null);
      let netCash = openBal;
      (cashEntries || []).forEach((e: any) => {
        netCash += e.type === "CREDITO" ? Number(e.amount) : -Number(e.amount);
      });
      return { openBal, netCash };
    },
  });

  // Goals for current month
  const { data: goals } = useQuery({
    queryKey: ["kpi-goals", currentYear, currentMonth],
    queryFn: async () => {
      const { data } = await supabase.from("fin_financial_goals")
        .select("metric_key, target_amount").eq("year", currentYear).eq("month", currentMonth);
      const m = new Map<string, number>();
      (data || []).forEach((g: any) => m.set(g.metric_key, Number(g.target_amount)));
      return m;
    },
  });

  // Budget for current month
  const { data: budgetData } = useQuery({
    queryKey: ["kpi-budget", currentYear, currentMonth],
    queryFn: async () => {
      const { data } = await supabase.from("fin_budgets")
        .select("chart_account_id, amount, budget_type").eq("year", currentYear).eq("month", currentMonth).eq("version_label", "base");
      let bReceita = 0, bDespesa = 0;
      (data || []).forEach((e: any) => {
        if (e.budget_type === "RECEITA") bReceita += Number(e.amount);
        else bDespesa += Number(e.amount);
      });
      return { bReceita, bDespesa };
    },
  });

  // Recurring contracts
  const { data: recurringData } = useQuery({
    queryKey: ["kpi-recurring"],
    queryFn: async () => {
      const { data } = await supabase.from("fin_recurring_contracts")
        .select("base_amount, entry_type, periodicity").eq("status", "active");
      let recReceita = 0, recDespesa = 0;
      (data || []).forEach((c: any) => {
        const monthly = periodicityToMonthly(Number(c.base_amount), c.periodicity);
        if (c.entry_type === "RECEITA") recReceita += monthly;
        else recDespesa += monthly;
      });
      return { recReceita, recDespesa };
    },
  });

  // Company settings for safety balance
  const { data: companySettings } = useQuery({
    queryKey: ["kpi-company-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("min_safety_balance").limit(1).maybeSingle();
      return data;
    },
  });

  // Classify and compute
  const kpis = useMemo(() => {
    if (!chartAccounts) return null;
    const classify = (code: string) => {
      const m = parseInt(code.split(".")[0]);
      if (m === 1) return "receita";
      if (m === 2) return "deducao";
      if (m === 3) return "despesa_op";
      if (m === 4) return "depreciacao";
      if (m === 5) return "financeiro";
      if (m === 7) return "imposto";
      return "outro";
    };
    const accMap = new Map(chartAccounts.map((a) => [a.id, { ...a, cls: classify(a.code) }]));

    // Month totals
    let receita = 0, deducao = 0, despesaOp = 0, depreciacao = 0, financeiro = 0, imposto = 0;
    let entryCount = 0;
    (dreEntries || []).forEach((e: any) => {
      const acc = accMap.get(e.chart_account_id);
      if (!acc) return;
      const amt = Number(e.amount);
      entryCount++;
      switch (acc.cls) {
        case "receita": receita += amt; break;
        case "deducao": deducao += amt; break;
        case "despesa_op": despesaOp += amt; break;
        case "depreciacao": depreciacao += amt; break;
        case "financeiro": financeiro += (acc.nature === "RECEITA" ? amt : -amt); break;
        case "imposto": imposto += amt; break;
      }
    });

    // YTD
    let ytdReceita = 0;
    (ytdEntries || []).forEach((e: any) => {
      const acc = accMap.get(e.chart_account_id);
      if (acc?.cls === "receita") ytdReceita += Number(e.amount);
    });

    const receitaLiquida = receita - deducao;
    const _margemContribuicao = receitaLiquida;
    const ebitda = receitaLiquida - despesaOp;
    const resultadoEconomico = ebitda - depreciacao + financeiro - imposto;
    const ticketMedio = entryCount > 0 ? receita / Math.max(entryCount, 1) : 0;

    // Cash
    const saldoCaixa = cashBalance?.netCash || 0;
    const burnRate = despesaOp + deducao;
    const runway = burnRate > 0 ? Math.floor(saldoCaixa / burnRate) : null;

    // Projections (simple: avg monthly * months remaining)
    const monthsRemaining = 12 - currentMonth;
    const saldo90d = saldoCaixa + (receitaLiquida - despesaOp) * 3;
    const saldo180d = saldoCaixa + (receitaLiquida - despesaOp) * 6;
    const resultadoProjetadoAnual = ytdReceita + receita * monthsRemaining - (deducao + despesaOp) * (monthsRemaining + currentMonth);

    // Efficiency
    const despFixaSobreReceita = receita > 0 ? (despesaOp / receita) * 100 : 0;
    const custoVarSobreReceita = receita > 0 ? (deducao / receita) * 100 : 0;

    // Recurring %
    const recReceita = recurringData?.recReceita || 0;
    const pctRecorrente = receita > 0 ? (recReceita / receita) * 100 : 0;

    // Breakeven
    const pontoEquilibrio = despesaOp > 0 && receita > deducao
      ? despesaOp / ((receita - deducao) / receita) : 0;

    // Goals
    const metaReceita = goals?.get("receita_liquida") || budgetData?.bReceita || 0;
    const _metaEbitda = goals?.get("resultado_operacional_ebitda") || 0;
    const receitaVsMeta = metaReceita > 0 ? ((receita - metaReceita) / metaReceita) * 100 : 0;

    // Safety balance
    const minSafety = Number(companySettings?.min_safety_balance || 0);
    const coberturaIdx = minSafety > 0 ? saldoCaixa / minSafety : null;

    return {
      // Receita block
      receitaMes: receita,
      receitaYtd: ytdReceita,
      receitaVsMeta,
      metaReceita,
      ticketMedio,
      pctRecorrente,
      // Rentabilidade
      margemContribuicaoPct: receita > 0 ? ((receitaLiquida) / receita) * 100 : 0,
      margemOperacionalPct: receita > 0 ? (ebitda / receita) * 100 : 0,
      ebitda,
      resultadoEconomico,
      resultadoProjetadoAnual,
      // Caixa
      saldoCaixa,
      saldo90d,
      saldo180d,
      burnRate,
      runway,
      // Eficiência
      despFixaSobreReceita,
      custoVarSobreReceita,
      // Risco
      pontoEquilibrio,
      coberturaIdx,
      pctDependenciaRecorrente: pctRecorrente,
    };
  }, [chartAccounts, dreEntries, ytdEntries, cashBalance, goals, budgetData, recurringData, companySettings, currentMonth]);

  if (loadDre || !kpis) {
    return <div className="grid gap-3 md:grid-cols-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[260px]" />)}</div>;
  }

  // Top 10 KPIs for executive strip
  const top10: KpiItemData[] = [
    { label: "Receita Mês", value: fmtCompact(kpis.receitaMes), trend: "up", color: "green" },
    { label: "Receita vs Meta", value: pct(kpis.receitaVsMeta), trend: kpis.receitaVsMeta >= 0 ? "up" : "down", color: kpis.receitaVsMeta >= 0 ? "green" : "red" },
    { label: "Margem Contribuição", value: `${kpis.margemContribuicaoPct.toFixed(1)}%`, trend: kpis.margemContribuicaoPct >= 30 ? "up" : "down", color: kpis.margemContribuicaoPct >= 30 ? "green" : "amber" },
    { label: "EBITDA", value: fmtCompact(kpis.ebitda), trend: kpis.ebitda >= 0 ? "up" : "down", color: kpis.ebitda >= 0 ? "green" : "red" },
    { label: "Resultado Econômico", value: fmtCompact(kpis.resultadoEconomico), trend: kpis.resultadoEconomico >= 0 ? "up" : "down", color: kpis.resultadoEconomico >= 0 ? "green" : "red" },
    { label: "Saldo Caixa", value: fmtCompact(kpis.saldoCaixa), trend: kpis.saldoCaixa >= 0 ? "up" : "down", color: kpis.saldoCaixa >= 0 ? "green" : "red" },
    { label: "Saldo 90 dias", value: fmtCompact(kpis.saldo90d), trend: kpis.saldo90d >= 0 ? "up" : "down", color: kpis.saldo90d >= 0 ? "blue" : "red" },
    { label: "Burn Rate", value: fmtCompact(kpis.burnRate), trend: "stable", color: "amber" },
    { label: "Runway", value: formatKpiNumber(kpis.runway, " meses", { cap: 24 }), trend: isKpiValid(kpis.runway) && kpis.runway > 6 ? "up" : "down", color: isKpiValid(kpis.runway) && kpis.runway > 6 ? "green" : "red" },
    { label: "Ponto Equilíbrio", value: fmtCompact(kpis.pontoEquilibrio), trend: kpis.receitaMes > kpis.pontoEquilibrio ? "up" : "down", color: kpis.receitaMes > kpis.pontoEquilibrio ? "green" : "red" },
  ];

  return (
    <div className="space-y-4">
      {/* Top 10 Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {top10.map((kpi, i) => (
          <KpiMiniCard key={i} {...kpi} />
        ))}
      </div>

      {/* 5 Blocks */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Receita */}
        <KpiBlock title="Receita" icon={DollarSign} color="green">
          <KpiRow label="Mês Atual" value={fmt(kpis.receitaMes)} />
          <KpiRow label="Acumulado Ano" value={fmtCompact(kpis.receitaYtd)} />
          <KpiRow label="vs Meta" value={pct(kpis.receitaVsMeta)} positive={kpis.receitaVsMeta >= 0} />
          <KpiRow label="Ticket Médio" value={fmt(kpis.ticketMedio)} />
          <KpiRow label="% Recorrente" value={`${kpis.pctRecorrente.toFixed(1)}%`} />
        </KpiBlock>

        {/* Rentabilidade */}
        <KpiBlock title="Rentabilidade" icon={PieChart} color="purple">
          <KpiRow label="Margem Contrib." value={`${kpis.margemContribuicaoPct.toFixed(1)}%`} positive={kpis.margemContribuicaoPct >= 30} />
          <KpiRow label="Margem Operac." value={`${kpis.margemOperacionalPct.toFixed(1)}%`} positive={kpis.margemOperacionalPct >= 15} />
          <KpiRow label="EBITDA" value={fmt(kpis.ebitda)} positive={kpis.ebitda >= 0} />
          <KpiRow label="Resultado Econ." value={fmt(kpis.resultadoEconomico)} positive={kpis.resultadoEconomico >= 0} />
          <KpiRow label="Proj. Anual" value={fmtCompact(kpis.resultadoProjetadoAnual)} positive={kpis.resultadoProjetadoAnual >= 0} />
        </KpiBlock>

        {/* Caixa */}
        <KpiBlock title="Caixa" icon={Wallet} color="cyan">
          <KpiRow label="Saldo Atual" value={fmt(kpis.saldoCaixa)} positive={kpis.saldoCaixa >= 0} />
          <KpiRow label="Proj. 90 dias" value={fmtCompact(kpis.saldo90d)} positive={kpis.saldo90d >= 0} />
          <KpiRow label="Proj. 180 dias" value={fmtCompact(kpis.saldo180d)} positive={kpis.saldo180d >= 0} />
          <KpiRow label="Burn Rate" value={fmt(kpis.burnRate)} />
          <KpiRow label="Runway" value={kpis.runway == null ? "—" : kpis.runway > 24 ? ">24m" : `${kpis.runway}m`} positive={kpis.runway != null && kpis.runway > 6} />
        </KpiBlock>

        {/* Eficiência */}
        <KpiBlock title="Eficiência" icon={Gauge} color="amber">
          <KpiRow label="Desp. Fixa/Receita" value={`${kpis.despFixaSobreReceita.toFixed(1)}%`} positive={kpis.despFixaSobreReceita < 40} />
          <KpiRow label="Custo Var./Receita" value={`${kpis.custoVarSobreReceita.toFixed(1)}%`} positive={kpis.custoVarSobreReceita < 30} />
        </KpiBlock>

        {/* Risco */}
        <KpiBlock title="Risco Financeiro" icon={ShieldAlert} color="red">
          <KpiRow label="Ponto Equilíbrio" value={fmtCompact(kpis.pontoEquilibrio)} />
          <KpiRow label="Receita > PE" value={kpis.pontoEquilibrio > 0 ? (kpis.receitaMes > kpis.pontoEquilibrio ? "Sim ✓" : "Não ✗") : "—"} positive={kpis.pontoEquilibrio > 0 && kpis.receitaMes > kpis.pontoEquilibrio} />
          <KpiRow label="Cobertura Caixa" value={kpis.coberturaIdx == null ? "—" : `${kpis.coberturaIdx.toFixed(1)}x`} positive={kpis.coberturaIdx != null && kpis.coberturaIdx >= 1} />
          <KpiRow label="Dep. Recorrente" value={`${kpis.pctDependenciaRecorrente.toFixed(0)}%`} />
        </KpiBlock>
      </div>
    </div>
  );
}

// ── Sub-components ──

interface KpiItemData {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
  color: "green" | "red" | "amber" | "blue" | "purple" | "cyan";
}

const trendIcons = { up: TrendingUp, down: TrendingDown, stable: Minus };
const colorMap = {
  green: "text-green-600",
  red: "text-red-600",
  amber: "text-amber-600",
  blue: "text-blue-600",
  purple: "text-purple-600",
  cyan: "text-cyan-600",
};

function KpiMiniCard({ label, value, trend, color }: KpiItemData) {
  const Icon = trendIcons[trend];
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-2.5">
        <p className="text-[9px] text-muted-foreground truncate leading-tight">{label}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Icon className={cn("h-3 w-3 shrink-0", colorMap[color])} />
          <span className={cn("text-sm font-bold font-mono truncate", colorMap[color])}>{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const blockColorMap = {
  green: "bg-green-50 dark:bg-green-950/30",
  purple: "bg-purple-50 dark:bg-purple-950/30",
  cyan: "bg-cyan-50 dark:bg-cyan-950/30",
  amber: "bg-amber-50 dark:bg-amber-950/30",
  red: "bg-red-50 dark:bg-red-950/30",
};
const blockIconColor = {
  green: "text-green-600",
  purple: "text-purple-600",
  cyan: "text-cyan-600",
  amber: "text-amber-600",
  red: "text-red-600",
};

function KpiBlock({ title, icon: Icon, color, children }: {
  title: string; icon: any; color: keyof typeof blockColorMap; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className={cn("pb-2 rounded-t-lg", blockColorMap[color])}>
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", blockIconColor[color])} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-1.5">{children}</CardContent>
    </Card>
  );
}

function KpiRow({ label, value, positive }: {
  label: string; value: string; positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 border-b last:border-0">
      <span className="text-[11px] text-muted-foreground truncate flex-1">{label}</span>
      <span className={cn(
        "text-[11px] font-mono font-medium ml-2 whitespace-nowrap",
        positive === true && "text-green-600",
        positive === false && "text-red-600",
      )}>{value}</span>
    </div>
  );
}

function periodicityToMonthly(amount: number, periodicity: string): number {
  switch (periodicity) {
    case "semanal": return amount * 4.33;
    case "quinzenal": return amount * 2;
    case "mensal": return amount;
    case "trimestral": return amount / 3;
    case "semestral": return amount / 6;
    case "anual": return amount / 12;
    default: return amount;
  }
}
