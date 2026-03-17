import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { FinanceiroKPIs } from "./FinanceiroKPIs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CostCenterKPIs } from "./CostCenterKPIs";
import { ProjectKPIs } from "./ProjectKPIs";
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
  ChevronRight,
  ChevronDown,
  ArrowUpCircle,
  ArrowDownCircle,
  X,
  FileText,
  Info,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardBIProps {
  filters: FinanceiroFiltersState;
}

type KPIType = "saldo" | "receitas" | "despesas" | "resultado" | null;

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

      // Build ledger entries query - use competence_date as fallback when cash_date is null
      // This ensures entries from orders (which have no cash_date yet) still appear
      let entriesQuery = supabase
        .from("fin_ledger_entries")
        .select(`
          id, type, amount, description, cash_date, competence_date, 
          document_number, party_type, party_id,
          chart_account:fin_chart_accounts(id, code, name, nature)
        `)
        .neq("status", "CANCELADO")
        .or(`and(cash_date.gte.${dateFrom},cash_date.lte.${dateTo}),and(cash_date.is.null,competence_date.gte.${dateFrom},competence_date.lte.${dateTo})`);

      // Apply sorting from global filters
      if (filters.sortField === "date") {
        entriesQuery = entriesQuery.order("cash_date", { ascending: filters.sortDirection === "asc" });
      } else if (filters.sortField === "value") {
        entriesQuery = entriesQuery.order("amount", { ascending: filters.sortDirection === "asc" });
      }

      if (filters.costCenterId) {
        entriesQuery = entriesQuery.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        entriesQuery = entriesQuery.eq("project_id", filters.projectId);
      }
      // Subcategoria tem prioridade sobre categoria
      if (filters.subcategoryId) {
        entriesQuery = entriesQuery.eq("chart_account_id", filters.subcategoryId);
      } else if (filters.categoryId) {
        entriesQuery = entriesQuery.eq("chart_account_id", filters.categoryId);
      }

      // Get all ledger entries with chart accounts
      const { data: entries } = await entriesQuery;

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

      return {
        receitas,
        despesas,
        resultado,
        saldoAtual,
        saldoInicial,
        receitasCategories: Array.from(receitasByAccount.values()).sort((a, b) => b.value - a.value),
        despesasCategories: Array.from(despesasByAccount.values()).sort((a, b) => b.value - a.value),
      };
    },
  });

  // Metrics for KPIs component
  const metrics = data ? {
    entradas: data.receitas,
    saidas: data.despesas,
    resultado: data.resultado,
    saldoConsolidado: data.saldoAtual,
  } : undefined;

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
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
      <ScrollArea className="h-[calc(100vh-400px)] min-h-[400px]">
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
        <FinanceiroKPIs metrics={undefined} isLoading={true} />
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
        {/* New unified KPIs */}
        <FinanceiroKPIs metrics={metrics} isLoading={false} />


        {/* BI Section - Dynamic content based on selected KPI */}
        {selectedKPI && (
          <Card className="min-h-[500px]">
            <CardContent className="pt-6">
              {renderBIContent()}
            </CardContent>
          </Card>
        )}

        {/* Cost Center KPIs */}
        <CostCenterKPIs filters={filters} />

        {/* Project KPIs */}
        <ProjectKPIs />
      </div>
    </TooltipProvider>
  );
}
