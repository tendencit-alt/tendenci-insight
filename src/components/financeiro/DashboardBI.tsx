import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CostCenterKPIs } from "./CostCenterKPIs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  Flame, 
  Calendar,
  ChevronRight,
  ChevronDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Target,
  AlertTriangle,
  CheckCircle,
  X,
  FileText,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardBIProps {
  filters: FinanceiroFiltersState;
}

type KPIType = "saldo" | "receitas" | "despesas" | "resultado" | "burn" | "runway" | null;

interface CategoryData {
  id: string;
  code: string;
  name: string;
  value: number;
  meta?: number;
  entries: EntryData[];
}

interface EntryData {
  id: string;
  description: string;
  amount: number;
  date: string;
  party?: string;
  document?: string;
}

export function DashboardBI({ filters }: DashboardBIProps) {
  const [selectedKPI, setSelectedKPI] = useState<KPIType>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Fetch complete financial data
  const { data, isLoading } = useQuery({
    queryKey: ["fin-dashboard-bi", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      // Get all ledger entries with chart accounts
      const { data: entries } = await supabase
        .from("fin_ledger_entries")
        .select(`
          id, type, amount, description, cash_date, competence_date, 
          document_number, party_type, party_id,
          chart_account:fin_chart_accounts(id, code, name, nature)
        `)
        .neq("status", "CANCELADO")
        .gte("cash_date", dateFrom)
        .lte("cash_date", dateTo)
        .not("cash_date", "is", null);

      // Get chart accounts for grouping
      const { data: chartAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature, parent_id")
        .eq("active", true)
        .eq("in_dre", true);

      // Get bank accounts
      const { data: accounts } = await supabase
        .from("fin_bank_accounts")
        .select("opening_balance")
        .eq("active", true);

      // Get financial goals (metas)
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const { data: goals } = await supabase
        .from("fin_financial_goals")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear);

      // Calculate totals
      const receitas = entries?.filter(e => e.type === "RECEITA").reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const despesas = entries?.filter(e => e.type === "DESPESA").reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const saldoInicial = accounts?.reduce((sum, a) => sum + Number(a.opening_balance || 0), 0) || 0;
      const resultado = receitas - despesas;
      const saldoAtual = saldoInicial + resultado;
      const burnRate = despesas / 30;
      const runway = burnRate > 0 ? Math.floor(saldoAtual / (burnRate * 30)) : 99;

      // Group entries by chart account for BI
      const receitasByAccount = new Map<string, CategoryData>();
      const despesasByAccount = new Map<string, CategoryData>();

      entries?.forEach(entry => {
        const account = entry.chart_account;
        if (!account) return;

        const map = entry.type === "RECEITA" ? receitasByAccount : despesasByAccount;
        
        if (!map.has(account.id)) {
          map.set(account.id, {
            id: account.id,
            code: account.code,
            name: account.name,
            value: 0,
            entries: [],
          });
        }

        const cat = map.get(account.id)!;
        cat.value += Number(entry.amount);
        cat.entries.push({
          id: entry.id,
          description: entry.description,
          amount: Number(entry.amount),
          date: entry.cash_date || entry.competence_date,
          document: entry.document_number,
        });
      });

      // Get metas for comparison
      const metaReceitas = goals?.find(g => g.metric_key === "receitas")?.target_amount || receitas * 1.1;
      const metaDespesas = goals?.find(g => g.metric_key === "despesas")?.target_amount || despesas * 0.9;
      const metaResultado = goals?.find(g => g.metric_key === "resultado")?.target_amount || resultado * 1.05;

      return {
        receitas,
        despesas,
        resultado,
        saldoAtual,
        saldoInicial,
        burnRate: burnRate * 30,
        runway,
        receitasCategories: Array.from(receitasByAccount.values()).sort((a, b) => b.value - a.value),
        despesasCategories: Array.from(despesasByAccount.values()).sort((a, b) => b.value - a.value),
        metas: {
          receitas: metaReceitas,
          despesas: metaDespesas,
          resultado: metaResultado,
        },
      };
    },
  });

  // Determine KPI status based on value positivity and alert threshold
  // Green = positive, Red = negative, Yellow = close to becoming negative (within 15% of zero)
  const getValueStatus = (value: number, alertThreshold?: number) => {
    if (value < 0) return "red";
    
    // If there's a threshold, check if we're close to it
    if (alertThreshold !== undefined && value <= alertThreshold) {
      return "yellow";
    }
    
    if (value > 0) return "green";
    return "neutral";
  };

  const kpis = useMemo(() => {
    if (!data) return [];

    // Alert thresholds (15% of total for most metrics)
    const receitaAlertThreshold = data.metas.receitas * 0.85;
    const despesaAlertThreshold = data.metas.despesas * 1.15; // For despesas, alert when getting too high
    
    return [
      {
        key: "saldo" as KPIType,
        title: "Saldo Consolidado",
        value: data.saldoAtual,
        icon: Wallet,
        // Alert when saldo is positive but below 15% of initial + expected result
        status: data.saldoAtual < 0 
          ? "red" 
          : data.saldoAtual < (data.saldoInicial * 0.15) 
            ? "yellow" 
            : "green",
        info: "Soma de todos os saldos das contas bancárias. Use para avaliar a liquidez imediata da empresa e capacidade de honrar compromissos de curto prazo.",
      },
      {
        key: "receitas" as KPIType,
        title: "Receitas",
        value: data.receitas,
        meta: data.metas.receitas,
        icon: TrendingUp,
        status: data.receitas >= data.metas.receitas 
          ? "green" 
          : data.receitas >= receitaAlertThreshold 
            ? "yellow" 
            : "red",
        info: "Total de receitas recebidas no período. Analise tendências de crescimento e sazonalidade. Quedas consecutivas indicam necessidade de ação comercial.",
      },
      {
        key: "despesas" as KPIType,
        title: "Despesas",
        value: data.despesas,
        meta: data.metas.despesas,
        icon: TrendingDown,
        // For expenses: green if under meta, yellow if close to meta, red if over
        status: data.despesas <= data.metas.despesas 
          ? "green" 
          : data.despesas <= despesaAlertThreshold 
            ? "yellow" 
            : "red",
        info: "Total de despesas pagas no período. Monitore para identificar gastos excessivos ou oportunidades de redução de custos.",
      },
      {
        key: "resultado" as KPIType,
        title: "Resultado Econômico",
        value: data.resultado,
        meta: data.metas.resultado,
        icon: PiggyBank,
        // Green if positive, red if negative, yellow if close to zero (within 10% of revenue)
        status: data.resultado < 0 
          ? "red" 
          : data.resultado < (data.receitas * 0.05) 
            ? "yellow" 
            : "green",
        info: "Diferença entre entradas e saídas. Resultado negativo recorrente indica que a operação não é sustentável. Avalie corte de custos ou aumento de receita.",
      },
      {
        key: "burn" as KPIType,
        title: "Consumo / Fôlego",
        value: data.burnRate,
        secondaryValue: data.runway,
        icon: Flame,
        status: data.runway <= 3 ? "red" : data.runway <= 6 ? "yellow" : "green",
        isCombo: true,
        info: "Consumo mensal médio e quantos meses a empresa pode operar com o saldo atual. Menos de 3 meses = urgente buscar capital ou cortar custos. 3-6 meses = atenção.",
      },
    ];
  }, [data]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green": return "border-green-500/50 bg-green-500/5";
      case "yellow": return "border-yellow-500/50 bg-yellow-500/5";
      case "red": return "border-red-500/50 bg-red-500/5";
      default: return "border-border bg-card";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "green": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "yellow": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "red": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getTextColor = (status: string) => {
    switch (status) {
      case "green": return "text-green-600";
      case "yellow": return "text-yellow-600";
      case "red": return "text-red-600";
      default: return "text-muted-foreground";
    }
  };

  const getIconBgColor = (status: string) => {
    switch (status) {
      case "green": return "bg-green-500/10";
      case "yellow": return "bg-yellow-500/10";
      case "red": return "bg-red-500/10";
      default: return "bg-muted";
    }
  };

  // Render BI content based on selected KPI
  const renderBIContent = () => {
    if (!selectedKPI || !data) {
      return null;
    }

    let categories: CategoryData[] = [];
    let title = "";
    let icon = null;
    let total = 0;

    switch (selectedKPI) {
      case "receitas":
        categories = data.receitasCategories;
        title = "Composição das Receitas";
        icon = <ArrowUpCircle className="h-5 w-5 text-green-500" />;
        total = data.receitas;
        break;
      case "despesas":
        categories = data.despesasCategories;
        title = "Composição das Despesas";
        icon = <ArrowDownCircle className="h-5 w-5 text-red-500" />;
        total = data.despesas;
        break;
      case "resultado":
        // Show both for resultado
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <PiggyBank className="h-5 w-5" />
                Composição do Resultado Econômico
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedKPI(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4" />
                  Receitas ({formatCurrency(data.receitas)})
                </h4>
                {renderCategoryTable(data.receitasCategories, data.receitas, "green")}
              </div>
              <div>
                <h4 className="text-sm font-medium text-red-600 mb-3 flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4" />
                  Despesas ({formatCurrency(data.despesas)})
                </h4>
                {renderCategoryTable(data.despesasCategories, data.despesas, "red")}
              </div>
            </div>
          </div>
        );
      case "saldo":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Composição do Saldo
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedKPI(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.saldoInicial)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Resultado do Período</p>
                  <p className={cn("text-2xl font-bold", data.resultado >= 0 ? "text-green-600" : "text-red-600")}>
                    {data.resultado >= 0 ? "+" : ""}{formatCurrency(data.resultado)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Saldo Atual</p>
                  <p className={cn("text-2xl font-bold", data.saldoAtual >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(data.saldoAtual)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case "burn":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Flame className="h-5 w-5" />
                Análise de Consumo & Fôlego Financeiro
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedKPI(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Consumo Mensal</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(data.burnRate)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.saldoAtual)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Fôlego Estimado</p>
                  <p className={cn("text-2xl font-bold", data.runway > 6 ? "text-green-600" : data.runway > 3 ? "text-yellow-600" : "text-red-600")}>
                    {data.runway} meses
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Principais Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                {renderCategoryTable(data.despesasCategories.slice(0, 5), data.despesas, "red")}
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {icon}
            {title}
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setSelectedKPI(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {renderCategoryTable(categories, total, selectedKPI === "receitas" ? "green" : "red")}
      </div>
    );
  };

  const renderCategoryTable = (categories: CategoryData[], total: number, colorType: "green" | "red") => {
    if (categories.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum lançamento encontrado
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right w-[80px]">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => {
              const isExpanded = expandedCategories.has(cat.id);
              const percentage = total > 0 ? (cat.value / total * 100) : 0;

              return (
                <>
                  <TableRow 
                    key={cat.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleCategory(cat.id)}
                  >
                    <TableCell className="py-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {cat.code}
                        </Badge>
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({cat.entries.length})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={cn("text-right font-semibold", colorType === "green" ? "text-green-600" : "text-red-600")}>
                      {formatCurrency(cat.value)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                  {isExpanded && cat.entries.map((entry) => (
                    <TableRow key={entry.id} className="bg-muted/30">
                      <TableCell></TableCell>
                      <TableCell className="py-1.5 pl-8" colSpan={1}>
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {entry.date ? format(new Date(entry.date), "dd/MM/yy", { locale: ptBR }) : "-"}
                          </span>
                          <span>{entry.description}</span>
                          {entry.document && (
                            <Badge variant="secondary" className="text-xs">
                              {entry.document}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm py-1.5">
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Executive Dashboard - Clickable KPIs */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((kpi) => (
            <Card 
              key={kpi.key}
              className={cn(
                "relative overflow-hidden cursor-pointer transition-all border-2",
                selectedKPI === kpi.key ? "ring-2 ring-primary" : "",
                getStatusColor(kpi.status)
              )}
              onClick={() => setSelectedKPI(selectedKPI === kpi.key ? null : kpi.key)}
            >
              <CardContent className="p-3 sm:pt-4 sm:px-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{kpi.title}</p>
                      {getStatusIcon(kpi.status)}
                      <Tooltip>
                        <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Info className="h-3 w-3 text-muted-foreground/60 cursor-help flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px] text-xs">
                          <p>{kpi.info}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {kpi.isCombo ? (
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {formatCurrency(kpi.value)}/mês
                        </p>
                        <p className={cn("text-base sm:text-xl font-bold", getTextColor(kpi.status))}>
                          {kpi.secondaryValue} meses
                        </p>
                      </div>
                    ) : (
                      <p className={cn("text-base sm:text-xl font-bold truncate", getTextColor(kpi.status))}>
                        {formatCurrency(kpi.value)}
                      </p>
                    )}
                    {kpi.meta && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        Meta: {formatCurrency(kpi.meta)}
                      </p>
                    )}
                  </div>
                  <div className={cn("p-1.5 sm:p-2 rounded-full hidden sm:block", getIconBgColor(kpi.status))}>
                    <kpi.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", getTextColor(kpi.status) || "text-muted-foreground")} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* BI Section - Dynamic content based on selected KPI */}
        {selectedKPI && (
          <Card>
            <CardContent className="pt-6">
              {renderBIContent()}
            </CardContent>
          </Card>
        )}

        {/* Cost Center KPIs */}
        <CostCenterKPIs filters={filters} />
      </div>
    </TooltipProvider>
  );
}
