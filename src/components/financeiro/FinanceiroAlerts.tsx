import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertTriangle, 
  Bell,
  Calculator, 
  FileQuestion,
  ChevronDown,
  ChevronRight,
  Upload,
  Check,
  Clock,
  Wallet,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinanceiroAlertsProps {
  entries: any[];
  transactions: any[];
  lastImportDate?: string | null;
  isImportOverdue?: boolean;
  lastImportFormatted?: string | null;
  unreconciledEntries?: any[];
  unreconciledTotal?: number;
  selectedForReconcile?: Set<string>;
  onToggleSelectForReconcile?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onOpenReconcileDialog?: () => void;
  onNavigateToEntry?: (entryId: string) => void;
  getTypeBadge?: (type: string, compact?: boolean) => React.ReactNode;
  formatCurrency?: (value: number, type: string) => React.ReactNode;
}

interface AlertSection {
  id: string;
  type: 'warning' | 'error' | 'info';
  icon: React.ReactNode;
  title: string;
  count?: number;
  content: React.ReactNode;
}

export function FinanceiroAlerts({ 
  entries, 
  transactions, 
  lastImportDate, 
  isImportOverdue,
  lastImportFormatted,
  unreconciledEntries = [],
  unreconciledTotal = 0,
  selectedForReconcile = new Set(),
  onToggleSelectForReconcile,
  onToggleSelectAll,
  onOpenReconcileDialog,
  onNavigateToEntry,
  getTypeBadge,
  formatCurrency,
}: FinanceiroAlertsProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [dismissedOverdue, setDismissedOverdue] = useState<Set<string>>(new Set());

  // Fetch overdue payables/receivables
  const { data: overdueItems } = useQuery({
    queryKey: ["fin-overdue-alerts"],
    queryFn: async () => {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const items: { id: string; type: "payable" | "receivable"; description: string; amount: number; due_date: string; days_overdue: number; party_name: string }[] = [];

      const { data: payables } = await supabase
        .from("fin_payables")
        .select("id, description, amount, due_date, status, supplier:suppliers(name)")
        .in("status", ["ABERTO", "VENCIDO"])
        .lte("due_date", todayStr)
        .order("due_date", { ascending: true })
        .limit(10);

      payables?.forEach((p) => {
        items.push({
          id: p.id, type: "payable",
          description: p.description || "Conta a Pagar",
          amount: Number(p.amount), due_date: p.due_date,
          days_overdue: differenceInDays(today, new Date(p.due_date)),
          party_name: (p.supplier as any)?.name || "Fornecedor",
        });
      });

      const { data: receivables } = await supabase
        .from("fin_receivables")
        .select("id, description, amount, due_date, status, customer:clients(name)")
        .in("status", ["ABERTO", "VENCIDO"])
        .lte("due_date", todayStr)
        .order("due_date", { ascending: true })
        .limit(10);

      receivables?.forEach((r) => {
        items.push({
          id: r.id, type: "receivable",
          description: r.description || "Conta a Receber",
          amount: Number(r.amount), due_date: r.due_date,
          days_overdue: differenceInDays(today, new Date(r.due_date)),
          party_name: (r.customer as any)?.name || "Cliente",
        });
      });

      return items.sort((a, b) => b.days_overdue - a.days_overdue);
    },
    refetchInterval: 60000,
  });

  const visibleOverdue = overdueItems?.filter(i => !dismissedOverdue.has(i.id)) || [];

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Build alert sections
  const sections: AlertSection[] = [];

  // 0. Contas vencidas (highest priority)
  if (visibleOverdue.length > 0) {
    const totalOverdue = visibleOverdue.reduce((s, i) => s + i.amount, 0);
    sections.push({
      id: 'overdue-accounts',
      type: 'error',
      icon: <Wallet className="h-3.5 w-3.5" />,
      title: 'Contas vencidas',
      count: visibleOverdue.length,
      content: (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Total vencido: <span className="font-semibold text-destructive">{totalOverdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </p>
          <div className="space-y-1 rounded border border-border bg-background/50 p-2 max-h-[200px] overflow-y-auto">
            {visibleOverdue.map(item => (
              <div key={`${item.type}-${item.id}`} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-muted/50 gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.days_overdue > 0 ? (
                    <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{item.party_name}</span>
                    <span className="text-muted-foreground truncate block">{item.description}</span>
                  </div>
                  <Badge variant={item.type === "payable" ? "destructive" : "default"} className="text-[10px] h-4 px-1.5 flex-shrink-0">
                    {item.type === "payable" ? "Pagar" : "Receber"}
                  </Badge>
                  {item.days_overdue > 0 && (
                    <span className="text-destructive font-medium flex-shrink-0">{item.days_overdue}d</span>
                  )}
                  {item.days_overdue === 0 && (
                    <span className="text-yellow-600 font-medium flex-shrink-0">Hoje</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="font-semibold">{item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDismissedOverdue(prev => new Set([...prev, item.id])); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {dismissedOverdue.size > 0 && (
            <button
              onClick={() => setDismissedOverdue(new Set())}
              className="text-[10px] text-muted-foreground hover:text-foreground w-full text-center"
            >
              Mostrar {dismissedOverdue.size} oculto(s)
            </button>
          )}
        </div>
      ),
    });
  }

  // 1. Último Extrato Importado
  if (isImportOverdue) {
    sections.push({
      id: 'import-overdue',
      type: 'error',
      icon: <Upload className="h-3.5 w-3.5" />,
      title: 'Extrato desatualizado',
      content: (
        <p className="text-xs text-muted-foreground">
          {lastImportFormatted 
            ? `Último: ${lastImportFormatted}` 
            : "Nenhum extrato importado"}
          {" — "}Importe o extrato atualizado
        </p>
      ),
    });
  }

  // 2. Lançamentos pendentes de conciliação
  if (unreconciledEntries.length > 0) {
    sections.push({
      id: 'unreconciled-ledger',
      type: 'warning',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      title: 'Pendentes de conciliação',
      count: unreconciledEntries.length,
      content: (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {unreconciledEntries.length} lançamento(s) — total {unreconciledTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <div className="max-h-[200px] overflow-y-auto rounded border border-border bg-background/50">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs h-7 w-[32px]">
                    <Checkbox 
                      checked={selectedForReconcile.size === unreconciledEntries.length && unreconciledEntries.length > 0}
                      onCheckedChange={() => onToggleSelectAll?.()}
                      className="h-3.5 w-3.5"
                    />
                  </TableHead>
                  <TableHead className="text-xs h-7">Data</TableHead>
                  <TableHead className="text-xs h-7">Tipo</TableHead>
                  <TableHead className="text-xs h-7">Descrição</TableHead>
                  <TableHead className="text-xs text-right h-7">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unreconciledEntries.map((entry: any) => (
                  <TableRow 
                    key={entry.id} 
                    className={`hover:bg-muted/50 cursor-pointer ${selectedForReconcile.has(entry.id) ? "bg-primary/5" : ""}`}
                    onClick={() => onToggleSelectForReconcile?.(entry.id)}
                  >
                    <TableCell className="text-xs py-1.5">
                      <Checkbox 
                        checked={selectedForReconcile.has(entry.id)}
                        onCheckedChange={() => onToggleSelectForReconcile?.(entry.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5"
                      />
                    </TableCell>
                    <TableCell className="text-xs py-1.5">
                      {(entry.cash_date || entry.competence_date) && format(new Date(entry.cash_date || entry.competence_date), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs py-1.5">
                      {getTypeBadge?.(entry.type, true)}
                    </TableCell>
                    <TableCell className="text-xs py-1.5 max-w-[180px] truncate">
                      {entry.description}
                    </TableCell>
                    <TableCell className="text-xs py-1.5 text-right font-medium">
                      {formatCurrency?.(Number(entry.amount), entry.type)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {selectedForReconcile.size > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedForReconcile.size} selecionado(s)
              </span>
              <Button 
                size="sm" 
                onClick={() => onOpenReconcileDialog?.()}
                className="gap-1.5 bg-green-600 hover:bg-green-700 h-7 text-xs"
              >
                <Check className="h-3 w-3" />
                Conciliar
              </Button>
            </div>
          )}
        </div>
      ),
    });
  }

  // 3. Transações bancárias pendentes
  const unreconciledTransactions = transactions?.filter(t => 
    t.status === 'PENDENTE' || t.status === 'SUGERIDA'
  ) || [];
  
  if (unreconciledTransactions.length > 0) {
    sections.push({
      id: 'unreconciled-transactions',
      type: 'warning',
      icon: <Clock className="h-3.5 w-3.5" />,
      title: 'Transações bancárias não vinculadas',
      count: unreconciledTransactions.length,
      content: (
        <div className="space-y-1 rounded border border-border bg-background/50 p-2">
          {unreconciledTransactions.slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/50">
              <span className="truncate max-w-[200px]">{t.bank_memo || 'Sem descrição'}</span>
              <span className="text-muted-foreground font-medium">
                {Math.abs(Number(t.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          ))}
          {unreconciledTransactions.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              ... e mais {unreconciledTransactions.length - 5} transação(ões)
            </p>
          )}
        </div>
      ),
    });
  }

  // 4. Lançamentos sem plano de contas
  const entriesWithoutChartAccount = entries?.filter(e => 
    !e.chart_account_id && e.status !== 'CANCELADO'
  ) || [];
  
  if (entriesWithoutChartAccount.length > 0) {
    sections.push({
      id: 'no-chart-account',
      type: 'info',
      icon: <FileQuestion className="h-3.5 w-3.5" />,
      title: 'Sem plano de contas',
      count: entriesWithoutChartAccount.length,
      content: (
        <div className="space-y-1 rounded border border-border bg-background/50 p-2">
          {entriesWithoutChartAccount.slice(0, 5).map(e => (
            <div 
              key={e.id} 
              className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/50 cursor-pointer"
              onClick={() => onNavigateToEntry?.(e.id)}
            >
              <span className="truncate max-w-[200px]">{e.description}</span>
              <span className="text-muted-foreground font-medium">
                {Math.abs(Number(e.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          ))}
          {entriesWithoutChartAccount.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              ... e mais {entriesWithoutChartAccount.length - 5} lançamento(s)
            </p>
          )}
        </div>
      ),
    });
  }

  // 5. Divergências de valor
  const divergentTransactions = transactions?.filter(t => t.status === 'DIVERGENTE') || [];
  if (divergentTransactions.length > 0) {
    sections.push({
      id: 'value-mismatch',
      type: 'error',
      icon: <Calculator className="h-3.5 w-3.5" />,
      title: 'Divergências de valor',
      count: divergentTransactions.length,
      content: (
        <div className="space-y-1 rounded border border-border bg-background/50 p-2">
          {divergentTransactions.slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/50">
              <span className="truncate max-w-[200px]">{t.bank_memo || 'Transação'}</span>
              <span className="text-red-600 font-medium">
                {Math.abs(Number(t.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (sections.length === 0) return null;

  const totalAlerts = sections.reduce((sum, s) => sum + (s.count || 1), 0);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <Collapsible open={panelOpen} onOpenChange={setPanelOpen}>
      <div className="rounded-lg border border-border bg-card">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center px-1">
                  {totalAlerts}
                </span>
              </div>
              <span className="text-sm font-medium">Alertas de Pendências</span>
              <div className="flex items-center gap-1.5 ml-2">
                {sections.some(s => s.type === 'error') && (
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                )}
                {sections.some(s => s.type === 'warning') && (
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                )}
                {sections.some(s => s.type === 'info') && (
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{sections.length} tipo(s)</span>
              {panelOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border px-3 pb-3 space-y-1">
            {sections.map((section) => (
              <Collapsible 
                key={section.id} 
                open={expandedSections.has(section.id)} 
                onOpenChange={() => toggleSection(section.id)}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between py-2 px-2 hover:bg-muted/30 rounded-md transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={getTypeColor(section.type)}>{section.icon}</span>
                      <span className="text-xs font-medium">{section.title}</span>
                      {section.count !== undefined && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {section.count}
                        </Badge>
                      )}
                    </div>
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-2 pb-2">
                  {section.content}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
