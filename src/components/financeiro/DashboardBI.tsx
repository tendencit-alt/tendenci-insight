import { useState, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { FinanceiroKPIs } from "./FinanceiroKPIs";
import { ExecutiveKPIPanel } from "./ExecutiveKPIPanel";
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
      const dateFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : null;
      const dateTo = filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : null;

      // Build ledger entries query
      let entriesQuery = supabase
        .from("fin_ledger_entries")
        .select(`
          id, type, amount, status, description, cash_date, competence_date, 
          document_number, party_type, party_id, has_splits,
          chart_account:fin_chart_accounts(id, code, name, nature, grupo_fluxo)
        `)
        .neq("status", "CANCELADO");

      if (dateFrom && dateTo) {
        entriesQuery = entriesQuery.or(`and(cash_date.gte.${dateFrom},cash_date.lte.${dateTo}),and(cash_date.is.null,competence_date.gte.${dateFrom},competence_date.lte.${dateTo})`);
      }

      // Apply sorting from global filters
      if (filters.sortField === "date") {
        entriesQuery = entriesQuery.order("competence_date", { ascending: filters.sortDirection === "asc" });
      } else if (filters.sortField === "value") {
        entriesQuery = entriesQuery.order("amount", { ascending: filters.sortDirection === "asc" });
      }

      if (filters.costCenterId) {
        // For entries with splits (has_splits=true), cost_center_id is null
        // We need to also include those and resolve via fin_ledger_splits
        entriesQuery = entriesQuery.or(`cost_center_id.eq.${filters.costCenterId},has_splits.eq.true`);
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
      const { data: rawEntries } = await entriesQuery;

      // When filtering by cost center, resolve split entries
      // Entries with has_splits=true have cost_center_id=null, their distribution is in fin_ledger_splits
      let entries = rawEntries;
      if (filters.costCenterId && rawEntries) {
        const splitParentIds = rawEntries.filter(e => (e as any).has_splits === true).map(e => e.id);
        let splitAmounts = new Map<string, number>();
        
        if (splitParentIds.length > 0) {
          const { data: splits } = await supabase
            .from("fin_ledger_splits")
            .select("parent_entry_id, amount")
            .eq("cost_center_id", filters.costCenterId)
            .in("parent_entry_id", splitParentIds);
          
          splits?.forEach(s => {
            splitAmounts.set(s.parent_entry_id, Number(s.amount));
          });
        }

        // Replace split parent amounts with their CC-specific split amount, or exclude if no split for this CC
        entries = rawEntries.map(e => {
          if ((e as any).has_splits === true) {
            const splitAmount = splitAmounts.get(e.id);
            if (splitAmount !== undefined && splitAmount > 0) {
              return { ...e, amount: splitAmount };
            }
            return null; // This split parent has no allocation to this CC
          }
          return e;
        }).filter(Boolean) as typeof rawEntries;
      }

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

      // Get ALL ledger entries up to dateTo for real cash balance
      let balanceQuery = supabase
        .from("fin_ledger_entries")
        .select("type, amount, cash_date, competence_date, chart_account:fin_chart_accounts(grupo_fluxo)")
        .neq("status", "CANCELADO");

      if (dateTo) {
        balanceQuery = balanceQuery.or(`cash_date.lte.${dateTo},and(cash_date.is.null,competence_date.lte.${dateTo})`);
      }

      const { data: allEntriesForBalance } = await balanceQuery;

      // Get financial goals (metas)
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const { data: goals } = await supabase
        .from("fin_financial_goals")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear);

      // Resolve "kind" from grupo_fluxo with fallback to legacy entry.type
      const resolveKind = (entry: any): "ENTRADA" | "SAIDA" | "NAO_CAIXA" | null => {
        const gf: string | null = entry?.chart_account?.grupo_fluxo ?? null;
        if (gf) {
          if (gf === "NAO_CAIXA") return "NAO_CAIXA";
          // Suporta valores compostos: OPERACIONAL_ENTRADA, FINANCIAMENTO_SAIDA, INVESTIMENTO_*, etc.
          if (gf === "ENTRADA" || gf.endsWith("_ENTRADA")) return "ENTRADA";
          if (gf === "SAIDA"   || gf.endsWith("_SAIDA"))   return "SAIDA";
        }
        if (entry?.type === "RECEITA") return "ENTRADA";
        if (entry?.type === "DESPESA") return "SAIDA";
        return null;
      };

      // Calculate period totals using grupo_fluxo (filtered)
      let receitas = 0;
      let despesas = 0;
      let receitasRealizadas = 0;
      let despesasRealizadas = 0;
      let naoClassificados = 0;
      entries?.forEach((e: any) => {
        const kind = resolveKind(e);
        const amt = Number(e.amount || 0);
        if (kind === "ENTRADA") {
          receitas += amt;
          if (e.status === "PAGO_RECEBIDO") receitasRealizadas += amt;
        } else if (kind === "SAIDA") {
          despesas += amt;
          if (e.status === "PAGO_RECEBIDO") despesasRealizadas += amt;
        } else if (kind === null) {
          naoClassificados += 1;
        }
      });
      const resultado = receitas - despesas;

      // Calculate real consolidated balance using grupo_fluxo
      const saldoInicial = accounts?.reduce((sum, a) => sum + Number(a.opening_balance || 0), 0) || 0;
      let allReceitas = 0;
      let allDespesas = 0;
      allEntriesForBalance?.forEach((e: any) => {
        const kind = resolveKind(e);
        const amt = Number(e.amount || 0);
        if (kind === "ENTRADA") allReceitas += amt;
        else if (kind === "SAIDA") allDespesas += amt;
      });
      const saldoAtual = saldoInicial + allReceitas - allDespesas;

      // Group entries by chart account for BI (uses grupo_fluxo, fallback to type)
      const receitasByAccount = new Map<string, CategoryData>();
      const despesasByAccount = new Map<string, CategoryData>();

      entries?.forEach(entry => {
        const account = entry.chart_account;
        if (!account) return;
        const kind = resolveKind(entry);
        if (kind !== "ENTRADA" && kind !== "SAIDA") return;

        const map = kind === "ENTRADA" ? receitasByAccount : despesasByAccount;
        
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
          date: entry.competence_date || entry.cash_date,
          document: entry.document_number,
        });
      });

      return {
        receitas,
        despesas,
        resultado,
        saldoAtual,
        saldoInicial,
        receitasRealizadas,
        despesasRealizadas,
        naoClassificados,
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
    receitasRealizadas: data.receitasRealizadas,
    despesasRealizadas: data.despesasRealizadas,
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
                          <span>–</span>
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
        {/* Executive KPI Panel */}
        <ExecutiveKPIPanel filters={filters} />

        {/* Existing KPIs */}
        <FinanceiroKPIs
          metrics={metrics}
          isLoading={false}
          onSelectKPI={setSelectedKPI}
          dateFrom={filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : null}
          dateTo={filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : null}
        />


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
