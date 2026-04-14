import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  BookOpen, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCw, 
  History, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight, 
  Check,
  Upload,
  CheckCircle,
  Clock,
  Link2,
  Split,
  MoreHorizontal,
  Undo2,
  Landmark,
  Brain,
  Loader2,
  Sparkles,
  Copy,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateLedgerEntryDialog } from "./CreateLedgerEntryDialog";
import { CreatePayableDialog } from "./CreatePayableDialog";
import { CreateReceivableDialog } from "./CreateReceivableDialog";
import { LedgerAuditSheet } from "./LedgerAuditSheet";
import { ReconcileDialog } from "./ReconcileDialog";
import { SplitEntryDialog } from "./SplitEntryDialog";
import { OFXImportDialog } from "./OFXImportDialog";
import { FinanceiroAlerts } from "./FinanceiroAlerts";
import { toast } from "sonner";
import { parseOFX, OFXTransaction } from "@/lib/ofx-parser";
import { BankAccountExtractTab } from "./BankAccountExtractTab";
import { ReconciliationSplitView } from "./ReconciliationSplitView";
import { ClassificationSuggestionBadge } from "./ClassificationSuggestionBadge";
import { useClassifyEntry } from "@/hooks/useClassifyEntry";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LedgerReconciliationTabProps {
  filters: FinanceiroFiltersState;
}

export function LedgerReconciliationTab({ filters }: LedgerReconciliationTabProps) {
  const [activeSubTab, setActiveSubTab] = useState("ledger");
  const [createOpen, setCreateOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [alertOpen, setAlertOpen] = useState(true);
  const [selectedForReconcile, setSelectedForReconcile] = useState<Set<string>>(new Set());
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<Set<string>>(new Set());
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [selectedForSplit, setSelectedForSplit] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [smartReconciling, setSmartReconciling] = useState(false);
  const [smartReconcileResults, setSmartReconcileResults] = useState<any>(null);
  
  // OFX Import states
  const [ofxDialogOpen, setOfxDialogOpen] = useState(false);
  const [ofxTransactions, setOfxTransactions] = useState<OFXTransaction[]>([]);
  const [createPayableOpen, setCreatePayableOpen] = useState(false);
  const [createReceivableOpen, setCreateReceivableOpen] = useState(false);
  const [importedData, setImportedData] = useState<{
    amount?: string;
    description?: string;
    due_date?: string;
    competence_date?: string;
  } | undefined>(undefined);

  const dateField = "cash_date";

  // Fetch ledger entries - use competence_date as fallback for entries without cash_date
  const { data: entries, isLoading: isLoadingEntries, refetch: refetchEntries } = useQuery({
    queryKey: ["fin-ledger-entries", filters],
    queryFn: async () => {
      const dateFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "2000-01-01";
      const dateTo = filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : "2099-12-31";

      // Fetch entries with cash_date in range (paid/received)
      let queryPaid = supabase
        .from("fin_ledger_entries")
        .select(`
          *,
          bank_account:fin_bank_accounts(nickname),
          chart_account:fin_chart_accounts(name, code),
          cost_center:fin_cost_centers(name),
          project:fin_projects(name)
        `)
        .not("cash_date", "is", null)
        .gte("cash_date", dateFrom)
        .lte("cash_date", dateTo);

      // Fetch entries without cash_date (ABERTO/VENCIDO) using competence_date
      let queryOpen = supabase
        .from("fin_ledger_entries")
        .select(`
          *,
          bank_account:fin_bank_accounts(nickname),
          chart_account:fin_chart_accounts(name, code),
          cost_center:fin_cost_centers(name),
          project:fin_projects(name)
        `)
        .is("cash_date", null)
        .gte("competence_date", dateFrom)
        .lte("competence_date", dateTo);

      // Apply common filters to both queries
      const applyFilters = (q: any) => {
        if (filters.bankAccountId) q = q.eq("bank_account_id", filters.bankAccountId);
        if (filters.costCenterId) q = q.eq("cost_center_id", filters.costCenterId);
        if (filters.projectId) q = q.eq("project_id", filters.projectId);
        if (filters.subcategoryId) q = q.eq("chart_account_id", filters.subcategoryId);
        else if (filters.categoryId) q = q.eq("chart_account_id", filters.categoryId);
        if (filters.search) q = q.ilike("description", `%${filters.search}%`);
        return q;
      };

      queryPaid = applyFilters(queryPaid);
      queryOpen = applyFilters(queryOpen);

      const [paidResult, openResult] = await Promise.all([queryPaid, queryOpen]);
      const allEntries = [...(paidResult.data || []), ...(openResult.data || [])];

      // Sort combined results
      if (filters.sortField === "date") {
        allEntries.sort((a, b) => {
          const dateA = a.cash_date || a.competence_date;
          const dateB = b.cash_date || b.competence_date;
          return filters.sortDirection === "asc" ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
        });
      } else if (filters.sortField === "value") {
        allEntries.sort((a, b) => filters.sortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount);
      } else {
        allEntries.sort((a, b) => {
          const dateA = a.cash_date || a.competence_date;
          const dateB = b.cash_date || b.competence_date;
          return dateB.localeCompare(dateA);
        });
      }

      return allEntries;
    },
  });

  // Fetch bank transactions
  const { data: transactions, isLoading: isLoadingTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["fin-bank-transactions", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      let query = supabase
        .from("fin_bank_transactions")
        .select(`
          *,
          bank_account:fin_bank_accounts(nickname),
          reconciliation_links:fin_reconciliation_links(
            id,
            ledger_entry:fin_ledger_entries(id, description, amount)
          )
        `)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: false });

      if (filters.bankAccountId) {
        query = query.eq("bank_account_id", filters.bankAccountId);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Fetch last import date
  const { data: lastImportData } = useQuery({
    queryKey: ["fin-last-import-date"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_bank_transactions")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const lastImportDate = lastImportData?.created_at 
    ? format(new Date(lastImportData.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : null;
  
  // Check if import is overdue (more than 1 day)
  const isImportOverdue = (() => {
    if (!lastImportData?.created_at) return true; // Never imported
    const lastDate = new Date(lastImportData.created_at);
    const now = new Date();
    return differenceInDays(now, lastDate) >= 1;
  })();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "RECEITA":
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case "DESPESA":
        return <ArrowDownCircle className="h-4 w-4 text-primary" />;
      case "TRANSFERENCIA":
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string, compact?: boolean) => {
    if (compact) {
      switch (type) {
        case "RECEITA":
          return <Badge className="bg-green-600 px-1.5">{getTypeIcon(type)}</Badge>;
        case "DESPESA":
          return <Badge className="bg-red-600 text-destructive-foreground hover:bg-red-600/90 px-1.5">{getTypeIcon(type)}</Badge>;
        case "TRANSFERENCIA":
          return <Badge variant="secondary" className="px-1.5">{getTypeIcon(type)}</Badge>;
        case "AJUSTE":
          return <Badge variant="outline" className="px-1.5 text-[10px]">AJ</Badge>;
        default:
          return <Badge variant="outline" className="px-1.5 text-[10px]">{type?.slice(0, 2)}</Badge>;
      }
    }
    switch (type) {
      case "RECEITA":
        return <Badge className="bg-green-600 gap-1">{getTypeIcon(type)} Receita</Badge>;
      case "DESPESA":
        return <Badge className="bg-red-600 text-destructive-foreground hover:bg-red-600/90 gap-1">{getTypeIcon(type)} Despesa</Badge>;
      case "TRANSFERENCIA":
        return <Badge variant="secondary" className="gap-1">{getTypeIcon(type)} Transferência</Badge>;
      case "AJUSTE":
        return <Badge variant="outline" className="gap-1">Ajuste</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAGO_RECEBIDO":
        return <Badge className="bg-green-600">Realizado</Badge>;
      case "CONCILIADO":
        return <Badge className="bg-emerald-700">Conciliado</Badge>;
      case "ABERTO":
        return <Badge variant="outline">Aberto</Badge>;
      case "VENCIDO":
        return <Badge variant="destructive">Vencido</Badge>;
      case "CANCELADO":
        return <Badge variant="destructive" className="bg-gray-500">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number, type: string) => {
    const formatted = Math.abs(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    if (type === "DESPESA" || type === "OUT") {
      return <span className="text-red-600">-{formatted}</span>;
    }
    return <span className="text-green-600">+{formatted}</span>;
  };

  const formatCurrencySimple = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Calculate totals
  const totals = entries?.reduce(
    (acc, e) => {
      if (e.status !== "CANCELADO") {
        if (e.type === "RECEITA") acc.entradas += Number(e.amount);
        if (e.type === "DESPESA") acc.saidas += Number(e.amount);
      }
      return acc;
    },
    { entradas: 0, saidas: 0 }
  ) || { entradas: 0, saidas: 0 };

  // Get unreconciled entries
  const unreconciledEntries = entries?.filter(e => !e.reconciled && e.status !== "CANCELADO") || [];
  const unreconciledTotal = unreconciledEntries.reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);

  const toggleSelectForReconcile = (entryId: string) => {
    const newSelected = new Set(selectedForReconcile);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedForReconcile(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedForReconcile.size === unreconciledEntries.length) {
      setSelectedForReconcile(new Set());
    } else {
      setSelectedForReconcile(new Set(unreconciledEntries.map(e => e.id)));
    }
  };

  const handleOpenReconcileDialog = () => {
    if (selectedForReconcile.size === 0) return;
    setReconcileDialogOpen(true);
  };

  const handleReconcileSuccess = () => {
    setSelectedForReconcile(new Set());
    refetchEntries();
    refetchTransactions();
  };

  const handleSplitSuccess = () => {
    setSelectedForSplit(null);
    refetchEntries();
  };

  const handleOpenSplit = (entry: any) => {
    if (entry.has_splits) {
      toast.error("Este lançamento já possui desdobramentos");
      return;
    }
    if (entry.reconciled) {
      toast.error("Não é possível desdobrar lançamentos já conciliados");
      return;
    }
    setSelectedForSplit(entry);
    setSplitDialogOpen(true);
  };

  const handleViewAudit = (entry: any) => {
    setSelectedEntry(entry);
    setAuditOpen(true);
  };

  const selectedEntries = unreconciledEntries.filter(e => selectedForReconcile.has(e.id));

  // Ledger selection helpers
  const toggleLedgerSelect = (id: string) => {
    setSelectedLedgerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleLedgerSelectAll = () => {
    if (!entries) return;
    const active = entries.filter(e => e.status !== "CANCELADO");
    if (selectedLedgerIds.size === active.length) {
      setSelectedLedgerIds(new Set());
    } else {
      setSelectedLedgerIds(new Set(active.map(e => e.id)));
    }
  };

  const selectedLedgerTotal = entries
    ?.filter(e => selectedLedgerIds.has(e.id))
    .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0) || 0;

  const bankKpis = transactions?.reduce(
    (acc, t: any) => {
      acc.total++;
      if (t.status === "PENDENTE") acc.pendentes++;
      if (t.status === "SUGERIDA") acc.sugeridas++;
      if (t.status === "CONCILIADA") acc.conciliadas++;
      if (t.status === "DIVERGENTE") acc.divergentes++;
      if (t.status === "DUPLICADA" || t.is_duplicate) acc.duplicadas++;
      if (t.classification_status === "auto_classified") acc.autoClassificados++;
      if (t.classification_status === "pending" || !t.classification_status) acc.pendentesCategoria++;
      return acc;
    },
    { total: 0, pendentes: 0, sugeridas: 0, conciliadas: 0, divergentes: 0, duplicadas: 0, autoClassificados: 0, pendentesCategoria: 0 }
  ) || { total: 0, pendentes: 0, sugeridas: 0, conciliadas: 0, divergentes: 0, duplicadas: 0, autoClassificados: 0, pendentesCategoria: 0 };

  const conciliationPercent = bankKpis.total > 0 
    ? Math.round((bankKpis.conciliadas / bankKpis.total) * 100) 
    : 0;

  const getBankStatusBadge = (status: string) => {
    switch (status) {
      case "PENDENTE":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case "SUGERIDA":
        return <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700">Sugestão</Badge>;
      case "CONCILIADA":
        return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> Conciliada</Badge>;
      case "IGNORADA":
        return <Badge variant="outline" className="gap-1 text-muted-foreground">Ignorada</Badge>;
      case "DIVERGENTE":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Divergente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".ofx")) {
      toast.error("Por favor, selecione um arquivo OFX");
      return;
    }

    setImporting(true);
    try {
      const content = await file.text();
      const result = parseOFX(content);
      
      if (result.transactions.length === 0) {
        toast.warning("Nenhuma transação encontrada no arquivo OFX");
      } else {
        setOfxTransactions(result.transactions);
        setOfxDialogOpen(true);
        toast.success(`${result.transactions.length} transações importadas`);
      }
    } catch (error: any) {
      toast.error("Erro ao importar arquivo: " + error.message);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const handleOFXTransactionSelect = (tx: OFXTransaction) => {
    const formData = {
      amount: tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      description: tx.description,
      due_date: tx.date,
      competence_date: tx.date,
    };
    setImportedData(formData);
    setOfxDialogOpen(false);
    
    if (tx.type === 'DEBIT') {
      setCreatePayableOpen(true);
    } else {
      setCreateReceivableOpen(true);
    }
  };

  const handleReconcileBankTx = async (transactionId: string) => {
    toast.info("Use a aba 'Lançamentos' para conciliar com transações bancárias");
  };

  const handleSmartReconcile = async () => {
    const pendingTxIds = transactions?.filter(t => t.status === "PENDENTE" || t.status === "SUGERIDA").map(t => t.id) || [];
    if (pendingTxIds.length === 0) {
      toast.info("Nenhuma transação pendente para conciliar");
      return;
    }

    setSmartReconciling(true);
    try {
      // Get tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile?.tenant_id) throw new Error("Tenant não encontrado");

      const { data, error } = await supabase.functions.invoke("smart-reconcile", {
        body: { transaction_ids: pendingTxIds, tenant_id: profile.tenant_id },
      });

      if (error) throw error;

      setSmartReconcileResults(data?.summary);
      const s = data?.summary;
      toast.success(
        `Conciliação inteligente: ${s?.auto_reconciled || 0} automáticas, ${s?.suggested || 0} sugeridas, ${s?.duplicates || 0} duplicadas`
      );
      refetchTransactions();
      refetchEntries();
    } catch (e: any) {
      toast.error("Erro na conciliação inteligente: " + (e.message || "Erro desconhecido"));
    } finally {
      setSmartReconciling(false);
    }
  };

  // Summary KPIs for unified header
  const totalLancamentos = entries?.length || 0;
  const totalConciliados = entries?.filter(e => e.reconciled).length || 0;
  const percentConciliados = totalLancamentos > 0 ? Math.round((totalConciliados / totalLancamentos) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Unified Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            Lançamentos & Conciliação
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie lançamentos financeiros e concilie com extratos bancários
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 text-xs sm:text-sm"
            onClick={handleSmartReconcile}
            disabled={smartReconciling || !transactions?.length}
          >
            {smartReconciling ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Brain className="h-3.5 w-3.5" />
            )}
            {smartReconciling ? "Conciliando..." : "Conciliação Inteligente"}
          </Button>
          <input
            type="file"
            accept=".ofx"
            onChange={handleFileUpload}
            className="hidden"
            id="ofx-upload-header"
          />
          <Button 
            variant="outline" 
            size="sm"
            className="gap-1.5 text-xs sm:text-sm"
            onClick={() => document.getElementById("ofx-upload-header")?.click()}
            disabled={importing}
          >
            <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Importar OFX
          </Button>
        </div>
      </div>


      {/* Unified Alerts Panel */}
      <FinanceiroAlerts 
        entries={entries || []} 
        transactions={transactions || []} 
        lastImportDate={lastImportData?.created_at}
        isImportOverdue={isImportOverdue}
        lastImportFormatted={lastImportDate}
        unreconciledEntries={unreconciledEntries}
        unreconciledTotal={unreconciledTotal}
        selectedForReconcile={selectedForReconcile}
        onToggleSelectForReconcile={toggleSelectForReconcile}
        onToggleSelectAll={toggleSelectAll}
        onOpenReconcileDialog={handleOpenReconcileDialog}
        onNavigateToEntry={(id) => {
          const entry = entries?.find(e => e.id === id);
          if (entry) handleViewAudit(entry);
        }}
        getTypeBadge={getTypeBadge}
        formatCurrency={formatCurrency}
      />

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Lançamentos Card */}
          <button
            onClick={() => setActiveSubTab("ledger")}
            className={`text-left rounded-lg border p-4 transition-all ${
              activeSubTab === "ledger"
                ? "ring-2 ring-primary bg-primary/5 border-primary/30"
                : "bg-card hover:bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${activeSubTab === "ledger" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="font-medium text-sm">Lançamentos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{totalLancamentos}</span>
              <span className={`text-lg font-bold ${percentConciliados === 100 ? 'text-green-600' : percentConciliados >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {percentConciliados}%
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">registros no período</p>
              <p className="text-xs text-muted-foreground">conciliado</p>
            </div>
            {unreconciledEntries.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-xs text-yellow-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{unreconciledEntries.length} pendentes de conciliação</span>
                </div>
              </div>
            )}
          </button>

          {/* Extrato por Conta Card */}
          <button
            onClick={() => setActiveSubTab("account-extract")}
            className={`text-left rounded-lg border p-4 transition-all ${
              activeSubTab === "account-extract"
                ? "ring-2 ring-primary bg-primary/5 border-primary/30"
                : "bg-card hover:bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${activeSubTab === "account-extract" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                <Landmark className="h-4 w-4" />
              </div>
              <span className="font-medium text-sm">Extrato por Conta</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              movimentação e importações OFX por conta
            </p>
          </button>

          {/* Conciliação Split View Card */}
          <button
            onClick={() => setActiveSubTab("reconcile-split")}
            className={`text-left rounded-lg border p-4 transition-all ${
              activeSubTab === "reconcile-split"
                ? "ring-2 ring-primary bg-primary/5 border-primary/30"
                : "bg-card hover:bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${activeSubTab === "reconcile-split" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                <Link2 className="h-4 w-4" />
              </div>
              <span className="font-medium text-sm">Conciliação Bancária</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Banco vs ERP</p>
              {bankKpis.pendentes > 0 && (
                <Badge variant="outline" className="text-xs gap-1 border-yellow-500/50 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20">
                  {bankKpis.pendentes} pendentes
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              concilie transações bancárias com lançamentos do sistema
            </p>
          </button>
        </div>

        {/* Ledger Tab Content */}
        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {isLoadingEntries ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  {selectedLedgerIds.size > 0 && (
                    <div className="flex items-center gap-2 p-3 mb-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">{selectedLedgerIds.size} selecionado(s)</span>
                      <span className="text-sm font-semibold text-primary">
                        Total: {selectedLedgerTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  )}
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs w-[40px]">
                            <Checkbox
                              checked={entries && entries.filter(e => e.status !== "CANCELADO").length > 0 && selectedLedgerIds.size === entries.filter(e => e.status !== "CANCELADO").length}
                              onCheckedChange={toggleLedgerSelectAll}
                            />
                          </TableHead>
                          <TableHead className="text-xs w-[80px]">Data</TableHead>
                          <TableHead className="text-xs w-[100px]">Tipo</TableHead>
                          <TableHead className="text-xs min-w-[150px]">Descrição</TableHead>
                          <TableHead className="text-xs hidden md:table-cell w-[120px]">Conta</TableHead>
                          <TableHead className="text-xs hidden lg:table-cell w-[150px]">Categoria</TableHead>
                          <TableHead className="text-xs text-right w-[120px]">Valor</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell w-[90px] text-center">Status</TableHead>
                          <TableHead className="text-xs w-[70px] text-center">Concil.</TableHead>
                          <TableHead className="text-xs w-[50px] text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center text-muted-foreground py-8 text-sm">
                              Nenhum lançamento encontrado no período
                            </TableCell>
                          </TableRow>
                        ) : (
                          entries?.map((entry) => (
                            <TableRow key={entry.id} className={`${entry.status === "CANCELADO" ? "opacity-50" : ""} ${selectedLedgerIds.has(entry.id) ? "bg-muted/50" : ""}`}>
                              <TableCell className="py-3">
                                <Checkbox
                                  checked={selectedLedgerIds.has(entry.id)}
                                  onCheckedChange={() => toggleLedgerSelect(entry.id)}
                                  disabled={entry.status === "CANCELADO"}
                                />
                              </TableCell>
                            <TableCell className="font-medium text-xs py-3">
                              {(entry.cash_date || entry.competence_date) && format(new Date(entry.cash_date || entry.competence_date), "dd/MM/yy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-xs py-3">
                              <span className="sm:hidden">{getTypeBadge(entry.type, true)}</span>
                              <span className="hidden sm:inline">{getTypeBadge(entry.type)}</span>
                            </TableCell>
                            <TableCell className="text-xs py-3 max-w-[200px] lg:max-w-none">
                              <div className="truncate">
                                {entry.description}
                                {entry.reversal_of_id && (
                                  <span className="text-xs text-muted-foreground ml-1">(Estorno)</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs hidden md:table-cell py-3">
                              <div className="truncate max-w-[100px]">{entry.bank_account?.nickname || "-"}</div>
                            </TableCell>
                            <TableCell className="text-xs hidden lg:table-cell py-3">
                              <div className="truncate max-w-[140px]">{entry.chart_account ? entry.chart_account.name : "-"}</div>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-xs py-3 whitespace-nowrap">
                              {formatCurrency(Number(entry.amount), entry.type)}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell py-3 text-center">{getStatusBadge(entry.status)}</TableCell>
                            <TableCell className="py-3 text-center">
                              {entry.reconciled ? (
                                <Badge className="bg-green-600 text-xs"><CheckCircle className="h-3 w-3" /></Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500">Pendente</Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewAudit(entry)} className="gap-2">
                                    <History className="h-4 w-4" />
                                    Histórico
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedForReconcile(new Set([entry.id]));
                                      setReconcileDialogOpen(true);
                                    }} 
                                    className="gap-2"
                                    disabled={entry.reconciled}
                                  >
                                    <Link2 className="h-4 w-4" />
                                    Conciliar
                                    {entry.reconciled && <Badge variant="secondary" className="ml-auto text-[10px]">Conciliado</Badge>}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleOpenSplit(entry)} 
                                    className="gap-2"
                                    disabled={entry.has_splits || entry.reconciled}
                                  >
                                    <Split className="h-4 w-4" />
                                    Desdobrar
                                    {entry.has_splits && <Badge variant="secondary" className="ml-auto text-[10px]">Já possui</Badge>}
                                  </DropdownMenuItem>
                                  {entry.status === "PAGO_RECEBIDO" && (
                                    <DropdownMenuItem
                                      onClick={async () => {
                                        try {
                                          await supabase.from("fin_ledger_entries").update({ status: "ABERTO", cash_date: null }).eq("id", entry.id);
                                          if (entry.type === "DESPESA") {
                                            await supabase.from("fin_payables").update({ status: "ABERTO", paid_amount: 0, payment_date: null }).eq("ledger_entry_id", entry.id);
                                          } else {
                                            await supabase.from("fin_receivables").update({ status: "ABERTO", received_amount: 0 }).eq("ledger_entry_id", entry.id);
                                          }
                                          toast.success("Lançamento reaberto com sucesso");
                                          refetchEntries();
                                        } catch { toast.error("Erro ao estornar lançamento"); }
                                      }}
                                      className="gap-2 text-yellow-600"
                                    >
                                      <Undo2 className="h-4 w-4" />
                                      Estornar (Reabrir)
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    {entries && entries.length > 0 && (
                      <tfoot>
                        <TableRow className="bg-muted/50 font-medium border-t-2">
                          <TableCell colSpan={6} className="text-right text-xs py-4 pr-4">
                            <span className="text-muted-foreground">Totais:</span>
                          </TableCell>
                          <TableCell className="text-right text-xs py-4">
                            <div className="space-y-0.5">
                              <div className="text-green-600 font-semibold">+{totals.entradas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                              <div className="text-red-600 font-semibold">-{totals.saidas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                              <div className={`font-bold pt-1 border-t ${totals.entradas - totals.saidas >= 0 ? "text-green-600" : "text-red-600"}`}>
                                = {(totals.entradas - totals.saidas).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell colSpan={3}></TableCell>
                        </TableRow>
                      </tfoot>
                    )}
                  </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Account Extract Tab Content */}
        <TabsContent value="account-extract" className="space-y-4">
          <BankAccountExtractTab filters={filters} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateLedgerEntryDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={refetchEntries} />
      <LedgerAuditSheet open={auditOpen} onOpenChange={setAuditOpen} entry={selectedEntry} />
      <ReconcileDialog 
        open={reconcileDialogOpen} 
        onOpenChange={setReconcileDialogOpen} 
        entries={selectedEntries} 
        onSuccess={handleReconcileSuccess} 
      />
      <SplitEntryDialog
        open={splitDialogOpen}
        onOpenChange={setSplitDialogOpen}
        entry={selectedForSplit}
        onSuccess={handleSplitSuccess}
      />
      <OFXImportDialog
        open={ofxDialogOpen}
        onOpenChange={setOfxDialogOpen}
        transactions={ofxTransactions}
        onSelectTransaction={handleOFXTransactionSelect}
      />
      <CreatePayableDialog
        open={createPayableOpen}
        onOpenChange={setCreatePayableOpen}
        onSuccess={() => { refetchEntries(); setImportedData(undefined); }}
        initialData={importedData}
      />
      <CreateReceivableDialog
        open={createReceivableOpen}
        onOpenChange={setCreateReceivableOpen}
        onSuccess={() => { refetchEntries(); setImportedData(undefined); }}
        initialData={importedData}
      />
    </div>
  );
}