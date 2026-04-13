import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { ClassificationSuggestionBadge } from "./ClassificationSuggestionBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, BookOpen, ArrowUpCircle, ArrowDownCircle, RefreshCw, History, AlertTriangle, ChevronDown, ChevronRight, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateLedgerEntryDialog } from "./CreateLedgerEntryDialog";
import { LedgerAuditSheet } from "./LedgerAuditSheet";
import { ReconcileDialog } from "./ReconcileDialog";

interface LedgerTabProps {
  filters: FinanceiroFiltersState;
}

export function LedgerTab({ filters }: LedgerTabProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [alertOpen, setAlertOpen] = useState(true);
  const [selectedForReconcile, setSelectedForReconcile] = useState<Set<string>>(new Set());
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);

  const dateField = "cash_date";

  const { data: entries, isLoading, refetch } = useQuery({
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
    if (type === "DESPESA") {
      return <span className="text-red-600">-{formatted}</span>;
    }
    return <span className="text-green-600">+{formatted}</span>;
  };

  const handleViewAudit = (entry: any) => {
    setSelectedEntry(entry);
    setAuditOpen(true);
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

  const formatCurrencySimple = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

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
    refetch();
  };

  // Get the selected entries for the dialog
  const selectedEntries = unreconciledEntries.filter(e => selectedForReconcile.has(e.id));

  return (
    <div className="space-y-4">
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

      {/* Header with action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            Lançamentos
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Livro de lançamentos financeiros
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5 text-xs sm:text-sm w-full sm:w-auto">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Novo Lançamento
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
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
                    <TableHead className="text-xs w-[50px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">
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
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">
                              {entry.description}
                              {entry.reversal_of_id && (
                                <span className="text-xs text-muted-foreground ml-1">(Estorno)</span>
                              )}
                            </span>
                            {entry.classification_status && entry.classification_status !== "pending" && (
                              <ClassificationSuggestionBadge
                                status={entry.classification_status}
                                score={entry.classification_score}
                                source={entry.classification_source}
                                compact
                              />
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
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleViewAudit(entry)}
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
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
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </tfoot>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateLedgerEntryDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={refetch} />
      <LedgerAuditSheet open={auditOpen} onOpenChange={setAuditOpen} entry={selectedEntry} />
      <ReconcileDialog 
        open={reconcileDialogOpen} 
        onOpenChange={setReconcileDialogOpen} 
        entries={selectedEntries} 
        onSuccess={handleReconcileSuccess} 
      />
    </div>
  );
}
