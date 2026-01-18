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
import { useState, useEffect } from "react";

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
  parentId: string | null;
  isCalculated: boolean;
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
      // Use pre-calculated value for RESULTADO accounts
      totalValue = calculatedValues.get(account.code) || 0;
    } else {
      const directValue = accountValues.get(account.id) || 0;
      const childrenTotal = hasChildren ? calculateTotals(tree, accountValues, account.id) : 0;
      totalValue = directValue + childrenTotal;
    }
    
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
    });
    
    if (hasChildren) {
      flattenTree(tree, accountValues, calculatedValues, account.id, level + 1, lines);
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

      // Get ALL chart accounts with in_dre = true, ordered by code
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

      // Calculate values for each account from entries
      const accountValues = new Map<string, number>();
      entries?.forEach((entry) => {
        if (entry.chart_account_id) {
          const current = accountValues.get(entry.chart_account_id) || 0;
          accountValues.set(entry.chart_account_id, current + Number(entry.amount));
        }
      });

      // Build tree
      const tree = buildTree(chartAccounts || []);

      // Calculate totals for root-level operational accounts
      let totalReceitas = 0;           // Code 1
      let totalDespesasSobreVenda = 0; // Code 3
      let totalCMV = 0;                // Code 2
      let totalDespesasOp = 0;         // Code 5
      let totalResultadoFinanceiro = 0; // Code 7
      let totalCapitalEntrada = 0;     // Code 9.1
      let totalCapitalSaida = 0;       // Code 9.2

      const rootAccounts = chartAccounts?.filter(a => !a.parent_id) || [];
      
      rootAccounts.forEach(account => {
        if (account.nature === "RESULTADO") return; // Skip calculated accounts
        
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
          // Capital movements - need to check sub-accounts
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

      // Calculate derived values based on DRE structure
      // 4 - Margem de Contribuição = Receitas - Despesas sobre Venda - CMV
      const margemContribuicao = totalReceitas - totalDespesasSobreVenda - totalCMV;
      
      // 6 - Resultado Operacional = Margem de Contribuição - Despesas Operacionais
      const resultadoOperacional = margemContribuicao - totalDespesasOp;
      
      // 8 - Resultado Antes do Capital = Resultado Operacional - Resultado Financeiro
      const resultadoAntesCapital = resultadoOperacional - totalResultadoFinanceiro;
      
      // 10 - Variação Líquida de Caixa = Resultado Antes do Capital + Capital Entrada - Capital Saída
      const variacaoLiquidaCaixa = resultadoAntesCapital + totalCapitalEntrada - totalCapitalSaida;

      // Map calculated values to their codes
      const calculatedValues = new Map<string, number>();
      calculatedValues.set("4", margemContribuicao);
      calculatedValues.set("6", resultadoOperacional);
      calculatedValues.set("8", resultadoAntesCapital);
      calculatedValues.set("10", variacaoLiquidaCaixa);

      // Flatten tree following exact chart structure
      const lines: DRELine[] = [];
      flattenTree(tree, accountValues, calculatedValues, null, 0, lines);

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
        chartAccounts: chartAccounts || [],
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
  const getVisibleLines = () => {
    if (!dreData?.lines) return [];
    
    const visible: DRELine[] = [];
    
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
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const renderLine = (line: DRELine) => {
    const isExpanded = expandedAccounts.has(line.id);
    const isReceita = line.nature === "RECEITA";
    const isDespesa = line.nature === "DESPESA";
    const isResultado = line.nature === "RESULTADO";
    const isFinanciamento = line.nature === "FINANCIAMENTO";
    
    // Determine styling based on nature and code
    const mainCode = parseFloat(line.code.split('.')[0]);
    const isCapital = mainCode === 9;
    
    return (
      <TableRow 
        key={line.id}
        className={cn(
          line.level === 0 && "bg-muted/50 font-semibold",
          line.level === 0 && line.hasChildren && "font-bold",
          isResultado && "bg-primary/10 font-bold",
          isFinanciamento && "bg-blue-50/50 dark:bg-blue-950/20",
          isCapital && !isResultado && "bg-blue-50/30 dark:bg-blue-950/10"
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
            <span className="text-muted-foreground font-mono text-sm">{line.code}</span>
            <span>{line.name}</span>
            {isResultado && (
              <span className="text-xs text-muted-foreground ml-1">(calculado)</span>
            )}
          </div>
        </TableCell>
        <TableCell 
          className={cn(
            "text-right font-mono",
            isReceita && line.value > 0 && "text-green-600",
            isDespesa && line.value > 0 && "text-red-600",
            isResultado && line.value >= 0 && "text-green-600 font-bold",
            isResultado && line.value < 0 && "text-red-600 font-bold",
            isFinanciamento && line.value > 0 && "text-blue-600",
            isCapital && !isResultado && "text-blue-600"
          )}
        >
          {isDespesa && line.value > 0 ? (
            `(${formatCurrency(line.value)})`
          ) : isCapital && line.code.startsWith("9.2") && line.value > 0 ? (
            `(${formatCurrency(line.value)})`
          ) : (
            formatCurrency(line.value)
          )}
        </TableCell>
      </TableRow>
    );
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Demonstração do Resultado do Exercício (DRE)
          </h2>
          <p className="text-sm text-muted-foreground">
            {filters.regime === "CAIXA" ? "Regime de Caixa" : "Regime de Competência"} - Estrutura fiel ao Plano de Contas
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
                <TableHead className="w-[65%]">Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLines.map(renderLine)}
              
              {/* Summary footer */}
              <TableRow>
                <TableCell colSpan={2} className="h-4 bg-muted/30" />
              </TableRow>
              <TableRow className="bg-green-50 dark:bg-green-950/20 font-semibold">
                <TableCell>TOTAL RECEITAS</TableCell>
                <TableCell className="text-right text-green-600 font-mono">
                  {formatCurrency(dreData?.summary.totalReceitas || 0)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-red-50 dark:bg-red-950/20 font-semibold">
                <TableCell>TOTAL DESPESAS</TableCell>
                <TableCell className="text-right text-red-600 font-mono">
                  ({formatCurrency(dreData?.summary.totalDespesas || 0)})
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
