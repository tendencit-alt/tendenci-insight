import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart3, Download, ChevronRight, ChevronDown, Wallet } from "lucide-react";
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
  isCalculated?: boolean;
}

interface DRESummary {
  totalReceitas: number;
  totalDespesas: number;
  margemContribuicao: number;
  resultadoOperacional: number;
  resultadoFinanceiro: number;
  resultadoAntesCapital: number;
  contratacaoEmprestimos: number;
  liquidacaoEmprestimos: number;
  variacaoLiquidaCaixa: number;
  lucroLiquido: number;
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
  const [capitalExpanded, setCapitalExpanded] = useState(true);
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

      // Calculate summary totals based on nature and code patterns
      let totalReceitas = 0;
      let totalDespesasVariaveis = 0; // CMV, Despesas sobre venda
      let totalDespesasOperacionais = 0;
      let resultadoFinanceiro = 0;
      let contratacaoEmprestimos = 0;
      let liquidacaoEmprestimos = 0;

      // Only sum root level accounts to avoid double counting
      const rootAccounts = chartAccounts?.filter(a => !a.parent_id) || [];
      
      rootAccounts.forEach(account => {
        const directValue = accountValues.get(account.id) || 0;
        const childrenTotal = calculateTotals(tree, accountValues, account.id);
        const total = directValue + childrenTotal;
        
        // Classify by code and nature
        const code = account.code;
        
        if (code === "1" || account.nature === "RECEITA" && !account.parent_id && code !== "7") {
          totalReceitas += total;
        } else if (code === "2" || code === "3") {
          // CMV and Despesas sobre Venda
          totalDespesasVariaveis += total;
        } else if (code === "5") {
          // Despesas Operacionais
          totalDespesasOperacionais += total;
        } else if (code === "7") {
          // Resultado Financeiro
          resultadoFinanceiro += total;
        } else if (code === "9") {
          // Movimentações de Capital
          const children = tree.get(account.id) || [];
          children.forEach(child => {
            const childValue = accountValues.get(child.id) || 0;
            const childChildrenTotal = calculateTotals(tree, accountValues, child.id);
            const childTotal = childValue + childChildrenTotal;
            
            if (child.code === "9.1") {
              contratacaoEmprestimos += childTotal;
            } else if (child.code === "9.2") {
              liquidacaoEmprestimos += childTotal;
            }
          });
        } else if (account.nature === "DESPESA" && !["2", "3", "5", "7"].includes(code)) {
          totalDespesasOperacionais += total;
        }
      });

      // Calculate derived values
      const margemContribuicao = totalReceitas - totalDespesasVariaveis;
      const resultadoOperacional = margemContribuicao - totalDespesasOperacionais;
      const resultadoAntesCapital = resultadoOperacional - resultadoFinanceiro;
      const variacaoLiquidaCaixa = resultadoAntesCapital + contratacaoEmprestimos - liquidacaoEmprestimos;
      const lucroLiquido = resultadoOperacional - resultadoFinanceiro;

      const summary: DRESummary = {
        totalReceitas,
        totalDespesas: totalDespesasVariaveis + totalDespesasOperacionais,
        margemContribuicao,
        resultadoOperacional,
        resultadoFinanceiro,
        resultadoAntesCapital,
        contratacaoEmprestimos,
        liquidacaoEmprestimos,
        variacaoLiquidaCaixa,
        lucroLiquido,
      };

      return {
        lines,
        summary,
        chartAccounts: chartAccounts || [],
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

  // Separate lines by category
  const categorizedLines = useMemo(() => {
    if (!dreData?.lines) return { operational: [], financial: [], capital: [], cash: [] };
    
    const operational: DRELine[] = [];
    const financial: DRELine[] = [];
    const capital: DRELine[] = [];
    const cash: DRELine[] = [];
    
    dreData.lines.forEach(line => {
      // Skip calculated result lines (they're handled separately)
      if (line.nature === "RESULTADO") return;
      
      const rootCode = line.code.split('.')[0];
      
      if (rootCode === "7") {
        financial.push(line);
      } else if (rootCode === "9" || line.nature === "CAPITAL") {
        capital.push(line);
      } else if (rootCode === "10" || line.nature === "CAIXA") {
        cash.push(line);
      } else {
        operational.push(line);
      }
    });
    
    return { operational, financial, capital, cash };
  }, [dreData?.lines]);

  // Filter visible lines based on expanded state
  const getVisibleLines = (lines: DRELine[]) => {
    const visible: DRELine[] = [];
    
    lines.forEach(line => {
      // Check if any ancestor is collapsed
      let shouldHide = false;
      let currentParentId = line.parentId;
      
      while (currentParentId) {
        if (!expandedAccounts.has(currentParentId)) {
          shouldHide = true;
          break;
        }
        const parent = dreData?.lines.find(l => l.id === currentParentId);
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
    const isCapital = line.nature === "CAPITAL";
    
    return (
      <TableRow 
        key={line.id}
        className={cn(
          line.level === 0 && "bg-muted/50 font-semibold",
          line.isSubtotal && "font-bold",
          isCapital && "bg-blue-50/50 dark:bg-blue-950/20"
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
            isCapital && line.value > 0 && "text-blue-600",
            line.value < 0 && "text-red-600"
          )}
        >
          {isDespesa && line.value > 0 ? (
            `(${formatCurrency(line.value)})`
          ) : isCapital && line.code === "9.2" && line.value > 0 ? (
            `(${formatCurrency(line.value)})`
          ) : (
            formatCurrency(line.value)
          )}
        </TableCell>
      </TableRow>
    );
  };

  const renderResultRow = (label: string, value: number, options?: { 
    variant?: 'normal' | 'highlight' | 'subtotal' | 'capital' | 'cash',
    showSign?: boolean 
  }) => {
    const { variant = 'normal', showSign = false } = options || {};
    
    const isPositive = value >= 0;
    const prefix = showSign && isPositive ? '+ ' : showSign && !isPositive ? '- ' : '';
    
    return (
      <TableRow 
        className={cn(
          variant === 'highlight' && "bg-primary/10 font-bold text-lg",
          variant === 'subtotal' && "bg-muted/70 font-semibold",
          variant === 'capital' && "bg-blue-50 dark:bg-blue-950/30 font-semibold",
          variant === 'cash' && "bg-amber-50 dark:bg-amber-950/30 font-bold"
        )}
      >
        <TableCell className={cn(
          variant === 'highlight' && "pl-4",
          variant === 'subtotal' && "pl-4",
          variant === 'capital' && "pl-6",
          variant === 'cash' && "pl-4"
        )}>
          {variant === 'cash' && <Wallet className="inline h-4 w-4 mr-2" />}
          {label}
        </TableCell>
        <TableCell 
          className={cn(
            "text-right",
            isPositive ? "text-green-600" : "text-red-600",
            variant === 'capital' && "text-blue-600"
          )}
        >
          {prefix}{formatCurrency(Math.abs(value))}
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

  const summary = dreData?.summary;
  const visibleOperational = getVisibleLines(categorizedLines.operational);
  const visibleFinancial = getVisibleLines(categorizedLines.financial);
  const visibleCapital = getVisibleLines(categorizedLines.capital);

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
              {/* Operational Lines (1-6) */}
              {visibleOperational.map(renderLine)}

              {/* Margem de Contribuição */}
              {renderResultRow("= MARGEM DE CONTRIBUIÇÃO", summary?.margemContribuicao || 0, { variant: 'subtotal' })}

              {/* Resultado Operacional */}
              {renderResultRow("= RESULTADO OPERACIONAL", summary?.resultadoOperacional || 0, { variant: 'subtotal' })}

              {/* Financial Lines (7) */}
              {visibleFinancial.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={2} className="h-2 bg-muted/30" />
                  </TableRow>
                  {visibleFinancial.map(renderLine)}
                </>
              )}

              {/* Resultado Antes do Capital */}
              {renderResultRow("= RESULTADO ANTES DO CAPITAL", summary?.resultadoAntesCapital || 0, { variant: 'highlight' })}

              {/* Capital Lines (9) - Collapsible */}
              {visibleCapital.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={2} className="h-1" />
                  </TableRow>
                  <TableRow className="bg-blue-100/50 dark:bg-blue-950/40">
                    <TableCell colSpan={2} className="py-3">
                      <Collapsible open={capitalExpanded} onOpenChange={setCapitalExpanded}>
                        <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-300 hover:underline">
                          {capitalExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Movimentações de Capital – Empréstimos
                          <span className="text-xs font-normal text-muted-foreground ml-2">
                            (Não impacta resultado operacional)
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Table className="mt-2">
                            <TableBody>
                              {visibleCapital.filter(l => l.code !== "9").map(line => (
                                <TableRow 
                                  key={line.id}
                                  className="bg-blue-50/50 dark:bg-blue-950/20"
                                >
                                  <TableCell style={{ paddingLeft: `${16}px` }}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">{line.code}</span>
                                      <span>{line.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell 
                                    className={cn(
                                      "text-right text-blue-600",
                                    )}
                                  >
                                    {line.code === "9.2" && line.value > 0 ? (
                                      `(${formatCurrency(line.value)})`
                                    ) : (
                                      formatCurrency(line.value)
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CollapsibleContent>
                      </Collapsible>
                    </TableCell>
                  </TableRow>
                </>
              )}

              {/* Variação Líquida de Caixa */}
              <TableRow>
                <TableCell colSpan={2} className="h-2" />
              </TableRow>
              <TableRow className="bg-amber-100/70 dark:bg-amber-950/40 font-bold">
                <TableCell className="pl-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                    <span className="text-amber-800 dark:text-amber-300">
                      VARIAÇÃO LÍQUIDA DE CAIXA
                    </span>
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      (Resultado de caixa, não lucro)
                    </span>
                  </div>
                </TableCell>
                <TableCell 
                  className={cn(
                    "text-right text-lg font-bold",
                    (summary?.variacaoLiquidaCaixa || 0) >= 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  )}
                >
                  {formatCurrency(summary?.variacaoLiquidaCaixa || 0)}
                </TableCell>
              </TableRow>

              {/* Summary Section */}
              <TableRow>
                <TableCell colSpan={2} className="h-4 bg-muted/30" />
              </TableRow>

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
