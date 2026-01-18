import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DRETab } from "./DRETab";
import { CashflowTab } from "./CashflowTab";

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
  type: "dre" | "cashflow";
}

export function IntegratedDashboardBI({ filters }: IntegratedDashboardBIProps) {
  const [selectedKPI, setSelectedKPI] = useState<KPIKey | null>(null);
  const [biViewMode, setBiViewMode] = useState<"dre" | "cashflow">("dre");

  const { data: kpiData, isLoading } = useQuery({
    queryKey: ["integrated-dashboard-kpis", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");
      const currentMonth = filters.dateFrom.getMonth() + 1;
      const currentYear = filters.dateFrom.getFullYear();

      const { data: chartAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature")
        .eq("active", true);

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

      let balanceQuery = supabase
        .from("fin_bank_accounts")
        .select("opening_balance")
        .eq("active", true);

      if (filters.bankAccountId) balanceQuery = balanceQuery.eq("id", filters.bankAccountId);

      const { data: accounts } = await balanceQuery;
      const openingBalance = accounts?.reduce((sum, a) => sum + Number(a.opening_balance || 0), 0) || 0;

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

  const formatCompact = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1000000) {
      return (value / 1000000).toFixed(1) + "M";
    }
    if (abs >= 1000) {
      return (value / 1000).toFixed(0) + "K";
    }
    return value.toFixed(0);
  };

  const getPercentage = (actual: number, target: number) => {
    if (target === 0) return 0;
    return (actual / target) * 100;
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
        type: "dre",
      },
      {
        key: "margem_contribuicao" as KPIKey,
        label: "Margem",
        value: kpiData.margem_contribuicao,
        target: kpiData.goals.dre.margem_contribuicao || 0,
        percentage: getPercentage(kpiData.margem_contribuicao, kpiData.goals.dre.margem_contribuicao || 0),
        type: "dre",
      },
      {
        key: "ebitda" as KPIKey,
        label: "EBITDA",
        value: kpiData.ebitda,
        target: kpiData.goals.dre.resultado_operacional || 0,
        percentage: getPercentage(kpiData.ebitda, kpiData.goals.dre.resultado_operacional || 0),
        type: "dre",
      },
      {
        key: "resultado_economico" as KPIKey,
        label: "Resultado",
        value: kpiData.resultado_economico,
        target: kpiData.goals.dre.resultado_antes_capital || 0,
        percentage: getPercentage(kpiData.resultado_economico, kpiData.goals.dre.resultado_antes_capital || 0),
        type: "dre",
      },
      {
        key: "saldo_caixa" as KPIKey,
        label: "Saldo Caixa",
        value: kpiData.saldo_caixa,
        target: kpiData.goals.cashflow.saldo_final || 0,
        percentage: getPercentage(kpiData.saldo_caixa, kpiData.goals.cashflow.saldo_final || 0),
        type: "cashflow",
      },
      {
        key: "variacao_liquida" as KPIKey,
        label: "Variação",
        value: kpiData.variacao_liquida,
        target: kpiData.goals.cashflow.variacao_liquida || 0,
        percentage: getPercentage(kpiData.variacao_liquida, kpiData.goals.cashflow.variacao_liquida || 0),
        type: "cashflow",
      },
    ];
  }, [kpiData]);

  const handleKPIClick = (kpi: KPIData) => {
    if (selectedKPI === kpi.key) {
      setSelectedKPI(null);
    } else {
      setSelectedKPI(kpi.key);
      setBiViewMode(kpi.type);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-32 flex-shrink-0" />
          ))}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Strip - Compact horizontal cards */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {kpis.map((kpi) => {
          const isSelected = selectedKPI === kpi.key;
          const isPositive = kpi.value >= 0;
          const hasTarget = kpi.target > 0;
          const isOnTrack = kpi.percentage >= 100;
          const isWarning = kpi.percentage >= 80 && kpi.percentage < 100;
          const isCritical = hasTarget && kpi.percentage < 80;

          return (
            <Card
              key={kpi.key}
              onClick={() => handleKPIClick(kpi)}
              className={cn(
                "flex-shrink-0 cursor-pointer transition-all duration-150 min-w-[140px]",
                "hover:shadow-md active:scale-[0.98]",
                isSelected 
                  ? "ring-2 ring-primary bg-primary/5 border-primary" 
                  : "hover:border-muted-foreground/30",
                isCritical && !isSelected && "border-red-200 dark:border-red-900"
              )}
            >
              <CardContent className="p-3 space-y-1">
                {/* Label + Type indicator */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
                    {kpi.label}
                  </span>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    kpi.type === "dre" ? "bg-purple-500" : "bg-cyan-500"
                  )} />
                </div>

                {/* Value */}
                <div className={cn(
                  "text-lg font-bold font-mono leading-tight",
                  isPositive ? "text-foreground" : "text-red-600"
                )}>
                  {isPositive ? "" : "-"}R$ {formatCompact(Math.abs(kpi.value))}
                </div>

                {/* Progress indicator */}
                {hasTarget ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          isOnTrack && "bg-green-500",
                          isWarning && "bg-yellow-500",
                          isCritical && "bg-red-500"
                        )}
                        style={{ width: `${Math.min(kpi.percentage, 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold tabular-nums",
                      isOnTrack && "text-green-600",
                      isWarning && "text-yellow-600",
                      isCritical && "text-red-600"
                    )}>
                      {kpi.percentage.toFixed(0)}%
                    </span>
                  </div>
                ) : (
                  <div className="h-1" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* BI Section */}
      <div className="space-y-3">
        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <Tabs value={biViewMode} onValueChange={(v) => setBiViewMode(v as "dre" | "cashflow")}>
            <TabsList className="h-8">
              <TabsTrigger value="dre" className="text-xs gap-1.5 h-7 px-3">
                <BarChart3 className="h-3.5 w-3.5" />
                DRE
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="text-xs gap-1.5 h-7 px-3">
                <Wallet className="h-3.5 w-3.5" />
                Fluxo de Caixa
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {selectedKPI && (
            <button
              onClick={() => setSelectedKPI(null)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {kpis.find(k => k.key === selectedKPI)?.value! >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              Analisando: {kpis.find(k => k.key === selectedKPI)?.label}
              <span className="ml-1 text-muted-foreground/50">×</span>
            </button>
          )}
        </div>

        {/* BI Content */}
        <Card className={cn(
          "overflow-hidden",
          selectedKPI && "ring-1 ring-primary/20"
        )}>
          <CardContent className="p-0">
            {biViewMode === "dre" ? (
              <DRETab filters={filters} />
            ) : (
              <CashflowTab filters={filters} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
