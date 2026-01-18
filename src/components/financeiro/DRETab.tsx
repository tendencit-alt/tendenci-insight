import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { CostCenterSubFilter } from "./CostCenterSubFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, ChevronRight, ChevronDown, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface DRETabProps {
  filters: FinanceiroFiltersState;
  onFiltersChange: (filters: FinanceiroFiltersState) => void;
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  nature: string | null;
  parent_id: string | null;
  dre_order: number | null;
}

interface LedgerEntry {
  id: string;
  chart_account_id: string;
  description: string;
  amount: number;
  competence_date: string;
  cash_date: string | null;
  document_number: string | null;
  party_type: string | null;
  party_id: string | null;
}

interface DRELine {
  id: string;
  code: string;
  name: string;
  nature: string | null;
  value: number;
  level: number;
  hasChildren: boolean;
  parentId: string | null;
  isCalculated: boolean;
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
  
  // Sort children by code numerically
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

// Flatten tree to ordered lines for display - following exact chart structure
function flattenTree(
  tree: Map<string | null, ChartAccount[]>,
  accountValues: Map<string, number>,
  calculatedValues: Map<string, number>,
  entriesByAccount: Map<string, LedgerEntry[]>,
  parentId: string | null,
  level: number,
  lines: DRELine[]
): void {
  const children = tree.get(parentId) || [];
  
  children.forEach(account => {
    const hasChildren = tree.has(account.id) && (tree.get(account.id)?.length || 0) > 0;
    const isCalculated = account.nature === "RESULTADO";
    
    let totalValue: number;
    if (isCalculated) {
      totalValue = calculatedValues.get(account.code) || 0;
    } else {
      const directValue = accountValues.get(account.id) || 0;
      const childrenTotal = hasChildren ? calculateTotals(tree, accountValues, account.id) : 0;
      totalValue = directValue + childrenTotal;
    }
    
    // Get entries for this account
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
      isCalculated,
      entries,
    });
    
    if (hasChildren) {
      flattenTree(tree, accountValues, calculatedValues, entriesByAccount, account.id, level + 1, lines);
    }
  });
}

export function DRETab({ filters, onFiltersChange }: DRETabProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const dateField = "cash_date";

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel('dre-chart-accounts-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fin_chart_accounts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["fin-dre"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: dreData, isLoading } = useQuery({
    queryKey: ["fin-dre", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      // Get ALL chart accounts with in_dre = true
      const { data: chartAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature, parent_id, dre_order")
        .eq("in_dre", true)
        .eq("active", true)
        .order("code");

      // Get ledger entries with full details
      let query = supabase
        .from("fin_ledger_entries")
        .select("id, chart_account_id, description, amount, competence_date, cash_date, document_number, party_type, party_id")
        .neq("status", "CANCELADO")
        .gte(dateField, dateFrom)
        .lte(dateField, dateTo)
        .not(dateField, "is", null);

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
          // Sum values
          const current = accountValues.get(entry.chart_account_id) || 0;
          accountValues.set(entry.chart_account_id, current + Number(entry.amount));
          
          // Group entries
          if (!entriesByAccount.has(entry.chart_account_id)) {
            entriesByAccount.set(entry.chart_account_id, []);
          }
          entriesByAccount.get(entry.chart_account_id)!.push({
            id: entry.id,
            chart_account_id: entry.chart_account_id,
            description: entry.description,
            amount: Number(entry.amount),
            competence_date: entry.competence_date,
            cash_date: entry.cash_date,
            document_number: entry.document_number,
            party_type: entry.party_type,
            party_id: entry.party_id,
          });
        }
      });

      // Sort entries by date
      entriesByAccount.forEach((entries) => {
        entries.sort((a, b) => {
          const dateA = a.cash_date;
          const dateB = b.cash_date;
          return (dateA || '').localeCompare(dateB || '');
        });
      });

      // Build tree
      const tree = buildTree(chartAccounts || []);

      // Calculate totals for root-level accounts
      let totalReceitas = 0;
      let totalDespesasSobreVenda = 0;
      let totalCMV = 0;
      let totalDespesasOp = 0;
      let totalResultadoFinanceiro = 0;
      let totalCapitalEntrada = 0;
      let totalCapitalSaida = 0;

      const rootAccounts = chartAccounts?.filter(a => !a.parent_id) || [];
      
      rootAccounts.forEach(account => {
        if (account.nature === "RESULTADO") return;
        
        const directValue = accountValues.get(account.id) || 0;
        const childrenTotal = calculateTotals(tree, accountValues, account.id);
        const total = directValue + childrenTotal;
        
        const mainCode = parseFloat(account.code.split('.')[0]);
        
        if (mainCode === 1) {
          totalReceitas += total;
        } else if (mainCode === 2) {
          totalCMV += total;
        } else if (mainCode === 3) {
          totalDespesasSobreVenda += total;
        } else if (mainCode === 5) {
          totalDespesasOp += total;
        } else if (mainCode === 7) {
          totalResultadoFinanceiro += total;
        } else if (mainCode === 9) {
          const children = tree.get(account.id) || [];
          children.forEach(child => {
            const childValue = accountValues.get(child.id) || 0;
            const childChildrenTotal = calculateTotals(tree, accountValues, child.id);
            const childTotal = childValue + childChildrenTotal;
            
            const subCode = parseFloat(child.code.split('.')[1] || '0');
            if (subCode === 1) {
              totalCapitalEntrada += childTotal;
            } else if (subCode === 2) {
              totalCapitalSaida += childTotal;
            }
          });
        }
      });

      // Calculate derived values
      const margemContribuicao = totalReceitas - totalDespesasSobreVenda - totalCMV;
      const resultadoOperacional = margemContribuicao - totalDespesasOp;
      const resultadoAntesCapital = resultadoOperacional - totalResultadoFinanceiro;
      const variacaoLiquidaCaixa = resultadoAntesCapital + totalCapitalEntrada - totalCapitalSaida;

      const calculatedValues = new Map<string, number>();
      calculatedValues.set("4", margemContribuicao);
      calculatedValues.set("6", resultadoOperacional);
      calculatedValues.set("8", resultadoAntesCapital);
      calculatedValues.set("10", variacaoLiquidaCaixa);

      // Flatten tree
      const lines: DRELine[] = [];
      flattenTree(tree, accountValues, calculatedValues, entriesByAccount, null, 0, lines);

      return {
        lines,
        summary: {
          totalReceitas,
          totalDespesas: totalDespesasSobreVenda + totalCMV + totalDespesasOp,
          margemContribuicao,
          resultadoOperacional,
          resultadoFinanceiro: totalResultadoFinanceiro,
          resultadoAntesCapital,
          variacaoLiquidaCaixa,
        },
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
    const allParentIds = dreData?.lines
      .filter(l => l.hasChildren || l.entries.length > 0)
      .map(l => l.id) || [];
    setExpandedAccounts(new Set(allParentIds));
    setExpandedEntries(new Set(allParentIds));
  };

  const collapseAll = () => {
    setExpandedAccounts(new Set());
    setExpandedEntries(new Set());
  };

  // Filter visible lines based on expanded state
  const getVisibleLines = () => {
    if (!dreData?.lines) return [];
    
    const visible: DRELine[] = [];
    
    dreData.lines.forEach(line => {
      let shouldHide = false;
      let currentParentId = line.parentId;
      
      while (currentParentId) {
        if (!expandedAccounts.has(currentParentId)) {
          shouldHide = true;
          break;
        }
        const parent = dreData.lines.find(l => l.id === currentParentId);
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

  const renderLine = (line: DRELine) => {
    const isExpanded = expandedAccounts.has(line.id);
    const isEntriesExpanded = expandedEntries.has(line.id);
    const isReceita = line.nature === "RECEITA";
    const isDespesa = line.nature === "DESPESA";
    const isResultado = line.nature === "RESULTADO";
    const isFinanciamento = line.nature === "FINANCIAMENTO";
    const mainCode = parseFloat(line.code.split('.')[0]);
    const isCapital = mainCode === 9;
    const hasEntries = line.entries.length > 0;
    const canExpand = line.hasChildren || hasEntries;
    
    const rows: JSX.Element[] = [];
    
    // Main account row
    rows.push(
      <TableRow 
        key={line.id}
        className={cn(
          line.level === 0 && !isResultado && "bg-muted/50 font-semibold",
          line.level === 0 && line.hasChildren && !isResultado && "font-bold",
          isFinanciamento && "bg-orange-50/50 dark:bg-orange-950/20"
        )}
      >
        <TableCell 
          className={cn("cursor-pointer select-none")}
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
            <span className={cn(
              isResultado && "font-semibold"
            )}>{line.name}</span>
            {isResultado && (
              <span className="text-xs text-muted-foreground ml-1">(calculado)</span>
            )}
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
          {isResultado ? (
            <div className={cn(
              "inline-flex items-center justify-end px-3 py-1.5 rounded-md font-bold font-mono text-sm",
              "bg-white dark:bg-slate-900 shadow-sm border",
              line.value >= 0 
                ? "border-green-300 dark:border-green-700 text-green-700 dark:text-green-400" 
                : "border-red-300 dark:border-red-700 text-red-700 dark:text-red-400"
            )}>
              {line.value >= 0 ? "▲ " : "▼ "}
              {formatCurrency(Math.abs(line.value))}
            </div>
          ) : (
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
          )}
        </TableCell>
      </TableRow>
    );
    
    // Entry rows (when expanded and no children - leaf accounts)
    if (isEntriesExpanded && !line.hasChildren && hasEntries) {
      line.entries.forEach((entry, idx) => {
        const entryDate = entry.cash_date;
        rows.push(
          <TableRow 
            key={`${line.id}-entry-${entry.id}`}
            className="bg-muted/20 text-sm hover:bg-muted/40"
          >
            <TableCell 
              style={{ paddingLeft: `${((line.level + 1) * 24) + 16}px` }}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground font-mono text-xs">
                  {entryDate ? formatDate(entryDate) : '-'}
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            DRE <span className="text-primary">(Competência)</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Demonstração do Resultado - Clique para expandir
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

      <Card>
        <CardContent className="p-2 sm:pt-6 sm:px-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%] text-xs sm:text-sm">Conta</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">Meta</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Realizado</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {visibleLines.map(line => renderLine(line))}
              
              {/* Summary footer */}
              <TableRow>
                <TableCell colSpan={3} className="h-4 bg-muted/30" />
              </TableRow>
              <TableRow className="bg-green-50 dark:bg-green-950/20 font-semibold">
                <TableCell>TOTAL RECEITAS</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-muted-foreground font-mono">-</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">-%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-green-600 font-mono">
                  {formatCurrency(dreData?.summary.totalReceitas || 0)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-red-50 dark:bg-red-950/20 font-semibold">
                <TableCell>TOTAL DESPESAS</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-muted-foreground font-mono">-</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">-%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-red-600 font-mono">
                  ({formatCurrency(dreData?.summary.totalDespesas || 0)})
                </TableCell>
              </TableRow>
              <TableRow className={cn(
                "font-bold border-t-2",
                ((dreData?.summary.totalReceitas || 0) - (dreData?.summary.totalDespesas || 0)) >= 0 
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
                  ((dreData?.summary.totalReceitas || 0) - (dreData?.summary.totalDespesas || 0)) >= 0 
                    ? "text-green-700 dark:text-green-400" 
                    : "text-red-700 dark:text-red-400"
                )}>
                  {((dreData?.summary.totalReceitas || 0) - (dreData?.summary.totalDespesas || 0)) >= 0 ? "▲ " : "▼ "}
                  {formatCurrency(Math.abs((dreData?.summary.totalReceitas || 0) - (dreData?.summary.totalDespesas || 0)))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
