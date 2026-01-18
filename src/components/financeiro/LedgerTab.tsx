import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, BookOpen, ArrowUpCircle, ArrowDownCircle, RefreshCw, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateLedgerEntryDialog } from "./CreateLedgerEntryDialog";
import { LedgerAuditSheet } from "./LedgerAuditSheet";

interface LedgerTabProps {
  filters: FinanceiroFiltersState;
}

export function LedgerTab({ filters }: LedgerTabProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

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

  const getTypeBadge = (type: string) => {
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

  return (
    <div className="space-y-4">
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
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Data</TableHead>
                    <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                    <TableHead className="text-xs sm:text-sm">Descrição</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">Conta</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Categoria</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">Valor</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm">Ações</TableHead>
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
                        <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                          {entry[dateField] && format(new Date(entry[dateField]), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getTypeBadge(entry.type)}</TableCell>
                        <TableCell className="text-xs sm:text-sm max-w-[120px] sm:max-w-[200px] truncate">
                          {entry.description}
                          {entry.reversal_of_id && (
                            <span className="text-xs text-muted-foreground ml-1">(Estorno)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm hidden md:table-cell">{entry.bank_account?.nickname || "-"}</TableCell>
                        <TableCell className="text-xs hidden lg:table-cell">
                          {entry.chart_account ? entry.chart_account.name : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-xs sm:text-sm whitespace-nowrap">
                          {formatCurrency(Number(entry.amount), entry.type)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{getStatusBadge(entry.status)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleViewAudit(entry)}
                          >
                            <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {entries && entries.length > 0 && (
                  <tfoot>
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={5} className="text-right text-xs sm:text-sm">Totais:</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        <div className="text-green-600">+{totals.entradas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                        <div className="text-red-600">-{totals.saidas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                        <div className={totals.entradas - totals.saidas >= 0 ? "text-green-600" : "text-red-600"}>
                          = {(totals.entradas - totals.saidas).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
    </div>
  );
}
