import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { CostCenterSubFilter } from "./CostCenterSubFilter";
import { EntryDetailsDialog } from "./EntryDetailsDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Download, ChevronRight, ChevronDown, FileText, Wallet, ArrowUpCircle, ArrowDownCircle, Target, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface CashflowTabProps {
  filters: FinanceiroFiltersState;
  onFiltersChange: (filters: FinanceiroFiltersState) => void;
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  nature: string | null;
  parent_id: string | null;
}

interface LedgerEntry {
  id: string;
  chart_account_id: string;
  description: string;
  amount: number;
  cash_date: string;
  document_number: string | null;
}

interface CashflowLine {
  id: string;
  code: string;
  name: string;
  nature: string | null;
  value: number;
  level: number;
  hasChildren: boolean;
  parentId: string | null;
  entries: LedgerEntry[];
}

// Numeric sorting for codes
function numericCodeSort(a: string, b: string): number {
  const aParts = a.split('.').map(p => parseFloat(p) || 0);
  const bParts = b.split('.').map(p => parseFloat(p) || 0);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal !== bVal) return aVal - bVal;
  }
  return 0;
}

// Build hierarchical tree from flat accounts
function buildTree(accounts: ChartAccount[]): Map<string | null, ChartAccount[]> {
  const tree = new Map<string | null, ChartAccount[]>();
  
  accounts.forEach(account => {
    const parentId = account.parent_id;
    if (!tree.has(parentId)) {
      tree.set(parentId, []);
    }
    tree.get(parentId)!.push(account);
  });
  
  tree.forEach((children) => {
    children.sort((a, b) => numericCodeSort(a.code, b.code));
  });
  
  return tree;
}

// Calculate totals recursively
function calculateTotals(
  tree: Map<string | null, ChartAccount[]>,
  accountValues: Map<string, number>,
  accountId: string | null
): number {
  const children = tree.get(accountId) || [];
  let total = 0;
  
  children.forEach(child => {
    const directValue = accountValues.get(child.id) || 0;
    const childrenTotal = calculateTotals(tree, accountValues, child.id);
    total += directValue + childrenTotal;
  });
  
  return total;
}

// Flatten tree to ordered lines
function flattenTree(
  tree: Map<string | null, ChartAccount[]>,
  accountValues: Map<string, number>,
  entriesByAccount: Map<string, LedgerEntry[]>,
  parentId: string | null,
  level: number,
  lines: CashflowLine[]
): void {
  const children = tree.get(parentId) || [];
  
  children.forEach(account => {
    const hasChildren = tree.has(account.id) && (tree.get(account.id)?.length || 0) > 0;
    const directValue = accountValues.get(account.id) || 0;
    const childrenTotal = hasChildren ? calculateTotals(tree, accountValues, account.id) : 0;
    const totalValue = directValue + childrenTotal;
    const entries = entriesByAccount.get(account.id) || [];
    
    lines.push({
      id: account.id,
      code: account.code,
      name: account.name,
      nature: account.nature,
      value: totalValue,
      level,
      hasChildren,
      parentId: account.parent_id,
      entries,
    });
    
    if (hasChildren) {
      flattenTree(tree, accountValues, entriesByAccount, account.id, level + 1, lines);
    }
  });
}

export function CashflowTab({ filters, onFiltersChange }: CashflowTabProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('cashflow-chart-accounts-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fin_chart_accounts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["fin-cashflow-list"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: cashflowData, isLoading } = useQuery({
    queryKey: ["fin-cashflow-list", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      // Get chart accounts with in_cashflow = true
      const { data: chartAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature, parent_id")
        .eq("in_cashflow", true)
        .eq("active", true)
        .order("code");

      // Get opening balance
      let balanceQuery = supabase
        .from("fin_bank_accounts")
        .select("opening_balance")
        .eq("active", true);

      if (filters.bankAccountId) {
        balanceQuery = balanceQuery.eq("id", filters.bankAccountId);
      }

      const { data: accounts } = await balanceQuery;
      const openingBalance = accounts?.reduce((sum, a) => sum + Number(a.opening_balance || 0), 0) || 0;

      // Get ledger entries with cash_date
      let query = supabase
        .from("fin_ledger_entries")
        .select("id, chart_account_id, description, amount, cash_date, document_number")
        .neq("status", "CANCELADO")
        .not("cash_date", "is", null)
        .gte("cash_date", dateFrom)
        .lte("cash_date", dateTo);

      if (filters.bankAccountId) {
        query = query.eq("bank_account_id", filters.bankAccountId);
      }
      if (filters.costCenterId) {
        query = query.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }

      const { data: entries } = await query;

      // Group entries by account and calculate values
      const accountValues = new Map<string, number>();
      const entriesByAccount = new Map<string, LedgerEntry[]>();
      
      entries?.forEach((entry) => {
        if (entry.chart_account_id) {
          const current = accountValues.get(entry.chart_account_id) || 0;
          accountValues.set(entry.chart_account_id, current + Number(entry.amount));
          
          if (!entriesByAccount.has(entry.chart_account_id)) {
            entriesByAccount.set(entry.chart_account_id, []);
          }
          entriesByAccount.get(entry.chart_account_id)!.push({
            id: entry.id,
            chart_account_id: entry.chart_account_id,
            description: entry.description,
            amount: Number(entry.amount),
            cash_date: entry.cash_date!,
            document_number: entry.document_number,
          });
        }
      });

      // Sort entries by date
      entriesByAccount.forEach((entries) => {
        entries.sort((a, b) => a.cash_date.localeCompare(b.cash_date));
      });

      // Build tree and flatten
      const tree = buildTree(chartAccounts || []);
      const lines: CashflowLine[] = [];
      flattenTree(tree, accountValues, entriesByAccount, null, 0, lines);

      // Calculate totals
      let totalEntradas = 0;
      let totalSaidas = 0;

      const rootAccounts = chartAccounts?.filter(a => !a.parent_id) || [];
      rootAccounts.forEach(account => {
        const directValue = accountValues.get(account.id) || 0;
        const childrenTotal = calculateTotals(tree, accountValues, account.id);
        const total = directValue + childrenTotal;
        
        if (account.nature === "RECEITA") {
          totalEntradas += total;
        } else if (account.nature === "DESPESA") {
          totalSaidas += total;
        }
      });

      // Calculate breakeven for cashflow
      // Ponto de Equilíbrio de Caixa = Saídas Fixas quando Entradas = Saídas
      const pontoEquilibrioCaixa = totalSaidas;
      
      // Fetch goals for meta
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      
      const { data: goalsData } = await supabase
        .from("fin_financial_goals")
        .select("metric_key, target_amount")
        .eq("month", month)
        .eq("year", year)
        .is("cost_center_id", null)
        .is("project_id", null);

      const metaEntradas = goalsData?.find(g => g.metric_key === "receitas")?.target_amount || 0;
      const metaSaidas = goalsData?.find(g => g.metric_key === "despesas")?.target_amount || totalSaidas;
      const pontoEquilibrioMeta = metaSaidas;

      return {
        lines,
        openingBalance,
        totalEntradas,
        totalSaidas,
        closingBalance: openingBalance + totalEntradas - totalSaidas,
        pontoEquilibrioCaixa,
        pontoEquilibrioMeta,
        metaEntradas,
      };
    },
  });

  const toggleExpand = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const toggleEntries = (accountId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = cashflowData?.lines
      .filter(l => l.hasChildren || l.entries.length > 0)
      .map(l => l.id) || [];
    setExpandedAccounts(new Set(allIds));
    setExpandedEntries(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedAccounts(new Set());
    setExpandedEntries(new Set());
  };

  const getVisibleLines = () => {
    if (!cashflowData?.lines) return [];
    
    const visible: CashflowLine[] = [];
    
    cashflowData.lines.forEach(line => {
      let shouldHide = false;
      let currentParentId = line.parentId;
      
      while (currentParentId) {
        if (!expandedAccounts.has(currentParentId)) {
          shouldHide = true;
          break;
        }
        const parent = cashflowData.lines.find(l => l.id === currentParentId);
        currentParentId = parent?.parentId || null;
      }
      
      if (!shouldHide) {
        visible.push(line);
      }
    });
    
    return visible;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr + 'T12:00:00'), "dd/MM/yyyy");
  };

  const renderLine = (line: CashflowLine) => {
    const isExpanded = expandedAccounts.has(line.id);
    const isEntriesExpanded = expandedEntries.has(line.id);
    const isReceita = line.nature === "RECEITA";
    const isDespesa = line.nature === "DESPESA";
    const isFinanciamento = line.nature === "FINANCIAMENTO";
    const hasEntries = line.entries.length > 0;
    const canExpand = line.hasChildren || hasEntries;
    
    const rows: JSX.Element[] = [];
    
    rows.push(
      <TableRow 
        key={line.id}
        className={cn(
          line.level === 0 && "bg-muted/50 font-semibold",
          line.level === 0 && line.hasChildren && "font-bold",
          isFinanciamento && "bg-orange-50/50 dark:bg-orange-950/20"
        )}
      >
        <TableCell 
          className="cursor-pointer select-none"
          style={{ paddingLeft: `${(line.level * 24) + 16}px` }}
          onClick={() => {
            if (line.hasChildren) {
              toggleExpand(line.id);
            } else if (hasEntries) {
              toggleEntries(line.id);
            }
          }}
        >
          <div className="flex items-center gap-2">
            {canExpand ? (
              (isExpanded || isEntriesExpanded) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
            <span className="text-muted-foreground font-mono text-sm">{line.code}</span>
            <span>{line.name}</span>
            {hasEntries && !line.hasChildren && (
              <span className="text-xs text-muted-foreground ml-1">
                ({line.entries.length} lançamento{line.entries.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right p-2">
          <div className="flex items-center justify-end gap-2">
            <span className="text-muted-foreground font-mono text-sm">-</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">-%</span>
          </div>
        </TableCell>
        <TableCell className="text-right p-2">
          <span className={cn(
            "font-mono",
            isReceita && "text-green-600",
            isDespesa && "text-red-600",
            isFinanciamento && "text-orange-500"
          )}>
            {isDespesa && line.value > 0 ? (
              `(${formatCurrency(line.value)})`
            ) : (
              formatCurrency(line.value)
            )}
          </span>
        </TableCell>
      </TableRow>
    );
    
    // Entry rows
    if (isEntriesExpanded && !line.hasChildren && hasEntries) {
      line.entries.forEach((entry) => {
        rows.push(
          <TableRow 
            key={`${line.id}-entry-${entry.id}`}
            className="bg-muted/20 text-sm hover:bg-muted/40"
          >
            <TableCell 
              style={{ paddingLeft: `${((line.level + 1) * 24) + 16}px` }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedEntryId(entry.id);
                    setEntryDialogOpen(true);
                  }}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="Ver detalhes do lançamento"
                >
                  <FileText className="h-3 w-3 text-muted-foreground hover:text-primary" />
                </button>
                <span className="text-muted-foreground font-mono text-xs">
                  {formatDate(entry.cash_date)}
                </span>
                <span className="text-foreground/80">{entry.description}</span>
                {entry.document_number && (
                  <span className="text-xs text-muted-foreground">
                    Doc: {entry.document_number}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right text-muted-foreground font-mono text-sm">
              -
            </TableCell>
            <TableCell 
              className={cn(
                "text-right font-mono text-sm",
                isReceita && "text-green-600/80",
                isDespesa && "text-red-600/80",
                isFinanciamento && "text-orange-500/80"
              )}
            >
              {isDespesa ? (
                `(${formatCurrency(entry.amount)})`
              ) : (
                formatCurrency(entry.amount)
              )}
            </TableCell>
          </TableRow>
        );
      });
    }
    
    return rows;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  const visibleLines = getVisibleLines();

  return (
    <div className="space-y-4">
      {/* Sub-filter for Cost Center */}
      <CostCenterSubFilter
        value={filters.costCenterId}
        onChange={(costCenterId) => onFiltersChange({ ...filters, costCenterId })}
        className="pb-2 border-b"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            Fluxo de Caixa <span className="text-primary">(Realizado)</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Regime de Caixa - Clique para expandir
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={expandAll} className="text-xs h-8">
            Expandir
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs h-8">
            Recolher
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exportar</span> PDF
          </Button>
        </div>
      </div>

      {/* Breakeven Point Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Ponto de Equilíbrio Meta */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Ponto Equilíbrio Meta
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Baseado na meta de saídas cadastrada para o período</p>
                    </TooltipContent>
                  </Tooltip>
                </p>
                <p className="text-lg sm:text-xl font-bold text-primary">
                  {formatCurrency(cashflowData?.pontoEquilibrioMeta || 0)}
                </p>
              </div>
              <div className="hidden sm:block p-2 rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ponto de Equilíbrio Realizado */}
        <Card className={cn(
          "border-2",
          (cashflowData?.totalEntradas || 0) >= (cashflowData?.pontoEquilibrioCaixa || 0)
            ? "border-green-500/30 bg-green-500/5"
            : "border-red-500/30 bg-red-500/5"
        )}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Ponto Equilíbrio Realizado
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-left">
                      <p className="text-xs font-semibold mb-1">Equilíbrio = Total de Saídas</p>
                      <div className="text-xs space-y-0.5">
                        <p>📈 <span className="text-green-500">Entradas (RECEITA):</span> {formatCurrency(cashflowData?.totalEntradas || 0)}</p>
                        <p>📉 <span className="text-red-500">Saídas (DESPESA):</span> {formatCurrency(cashflowData?.totalSaidas || 0)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 border-t pt-1">Contas identificadas pela natureza no plano de contas</p>
                    </TooltipContent>
                  </Tooltip>
                </p>
                <p className={cn(
                  "text-lg sm:text-xl font-bold",
                  (cashflowData?.totalEntradas || 0) >= (cashflowData?.pontoEquilibrioCaixa || 0)
                    ? "text-green-600"
                    : "text-red-600"
                )}>
                  {formatCurrency(cashflowData?.pontoEquilibrioCaixa || 0)}
                </p>
              </div>
              <div className={cn(
                "hidden sm:block p-2 rounded-full",
                (cashflowData?.totalEntradas || 0) >= (cashflowData?.pontoEquilibrioCaixa || 0)
                  ? "bg-green-500/10"
                  : "bg-red-500/10"
              )}>
                {(cashflowData?.totalEntradas || 0) >= (cashflowData?.pontoEquilibrioCaixa || 0) ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saldo de Caixa */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Saldo de Caixa</p>
                <p className={cn(
                  "text-lg sm:text-xl font-bold",
                  (cashflowData?.closingBalance || 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(cashflowData?.closingBalance || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Inicial: {formatCurrency(cashflowData?.openingBalance || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                {(cashflowData?.totalEntradas || 0) >= (cashflowData?.pontoEquilibrioCaixa || 0) ? (
                  <Badge className="bg-green-600 mt-1 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Caixa Positivo
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="mt-1 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Caixa Negativo
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {(cashflowData?.totalEntradas || 0) >= (cashflowData?.pontoEquilibrioCaixa || 0) 
                    ? `Excedente: ${formatCurrency((cashflowData?.totalEntradas || 0) - (cashflowData?.pontoEquilibrioCaixa || 0))}`
                    : `Faltam: ${formatCurrency((cashflowData?.pontoEquilibrioCaixa || 0) - (cashflowData?.totalEntradas || 0))}`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Mapping Info */}
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Contas identificadas automaticamente:</p>
          <p className="mt-1">
            <span className="text-green-600">Natureza RECEITA = Entradas</span> • 
            <span className="text-red-500 ml-1">Natureza DESPESA = Saídas</span> • 
            <span className="text-muted-foreground ml-1">Contas com in_cashflow = true</span>
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="p-2 sm:pt-6 sm:px-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%] text-xs sm:text-sm">Conta</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">Orçamento</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Realizado</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {visibleLines.map(line => renderLine(line))}
              
              {/* Summary */}
              <TableRow>
                <TableCell colSpan={3} className="h-4 bg-muted/30" />
              </TableRow>
              <TableRow className="bg-green-50 dark:bg-green-950/20 font-semibold">
                <TableCell>TOTAL ENTRADAS</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-muted-foreground font-mono">-</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">-%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-green-600 font-mono">
                  {formatCurrency(cashflowData?.totalEntradas || 0)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-red-50 dark:bg-red-950/20 font-semibold">
                <TableCell>TOTAL SAÍDAS</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-muted-foreground font-mono">-</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">-%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-red-600 font-mono">
                  ({formatCurrency(cashflowData?.totalSaidas || 0)})
                </TableCell>
              </TableRow>
              <TableRow className={cn(
                "font-bold border-t-2",
                ((cashflowData?.totalEntradas || 0) - (cashflowData?.totalSaidas || 0)) >= 0 
                  ? "bg-green-100 dark:bg-green-950/30 border-green-400" 
                  : "bg-red-100 dark:bg-red-950/30 border-red-400"
              )}>
                <TableCell className="text-base">RESULTADO</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-muted-foreground font-mono">-</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">-%</span>
                  </div>
                </TableCell>
                <TableCell className={cn(
                  "text-right font-mono text-base",
                  ((cashflowData?.totalEntradas || 0) - (cashflowData?.totalSaidas || 0)) >= 0 
                    ? "text-green-700 dark:text-green-400" 
                    : "text-red-700 dark:text-red-400"
                )}>
                  {((cashflowData?.totalEntradas || 0) - (cashflowData?.totalSaidas || 0)) >= 0 ? "▲ " : "▼ "}
                  {formatCurrency(Math.abs((cashflowData?.totalEntradas || 0) - (cashflowData?.totalSaidas || 0)))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards - After table */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:pt-4 sm:px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo Inicial</p>
                <p className="text-sm sm:text-xl font-bold font-mono truncate">{formatCurrency(cashflowData?.openingBalance || 0)}</p>
              </div>
              <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground opacity-50 flex-shrink-0 hidden sm:block" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4 sm:px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Entradas</p>
                <p className="text-sm sm:text-xl font-bold text-green-600 font-mono truncate">{formatCurrency(cashflowData?.totalEntradas || 0)}</p>
              </div>
              <ArrowUpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 opacity-50 flex-shrink-0 hidden sm:block" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4 sm:px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Saídas</p>
                <p className="text-sm sm:text-xl font-bold text-red-600 font-mono truncate">{formatCurrency(cashflowData?.totalSaidas || 0)}</p>
              </div>
              <ArrowDownCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 opacity-50 flex-shrink-0 hidden sm:block" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn(
          "border-2",
          (cashflowData?.closingBalance || 0) >= 0 
            ? "border-green-300 dark:border-green-700" 
            : "border-red-300 dark:border-red-700"
        )}>
          <CardContent className="p-3 sm:pt-4 sm:px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo Final</p>
                <p className={cn(
                  "text-sm sm:text-xl font-bold font-mono truncate",
                  (cashflowData?.closingBalance || 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {(cashflowData?.closingBalance || 0) >= 0 ? "▲ " : "▼ "}
                  {formatCurrency(cashflowData?.closingBalance || 0)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary opacity-50 flex-shrink-0 hidden sm:block" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entry Details Dialog */}
      <EntryDetailsDialog 
        entryId={selectedEntryId} 
        open={entryDialogOpen} 
        onOpenChange={setEntryDialogOpen} 
      />
    </div>
  );
}
