import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Landmark, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BankAccountExtractTabProps {
  filters: FinanceiroFiltersState;
}

export function BankAccountExtractTab({ filters }: BankAccountExtractTabProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

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

  // Fetch extract entries for selected account
  const { data: extractEntries, isLoading } = useQuery({
    queryKey: ["fin-account-extract", selectedAccountId, filters],
    enabled: !!selectedAccountId,
    queryFn: async () => {
      const dateFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "2000-01-01";
      const dateTo = filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : "2099-12-31";

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

  // Fetch opening balance (sum of entries before the filter period)
  const { data: openingBalanceData } = useQuery({
    queryKey: ["fin-account-opening-balance", selectedAccountId, filters.dateFrom],
    enabled: !!selectedAccountId,
    queryFn: async () => {
      const dateFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "2000-01-01";

      // Get bank account opening balance
      const { data: account } = await supabase
        .from("fin_bank_accounts")
        .select("opening_balance, opening_balance_date")
        .eq("id", selectedAccountId)
        .single();

      // Sum all entries before the period
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

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);

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
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
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
                  <ArrowUpCircle className="h-3 w-3 text-green-600" /> Total Entradas
                </p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalEntradas)}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3 text-red-600" /> Total Saídas
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
          </div>

          {/* Extract Table */}
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
        </>
      )}
    </div>
  );
}
