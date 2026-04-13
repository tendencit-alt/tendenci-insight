import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrafficLight, TrafficLightBadge } from "./TrafficLight";
import { BarChart3, Wallet, Target, TrendingUp, TrendingDown, Lock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ExecutiveViewProps {
  filters: FinanceiroFiltersState;
}

interface ExecutiveData {
  dre: {
    receitaLiquida: number;
    margemContribuicao: number;
    resultadoOperacionalEBITDA: number;
    resultadoEconomicoEBIT: number;
    resultadoAntesCapital: number;
  };
  cashflow: {
    entradasOperacionais: number;
    saidasOperacionais: number;
    geracaoOperacional: number;
    jurosLiquidos: number;
    caixaAntesCapital: number;
    capitalEntrada: number;
    capitalSaida: number;
    variacaoLiquida: number;
    saldoFinal: number;
  };
  goals: {
    dre: Record<string, number>;
    cashflow: Record<string, number>;
  };
}

export function ExecutiveView({ filters }: ExecutiveViewProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["executive-view", filters],
    queryFn: async (): Promise<ExecutiveData> => {
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
      // Structure: 1=Receitas, 2=Deduções, 3=CustosVar, 4=MC(calc), 5=DespOp, 6=Deprec, 7=ResultFin, 8=Capital, 9=Variação
      const classifyAccount = (code: string, nature: string | null) => {
        const mainCode = parseFloat(code.split('.')[0]);
        const subCode = code.includes('.') ? parseFloat(code.split('.')[1]) : 0;
        
        if (mainCode === 1) return "receita_operacional";
        if (mainCode === 2) return "deducao_receita";
        if (mainCode === 3) return "custo_variavel";
        if (mainCode === 4) return "margem_contribuicao";
        if (mainCode === 5) return "despesa_operacional";
        if (mainCode === 6) return "depreciacao";
        if (mainCode === 7 && nature === "RECEITA") return "receita_financeira";
        if (mainCode === 7 && nature === "DESPESA") return "despesa_financeira";
        if (mainCode === 7) return "resultado_financeiro";
        if (mainCode === 8 && subCode === 1) return "capital_entrada";
        if (mainCode === 8 && subCode === 2) return "capital_saida";
        if (mainCode === 8) return "capital_entrada";
        
        return nature === "RECEITA" ? "receita_operacional" : "despesa_operacional";
      };

      // Create account maps for classification
      const accountMap = new Map(chartAccounts?.map(a => [a.id, { ...a, category_type: classifyAccount(a.code, a.nature) }]) || []);

      // Fetch ledger entries for DRE (competence)
      let dreQuery = supabase
        .from("fin_ledger_entries")
        .select("chart_account_id, amount, type")
        .neq("status", "CANCELADO")
        .gte("competence_date", dateFrom)
        .lte("competence_date", dateTo)
        .not("competence_date", "is", null);

      if (filters.costCenterId) {
        dreQuery = dreQuery.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        dreQuery = dreQuery.eq("project_id", filters.projectId);
      }

      const { data: dreEntries } = await dreQuery;

      // Fetch ledger entries for Cashflow (cash_date)
      let cashQuery = supabase
        .from("fin_ledger_entries")
        .select("chart_account_id, amount, type")
        .neq("status", "CANCELADO")
        .gte("cash_date", dateFrom)
        .lte("cash_date", dateTo)
        .not("cash_date", "is", null);

      if (filters.bankAccountId) {
        cashQuery = cashQuery.eq("bank_account_id", filters.bankAccountId);
      }
      if (filters.costCenterId) {
        cashQuery = cashQuery.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        cashQuery = cashQuery.eq("project_id", filters.projectId);
      }

      const { data: cashEntries } = await cashQuery;

      // Get opening balance for cashflow
      let balanceQuery = supabase
        .from("fin_bank_accounts")
        .select("opening_balance")
        .eq("active", true);

      if (filters.bankAccountId) {
        balanceQuery = balanceQuery.eq("id", filters.bankAccountId);
      }

      const { data: accounts } = await balanceQuery;
      const openingBalance = accounts?.reduce((sum, a) => sum + Number(a.opening_balance || 0), 0) || 0;

      // Fetch goals for the period
      const { data: goalsData } = await supabase
        .from("fin_financial_goals")
        .select("goal_type, metric_key, target_amount")
        .eq("year", currentYear)
        .eq("month", currentMonth);

      // Build goals map
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
      let deducoesReceita = 0;
      let custosVariaveis = 0;
      let despesasOperacionais = 0;
      let depreciacao = 0;
      let receitasFinanceiras = 0;
      let despesasFinanceiras = 0;

      dreEntries?.forEach(entry => {
        const account = accountMap.get(entry.chart_account_id || "");
        if (!account) return;

        const amount = Number(entry.amount);
        const category = account.category_type;

        if (category === "receita_operacional") {
          totalReceitas += amount;
        } else if (category === "deducao_receita") {
          deducoesReceita += amount;
        } else if (category === "custo_variavel") {
          custosVariaveis += amount;
        } else if (category === "despesa_operacional") {
          despesasOperacionais += amount;
        } else if (category === "depreciacao") {
          depreciacao += amount;
        } else if (category === "receita_financeira") {
          receitasFinanceiras += amount;
        } else if (category === "despesa_financeira") {
          despesasFinanceiras += amount;
        }
      });

      const resultadoFinanceiro = receitasFinanceiras - despesasFinanceiras;
      const receitaLiquida = totalReceitas - deducoesReceita;
      const margemContribuicao = receitaLiquida - custosVariaveis;
      const resultadoOperacionalEBITDA = margemContribuicao - despesasOperacionais;
      const resultadoEconomicoEBIT = resultadoOperacionalEBITDA - depreciacao;
      const resultadoAntesCapital = resultadoEconomicoEBIT - resultadoFinanceiro;

      // Calculate Cashflow values
      let entradasOperacionais = 0;
      let saidasOperacionais = 0;
      let jurosLiquidos = 0;
      let capitalEntrada = 0;
      let capitalSaida = 0;

      cashEntries?.forEach(entry => {
        const account = accountMap.get(entry.chart_account_id || "");
        if (!account) return;

        const amount = Number(entry.amount);
        const category = account.category_type;
        const nature = account.nature;

        if (nature === "RECEITA" || category === "receita_operacional" || category === "receita_financeira") {
          entradasOperacionais += amount;
        } else if ((nature === "DESPESA" || category === "despesa_financeira") && !["depreciacao"].includes(category)) {
          saidasOperacionais += amount;
        } else if (category === "capital_entrada") {
          capitalEntrada += amount;
        } else if (category === "capital_saida") {
          capitalSaida += amount;
        }
      });

      const geracaoOperacional = entradasOperacionais - saidasOperacionais;
      const caixaAntesCapital = geracaoOperacional - jurosLiquidos;
      const variacaoLiquida = caixaAntesCapital + capitalEntrada - capitalSaida;
      const saldoFinal = openingBalance + variacaoLiquida;

      return {
        dre: {
          receitaLiquida,
          margemContribuicao,
          resultadoOperacionalEBITDA,
          resultadoEconomicoEBIT,
          resultadoAntesCapital,
        },
        cashflow: {
          entradasOperacionais,
          saidasOperacionais,
          geracaoOperacional,
          jurosLiquidos,
          caixaAntesCapital,
          capitalEntrada,
          capitalSaida,
          variacaoLiquida,
          saldoFinal,
        },
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

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[500px]" />
        ))}
      </div>
    );
  }

  const dre = data?.dre;
  const cashflow = data?.cashflow;
  const goals = data?.goals;

  const dreRows = [
    { 
      label: "Receita Líquida", 
      key: "receita_liquida",
      value: dre?.receitaLiquida || 0, 
      isCalculated: false 
    },
    { 
      label: "Margem de Contribuição", 
      key: "margem_contribuicao",
      value: dre?.margemContribuicao || 0, 
      isCalculated: true 
    },
    { 
      label: "Resultado Operacional (EBITDA)", 
      key: "resultado_operacional_ebitda",
      value: dre?.resultadoOperacionalEBITDA || 0, 
      isCalculated: true 
    },
    { 
      label: "Resultado Econômico (EBIT)", 
      key: "resultado_economico_ebit",
      value: dre?.resultadoEconomicoEBIT || 0, 
      isCalculated: true 
    },
    { 
      label: "Resultado Antes do Capital", 
      key: "resultado_antes_capital",
      value: dre?.resultadoAntesCapital || 0, 
      isCalculated: true,
      highlight: true 
    },
  ];

  const cashflowRows = [
    { label: "Entradas Operacionais", value: cashflow?.entradasOperacionais || 0, type: "entrada" },
    { label: "(-) Saídas Operacionais", value: cashflow?.saidasOperacionais || 0, type: "saida" },
    { 
      label: "= Geração Operacional", 
      key: "geracao_operacional",
      value: cashflow?.geracaoOperacional || 0, 
      isCalculated: true 
    },
    { label: "(-) Juros Líquidos", value: cashflow?.jurosLiquidos || 0, type: "saida" },
    { label: "= Caixa Antes do Capital", value: cashflow?.caixaAntesCapital || 0, isCalculated: true },
    { label: "(+) Contratação Empréstimo", value: cashflow?.capitalEntrada || 0, type: "capital" },
    { label: "(-) Liquidação Empréstimo", value: cashflow?.capitalSaida || 0, type: "capital" },
    { 
      label: "= Variação Líquida", 
      key: "variacao_liquida",
      value: cashflow?.variacaoLiquida || 0, 
      isCalculated: true,
      highlight: true 
    },
    { 
      label: "SALDO FINAL", 
      key: "saldo_final",
      value: cashflow?.saldoFinal || 0, 
      isCalculated: true,
      isFinal: true 
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Visão Executiva
          </h2>
          <p className="text-sm text-muted-foreground">
            DRE x Fluxo de Caixa x Metas - Período sincronizado
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* DRE Column */}
        <Card>
          <CardHeader className="pb-3 bg-purple-50 dark:bg-purple-950/30 rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              DRE (Competência)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {dreRows.map((row, i) => (
              <div 
                key={i}
                className={cn(
                  "flex items-center justify-between py-2 border-b last:border-0",
                  row.highlight && "bg-purple-50 dark:bg-purple-950/30 -mx-4 px-4 py-3 rounded",
                  row.isCalculated && "font-medium"
                )}
              >
                <div className="flex items-center gap-2">
                  {row.isCalculated && <Lock className="h-3 w-3 text-muted-foreground" />}
                  <span className={cn(row.highlight && "font-semibold")}>{row.label}</span>
                </div>
                <span className={cn(
                  "font-mono",
                  row.value >= 0 ? "text-green-600" : "text-red-600",
                  row.highlight && "text-lg font-bold"
                )}>
                  {formatCurrency(row.value)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cashflow Column */}
        <Card>
          <CardHeader className="pb-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-cyan-600" />
              Fluxo de Caixa (Realizado)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {cashflowRows.map((row, i) => (
              <div 
                key={i}
                className={cn(
                  "flex items-center justify-between py-1.5 border-b last:border-0",
                  row.highlight && "bg-cyan-50 dark:bg-cyan-950/30 -mx-4 px-4 py-3 rounded",
                  row.isFinal && "bg-primary/10 -mx-4 px-4 py-3 rounded font-bold",
                  row.isCalculated && "font-medium"
                )}
              >
                <div className="flex items-center gap-2">
                  {row.isCalculated && <Lock className="h-3 w-3 text-muted-foreground" />}
                  <span className={cn(
                    "text-sm",
                    row.highlight && "font-semibold",
                    row.isFinal && "text-base"
                  )}>
                    {row.label}
                  </span>
                </div>
                <span className={cn(
                  "font-mono text-sm",
                  row.type === "entrada" && "text-green-600",
                  row.type === "saida" && "text-red-600",
                  row.type === "capital" && "text-blue-600",
                  row.isCalculated && row.value >= 0 && "text-green-600",
                  row.isCalculated && row.value < 0 && "text-red-600",
                  row.highlight && "text-base font-bold",
                  row.isFinal && "text-lg"
                )}>
                  {row.type === "saida" && row.value > 0 ? `(${formatCurrency(row.value)})` : formatCurrency(row.value)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Goals Column */}
        <Card>
          <CardHeader className="pb-3 bg-amber-50 dark:bg-amber-950/30 rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" />
              Metas (% Evolução)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">DRE</h4>
              {dreRows.filter(r => r.key).map((row, i) => {
                const target = goals?.dre[row.key || ""] || 0;
                return (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b">
                    <span className="text-sm truncate flex-1">{row.label}</span>
                    {target > 0 ? (
                      <TrafficLight actual={row.value} target={target} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem meta</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Caixa</h4>
              {cashflowRows.filter(r => r.key).map((row, i) => {
                const target = goals?.cashflow[row.key || ""] || 0;
                return (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b">
                    <span className="text-sm truncate flex-1">{row.label}</span>
                    {target > 0 ? (
                      <TrafficLight actual={row.value} target={target} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem meta</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary badges */}
            <div className="pt-4 space-y-2">
              <TrafficLightBadge 
                label="Meta principal: Resultado Antes Capital"
                actual={dre?.resultadoAntesCapital || 0} 
                target={goals?.dre.resultado_antes_capital || 0} 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}