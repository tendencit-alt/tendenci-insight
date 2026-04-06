import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Landmark, CheckCircle, XCircle, Clock, AlertTriangle, Link2, Upload } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BankAccountExtractTabProps {
  filters: FinanceiroFiltersState;
}

export function BankAccountExtractTab({ filters }: BankAccountExtractTabProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [activeView, setActiveView] = useState<"extract" | "ofx">("extract");

  // Fetch active bank accounts
  const { data: accounts } = useQuery({
    queryKey: ["fin-bank-accounts-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_bank_accounts")
        .select("id, nickname, bank_name")
        .eq("active", true)
        .order("nickname");
      return data || [];
    },
  });

  const dateFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "2000-01-01";
  const dateTo = filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : "2099-12-31";

  // Fetch extract entries for selected account
  const { data: extractEntries, isLoading } = useQuery({
    queryKey: ["fin-account-extract", selectedAccountId, filters],
    enabled: !!selectedAccountId,
    queryFn: async () => {
      let query = supabase
        .from("fin_ledger_entries")
        .select(`
          *,
          chart_account:fin_chart_accounts(name, code),
          cost_center:fin_cost_centers(name),
          project:fin_projects(name)
        `)
        .eq("bank_account_id", selectedAccountId)
        .eq("status", "PAGO_RECEBIDO")
        .not("cash_date", "is", null)
        .gte("cash_date", dateFrom)
        .lte("cash_date", dateTo)
        .order("cash_date", { ascending: true });

      if (filters.costCenterId) query = query.eq("cost_center_id", filters.costCenterId);
      if (filters.projectId) query = query.eq("project_id", filters.projectId);
      if (filters.subcategoryId) query = query.eq("chart_account_id", filters.subcategoryId);
      else if (filters.categoryId) query = query.eq("chart_account_id", filters.categoryId);
      if (filters.search) query = query.ilike("description", `%${filters.search}%`);

      const { data } = await query;
      return data || [];
    },
  });

  // Fetch bank transactions (OFX) for selected account
  const { data: bankTransactions, isLoading: isLoadingTx } = useQuery({
    queryKey: ["fin-bank-transactions-account", selectedAccountId, dateFrom, dateTo],
    enabled: !!selectedAccountId,
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_bank_transactions")
        .select(`
          *,
          bank_account:fin_bank_accounts(nickname),
          reconciliation_links:fin_reconciliation_links(
            id,
            ledger_entry:fin_ledger_entries(id, description, amount)
          )
        `)
        .eq("bank_account_id", selectedAccountId)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: false });
      return data || [];
    },
  });

  // Fetch opening balance
  const { data: openingBalanceData } = useQuery({
    queryKey: ["fin-account-opening-balance", selectedAccountId, filters.dateFrom],
    enabled: !!selectedAccountId,
    queryFn: async () => {
      const { data: account } = await supabase
        .from("fin_bank_accounts")
        .select("opening_balance, opening_balance_date")
        .eq("id", selectedAccountId)
        .single();

      const { data: priorEntries } = await supabase
        .from("fin_ledger_entries")
        .select("amount, type")
        .eq("bank_account_id", selectedAccountId)
        .eq("status", "PAGO_RECEBIDO")
        .not("cash_date", "is", null)
        .lt("cash_date", dateFrom);

      const accountOpening = Number(account?.opening_balance || 0);
      const priorSum = (priorEntries || []).reduce((sum, e) => {
        const amt = Number(e.amount);
        return sum + (e.type === "RECEITA" ? amt : -amt);
      }, 0);

      return accountOpening + priorSum;
    },
  });

  const openingBalance = openingBalanceData || 0;

  // Calculate summaries and running balance
  const { totalEntradas, totalSaidas, rows } = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    let runningBalance = openingBalance;
    const rows = (extractEntries || []).map((entry) => {
      const amount = Number(entry.amount);
      const isReceita = entry.type === "RECEITA";
      if (isReceita) {
        entradas += amount;
        runningBalance += amount;
      } else {
        saidas += amount;
        runningBalance -= amount;
      }
      return { ...entry, entrada: isReceita ? amount : 0, saida: !isReceita ? amount : 0, saldo: runningBalance };
    });
    return { totalEntradas: entradas, totalSaidas: saidas, rows };
  }, [extractEntries, openingBalance]);

  const saldoFinal = openingBalance + totalEntradas - totalSaidas;

  // Bank transaction KPIs
  const txKpis = useMemo(() => {
    const kpis = { total: 0, pendentes: 0, conciliadas: 0, sugeridas: 0 };
    (bankTransactions || []).forEach(t => {
      kpis.total++;
      if (t.status === "PENDENTE") kpis.pendentes++;
      if (t.status === "CONCILIADA") kpis.conciliadas++;
      if (t.status === "SUGERIDA") kpis.sugeridas++;
    });
    return kpis;
  }, [bankTransactions]);

  const txConcPercent = txKpis.total > 0 ? Math.round((txKpis.conciliadas / txKpis.total) * 100) : 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);

  const getBankStatusBadge = (status: string) => {
    switch (status) {
      case "PENDENTE":
        return <Badge variant="outline" className="gap-1 text-[10px]"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case "SUGERIDA":
        return <Badge variant="secondary" className="gap-1 text-[10px] bg-blue-100 text-blue-700">Sugestão</Badge>;
      case "CONCILIADA":
        return <Badge className="bg-green-600 gap-1 text-[10px]"><CheckCircle className="h-3 w-3" /> Conciliada</Badge>;
      case "IGNORADA":
        return <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">Ignorada</Badge>;
      case "DIVERGENTE":
        return <Badge variant="destructive" className="gap-1 text-[10px]"><AlertTriangle className="h-3 w-3" /> Divergente</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Account Selector */}
      <div className="flex items-center gap-3">
        <Landmark className="h-5 w-5 text-muted-foreground" />
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Selecione uma conta bancária" />
          </SelectTrigger>
          <SelectContent>
            {accounts?.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.nickname} {acc.bank_name ? `(${acc.bank_name})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedAccountId ? (
        <div className="text-center py-16">
          <Landmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Selecione uma conta bancária para visualizar o extrato</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Saldo Anterior</p>
                <p className={`text-xl font-bold ${openingBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(openingBalance)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUpCircle className="h-3 w-3 text-green-600" /> Entradas
                </p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalEntradas)}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3 text-red-600" /> Saídas
                </p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalSaidas)}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Saldo Final</p>
                <p className={`text-xl font-bold ${saldoFinal >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(saldoFinal)}
                </p>
              </CardContent>
            </Card>
            {/* OFX KPIs */}
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Upload className="h-3 w-3" /> Importadas
                </p>
                <p className="text-xl font-bold">{txKpis.total}</p>
                {txKpis.pendentes > 0 && (
                  <p className="text-[10px] text-yellow-600">{txKpis.pendentes} pendentes</p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Conciliação
                </p>
                <p className={`text-xl font-bold ${txConcPercent === 100 ? "text-green-600" : txConcPercent >= 50 ? "text-yellow-600" : "text-foreground"}`}>
                  {txConcPercent}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Inner tabs: Extrato / Transações OFX */}
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "extract" | "ofx")} className="space-y-3">
            <TabsList>
              <TabsTrigger value="extract" className="gap-1.5 text-xs">
                <Landmark className="h-3.5 w-3.5" />
                Extrato Realizado
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{rows.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="ofx" className="gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" />
                Transações OFX
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{txKpis.total}</Badge>
                {txKpis.pendentes > 0 && (
                  <Badge variant="outline" className="ml-1 text-[10px] px-1.5 border-yellow-500 text-yellow-600">{txKpis.pendentes}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Extrato Realizado */}
            <TabsContent value="extract">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    Extrato — {selectedAccount?.nickname}
                    <span className="text-sm text-muted-foreground font-normal ml-2">
                      ({rows.length} lançamento{rows.length !== 1 ? "s" : ""})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="text-center py-12">
                      <RefreshCw className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhum lançamento realizado nesta conta no período</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Descrição</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Categoria</TableHead>
                            <TableHead className="text-xs text-right">Entrada</TableHead>
                            <TableHead className="text-xs text-right">Saída</TableHead>
                            <TableHead className="text-xs text-right">Saldo</TableHead>
                            <TableHead className="text-xs text-center">Conc.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Opening balance row */}
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell className="text-xs font-medium" colSpan={6}>
                              Saldo Anterior
                            </TableCell>
                            <TableCell className={`text-xs text-right font-bold ${openingBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrency(openingBalance)}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                          {rows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="text-xs font-medium whitespace-nowrap">
                                {format(new Date(row.cash_date), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-xs max-w-[200px] truncate">
                                {row.description}
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.type === "RECEITA" ? (
                                  <Badge className="bg-green-600 gap-1 text-[10px] px-1.5">
                                    <ArrowUpCircle className="h-3 w-3" /> Receita
                                  </Badge>
                                ) : row.type === "TRANSFERENCIA" ? (
                                  <Badge variant="secondary" className="gap-1 text-[10px] px-1.5">
                                    <RefreshCw className="h-3 w-3" /> Transf.
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-600 text-destructive-foreground hover:bg-red-600/90 gap-1 text-[10px] px-1.5">
                                    <ArrowDownCircle className="h-3 w-3" /> Despesa
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {row.chart_account?.name || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium text-green-600">
                                {row.entrada > 0 ? formatCurrency(row.entrada) : ""}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium text-red-600">
                                {row.saida > 0 ? formatCurrency(row.saida) : ""}
                              </TableCell>
                              <TableCell className={`text-xs text-right font-bold ${row.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrency(row.saldo)}
                              </TableCell>
                              <TableCell className="text-center">
                                {row.reconciled ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transações OFX */}
            <TabsContent value="ofx">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    Transações Importadas (OFX) — {selectedAccount?.nickname}
                    <span className="text-sm text-muted-foreground font-normal ml-2">
                      ({bankTransactions?.length || 0} transaç{(bankTransactions?.length || 0) !== 1 ? "ões" : "ão"})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingTx ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : (bankTransactions?.length || 0) === 0 ? (
                    <div className="text-center py-12">
                      <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhuma transação importada para esta conta no período</p>
                      <p className="text-xs text-muted-foreground mt-1">Importe um arquivo OFX para começar a conciliação</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Descrição (Memo)</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Lançamento Vinculado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bankTransactions?.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-xs font-medium whitespace-nowrap">
                                {format(new Date(tx.date), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-xs max-w-[250px] truncate">
                                {tx.bank_memo || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium whitespace-nowrap">
                                <span className={tx.direction === "IN" ? "text-green-600" : "text-red-600"}>
                                  {tx.direction === "IN" ? "+" : "-"}{formatCurrency(Math.abs(Number(tx.amount)))}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                {getBankStatusBadge(tx.status)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {tx.reconciliation_links?.[0]?.ledger_entry?.description || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
