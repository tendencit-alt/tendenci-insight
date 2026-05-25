import React from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  TrendingUp, Download, ChevronRight, ChevronDown, FileText, Wallet,
  ArrowUpCircle, ArrowDownCircle, Flame, Clock, Eye, EyeOff
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useActiveTenant } from "@/hooks/useActiveTenant";

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
  grupo_fluxo: string | null;
}

interface LedgerEntry {
  id: string;
  chart_account_id: string;
  description: string;
  amount: number;
  cash_date: string;
  document_number: string | null;
  status?: string;
}

interface CashflowBlock {
  id: string;
  code: string;
  name: string;
  type: "block" | "calc";
  value: number;
  competenceValue: number;
  children: CashflowLine[];
  icon?: string;
  colorClass?: string;
}

interface CashflowLine {
  id: string;
  code: string;
  name: string;
  nature: string | null;
  value: number;
  competenceValue: number;
  level: number;
  hasChildren: boolean;
  parentId: string | null;
  entries: LedgerEntry[];
  status?: "conciliado" | "pendente" | "previsto" | "realizado";
}

// Route account to cashflow block based on grupo_fluxo (from DB) with code-based refinement
// for splitting OPERACIONAL_SAIDA between "saídas sobre vendas" (root 2) and "estrutura" (root 3).
function getBlockForAccount(account: { code: string; grupo_fluxo: string | null }): string {
  const grupo = account.grupo_fluxo;
  const root = account.code.split('.')[0];

  if (!grupo) return "nao_classificados";
  if (grupo === "NAO_CAIXA") return "nao_classificados";
  if (grupo === "OPERACIONAL_ENTRADA") return "entradas_operacionais";
  if (grupo === "OPERACIONAL_SAIDA") {
    return root === "2" ? "saidas_vendas" : "saidas_estrutura";
  }
  if (grupo === "INVESTIMENTO_ENTRADA" || grupo === "INVESTIMENTO_SAIDA") return "investimentos";
  if (grupo === "FINANCIAMENTO_ENTRADA" || grupo === "FINANCIAMENTO_SAIDA") return "mov_capital";
  return "nao_classificados";
}

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

export function CashflowTab({ filters, onFiltersChange }: CashflowTabProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [executiveMode, setExecutiveMode] = useState(false);
  const [hiddenBlocks, setHiddenBlocks] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('cashflow-chart-accounts-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_chart_accounts' }, () => {
        queryClient.invalidateQueries({ queryKey: ["fin-cashflow-list"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: cashflowData, isLoading } = useQuery({
    queryKey: ["fin-cashflow-list", filters],
    queryFn: async () => {
      const dateFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "2000-01-01";
      const dateTo = filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : "2099-12-31";

      // Get chart accounts with in_cashflow = true
      const { data: chartAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature, parent_id, grupo_fluxo")
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

      // Get cash entries
      let query = supabase
        .from("fin_ledger_entries")
        .select("id, chart_account_id, description, amount, cash_date, document_number, has_splits, type, status")
        .neq("status", "CANCELADO")
        .not("cash_date", "is", null)
        .gte("cash_date", dateFrom)
        .lte("cash_date", dateTo);

      if (filters.bankAccountId) query = query.eq("bank_account_id", filters.bankAccountId);
      if (filters.costCenterId) query = query.or(`cost_center_id.eq.${filters.costCenterId},has_splits.eq.true`);
      if (filters.projectId) query = query.eq("project_id", filters.projectId);
      if (filters.clientId) query = query.eq("client_id", filters.clientId);
      if (filters.vendedorId) query = query.eq("vendedor_id", filters.vendedorId);
      if (filters.orderId) query = query.eq("order_id", filters.orderId);
      if (filters.subcategoryId) query = query.eq("chart_account_id", filters.subcategoryId);
      else if (filters.categoryId) query = query.eq("chart_account_id", filters.categoryId);

      const { data: rawEntries } = await query;

      // Competence entries
      let compQuery = supabase
        .from("fin_ledger_entries")
        .select("type, amount, status, chart_account_id")
        .neq("status", "CANCELADO")
        .gte("competence_date", dateFrom)
        .lte("competence_date", dateTo)
        .not("competence_date", "is", null);

      if (filters.bankAccountId) compQuery = compQuery.eq("bank_account_id", filters.bankAccountId);
      if (filters.costCenterId) compQuery = compQuery.or(`cost_center_id.eq.${filters.costCenterId},has_splits.eq.true`);
      if (filters.projectId) compQuery = compQuery.eq("project_id", filters.projectId);
      if (filters.clientId) compQuery = compQuery.eq("client_id", filters.clientId);
      if (filters.vendedorId) compQuery = compQuery.eq("vendedor_id", filters.vendedorId);
      if (filters.orderId) compQuery = compQuery.eq("order_id", filters.orderId);
      if (filters.subcategoryId) compQuery = compQuery.eq("chart_account_id", filters.subcategoryId);
      else if (filters.categoryId) compQuery = compQuery.eq("chart_account_id", filters.categoryId);

      const { data: compEntries } = await compQuery;

      const competenceAmounts = new Map<string, number>();
      compEntries?.forEach(e => {
        if (e.chart_account_id) {
          const current = competenceAmounts.get(e.chart_account_id) || 0;
          competenceAmounts.set(e.chart_account_id, current + Number(e.amount));
        }
      });

      // Resolve splits
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
          splits?.forEach(s => { splitAmounts.set(s.parent_entry_id, Number(s.amount)); });
        }
        entries = rawEntries.map(e => {
          if (e.has_splits === true) {
            const splitAmount = splitAmounts.get(e.id);
            if (splitAmount !== undefined && splitAmount > 0) return { ...e, amount: splitAmount };
            return null;
          }
          return e;
        }).filter(Boolean) as typeof rawEntries;
      }

      // Build tree
      const tree = new Map<string | null, ChartAccount[]>();
      chartAccounts?.forEach(account => {
        const parentId = account.parent_id;
        if (!tree.has(parentId)) tree.set(parentId, []);
        tree.get(parentId)!.push(account);
      });
      tree.forEach(children => { children.sort((a, b) => numericCodeSort(a.code, b.code)); });

      // Group entries by account
      const accountValues = new Map<string, number>();
      const entriesByAccount = new Map<string, LedgerEntry[]>();
      
      entries?.forEach(entry => {
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
            status: entry.status || undefined,
          });
        }
      });

      entriesByAccount.forEach(entries => {
        entries.sort((a, b) => a.cash_date.localeCompare(b.cash_date));
      });

      // Flatten accounts into lines grouped by block
      const rootAccounts = chartAccounts?.filter(a => !a.parent_id) || [];
      
      const blockData: Record<string, { total: number; compTotal: number; lines: CashflowLine[] }> = {
        entradas_operacionais: { total: 0, compTotal: 0, lines: [] },
        saidas_vendas: { total: 0, compTotal: 0, lines: [] },
        saidas_estrutura: { total: 0, compTotal: 0, lines: [] },
        mov_financeiras: { total: 0, compTotal: 0, lines: [] },
        mov_capital: { total: 0, compTotal: 0, lines: [] },
        investimentos: { total: 0, compTotal: 0, lines: [] },
        nao_classificados: { total: 0, compTotal: 0, lines: [] },
      };

      const flattenIntoBlock = (
        blockKey: string,
        accountId: string | null,
        level: number
      ) => {
        const children = tree.get(accountId) || [];
        children.forEach(account => {
          const hasChildren = tree.has(account.id) && (tree.get(account.id)?.length || 0) > 0;
          const directValue = accountValues.get(account.id) || 0;
          const childrenTotal = hasChildren ? calculateTotals(tree, accountValues, account.id) : 0;
          const totalValue = directValue + childrenTotal;

          const directComp = competenceAmounts.get(account.id) || 0;
          const childrenComp = hasChildren ? calculateTotals(tree, competenceAmounts, account.id) : 0;
          const competenceValue = directComp + childrenComp;

          const acctEntries = entriesByAccount.get(account.id) || [];

          blockData[blockKey].lines.push({
            id: account.id,
            code: account.code,
            name: account.name,
            nature: account.nature,
            value: totalValue,
            competenceValue,
            level,
            hasChildren,
            parentId: account.parent_id,
            entries: acctEntries,
          });

          if (hasChildren) {
            flattenIntoBlock(blockKey, account.id, level + 1);
          }
        });
      };

      rootAccounts.forEach(root => {
        const blockKey = getBlockForAccount(root);
        if (!blockData[blockKey]) return;

        const directValue = accountValues.get(root.id) || 0;
        const childrenTotal = calculateTotals(tree, accountValues, root.id);
        const rootTotal = directValue + childrenTotal;

        const directComp = competenceAmounts.get(root.id) || 0;
        const childrenComp = calculateTotals(tree, competenceAmounts, root.id);
        const rootCompTotal = directComp + childrenComp;

        blockData[blockKey].total += rootTotal;
        blockData[blockKey].compTotal += rootCompTotal;

        // Add root line
        const hasChildren = tree.has(root.id) && (tree.get(root.id)?.length || 0) > 0;
        blockData[blockKey].lines.push({
          id: root.id,
          code: root.code,
          name: root.name,
          nature: root.nature,
          value: rootTotal,
          competenceValue: rootCompTotal,
          level: 0,
          hasChildren,
          parentId: null,
          entries: entriesByAccount.get(root.id) || [],
        });

        if (hasChildren) {
          flattenIntoBlock(blockKey, root.id, 1);
        }
      });

      // Calculate automatic lines
      const entradasOp = blockData.entradas_operacionais.total;
      const saidasVendas = blockData.saidas_vendas.total;
      const saidasEstrutura = blockData.saidas_estrutura.total;
      const geracaoOperacional = entradasOp - saidasVendas - saidasEstrutura;

      const movFinRecebimentos = blockData.mov_financeiras.total; // net (receitas - despesas fin)
      const movCapital = blockData.mov_capital.total; // net (entrada - saída empréstimos)
      const totalInvestimentos = blockData.investimentos.total;

      const variacaoLiquida = geracaoOperacional + movFinRecebimentos + movCapital - totalInvestimentos;
      const saldoFinal = openingBalance + variacaoLiquida;

      // Calculate indicators
      const totalSaidas = saidasVendas + saidasEstrutura + totalInvestimentos;
      const daysInPeriod = differenceInDays(filters.dateTo || new Date(), filters.dateFrom || new Date()) || 30;
      const burnRateMensal = daysInPeriod > 0 ? (totalSaidas / daysInPeriod) * 30 : 0;
      const runwayMeses = burnRateMensal > 0 ? saldoFinal / burnRateMensal : 0;
      const saldoProjetado30 = saldoFinal + (geracaoOperacional / daysInPeriod) * 30;
      const saldoProjetado90 = saldoFinal + (geracaoOperacional / daysInPeriod) * 90;

      return {
        blockData,
        openingBalance,
        geracaoOperacional,
        variacaoLiquida,
        saldoFinal,
        burnRateMensal,
        runwayMeses,
        saldoProjetado30,
        saldoProjetado90,
        entradasOp,
        totalSaidas,
      };
    },
  });

  const toggleExpand = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId); else next.add(accountId);
      return next;
    });
  };

  const toggleEntries = (accountId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId); else next.add(accountId);
      return next;
    });
  };

  const toggleBlockVisibility = (blockKey: string) => {
    setHiddenBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockKey)) next.delete(blockKey); else next.add(blockKey);
      return next;
    });
  };

  const expandAll = () => {
    if (!cashflowData) return;
    const allIds: string[] = [];
    Object.values(cashflowData.blockData).forEach(block => {
      block.lines.forEach(l => {
        if (l.hasChildren || l.entries.length > 0) allIds.push(l.id);
      });
    });
    setExpandedAccounts(new Set(allIds));
    setExpandedEntries(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedAccounts(new Set());
    setExpandedEntries(new Set());
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getVisibleLines = (lines: CashflowLine[]) => {
    const visible: CashflowLine[] = [];
    lines.forEach(line => {
      // Skip root accounts for display (block header replaces them)
      if (line.level === 0) {
        // Always show root for tree expansion
        visible.push(line);
        return;
      }
      let shouldHide = false;
      let currentParentId = line.parentId;
      while (currentParentId) {
        if (!expandedAccounts.has(currentParentId)) { shouldHide = true; break; }
        const parent = lines.find(l => l.id === currentParentId);
        currentParentId = parent?.parentId || null;
      }
      if (!shouldHide) visible.push(line);
    });
    return visible;
  };

  const renderLine = (line: CashflowLine, blockLines: CashflowLine[]) => {
    const isExpanded = expandedAccounts.has(line.id);
    const isEntriesExpanded = expandedEntries.has(line.id);
    const isReceita = line.nature === "RECEITA";
    const isDespesa = line.nature === "DESPESA";
    const hasEntries = line.entries.length > 0;
    const canExpand = line.hasChildren || hasEntries;

    // Find parent value for percentage
    const parent = line.parentId ? blockLines.find(l => l.id === line.parentId) : null;
    const percentage = parent && parent.value !== 0 && line.value !== 0
      ? Math.abs((line.value / parent.value) * 100) : null;

    const rows: JSX.Element[] = [];

    rows.push(
      <TableRow
        key={line.id}
        className={cn(
          line.level === 0 && "bg-muted/50 font-semibold",
        )}
      >
        <TableCell
          className="cursor-pointer select-none"
          style={{ paddingLeft: `${(line.level * 14) + 8}px` }}
          onClick={() => {
            if (line.hasChildren) { toggleExpand(line.id); if (hasEntries) toggleEntries(line.id); }
            else if (hasEntries) toggleEntries(line.id);
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
            <span className="text-muted-foreground font-mono text-[11px] shrink-0">{line.code}</span>
            <span className="truncate">{line.name}</span>
            {percentage !== null && line.level > 0 && (
              <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
                {percentage.toFixed(1)}%
              </span>
            )}
            {hasEntries && (
              <span className="text-xs text-muted-foreground ml-1">
                ({line.entries.length})
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right p-1">
          <div className="flex flex-col items-end">
            <span className={cn(
              "font-mono text-xs",
              isReceita && "text-green-600",
              isDespesa && "text-red-600",
            )}>
              {isDespesa && line.value > 0 ? `(${formatCurrency(line.value)})` : formatCurrency(line.value)}
            </span>
            {line.competenceValue !== 0 && line.value !== 0 && (
              <span className="text-[9px] text-muted-foreground/60 font-mono leading-tight">
                {((line.value / Math.abs(line.competenceValue)) * 100).toFixed(0)}% realizado
              </span>
            )}
          </div>
        </TableCell>
      </TableRow>
    );

    // Entry rows
    if (isEntriesExpanded && hasEntries) {
      line.entries.forEach(entry => {
        rows.push(
          <TableRow
            key={`${line.id}-entry-${entry.id}`}
            className="bg-muted/20 text-xs hover:bg-muted/40"
          >
            <TableCell style={{ paddingLeft: `${((line.level + 1) * 14) + 8}px` }}>
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => { setSelectedEntryId(entry.id); setEntryDialogOpen(true); }}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <FileText className="h-3 w-3 text-muted-foreground hover:text-primary" />
                </button>
                <span className="text-foreground/80 truncate">{entry.description}</span>
                {entry.status && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    {entry.status === "PAGO_RECEBIDO" ? "✓" : entry.status === "CONCILIADO" ? "✓✓" : entry.status === "VENCIDO" ? "!" : "○"}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className={cn(
              "text-right font-mono text-xs p-1",
              isReceita && "text-green-600/80",
              isDespesa && "text-red-600/80",
            )}>
              {isDespesa ? `(${formatCurrency(entry.amount)})` : formatCurrency(entry.amount)}
            </TableCell>
          </TableRow>
        );
      });
    }

    return rows;
  };

  const renderCalcLine = (label: string, value: number, highlight?: boolean) => (
    <TableRow key={label} className={cn(
      "font-bold border-t-2",
      highlight && (value >= 0
        ? "bg-green-100 dark:bg-green-950/30 border-green-400"
        : "bg-red-100 dark:bg-red-950/30 border-red-400"),
      !highlight && "bg-muted/60 border-muted-foreground/20"
    )}>
      <TableCell className="text-xs font-bold pl-2">{label}</TableCell>
      <TableCell className={cn(
        "text-right font-mono text-xs font-bold",
        value >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
      )}>
        {value >= 0 ? "▲ " : "▼ "}{formatCurrency(Math.abs(value))}
      </TableCell>
    </TableRow>
  );

  const renderBlockHeader = (label: string, icon: React.ReactNode, colorClass: string, total: number, blockKey: string) => {
    const isHidden = hiddenBlocks.has(blockKey);
    if (executiveMode && isHidden) return null;

    return (
      <TableRow key={`header-${blockKey}`} className={cn("font-bold", colorClass)}>
        <TableCell className="text-xs font-bold">
          <div className="flex items-center gap-2">
            {icon}
            <span>{label}</span>
            {executiveMode && (
              <button onClick={() => toggleBlockVisibility(blockKey)} className="ml-auto p-0.5 rounded hover:bg-muted">
                {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            )}
          </div>
        </TableCell>
        <TableCell className={cn("text-right font-mono text-xs font-bold",
          total >= 0 ? "text-green-600" : "text-red-600"
        )}>
          {formatCurrency(total)}
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

  const bd = cashflowData?.blockData;

  // Block configs
  const blocks = [
    { key: "entradas_operacionais", label: "Entradas Operacionais", icon: <ArrowUpCircle className="h-3.5 w-3.5" />, colorClass: "bg-green-50 dark:bg-green-950/20" },
    { key: "saidas_vendas", label: "Saídas Operacionais (Vendas)", icon: <ArrowDownCircle className="h-3.5 w-3.5" />, colorClass: "bg-red-50 dark:bg-red-950/20" },
    { key: "saidas_estrutura", label: "Saídas Operacionais (Estrutura)", icon: <ArrowDownCircle className="h-3.5 w-3.5" />, colorClass: "bg-orange-50 dark:bg-orange-950/20" },
  ];

  const blocksAfterCalc = [
    { key: "mov_financeiras", label: "Movimentações Financeiras", icon: <TrendingUp className="h-3.5 w-3.5" />, colorClass: "bg-blue-50 dark:bg-blue-950/20" },
    { key: "mov_capital", label: "Movimentações de Capital", icon: <Wallet className="h-3.5 w-3.5" />, colorClass: "bg-purple-50 dark:bg-purple-950/20" },
    { key: "investimentos", label: "Investimentos", icon: <Flame className="h-3.5 w-3.5" />, colorClass: "bg-amber-50 dark:bg-amber-950/20" },
    ...((bd?.nao_classificados?.lines.length ?? 0) > 0
      ? [{ key: "nao_classificados", label: "⚠ Não Classificados (definir Grupo de Fluxo)", icon: <Clock className="h-3.5 w-3.5" />, colorClass: "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-300 dark:border-yellow-800" }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <CostCenterSubFilter
        value={filters.costCenterId}
        onChange={(costCenterId) => onFiltersChange({ ...filters, costCenterId })}
        className="pb-2 border-b"
      />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            Fluxo de Caixa <span className="text-primary">(Gerencial)</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Regime de Caixa - Clique para expandir
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <div className="flex items-center gap-1.5">
            <Switch checked={executiveMode} onCheckedChange={setExecutiveMode} className="h-4 w-8" />
            <span className="text-xs text-muted-foreground">Executivo</span>
          </div>
          <Button variant="outline" size="sm" onClick={expandAll} className="h-8 text-xs">Expandir</Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-xs">Recolher</Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Card>
          <CardContent className="p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5">
              <Flame className="h-2.5 w-2.5" /> Burn Rate
            </p>
            <p className="text-xs sm:text-sm font-bold text-red-600 font-mono">
              {formatCurrency(cashflowData?.burnRateMensal || 0)}<span className="text-[10px] font-normal text-muted-foreground">/mês</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" /> Runway
            </p>
            <p className={cn("text-xs sm:text-sm font-bold font-mono",
              (cashflowData?.runwayMeses || 0) > 6 ? "text-green-600" : (cashflowData?.runwayMeses || 0) > 3 ? "text-amber-600" : "text-red-600"
            )}>
              {(cashflowData?.runwayMeses || 0).toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">meses</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Geração Operacional</p>
            <p className={cn("text-xs sm:text-sm font-bold font-mono",
              (cashflowData?.geracaoOperacional || 0) >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(cashflowData?.geracaoOperacional || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Projetado 30d</p>
            <p className={cn("text-xs sm:text-sm font-bold font-mono",
              (cashflowData?.saldoProjetado30 || 0) >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(cashflowData?.saldoProjetado30 || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Projetado 90d</p>
            <p className={cn("text-xs sm:text-sm font-bold font-mono",
              (cashflowData?.saldoProjetado90 || 0) >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(cashflowData?.saldoProjetado90 || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardContent className="p-1.5 sm:p-4">
          <div className="[&>div]:overflow-hidden">
            <Table className="w-full table-fixed text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Conta</TableHead>
                  <TableHead className="w-[120px] text-right text-xs">Realizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Saldo Inicial */}
                <TableRow className="bg-muted/30">
                  <TableCell className="text-xs font-semibold pl-2 flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    Saldo Inicial
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold">
                    {formatCurrency(cashflowData?.openingBalance || 0)}
                  </TableCell>
                </TableRow>

                {/* Block 1-3: Operational */}
                {blocks.map(block => {
                  const data = bd?.[block.key];
                  if (!data) return null;
                  const isHidden = hiddenBlocks.has(block.key);
                  
                  return (
                    <React.Fragment key={block.key}>
                      {renderBlockHeader(block.label, block.icon, block.colorClass, data.total, block.key)}
                      {!executiveMode && !isHidden && getVisibleLines(data.lines).map(line => renderLine(line, data.lines))}
                    </React.Fragment>
                  );
                })}

                {/* = Geração Operacional de Caixa */}
                {renderCalcLine("= Geração Operacional de Caixa", cashflowData?.geracaoOperacional || 0, true)}

                {/* Blocks 5-7: Financial, Capital, Investments */}
                {blocksAfterCalc.map(block => {
                  const data = bd?.[block.key];
                  if (!data) return null;
                  const isHidden = hiddenBlocks.has(block.key);
                  
                  return (
                    <React.Fragment key={block.key}>
                      {renderBlockHeader(block.label, block.icon, block.colorClass, data.total, block.key)}
                      {!executiveMode && !isHidden && getVisibleLines(data.lines).map(line => renderLine(line, data.lines))}
                    </React.Fragment>
                  );
                })}

                {/* = Variação Líquida */}
                {renderCalcLine("= Variação Líquida de Caixa", cashflowData?.variacaoLiquida || 0, true)}

                {/* = Saldo Final */}
                <TableRow className={cn(
                  "font-bold border-t-4",
                  (cashflowData?.saldoFinal || 0) >= 0
                    ? "bg-green-200 dark:bg-green-950/50 border-green-500"
                    : "bg-red-200 dark:bg-red-950/50 border-red-500"
                )}>
                  <TableCell className="text-sm font-bold pl-2">💰 SALDO FINAL</TableCell>
                  <TableCell className={cn(
                    "text-right font-mono text-sm font-bold",
                    (cashflowData?.saldoFinal || 0) >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                  )}>
                    {formatCurrency(cashflowData?.saldoFinal || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* KPI Footer Cards */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo Inicial</p>
            <p className="text-sm font-bold font-mono">{formatCurrency(cashflowData?.openingBalance || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Entradas</p>
            <p className="text-sm font-bold text-green-600 font-mono">{formatCurrency(cashflowData?.entradasOp || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Saídas</p>
            <p className="text-sm font-bold text-red-600 font-mono">{formatCurrency(cashflowData?.totalSaidas || 0)}</p>
          </CardContent>
        </Card>
        <Card className={cn("border-2",
          (cashflowData?.saldoFinal || 0) >= 0 ? "border-green-300 dark:border-green-700" : "border-red-300 dark:border-red-700"
        )}>
          <CardContent className="p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo Final</p>
            <p className={cn("text-sm font-bold font-mono",
              (cashflowData?.saldoFinal || 0) >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(cashflowData?.saldoFinal || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <EntryDetailsDialog
        entryId={selectedEntryId}
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
      />
    </div>
  );
}
