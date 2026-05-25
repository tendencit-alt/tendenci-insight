import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountsStatusTooltip } from "./AccountsStatusTooltip";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { CostCenterSubFilter } from "./CostCenterSubFilter";
import { EntryDetailsDialog } from "./EntryDetailsDialog";
import { useBudgetData, BudgetVersionLabel, VERSION_LABELS } from "@/hooks/useBudgetData";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Download, ChevronRight, ChevronDown, FileText, Target, TrendingUp, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { useActiveTenant } from "@/hooks/useActiveTenant";

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
  realizedValue: number;
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
  realizedAmounts: Map<string, number>,
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
    
    // Calculate realized value (direct + children)
    let realizedValue: number;
    if (isCalculated) {
      realizedValue = 0; // Will be set from summary
    } else {
      const directRealized = realizedAmounts.get(account.id) || 0;
      const childrenRealized = hasChildren ? calculateTotals(tree, realizedAmounts, account.id) : 0;
      realizedValue = directRealized + childrenRealized;
    }
    
    // Get entries for this account
    const entries = entriesByAccount.get(account.id) || [];
    
    lines.push({
      id: account.id,
      code: account.code,
      name: account.name,
      nature: account.nature,
      value: totalValue,
      realizedValue,
      level,
      hasChildren,
      parentId: account.parent_id,
      isCalculated,
      entries,
    });
    
    if (hasChildren) {
      flattenTree(tree, accountValues, calculatedValues, entriesByAccount, realizedAmounts, account.id, level + 1, lines);
    }
  });
}

export function DRETab({ filters, onFiltersChange }: DRETabProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [budgetVersion, setBudgetVersion] = useState<BudgetVersionLabel>("base");
  const queryClient = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  const dateField = "competence_date";

  // Derive year/month from filters for budget lookup
  const budgetPeriod = useMemo(() => {
    const d = filters.dateFrom || new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [filters.dateFrom]);

  const { data: budgetData } = useBudgetData({
    year: budgetPeriod.year,
    month: budgetPeriod.month,
    versionLabel: budgetVersion,
    costCenterId: filters.costCenterId,
    projectId: filters.projectId,
  });

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
    queryKey: ["fin-dre", filters, activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const dateFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "2000-01-01";
      const dateTo = filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : "2099-12-31";

      // Get ALL chart accounts with in_dre = true
      const { data: chartAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature, parent_id, dre_order")
        .eq("tenant_id", activeTenantId!)
        .eq("in_dre", true)
        .eq("active", true)
        .order("code");

      // Get ledger entries with full details
      let query = supabase
        .from("fin_ledger_entries")
        .select("id, chart_account_id, description, amount, competence_date, cash_date, document_number, party_type, party_id, has_splits, status")
        .eq("tenant_id", activeTenantId!)
        .neq("status", "CANCELADO")
        .gte(dateField, dateFrom)
        .lte(dateField, dateTo)
        .not(dateField, "is", null);

      if (filters.costCenterId) {
        query = query.or(`cost_center_id.eq.${filters.costCenterId},has_splits.eq.true`);
      }
      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }
      if (filters.clientId) {
        query = query.eq("client_id", filters.clientId);
      }
      if (filters.vendedorId) {
        query = query.eq("vendedor_id", filters.vendedorId);
      }
      if (filters.orderId) {
        query = query.eq("order_id", filters.orderId);
      }
      // Subcategoria tem prioridade sobre categoria
      if (filters.subcategoryId) {
        query = query.eq("chart_account_id", filters.subcategoryId);
      } else if (filters.categoryId) {
        query = query.eq("chart_account_id", filters.categoryId);
      }

      const { data: rawEntries } = await query;

      // Resolve split entries when filtering by cost center
      let entries = rawEntries;
      if (filters.costCenterId && rawEntries) {
        const splitParentIds = rawEntries.filter(e => e.has_splits === true).map(e => e.id);
        const splitAmounts = new Map<string, number>();
        
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

        entries = rawEntries.map(e => {
          if (e.has_splits === true) {
            const splitAmount = splitAmounts.get(e.id);
            if (splitAmount !== undefined && splitAmount > 0) {
              return { ...e, amount: splitAmount };
            }
            return null;
          }
          return e;
        }).filter(Boolean) as typeof rawEntries;
      }

      // Group entries by account and calculate values
      const accountValues = new Map<string, number>();
      const realizedAmounts = new Map<string, number>();
      const entriesByAccount = new Map<string, LedgerEntry[]>();
      let receitasRealizadas = 0;
      let despesasRealizadas = 0;
      
      entries?.forEach((entry) => {
        if (entry.chart_account_id) {
          // Sum values
          const current = accountValues.get(entry.chart_account_id) || 0;
          accountValues.set(entry.chart_account_id, current + Number(entry.amount));

          // Track realized amounts per account and globally
          if (entry.status === "PAGO_RECEBIDO") {
            const currentRealized = realizedAmounts.get(entry.chart_account_id) || 0;
            realizedAmounts.set(entry.chart_account_id, currentRealized + Number(entry.amount));
            
            const account = chartAccounts?.find(a => a.id === entry.chart_account_id);
            if (account) {
              const mainCode = parseFloat(account.code.split('.')[0]);
              if (mainCode === 1) {
                receitasRealizadas += Number(entry.amount);
              } else if ([2, 3, 4, 5, 6].includes(mainCode)) {
                despesasRealizadas += Number(entry.amount);
              }
            }
          }
          
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

      // Fetch tax regime to determine if root 7 should be visible
      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("tax_regime")
        .limit(1)
        .maybeSingle();
      
      const taxRegime = companySettings?.tax_regime || 'simples_nacional';
      const showImpostos = taxRegime !== 'simples_nacional';

      // Calculate totals for root-level accounts
      let totalReceitas = 0;
      let totalImpostosVenda = 0;  // 2.1
      let totalTaxasVenda = 0;     // 2.2
      let totalCustosDiretos = 0;  // 2.3
      let totalComissoes = 0;      // 2.4
      let totalAntecipacao = 0;    // 2.5
      let totalDespesasOp = 0;
      let totalDepreciacao = 0;
      let totalReceitasFinanceiras = 0;
      let totalDespesasFinanceiras = 0;
      let totalCapitalEntrada = 0;
      let totalCapitalSaida = 0;
      let totalImpostos = 0;

      // Build account lookup for fast classification.
      const accountById = new Map<string, ChartAccount>();
      (chartAccounts || []).forEach(a => accountById.set(a.id, a));

      // Aggregate totals directly from entries by chart account code.
      // Robust to tree gaps (e.g. root "1" not visible in tenant) and
      // ensures ALL non-CANCELADO entries are summed for competence DRE
      // (status=ABERTO included — regime de competência).
      entries?.forEach((e) => {
        if (!e.chart_account_id) return;
        const acc = accountById.get(e.chart_account_id);
        if (!acc) return;
        const parts = acc.code.split('.');
        const mainCode = parseFloat(parts[0]);
        const subCode = parseFloat(parts[1] || '0');
        const amt = Number(e.amount) || 0;

        if (mainCode === 1) {
          totalReceitas += amt;
        } else if (mainCode === 2) {
          if (subCode === 1) totalImpostosVenda += amt;
          else if (subCode === 2) totalTaxasVenda += amt;
          else if (subCode === 3) totalCustosDiretos += amt;
          else if (subCode === 4) totalComissoes += amt;
          else if (subCode === 5) totalAntecipacao += amt;
        } else if (mainCode === 3) {
          totalDespesasOp += amt;
        } else if (mainCode === 4) {
          totalDepreciacao += amt;
        } else if (mainCode === 5) {
          if (acc.nature === "RECEITA") totalReceitasFinanceiras += amt;
          else if (acc.nature === "DESPESA") totalDespesasFinanceiras += amt;
        } else if (mainCode === 6) {
          if (subCode === 1) totalCapitalEntrada += amt;
          else if (subCode === 2) totalCapitalSaida += amt;
        } else if (mainCode === 7) {
          totalImpostos += amt;
        }
      });

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[DRE competence]', {
          entries: entries?.length || 0,
          totalReceitas,
          totalDespesasOp,
          totalImpostosVenda,
        });
      }

      // Calculate derived values - clean managerial DRE
      const totalDespesasSobreVendas = totalImpostosVenda + totalTaxasVenda + totalCustosDiretos + totalComissoes + totalAntecipacao;
      const receitaLiquida = totalReceitas - totalDespesasSobreVendas;
      const margemContribuicao = receitaLiquida - totalCustosDiretos - totalComissoes;
      const resultadoOperacionalEBITDA = margemContribuicao - totalDespesasOp;
      const totalResultadoFinanceiro = totalReceitasFinanceiras - totalDespesasFinanceiras;
      const resultadoAntesImpostos = resultadoOperacionalEBITDA - totalDepreciacao + totalResultadoFinanceiro;
      const resultadoLiquido = resultadoAntesImpostos - totalImpostos;
      const variacaoLiquidaCaixa = resultadoLiquido + totalCapitalEntrada - totalCapitalSaida;

      // Calculate breakeven point
      const custosVariaveis = Math.abs(totalCustosDiretos + totalComissoes);
      const custosFixos = Math.abs(totalDespesasOp);
      
      const margemContribuicaoValor = receitaLiquida - custosVariaveis;
      const margemContribuicaoPercent = receitaLiquida > 0 
        ? (margemContribuicaoValor / receitaLiquida) * 100 
        : 0;
      
      let pontoEquilibrioRealizado = 0;
      if (custosFixos > 0 && margemContribuicaoPercent > 0) {
        pontoEquilibrioRealizado = custosFixos / (margemContribuicaoPercent / 100);
      } else if (custosFixos > 0 && margemContribuicaoPercent <= 0) {
        pontoEquilibrioRealizado = Number.MAX_SAFE_INTEGER;
      }

      // Calculated values for RESULTADO accounts
      const calculatedValues = new Map<string, number>();
      calculatedValues.set("5", totalResultadoFinanceiro);

      // Filter out root 7 if Simples Nacional (root 7 is deactivated but kept for safety)
      const filteredAccounts = showImpostos 
        ? (chartAccounts || [])
        : (chartAccounts || []).filter(a => {
            const mainCode = parseFloat(a.code.split('.')[0]);
            return mainCode !== 7;
          });

      // Flatten tree from filtered accounts
      const filteredTree = buildTree(filteredAccounts);
      const lines: DRELine[] = [];
      flattenTree(filteredTree, accountValues, calculatedValues, entriesByAccount, realizedAmounts, null, 0, lines);
      
      // Inject calculated intermediate lines after specific groups
      const injectAfterCode = (afterCode: string, calcLine: DRELine) => {
        let idx = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].code.startsWith(afterCode + '.') || lines[i].code === afterCode) {
            idx = i;
            break;
          }
        }
        if (idx >= 0) {
          lines.splice(idx + 1, 0, calcLine);
        } else {
          lines.push(calcLine);
        }
      };

      const makeCalcLine = (id: string, code: string, name: string, value: number): DRELine => ({
        id, code, name, nature: "RESULTADO", value, realizedValue: 0,
        level: 0, hasChildren: false, parentId: null, isCalculated: true, entries: [],
      });

      // RAC = Resultado Antes de Capital (EBIT + Depreciação + Resultado Financeiro, antes do bloco 6)
      const rac = resultadoOperacionalEBITDA - totalDepreciacao + totalResultadoFinanceiro;

      // Insert in reverse order so indices don't shift
      // Final: Resultado Líquido after impostos (or after root 5 if no impostos)
      if (showImpostos) {
        injectAfterCode("7", makeCalcLine("calc-resultado-liquido", "=RLi", "= Resultado Líquido", resultadoLiquido));
        injectAfterCode("5", makeCalcLine("calc-rac", "=RAC", "= Resultado Antes de Capital (RAC)", rac));
        injectAfterCode("5", makeCalcLine("calc-resultado-antes-impostos", "=RAI", "= Resultado Antes dos Impostos", resultadoAntesImpostos));
      } else {
        injectAfterCode("5", makeCalcLine("calc-resultado-liquido", "=RLi", "= Resultado Líquido", resultadoLiquido));
        injectAfterCode("5", makeCalcLine("calc-rac", "=RAC", "= Resultado Antes de Capital (RAC)", rac));
      }
      injectAfterCode("4", makeCalcLine("calc-ebit", "=EBIT", "= EBIT (Resultado Operacional)", resultadoOperacionalEBITDA - totalDepreciacao));
      injectAfterCode("3", makeCalcLine("calc-ebitda", "=EBITDA", "= EBITDA", resultadoOperacionalEBITDA));
      injectAfterCode("2", makeCalcLine("calc-margem", "=MC", "= Margem de Contribuição", margemContribuicao));
      injectAfterCode("2", makeCalcLine("calc-receita-liquida", "=RL2", "= Receita Líquida (RL2)", receitaLiquida));

      // Fetch goals for breakeven meta
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      
      const { data: goalsData } = await supabase
        .from("fin_financial_goals")
        .select("metric_key, target_amount")
        .eq("month", month)
        .eq("year", year)
        .is("cost_center_id", null)
        .is("project_id", null);

      const metaReceitas = goalsData?.find(g => g.metric_key === "receitas")?.target_amount || 0;
      const metaCustosVariaveis = goalsData?.find(g => g.metric_key === "custos_variaveis")?.target_amount || custosVariaveis;
      const metaDespesasFixas = goalsData?.find(g => g.metric_key === "despesas_fixas")?.target_amount || custosFixos;
      
      // Meta breakeven calculation using same formula
      // Se não houver meta de receitas, usar a mesma margem % realizada
      const metaMargemValor = metaReceitas > 0 ? metaReceitas - metaCustosVariaveis : margemContribuicaoValor;
      const metaMargemPercent = metaReceitas > 0 
        ? (metaMargemValor / metaReceitas) * 100
        : margemContribuicaoPercent;
      
      let pontoEquilibrioMeta = 0;
      if (metaDespesasFixas > 0 && metaMargemPercent > 0) {
        pontoEquilibrioMeta = metaDespesasFixas / (metaMargemPercent / 100);
      } else if (metaDespesasFixas > 0 && metaMargemPercent <= 0) {
        pontoEquilibrioMeta = Number.MAX_SAFE_INTEGER;
      }

      return {
        lines,
        summary: {
          totalReceitas,
          totalDespesas: totalDespesasSobreVendas + totalDespesasOp + totalDepreciacao + totalResultadoFinanceiro,
          margemContribuicao,
          margemContribuicaoPercent,
          resultadoOperacional: resultadoOperacionalEBITDA,
          resultadoFinanceiro: totalResultadoFinanceiro,
          resultadoLiquido,
          variacaoLiquidaCaixa,
          custosFixos,
          custosVariaveis,
          pontoEquilibrioRealizado,
          pontoEquilibrioMeta,
          metaReceitas,
          receitasRealizadas,
          despesasRealizadas,
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

  const getParentValue = (line: DRELine): number | null => {
    if (!line.parentId || !dreData?.lines) return null;
    const parent = dreData.lines.find(l => l.id === line.parentId);
    return parent ? parent.value : null;
  };

  const renderLine = (line: DRELine) => {
    const isExpanded = expandedAccounts.has(line.id);
    const isEntriesExpanded = expandedEntries.has(line.id);
    const isReceita = line.nature === "RECEITA";
    const isDespesa = line.nature === "DESPESA";
    const isResultado = line.nature === "RESULTADO";
    const isFinanciamento = line.nature === "FINANCIAMENTO";
    const mainCode = parseFloat(line.code.split('.')[0]);
    const isCapital = mainCode === 6;
    const hasEntries = line.entries.length > 0;
    const canExpand = line.hasChildren || hasEntries;
    
    // Calculate percentage composition
    const parentValue = getParentValue(line);
    const percentage = parentValue && parentValue !== 0 && line.value !== 0
      ? Math.abs((line.value / parentValue) * 100)
      : null;
    
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
          style={{ paddingLeft: `${(line.level * 14) + 8}px` }}
          onClick={() => {
            if (line.hasChildren) {
              toggleExpand(line.id);
              if (hasEntries) {
                toggleEntries(line.id);
              }
            } else if (hasEntries) {
              toggleEntries(line.id);
            }
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {canExpand ? (
              (isExpanded || isEntriesExpanded) ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <span className="text-muted-foreground font-mono text-[10px] shrink-0">{line.code}</span>
            <span className={cn(
              "truncate",
              isResultado && "font-semibold"
            )}>{line.name}</span>
            {percentage !== null && line.level > 0 && (
              <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
                {percentage.toFixed(1)}%
              </span>
            )}
            {hasEntries && (
              <span className="text-xs text-muted-foreground ml-1">
                ({line.entries.length} lançamento{line.entries.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </TableCell>
        {showBudget && (
          <TableCell className="text-right p-1">
            {(() => {
              const budgeted = budgetData?.byAccount?.get(line.id) || 0;
              return budgeted !== 0 ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {formatCurrency(budgeted)}
                </span>
              ) : <span className="text-[10px] text-muted-foreground">—</span>;
            })()}
          </TableCell>
        )}
        <TableCell className="text-right p-1">
          <div className="flex flex-col items-end">
            {isResultado ? (
              <div className={cn(
                "inline-flex items-center justify-end px-1.5 py-0.5 rounded font-bold font-mono text-[11px]",
                "bg-background shadow-sm border",
                line.value >= 0 
                  ? "border-green-300 dark:border-green-700 text-green-700 dark:text-green-400" 
                  : "border-red-300 dark:border-red-700 text-red-700 dark:text-red-400"
              )}>
                {line.value >= 0 ? "▲ " : "▼ "}
                {formatCurrency(Math.abs(line.value))}
              </div>
            ) : (
              <span className={cn(
                "font-mono text-xs",
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
            {line.value !== 0 && !line.isCalculated && (
              <span className="text-[9px] text-muted-foreground/60 font-mono leading-tight">
                {((line.realizedValue / Math.abs(line.value)) * 100).toFixed(0)}% ({formatCurrency(line.realizedValue)})
              </span>
            )}
          </div>
        </TableCell>
        {showBudget && (
          <TableCell className="text-right p-1">
            {(() => {
              const budgeted = budgetData?.byAccount?.get(line.id) || 0;
              if (budgeted === 0) return <span className="text-[10px] text-muted-foreground">—</span>;
              const desvio = ((line.value - budgeted) / Math.abs(budgeted)) * 100;
              const isGood = isDespesa ? desvio <= 0 : desvio >= 0;
              return (
                <span className={cn("font-mono text-[10px] font-medium", isGood ? "text-green-600" : "text-red-600")}>
                  {desvio >= 0 ? "+" : ""}{desvio.toFixed(1)}%
                </span>
              );
            })()}
          </TableCell>
        )}
      </TableRow>
    );
    
    // Entry rows (when expanded - show direct entries even on parent accounts)
    if (isEntriesExpanded && hasEntries) {
      line.entries.forEach((entry, idx) => {
        const entryDate = entry.cash_date;
        rows.push(
          <TableRow 
            key={`${line.id}-entry-${entry.id}`}
            className="bg-muted/20 text-xs hover:bg-muted/40"
          >
            <TableCell 
              style={{ paddingLeft: `${((line.level + 1) * 14) + 8}px` }}
            >
              <div className="flex items-center gap-2 min-w-0">
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
                <span className="text-foreground/80 truncate">{entry.description}</span>
                {line.value !== 0 && (
                  <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
                    {((entry.amount / Math.abs(line.value)) * 100).toFixed(1)}%
                  </span>
                )}
                {entry.document_number && (
                  <span className="text-xs text-muted-foreground">
                    Doc: {entry.document_number}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell 
              className={cn(
                "text-right font-mono text-xs p-1",
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            DRE <span className="text-primary">(Competência)</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Demonstração do Resultado - Clique para expandir
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <div className="flex items-center gap-1.5 rounded-lg border px-2 py-1">
            <input
              type="checkbox"
              checked={showBudget}
              onChange={(e) => setShowBudget(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Orçado</span>
            {showBudget && (
              <Select value={budgetVersion} onValueChange={(v) => setBudgetVersion(v as BudgetVersionLabel)}>
                <SelectTrigger className="h-6 w-[120px] text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VERSION_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={expandAll} className="h-8 whitespace-nowrap text-xs">
            Expandir
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 whitespace-nowrap text-xs">
            Recolher
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 whitespace-nowrap text-xs">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exportar</span> PDF
          </Button>
        </div>
      </div>

      {/* Breakeven Point Cards - Linha 1 */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Ponto de Equilíbrio Meta */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5">
              <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
              Equilíbrio Meta
            </p>
            <p className="text-xs sm:text-sm font-bold text-primary break-all">
              {(dreData?.summary.pontoEquilibrioMeta || 0) >= Number.MAX_SAFE_INTEGER 
                ? "∞" 
                : (dreData?.summary.custosFixos || 0) === 0 
                  ? "Sem custos"
                  : formatCurrency(dreData?.summary.pontoEquilibrioMeta || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Ponto de Equilíbrio Realizado */}
        <Card className={cn(
          "border-2",
          (dreData?.summary.totalReceitas || 0) >= (dreData?.summary.pontoEquilibrioRealizado || 0)
            ? "border-green-500/30 bg-green-500/5"
            : "border-red-500/30 bg-red-500/5"
        )}>
          <CardContent className="p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5">
              <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
              Equilíbrio Real
            </p>
            <p className={cn(
              "text-xs sm:text-sm font-bold break-all",
              (dreData?.summary.pontoEquilibrioRealizado || 0) >= Number.MAX_SAFE_INTEGER 
                ? "text-red-600"
                : (dreData?.summary.totalReceitas || 0) >= (dreData?.summary.pontoEquilibrioRealizado || 0)
                  ? "text-green-600"
                  : "text-red-600"
            )}>
              {(dreData?.summary.pontoEquilibrioRealizado || 0) >= Number.MAX_SAFE_INTEGER 
                ? "∞" 
                : (dreData?.summary.custosFixos || 0) === 0 
                  ? "Sem custos"
                  : formatCurrency(dreData?.summary.pontoEquilibrioRealizado || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakeven Point Cards - Linha 2 */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Margem de Contribuição */}
        <Card>
          <CardContent className="p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Margem Contribuição
            </p>
            <p className="text-xs sm:text-sm font-bold">
              {(dreData?.summary.margemContribuicaoPercent || 0).toFixed(1)}%
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground break-all">
              {formatCurrency(dreData?.summary.margemContribuicao || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Status - Valor Faltante em Destaque */}
        <Card className={cn(
          "border-2",
          (dreData?.summary.totalReceitas || 0) >= (dreData?.summary.pontoEquilibrioRealizado || 0)
            ? "border-green-500/50 bg-green-500/10"
            : "border-red-500/50 bg-red-500/10"
        )}>
          <CardContent className="p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Status</p>
            {(dreData?.summary.totalReceitas || 0) >= (dreData?.summary.pontoEquilibrioRealizado || 0) ? (
              <>
                <Badge className="bg-green-600 mt-0.5 gap-0.5 text-[10px] h-5 px-1">
                  <CheckCircle className="h-2.5 w-2.5" />
                  Acima
                </Badge>
                <p className="text-[10px] sm:text-xs text-green-600 font-medium mt-0.5 break-all">
                  +{formatCurrency((dreData?.summary.totalReceitas || 0) - (dreData?.summary.pontoEquilibrioRealizado || 0))}
                </p>
              </>
            ) : (
              <>
                <Badge variant="destructive" className="mt-0.5 gap-0.5 text-[10px] h-5 px-1">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Abaixo
                </Badge>
                <p className="text-xs sm:text-base font-bold text-red-600 mt-0.5 break-all">
                  -{formatCurrency((dreData?.summary.pontoEquilibrioRealizado || 0) - (dreData?.summary.totalReceitas || 0))}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-1.5 sm:p-4">
          <div className="[&>div]:overflow-hidden">
            <Table className="w-full table-fixed text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Conta</TableHead>
                  {showBudget && <TableHead className="w-[110px] text-right text-xs">Orçado</TableHead>}
                  <TableHead className="w-[120px] text-right text-xs">Realizado</TableHead>
                  {showBudget && <TableHead className="w-[70px] text-right text-xs">Δ%</TableHead>}
                </TableRow>
              </TableHeader>
            <TableBody>
              {visibleLines.map(line => renderLine(line))}
              
              {/* Summary footer */}
              <TableRow>
                <TableCell colSpan={2} className="h-3 bg-muted/30" />
              </TableRow>
              <TableRow className="bg-green-50 dark:bg-green-950/20 font-semibold">
                <TableCell className="text-xs">
                  <div>
                    <span className="inline-flex items-center gap-1">
                      TOTAL RECEITAS
                      <AccountsStatusTooltip dateFrom={filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : null} dateTo={filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : null} show="receivables" />
                    </span>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                      Realizado: <span className="font-semibold text-foreground">{((dreData?.summary.totalReceitas || 0) > 0 ? ((dreData?.summary.receitasRealizadas || 0) / (dreData?.summary.totalReceitas || 1) * 100) : 0).toFixed(1)}%</span>
                      <span className="ml-1 text-muted-foreground/70">({formatCurrency(dreData?.summary.receitasRealizadas || 0)})</span>
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right text-green-600 font-mono text-xs">
                  {formatCurrency(dreData?.summary.totalReceitas || 0)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-red-50 dark:bg-red-950/20 font-semibold">
                <TableCell className="text-xs">
                  <div>
                    <span className="inline-flex items-center gap-1">
                      TOTAL DESPESAS
                      <AccountsStatusTooltip dateFrom={filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : null} dateTo={filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : null} show="payables" />
                    </span>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                      Realizado: <span className="font-semibold text-foreground">{((dreData?.summary.totalDespesas || 0) > 0 ? ((dreData?.summary.despesasRealizadas || 0) / (dreData?.summary.totalDespesas || 1) * 100) : 0).toFixed(1)}%</span>
                      <span className="ml-1 text-muted-foreground/70">({formatCurrency(dreData?.summary.despesasRealizadas || 0)})</span>
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right text-red-600 font-mono text-xs">
                  ({formatCurrency(dreData?.summary.totalDespesas || 0)})
                </TableCell>
              </TableRow>
              {(() => {
                const resultado = (dreData?.summary.totalReceitas || 0) - (dreData?.summary.totalDespesas || 0);
                const resultadoRealizado = (dreData?.summary.receitasRealizadas || 0) - (dreData?.summary.despesasRealizadas || 0);
                const resultadoRealizadoPct = resultado !== 0 ? (resultadoRealizado / Math.abs(resultado)) * 100 : 0;
                return (
                  <TableRow className={cn(
                    "font-bold border-t-2",
                    resultado >= 0 
                      ? "bg-green-100 dark:bg-green-950/30 border-green-400" 
                      : "bg-red-100 dark:bg-red-950/30 border-red-400"
                  )}>
                    <TableCell className="text-xs font-bold">
                      <div>
                        RESULTADO
                        <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                          Realizado: <span className="font-semibold text-foreground">{resultadoRealizadoPct.toFixed(1)}%</span>
                          <span className="ml-1 text-muted-foreground/70">({formatCurrency(resultadoRealizado)})</span>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono text-xs font-bold",
                      resultado >= 0 
                        ? "text-green-700 dark:text-green-400" 
                        : "text-red-700 dark:text-red-400"
                    )}>
                      {resultado >= 0 ? "▲ " : "▼ "}
                      {formatCurrency(Math.abs(resultado))}
                    </TableCell>
                  </TableRow>
                );
              })()}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Entry Details Dialog */}
      <EntryDetailsDialog 
        entryId={selectedEntryId} 
        open={entryDialogOpen} 
        onOpenChange={setEntryDialogOpen} 
      />
    </div>
  );
}
