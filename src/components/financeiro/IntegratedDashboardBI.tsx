import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target,
  BarChart3,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DRETab } from "./DRETab";
import { CashflowTab } from "./CashflowTab";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface IntegratedDashboardBIProps {
  filters: FinanceiroFiltersState;
}

type KPIKey = 
  | "receita_bruta" 
  | "margem_contribuicao" 
  | "ebitda" 
  | "resultado_economico" 
  | "saldo_caixa" 
  | "variacao_liquida";

interface KPIData {
  key: KPIKey;
  label: string;
  value: number;
  target: number;
  percentage: number;
  trend: "up" | "down" | "neutral";
  type: "dre" | "cashflow";
  icon: typeof TrendingUp;
  description: string;
  drilldownFilter?: string;
}

export function IntegratedDashboardBI({ filters }: IntegratedDashboardBIProps) {
  const [selectedKPI, setSelectedKPI] = useState<KPIKey | null>(null);
  const [biViewMode, setBiViewMode] = useState<"dre" | "cashflow">("dre");
  const [compareMode, setCompareMode] = useState<"meta" | "anterior">("meta");

  // Fetch executive KPIs data
  const { data: kpiData, isLoading } = useQuery({
    queryKey: ["integrated-dashboard-kpis", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");
      const currentMonth = filters.dateFrom.getMonth() + 1;
      const currentYear = filters.dateFrom.getFullYear();

      // Fetch chart accounts
      const { data: chartAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature")
        .eq("active", true);

      // Helper to classify accounts by numeric code ranges
      const classifyAccount = (code: string, nature: string | null) => {
        const mainCode = parseFloat(code.split('.')[0]);
        const subCode = code.includes('.') ? parseFloat(code.split('.')[1]) : 0;
        
        if (mainCode === 4 || mainCode === 1) return "receita_operacional";
        if (mainCode === 5 && subCode === 1) return "custo_variavel";
        if (mainCode === 2) return "cmv";
        if (mainCode === 3) return "despesa_sobre_venda";
        if ((mainCode === 5 && subCode >= 2) || mainCode === 6) return "despesa_operacional";
        if (mainCode === 7) return "resultado_financeiro";
        if (mainCode === 8 && subCode === 1) return "capital_entrada";
        if (mainCode === 8 && subCode === 2) return "capital_saida";
        
        return nature === "RECEITA" ? "receita_operacional" : "despesa_operacional";
      };

      const accountMap = new Map(chartAccounts?.map(a => [a.id, { ...a, category_type: classifyAccount(a.code, a.nature) }]) || []);

      // Fetch DRE entries (competence)
      let dreQuery = supabase
        .from("fin_ledger_entries")
        .select("chart_account_id, amount, type")
        .neq("status", "CANCELADO")
        .gte("competence_date", dateFrom)
        .lte("competence_date", dateTo)
        .not("competence_date", "is", null);

      if (filters.costCenterId) dreQuery = dreQuery.eq("cost_center_id", filters.costCenterId);
      if (filters.projectId) dreQuery = dreQuery.eq("project_id", filters.projectId);

      const { data: dreEntries } = await dreQuery;

      // Fetch Cashflow entries (cash_date)
      let cashQuery = supabase
        .from("fin_ledger_entries")
        .select("chart_account_id, amount, type")
        .neq("status", "CANCELADO")
        .gte("cash_date", dateFrom)
        .lte("cash_date", dateTo)
        .not("cash_date", "is", null);

      if (filters.bankAccountId) cashQuery = cashQuery.eq("bank_account_id", filters.bankAccountId);
      if (filters.costCenterId) cashQuery = cashQuery.eq("cost_center_id", filters.costCenterId);
      if (filters.projectId) cashQuery = cashQuery.eq("project_id", filters.projectId);

      const { data: cashEntries } = await cashQuery;

      // Get opening balance
      let balanceQuery = supabase
        .from("fin_bank_accounts")
        .select("opening_balance")
        .eq("active", true);

      if (filters.bankAccountId) balanceQuery = balanceQuery.eq("id", filters.bankAccountId);

      const { data: accounts } = await balanceQuery;
      const openingBalance = accounts?.reduce((sum, a) => sum + Number(a.opening_balance || 0), 0) || 0;

      // Fetch goals
      const { data: goalsData } = await supabase
        .from("fin_financial_goals")
        .select("goal_type, metric_key, target_amount")
        .eq("year", currentYear)
        .eq("month", currentMonth);

      const dreGoals: Record<string, number> = {};
      const cashflowGoals: Record<string, number> = {};
      
      goalsData?.forEach(g => {
        if (g.goal_type === "dre") {
          dreGoals[g.metric_key] = Number(g.target_amount);
        } else {
          cashflowGoals[g.metric_key] = Number(g.target_amount);
        }
      });

      // Calculate DRE values
      let totalReceitas = 0;
      let custosVariaveis = 0;
      let cmv = 0;
      let despesasSobreVenda = 0;
      let despesasOperacionais = 0;
      let resultadoFinanceiro = 0;

      dreEntries?.forEach(entry => {
        const account = accountMap.get(entry.chart_account_id || "");
        if (!account) return;

        const amount = Number(entry.amount);
        const category = account.category_type;

        if (category === "receita_operacional") totalReceitas += amount;
        else if (category === "custo_variavel") custosVariaveis += amount;
        else if (category === "cmv") cmv += amount;
        else if (category === "despesa_sobre_venda") despesasSobreVenda += amount;
        else if (category === "despesa_operacional") despesasOperacionais += amount;
        else if (category === "resultado_financeiro") resultadoFinanceiro += amount;
      });

      const receitaBruta = totalReceitas;
      const margemContribuicao = receitaBruta - custosVariaveis - cmv - despesasSobreVenda;
      const ebitda = margemContribuicao - despesasOperacionais;
      const resultadoEconomico = ebitda - resultadoFinanceiro;

      // Calculate Cashflow values
      let entradasOperacionais = 0;
      let saidasOperacionais = 0;
      let capitalEntrada = 0;
      let capitalSaida = 0;

      cashEntries?.forEach(entry => {
        const account = accountMap.get(entry.chart_account_id || "");
        if (!account) return;

        const amount = Number(entry.amount);
        const category = account.category_type;
        const nature = account.nature;

        if (nature === "RECEITA" && category !== "resultado_financeiro") {
          entradasOperacionais += amount;
        } else if (nature === "DESPESA" && category !== "resultado_financeiro" && category !== "capital_saida") {
          saidasOperacionais += amount;
        } else if (category === "capital_entrada") {
          capitalEntrada += amount;
        } else if (category === "capital_saida") {
          capitalSaida += amount;
        }
      });

      const variacaoLiquida = entradasOperacionais - saidasOperacionais + capitalEntrada - capitalSaida;
      const saldoCaixa = openingBalance + variacaoLiquida;

      return {
        receita_bruta: receitaBruta,
        margem_contribuicao: margemContribuicao,
        ebitda,
        resultado_economico: resultadoEconomico,
        saldo_caixa: saldoCaixa,
        variacao_liquida: variacaoLiquida,
        goals: {
          dre: dreGoals,
          cashflow: cashflowGoals,
        },
      };
    },
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getPercentage = (actual: number, target: number) => {
    if (target === 0) return 0;
    return (actual / target) * 100;
  };

  const getTrend = (value: number, target: number): "up" | "down" | "neutral" => {
    const pct = getPercentage(value, target);
    if (pct >= 100) return "up";
    if (pct < 80) return "down";
    return "neutral";
  };

  const getStatusColor = (pct: number) => {
    if (pct >= 100) return "text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800";
    if (pct >= 80) return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800";
    return "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
  };

  const kpis: KPIData[] = useMemo(() => {
    if (!kpiData) return [];

    return [
      {
        key: "receita_bruta" as KPIKey,
        label: "Receita Bruta",
        value: kpiData.receita_bruta,
        target: kpiData.goals.dre.receita_liquida || 0,
        percentage: getPercentage(kpiData.receita_bruta, kpiData.goals.dre.receita_liquida || 0),
        trend: getTrend(kpiData.receita_bruta, kpiData.goals.dre.receita_liquida || 0),
        type: "dre",
        icon: TrendingUp,
        description: "Total de receitas no período",
        drilldownFilter: "1",
      },
      {
        key: "margem_contribuicao" as KPIKey,
        label: "Margem de Contribuição",
        value: kpiData.margem_contribuicao,
        target: kpiData.goals.dre.margem_contribuicao || 0,
        percentage: getPercentage(kpiData.margem_contribuicao, kpiData.goals.dre.margem_contribuicao || 0),
        trend: getTrend(kpiData.margem_contribuicao, kpiData.goals.dre.margem_contribuicao || 0),
        type: "dre",
        icon: BarChart3,
        description: "Receita - Custos Variáveis - CMV - Despesas s/ Venda",
        drilldownFilter: "4",
      },
      {
        key: "ebitda" as KPIKey,
        label: "EBITDA",
        value: kpiData.ebitda,
        target: kpiData.goals.dre.resultado_operacional || 0,
        percentage: getPercentage(kpiData.ebitda, kpiData.goals.dre.resultado_operacional || 0),
        trend: getTrend(kpiData.ebitda, kpiData.goals.dre.resultado_operacional || 0),
        type: "dre",
        icon: Target,
        description: "Margem de Contribuição - Despesas Operacionais",
        drilldownFilter: "6",
      },
      {
        key: "resultado_economico" as KPIKey,
        label: "Resultado Econômico",
        value: kpiData.resultado_economico,
        target: kpiData.goals.dre.resultado_antes_capital || 0,
        percentage: getPercentage(kpiData.resultado_economico, kpiData.goals.dre.resultado_antes_capital || 0),
        trend: getTrend(kpiData.resultado_economico, kpiData.goals.dre.resultado_antes_capital || 0),
        type: "dre",
        icon: kpiData.resultado_economico >= 0 ? TrendingUp : TrendingDown,
        description: "Linha final da DRE (Meta Econômica)",
        drilldownFilter: "8",
      },
      {
        key: "saldo_caixa" as KPIKey,
        label: "Saldo de Caixa",
        value: kpiData.saldo_caixa,
        target: kpiData.goals.cashflow.saldo_final || 0,
        percentage: getPercentage(kpiData.saldo_caixa, kpiData.goals.cashflow.saldo_final || 0),
        trend: getTrend(kpiData.saldo_caixa, kpiData.goals.cashflow.saldo_final || 0),
        type: "cashflow",
        icon: Wallet,
        description: "Saldo atual de caixa (Meta de Caixa)",
      },
      {
        key: "variacao_liquida" as KPIKey,
        label: "Variação Líquida de Caixa",
        value: kpiData.variacao_liquida,
        target: kpiData.goals.cashflow.variacao_liquida || 0,
        percentage: getPercentage(kpiData.variacao_liquida, kpiData.goals.cashflow.variacao_liquida || 0),
        trend: getTrend(kpiData.variacao_liquida, kpiData.goals.cashflow.variacao_liquida || 0),
        type: "cashflow",
        icon: kpiData.variacao_liquida >= 0 ? TrendingUp : TrendingDown,
        description: "Entradas - Saídas no período",
      },
    ];
  }, [kpiData]);

  const handleKPIClick = (kpi: KPIData) => {
    setSelectedKPI(kpi.key);
    setBiViewMode(kpi.type);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TOPO — DASHBOARD EXECUTIVO */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Dashboard Executivo
            </h2>
            <p className="text-sm text-muted-foreground">
              Clique em qualquer KPI para análise detalhada no BI
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={compareMode === "meta" ? "default" : "outline"}
              size="sm"
              onClick={() => setCompareMode("meta")}
            >
              vs Meta
            </Button>
            <Button
              variant={compareMode === "anterior" ? "default" : "outline"}
              size="sm"
              onClick={() => setCompareMode("anterior")}
            >
              vs Anterior
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {kpis.map((kpi) => {
            const isSelected = selectedKPI === kpi.key;
            const statusColor = getStatusColor(kpi.percentage);
            const Icon = kpi.icon;
            const isOffTarget = kpi.target > 0 && kpi.percentage < 80;

            return (
              <Card
                key={kpi.key}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2",
                  isSelected && "ring-2 ring-primary border-primary shadow-lg",
                  !isSelected && "hover:border-primary/50",
                  isOffTarget && !isSelected && "animate-pulse border-red-300"
                )}
                onClick={() => handleKPIClick(kpi)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn(
                        "h-4 w-4",
                        kpi.type === "dre" ? "text-purple-600" : "text-cyan-600"
                      )} />
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{kpi.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      kpi.type === "dre" ? "border-purple-300 text-purple-600" : "border-cyan-300 text-cyan-600"
                    )}>
                      {kpi.type === "dre" ? "DRE" : "Caixa"}
                    </Badge>
                  </div>

                  {/* Label */}
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    {kpi.label}
                  </p>

                  {/* Value */}
                  <div className={cn(
                    "text-lg font-bold font-mono",
                    kpi.value >= 0 ? "text-foreground" : "text-red-600"
                  )}>
                    {formatCurrency(kpi.value)}
                  </div>

                  {/* Target & Percentage */}
                  {kpi.target > 0 ? (
                    <div className={cn("flex items-center gap-2 p-2 rounded-md border", statusColor)}>
                      <div className="flex items-center gap-1">
                        {kpi.trend === "up" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : kpi.trend === "down" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : null}
                        <span className="font-bold text-sm">
                          {kpi.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs opacity-75 truncate">
                        Meta: {formatCurrency(kpi.target)}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-md border border-muted bg-muted/30">
                      <span className="text-xs text-muted-foreground">Sem meta definida</span>
                    </div>
                  )}

                  {/* Click indicator */}
                  <div className="flex items-center justify-end text-xs text-muted-foreground">
                    <ArrowRight className={cn(
                      "h-3 w-3 transition-transform",
                      isSelected && "translate-x-1 text-primary"
                    )} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-4 text-muted-foreground font-medium">
            {selectedKPI 
              ? `Análise Detalhada: ${kpis.find(k => k.key === selectedKPI)?.label}`
              : "BI Financeiro — Selecione um KPI para análise direcionada"
            }
          </span>
        </div>
      </div>

      {/* CORPO — BI FINANCEIRO DINÂMICO */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Tabs value={biViewMode} onValueChange={(v) => setBiViewMode(v as "dre" | "cashflow")}>
            <TabsList>
              <TabsTrigger value="dre" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                DRE (Competência)
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="gap-2">
                <Wallet className="h-4 w-4" />
                Fluxo de Caixa (Realizado)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {selectedKPI && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedKPI(null)}
              className="text-muted-foreground"
            >
              Limpar filtro
            </Button>
          )}
        </div>

        {/* BI Content */}
        <div className={cn(
          "rounded-lg border bg-card",
          selectedKPI && "ring-2 ring-primary/20"
        )}>
          {biViewMode === "dre" ? (
            <DRETab filters={filters} />
          ) : (
            <CashflowTab filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
