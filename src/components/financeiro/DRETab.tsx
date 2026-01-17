import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, ChevronRight, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";

interface DRETabProps {
  filters: FinanceiroFiltersState;
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  nature: string | null;
  parent_id: string | null;
  dre_order: number | null;
}

interface DRELine {
  id: string;
  code: string;
  name: string;
  nature: string | null;
  value: number;
  level: number;
  hasChildren: boolean;
  isSubtotal: boolean;
  parentId: string | null;
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
  
  // Sort children by code
  tree.forEach((children) => {
    children.sort((a, b) => {
      const aParts = a.code.split('.').map(Number);
      const bParts = b.code.split('.').map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });
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

// Flatten tree to ordered lines for display
function flattenTree(
  tree: Map<string | null, ChartAccount[]>,
  accountValues: Map<string, number>,
  parentId: string | null,
  level: number,
  lines: DRELine[]
): void {
  const children = tree.get(parentId) || [];
  
  children.forEach(account => {
    const hasChildren = tree.has(account.id) && (tree.get(account.id)?.length || 0) > 0;
    const directValue = accountValues.get(account.id) || 0;
    const childrenTotal = hasChildren ? calculateTotals(tree, accountValues, account.id) : 0;
    const totalValue = directValue + childrenTotal;
    
    lines.push({
      id: account.id,
      code: account.code,
      name: account.name,
      nature: account.nature,
      value: totalValue,
      level,
      hasChildren,
      isSubtotal: hasChildren && level === 0,
      parentId: account.parent_id,
    });
    
    if (hasChildren) {
      flattenTree(tree, accountValues, account.id, level + 1, lines);
    }
  });
}

export function DRETab({ filters }: DRETabProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const dateField = filters.regime === "CAIXA" ? "cash_date" : "competence_date";

  // Subscribe to real-time changes on fin_chart_accounts
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
          // Invalidate DRE query when chart accounts change
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

      // Get chart accounts ordered by code (following the chart of accounts structure)
      const { data: chartAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature, parent_id, dre_order")
        .eq("in_dre", true)
        .eq("active", true)
        .order("code");

      // Get ledger entries
      let query = supabase
        .from("fin_ledger_entries")
        .select("chart_account_id, amount, type")
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

      // Calculate values for each account
      const accountValues = new Map<string, number>();
      entries?.forEach((entry) => {
        if (entry.chart_account_id) {
          const current = accountValues.get(entry.chart_account_id) || 0;
          accountValues.set(entry.chart_account_id, current + Number(entry.amount));
        }
      });

      // Build tree and flatten
      const tree = buildTree(chartAccounts || []);
      const lines: DRELine[] = [];
      flattenTree(tree, accountValues, null, 0, lines);

      // Calculate summary totals based on nature
      let totalReceitas = 0;
      let totalDespesas = 0;

      // Only sum root level accounts to avoid double counting
      const rootAccounts = chartAccounts?.filter(a => !a.parent_id) || [];
      rootAccounts.forEach(account => {
        const directValue = accountValues.get(account.id) || 0;
        const childrenTotal = calculateTotals(tree, accountValues, account.id);
        const total = directValue + childrenTotal;
        
        if (account.nature === "RECEITA") {
          totalReceitas += total;
        } else if (account.nature === "DESPESA") {
          totalDespesas += total;
        }
      });

      const lucroLiquido = totalReceitas - totalDespesas;

      return {
        lines,
        summary: {
          totalReceitas,
          totalDespesas,
          lucroLiquido,
        },
      };
    },
  });

  // Handle expand/collapse with initial state
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

  const expandAll = () => {
    const allParentIds = dreData?.lines
      .filter(l => l.hasChildren)
      .map(l => l.id) || [];
    setExpandedAccounts(new Set(allParentIds));
  };

  const collapseAll = () => {
    setExpandedAccounts(new Set());
  };

  // Filter visible lines based on expanded state
  const visibleLines = useMemo(() => {
    if (!dreData?.lines) return [];
    
    const visible: DRELine[] = [];
    const hiddenParents = new Set<string>();
    
    dreData.lines.forEach(line => {
      // Check if any ancestor is collapsed
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
  }, [dreData?.lines, expandedAccounts]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  const summary = dreData?.summary;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Demonstração do Resultado do Exercício (DRE)
          </h2>
          <p className="text-sm text-muted-foreground">
            {filters.regime === "CAIXA" ? "Regime de Caixa" : "Regime de Competência"} - Estrutura baseada no Plano de Contas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expandir Tudo
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Recolher Tudo
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLines.map((line) => {
                const isExpanded = expandedAccounts.has(line.id);
                const isReceita = line.nature === "RECEITA";
                const isDespesa = line.nature === "DESPESA";
                
                return (
                  <TableRow 
                    key={line.id}
                    className={cn(
                      line.level === 0 && "bg-muted/50 font-semibold",
                      line.isSubtotal && "font-bold"
                    )}
                  >
                    <TableCell 
                      className={cn("cursor-pointer select-none")}
                      style={{ paddingLeft: `${(line.level * 24) + 16}px` }}
                      onClick={() => line.hasChildren && toggleExpand(line.id)}
                    >
                      <div className="flex items-center gap-2">
                        {line.hasChildren ? (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="text-muted-foreground">{line.code}</span>
                        <span>{line.name}</span>
                      </div>
                    </TableCell>
                    <TableCell 
                      className={cn(
                        "text-right",
                        isReceita && line.value > 0 && "text-green-600",
                        isDespesa && line.value > 0 && "text-red-600",
                        line.value < 0 && "text-red-600"
                      )}
                    >
                      {isDespesa && line.value > 0 ? (
                        `(${formatCurrency(line.value)})`
                      ) : (
                        formatCurrency(line.value)
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Separator */}
              <TableRow>
                <TableCell colSpan={2} className="h-2 bg-muted/30" />
              </TableRow>

              {/* Summary */}
              <TableRow className="bg-green-50 dark:bg-green-950/20 font-semibold">
                <TableCell>TOTAL RECEITAS</TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(summary?.totalReceitas || 0)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-red-50 dark:bg-red-950/20 font-semibold">
                <TableCell>TOTAL DESPESAS</TableCell>
                <TableCell className="text-right text-red-600">
                  ({formatCurrency(summary?.totalDespesas || 0)})
                </TableCell>
              </TableRow>
              <TableRow className="bg-primary/10 font-bold text-lg">
                <TableCell>= RESULTADO LÍQUIDO</TableCell>
                <TableCell 
                  className={cn(
                    "text-right",
                    (summary?.lucroLiquido || 0) >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrency(summary?.lucroLiquido || 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
