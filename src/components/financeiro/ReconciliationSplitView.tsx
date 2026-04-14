import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UniversalStatusBadge } from "@/components/ui/UniversalStatusBadge";
import { useReconciliation } from "@/hooks/useReconciliation";
import {
  Landmark, ArrowRight, Check, X, Undo2, Link2,
  ArrowUpCircle, ArrowDownCircle, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReconciliationSplitViewProps {
  filters: FinanceiroFiltersState;
}

export function ReconciliationSplitView({ filters }: ReconciliationSplitViewProps) {
  const [selectedBankTxId, setSelectedBankTxId] = useState<string | null>(null);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { manualReconcile, acceptSuggestion, ignorar, undoReconcile } = useReconciliation();

  const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
  const dateTo = format(filters.dateTo, "yyyy-MM-dd");

  // Fetch bank transactions
  const { data: bankTxs, isLoading: loadingBank } = useQuery({
    queryKey: ["recon-bank-txs", filters, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("fin_bank_transactions")
        .select(`*, bank_account:fin_bank_accounts(nickname),
          reconciliation_links:fin_reconciliation_links(id, ledger_entry_id, match_type, score)`)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: false });

      if (filters.bankAccountId) query = query.eq("bank_account_id", filters.bankAccountId);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data } = await query;
      return data || [];
    },
  });

  // Fetch unreconciled ledger entries for matching
  const { data: ledgerEntries, isLoading: loadingLedger } = useQuery({
    queryKey: ["recon-ledger-entries", filters],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_ledger_entries")
        .select(`*, bank_account:fin_bank_accounts(nickname), chart_account:fin_chart_accounts(name, code)`)
        .eq("reconciled", false)
        .neq("status", "CANCELADO")
        .gte("competence_date", dateFrom)
        .lte("competence_date", dateTo)
        .order("competence_date", { ascending: false });
      return data || [];
    },
  });

  // Fetch bank account balances
  const { data: balanceData } = useQuery({
    queryKey: ["recon-balance-kpis", filters],
    queryFn: async () => {
      const { data: accounts } = await supabase
        .from("fin_bank_accounts")
        .select("id, nickname, opening_balance")
        .eq("active", true);

      let totalBankBalance = 0;
      for (const acc of accounts || []) {
        const ob = Number(acc.opening_balance || 0);
        const { data: txs } = await supabase
          .from("fin_bank_transactions")
          .select("amount, direction")
          .eq("bank_account_id", acc.id)
          .lte("date", dateTo);

        const txTotal = (txs || []).reduce((sum, t) => {
          const amt = Math.abs(Number(t.amount));
          return sum + (t.direction === "IN" ? amt : -amt);
        }, 0);
        totalBankBalance += ob + txTotal;
      }

      // ERP realized balance
      const { data: realized } = await supabase
        .from("fin_ledger_entries")
        .select("amount, type")
        .in("status", ["PAGO_RECEBIDO", "CONCILIADO"])
        .neq("status", "CANCELADO")
        .lte("cash_date", dateTo);

      const erpBalance = (realized || []).reduce((sum, e) => {
        const amt = Math.abs(Number(e.amount));
        return sum + (e.type === "RECEITA" ? amt : -amt);
      }, 0);

      return { bankBalance: totalBankBalance, erpBalance, diff: totalBankBalance - erpBalance };
    },
  });

  // KPIs
  const kpis = useMemo(() => {
    const all = bankTxs || [];
    return {
      total: all.length,
      pendentes: all.filter(t => t.status === "PENDENTE").length,
      sugeridas: all.filter(t => t.status === "SUGERIDA").length,
      conciliadas: all.filter(t => t.status === "CONCILIADA").length,
      ignoradas: all.filter(t => t.status === "IGNORADA").length,
    };
  }, [bankTxs]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const selectedBankTx = bankTxs?.find(t => t.id === selectedBankTxId);

  // Filter ledger entries to match direction of selected bank tx
  const filteredLedger = useMemo(() => {
    if (!selectedBankTx || !ledgerEntries) return ledgerEntries || [];
    const dir = selectedBankTx.direction;
    return ledgerEntries.filter(e =>
      (dir === "OUT" && e.type === "DESPESA") || (dir === "IN" && e.type === "RECEITA")
    );
  }, [selectedBankTx, ledgerEntries]);

  const handleManualReconcile = () => {
    if (!selectedBankTxId || !selectedLedgerId) {
      toast.warning("Selecione uma transação bancária e um lançamento");
      return;
    }
    manualReconcile.mutate({
      bankTransactionId: selectedBankTxId,
      ledgerEntryId: selectedLedgerId,
    });
    setSelectedBankTxId(null);
    setSelectedLedgerId(null);
  };

  const isLoading = loadingBank || loadingLedger;

  return (
    <div className="space-y-4">
      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[11px] text-muted-foreground">Saldo Banco</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(balanceData?.bankBalance || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[11px] text-muted-foreground">Saldo Sistema</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(balanceData?.erpBalance || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[11px] text-muted-foreground">Diferença</p>
            <p className={cn("text-lg font-bold font-mono", (balanceData?.diff || 0) === 0 ? "text-green-600" : "text-red-600")}>
              {formatCurrency(balanceData?.diff || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[11px] text-muted-foreground">Não Conciliados</p>
            <p className="text-lg font-bold text-yellow-600">{kpis.pendentes + kpis.sugeridas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[11px] text-muted-foreground">Conciliados</p>
            <p className="text-lg font-bold text-green-600">{kpis.conciliadas}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PENDENTE">Não Conciliado</SelectItem>
            <SelectItem value="SUGERIDA">Sugestão</SelectItem>
            <SelectItem value="CONCILIADA">Conciliado</SelectItem>
            <SelectItem value="IGNORADA">Ignorado</SelectItem>
          </SelectContent>
        </Select>

        {selectedBankTxId && selectedLedgerId && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleManualReconcile} disabled={manualReconcile.isPending}>
            <Link2 className="h-3.5 w-3.5" />
            Conciliar Selecionados
          </Button>
        )}
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Bank Transactions */}
        <Card>
          <CardContent className="pt-3">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Landmark className="h-4 w-4" />
              Movimentos Banco
            </h3>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Data</TableHead>
                      <TableHead className="text-[11px]">Descrição</TableHead>
                      <TableHead className="text-[11px] text-right">Valor</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px] w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankTxs?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                          Nenhuma transação bancária no período
                        </TableCell>
                      </TableRow>
                    ) : (
                      bankTxs?.map(tx => (
                        <TableRow
                          key={tx.id}
                          className={cn(
                            "cursor-pointer transition-colors",
                            selectedBankTxId === tx.id && "bg-primary/10 ring-1 ring-primary/30",
                            tx.status === "CONCILIADA" && "opacity-60"
                          )}
                          onClick={() => {
                            if (tx.status !== "CONCILIADA") {
                              setSelectedBankTxId(prev => prev === tx.id ? null : tx.id);
                            }
                          }}
                        >
                          <TableCell className="text-[11px] py-2">
                            {format(new Date(tx.date), "dd/MM", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-[11px] py-2 max-w-[150px] truncate">
                            {tx.bank_memo || "-"}
                          </TableCell>
                          <TableCell className="text-[11px] py-2 text-right font-mono font-medium">
                            <span className={tx.direction === "IN" ? "text-green-600" : "text-red-600"}>
                              {tx.direction === "IN" ? "+" : "-"}{formatCurrency(Math.abs(Number(tx.amount)))}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <UniversalStatusBadge module="reconciliation" status={tx.status} size="sm" />
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex gap-1">
                              {tx.status === "SUGERIDA" && (
                                <Button
                                  variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600"
                                  onClick={(e) => { e.stopPropagation(); acceptSuggestion.mutate(tx.id); }}
                                  title="Aceitar sugestão"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              {(tx.status === "PENDENTE" || tx.status === "SUGERIDA" || tx.status === "DIVERGENTE") && (
                                <Button
                                  variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground"
                                  onClick={(e) => { e.stopPropagation(); ignorar.mutate(tx.id); }}
                                  title="Ignorar"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                              {(tx.status === "CONCILIADA" || tx.status === "IGNORADA") && (
                                <Button
                                  variant="ghost" size="sm" className="h-6 w-6 p-0 text-yellow-600"
                                  onClick={(e) => { e.stopPropagation(); undoReconcile.mutate(tx.id); }}
                                  title="Desfazer"
                                >
                                  <Undo2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: ERP Ledger Entries */}
        <Card>
          <CardContent className="pt-3">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <ArrowRight className="h-4 w-4" />
              Lançamentos ERP
              {selectedBankTx && (
                <span className="text-[11px] text-muted-foreground font-normal ml-2">
                  (filtrado por {selectedBankTx.direction === "IN" ? "receitas" : "despesas"})
                </span>
              )}
            </h3>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Data</TableHead>
                      <TableHead className="text-[11px]">Descrição</TableHead>
                      <TableHead className="text-[11px]">Categoria</TableHead>
                      <TableHead className="text-[11px] text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLedger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                          {selectedBankTx
                            ? "Nenhum lançamento compatível encontrado"
                            : "Selecione uma transação bancária à esquerda"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLedger.map(entry => {
                        const amountMatch = selectedBankTx
                          ? Math.abs(Math.abs(Number(entry.amount)) - Math.abs(Number(selectedBankTx.amount))) < 0.01
                          : false;

                        return (
                          <TableRow
                            key={entry.id}
                            className={cn(
                              "cursor-pointer transition-colors",
                              selectedLedgerId === entry.id && "bg-primary/10 ring-1 ring-primary/30",
                              amountMatch && "bg-green-50 dark:bg-green-950/20"
                            )}
                            onClick={() => setSelectedLedgerId(prev => prev === entry.id ? null : entry.id)}
                          >
                            <TableCell className="text-[11px] py-2">
                              {format(new Date(entry.cash_date || entry.competence_date), "dd/MM", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-[11px] py-2 max-w-[140px] truncate">
                              {entry.description}
                            </TableCell>
                            <TableCell className="text-[11px] py-2 max-w-[100px] truncate">
                              {entry.chart_account?.name || "-"}
                            </TableCell>
                            <TableCell className="text-[11px] py-2 text-right font-mono font-medium">
                              <span className={entry.type === "RECEITA" ? "text-green-600" : "text-red-600"}>
                                {formatCurrency(Math.abs(Number(entry.amount)))}
                              </span>
                              {amountMatch && (
                                <span className="ml-1 text-green-600" title="Valor exato">✓</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
