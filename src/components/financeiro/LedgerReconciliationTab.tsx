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
  MoreHorizontal
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateLedgerEntryDialog } from "./CreateLedgerEntryDialog";
import { LedgerAuditSheet } from "./LedgerAuditSheet";
import { ReconcileDialog } from "./ReconcileDialog";
import { SplitEntryDialog } from "./SplitEntryDialog";
import { FinanceiroAlerts } from "./FinanceiroAlerts";
import { toast } from "sonner";
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
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [selectedForSplit, setSelectedForSplit] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const dateField = "cash_date";

  // Fetch ledger entries
  const { data: entries, isLoading: isLoadingEntries, refetch: refetchEntries } = useQuery({
    queryKey: ["fin-ledger-entries", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      let query = supabase
        .from("fin_ledger_entries")
        .select(`
          *,
          bank_account:fin_bank_accounts(nickname),
          chart_account:fin_chart_accounts(name, code),
          cost_center:fin_cost_centers(name),
          project:fin_projects(name)
        `)
        .gte(dateField, dateFrom)
        .lte(dateField, dateTo)
        .order(dateField, { ascending: false });

      if (filters.bankAccountId) {
        query = query.eq("bank_account_id", filters.bankAccountId);
      }
      if (filters.costCenterId) {
        query = query.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }
      if (filters.search) {
        query = query.ilike("description", `%${filters.search}%`);
      }

      const { data } = await query;
      return data || [];
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

  // Ledger helpers
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "RECEITA":
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case "DESPESA":
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
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
          return <Badge variant="destructive" className="px-1.5">{getTypeIcon(type)}</Badge>;
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
        return <Badge variant="destructive" className="gap-1">{getTypeIcon(type)} Despesa</Badge>;
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
      case "ABERTO":
        return <Badge variant="outline">Aberto</Badge>;
      case "CANCELADO":
        return <Badge variant="destructive">Cancelado</Badge>;
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

  // Bank transactions helpers
  const bankKpis = transactions?.reduce(
    (acc, t) => {
      acc.total++;
      if (t.status === "PENDENTE") acc.pendentes++;
      if (t.status === "SUGERIDA") acc.sugeridas++;
      if (t.status === "CONCILIADA") acc.conciliadas++;
      if (t.status === "DIVERGENTE") acc.divergentes++;
      return acc;
    },
    { total: 0, pendentes: 0, sugeridas: 0, conciliadas: 0, divergentes: 0 }
  ) || { total: 0, pendentes: 0, sugeridas: 0, conciliadas: 0, divergentes: 0 };

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
      toast.info("Funcionalidade de importação OFX em desenvolvimento");
    } catch (error: any) {
      toast.error("Erro ao importar arquivo: " + error.message);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const handleReconcileBankTx = async (transactionId: string) => {
    toast.info("Use a aba 'Lançamentos' para conciliar com transações bancárias");
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
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5 text-xs sm:text-sm">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Total Lançamentos</p>
            <p className="text-xl font-bold">{totalLancamentos}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Pendentes Conciliação</p>
            <p className="text-xl font-bold text-yellow-600">{unreconciledEntries.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Transações Extrato</p>
            <p className="text-xl font-bold">{bankKpis.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">% Conciliado</p>
            <p className="text-xl font-bold text-green-600">{percentConciliados}%</p>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      <FinanceiroAlerts 
        entries={entries || []} 
        transactions={transactions || []} 
        onNavigateToEntry={(id) => {
          const entry = entries?.find(e => e.id === id);
          if (entry) handleViewAudit(entry);
        }}
      />

      {/* Alert for unreconciled entries */}
      {unreconciledEntries.length > 0 && (
        <Collapsible open={alertOpen} onOpenChange={setAlertOpen}>
          <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-600 flex items-center justify-between">
              <span>Lançamentos Pendentes de Conciliação</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-yellow-600">
                  {alertOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </AlertTitle>
            <AlertDescription className="text-yellow-600/90">
              <span className="font-medium">{unreconciledEntries.length}</span> lançamento(s) não conciliado(s) 
              totalizando <span className="font-medium">{formatCurrencySimple(unreconciledTotal)}</span>
            </AlertDescription>
            <CollapsibleContent className="mt-3 space-y-3">
              <div className="max-h-[250px] overflow-y-auto rounded border border-yellow-500/30 bg-background/50">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs h-8 w-[40px]">
                        <Checkbox 
                          checked={selectedForReconcile.size === unreconciledEntries.length && unreconciledEntries.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="border-yellow-600 data-[state=checked]:bg-yellow-600"
                        />
                      </TableHead>
                      <TableHead className="text-xs h-8">Data</TableHead>
                      <TableHead className="text-xs h-8">Tipo</TableHead>
                      <TableHead className="text-xs h-8">Descrição</TableHead>
                      <TableHead className="text-xs text-right h-8">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unreconciledEntries.map((entry) => (
                      <TableRow 
                        key={entry.id} 
                        className={`hover:bg-yellow-500/5 cursor-pointer ${selectedForReconcile.has(entry.id) ? "bg-yellow-500/10" : ""}`}
                        onClick={() => toggleSelectForReconcile(entry.id)}
                      >
                        <TableCell className="text-xs py-2">
                          <Checkbox 
                            checked={selectedForReconcile.has(entry.id)}
                            onCheckedChange={() => toggleSelectForReconcile(entry.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="border-yellow-600 data-[state=checked]:bg-yellow-600"
                          />
                        </TableCell>
                        <TableCell className="text-xs py-2">
                          {entry.cash_date && format(new Date(entry.cash_date), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-xs py-2">
                          {getTypeBadge(entry.type, true)}
                        </TableCell>
                        <TableCell className="text-xs py-2 max-w-[200px] truncate">
                          {entry.description}
                        </TableCell>
                        <TableCell className="text-xs py-2 text-right font-medium">
                          {formatCurrency(Number(entry.amount), entry.type)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selectedForReconcile.size > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-yellow-600">
                    {selectedForReconcile.size} selecionado(s)
                  </span>
                  <Button 
                    size="sm" 
                    onClick={handleOpenReconcileDialog}
                    className="gap-1.5 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Conciliar Selecionados
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Alert>
        </Collapsible>
      )}

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="ledger" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            Lançamentos
          </TabsTrigger>
          <TabsTrigger value="bank" className="gap-1.5">
            <Link2 className="h-4 w-4" />
            Extrato Bancário
          </TabsTrigger>
        </TabsList>

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
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
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
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-8 text-sm">
                            Nenhum lançamento encontrado no período
                          </TableCell>
                        </TableRow>
                      ) : (
                        entries?.map((entry) => (
                          <TableRow key={entry.id} className={entry.status === "CANCELADO" ? "opacity-50" : ""}>
                            <TableCell className="font-medium text-xs py-3">
                              {entry[dateField] && format(new Date(entry[dateField]), "dd/MM/yy", { locale: ptBR })}
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
                                    onClick={() => handleOpenSplit(entry)} 
                                    className="gap-2"
                                    disabled={entry.has_splits || entry.reconciled}
                                  >
                                    <Split className="h-4 w-4" />
                                    Desdobrar
                                    {entry.has_splits && <Badge variant="secondary" className="ml-auto text-[10px]">Já possui</Badge>}
                                  </DropdownMenuItem>
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
                          <TableCell colSpan={5} className="text-right text-xs py-4 pr-4">
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Transactions Tab Content */}
        <TabsContent value="bank" className="space-y-4">
          {/* Bank KPIs */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Total Importadas</p>
                <p className="text-xl font-bold">{bankKpis.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold text-yellow-600">{bankKpis.pendentes}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Sugestões</p>
                <p className="text-xl font-bold text-blue-600">{bankKpis.sugeridas}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Conciliadas</p>
                <p className="text-xl font-bold text-green-600">{bankKpis.conciliadas}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">% Conciliação</p>
                <p className="text-xl font-bold">{conciliationPercent}%</p>
              </CardContent>
            </Card>
          </div>


          {/* Bank transactions table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Transações do Extrato</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transactions?.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma transação importada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Importe um arquivo OFX para começar a conciliação
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Conta</TableHead>
                      <TableHead className="text-xs">Descrição (Memo)</TableHead>
                      <TableHead className="text-xs text-right">Valor</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Lançamento</TableHead>
                      <TableHead className="text-xs">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium text-xs">
                          {format(new Date(tx.date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-xs">{tx.bank_account?.nickname || "-"}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{tx.bank_memo || "-"}</TableCell>
                        <TableCell className="text-right font-medium text-xs">
                          {formatCurrency(Number(tx.amount), tx.direction)}
                        </TableCell>
                        <TableCell className="text-xs">{getBankStatusBadge(tx.status)}</TableCell>
                        <TableCell className="text-xs">
                          {tx.reconciliation_links?.[0]?.ledger_entry?.description || "-"}
                        </TableCell>
                        <TableCell>
                          {tx.status !== "CONCILIADA" && tx.status !== "IGNORADA" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReconcileBankTx(tx.id)}
                              className="text-xs"
                            >
                              Conciliar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
    </div>
  );
}
