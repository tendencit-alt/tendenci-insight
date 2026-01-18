import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CreditCard, Receipt, AlertTriangle, Clock, CheckCircle, ArrowDownCircle, ArrowUpCircle, Landmark, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreatePayableDialog } from "./CreatePayableDialog";
import { PayPayableDialog } from "./PayPayableDialog";
import { CreateReceivableDialog } from "./CreateReceivableDialog";
import { ReceivePaymentDialog } from "./ReceivePaymentDialog";

interface PayablesReceivablesTabProps {
  filters: FinanceiroFiltersState;
}

type ViewType = "all" | "payables" | "receivables";

export function PayablesReceivablesTab({ filters }: PayablesReceivablesTabProps) {
  const [viewType, setViewType] = useState<ViewType>("all");
  const [createPayableOpen, setCreatePayableOpen] = useState(false);
  const [createReceivableOpen, setCreateReceivableOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);

  // Fetch Payables
  const { data: payables, isLoading: payablesLoading, refetch: refetchPayables } = useQuery({
    queryKey: ["fin-payables", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      let query = supabase
        .from("fin_payables")
        .select(`
          *,
          supplier:suppliers(name),
          chart_account:fin_chart_accounts(name, code),
          bank_account:fin_bank_accounts(nickname)
        `)
        .gte("due_date", dateFrom)
        .lte("due_date", dateTo)
        .order("due_date", { ascending: true });

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

  // Fetch Receivables
  const { data: receivables, isLoading: receivablesLoading, refetch: refetchReceivables } = useQuery({
    queryKey: ["fin-receivables", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      let query = supabase
        .from("fin_receivables")
        .select(`
          *,
          customer:clients(name),
          chart_account:fin_chart_accounts(name, code),
          bank_account:fin_bank_accounts(nickname)
        `)
        .gte("due_date", dateFrom)
        .lte("due_date", dateTo)
        .order("due_date", { ascending: true });

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

  // Fetch Payables Summary with 7d, 15d, 30d
  const { data: payablesSummary, isLoading: payablesSummaryLoading } = useQuery({
    queryKey: ["fin-payables-summary-unified"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_payables")
        .select("status, amount, paid_amount, due_date")
        .neq("status", "CANCELADO");

      const today = new Date();
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const abertas = data?.filter(d => d.status === "ABERTO") || [];
      const vencidas = data?.filter(d => d.status === "VENCIDO") || [];

      return {
        abertasCount: abertas.length,
        abertasValor: abertas.reduce((sum, d) => sum + Number(d.amount) - Number(d.paid_amount || 0), 0),
        vencidasCount: vencidas.length,
        vencidasValor: vencidas.reduce((sum, d) => sum + Number(d.amount) - Number(d.paid_amount || 0), 0),
        aVencer7d: abertas.filter(d => new Date(d.due_date) <= in7Days).length,
        aVencer15d: abertas.filter(d => new Date(d.due_date) <= in15Days).length,
        aVencer30d: abertas.filter(d => new Date(d.due_date) <= in30Days).length,
      };
    },
  });

  // Fetch Receivables Summary with 7d, 15d, 30d
  const { data: receivablesSummary, isLoading: receivablesSummaryLoading } = useQuery({
    queryKey: ["fin-receivables-summary-unified"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_receivables")
        .select("status, amount, received_amount, due_date")
        .neq("status", "CANCELADO");

      const today = new Date();
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const abertas = data?.filter(d => d.status === "ABERTO") || [];
      const vencidas = data?.filter(d => d.status === "VENCIDO") || [];

      return {
        abertasCount: abertas.length,
        abertasValor: abertas.reduce((sum, d) => sum + Number(d.amount) - Number(d.received_amount || 0), 0),
        vencidasCount: vencidas.length,
        vencidasValor: vencidas.reduce((sum, d) => sum + Number(d.amount) - Number(d.received_amount || 0), 0),
        aVencer7d: abertas.filter(d => new Date(d.due_date) <= in7Days).length,
        aVencer15d: abertas.filter(d => new Date(d.due_date) <= in15Days).length,
        aVencer30d: abertas.filter(d => new Date(d.due_date) <= in30Days).length,
      };
    },
  });

  // Fetch Unified Bank Balance
  const { data: bankBalance, isLoading: bankBalanceLoading } = useQuery({
    queryKey: ["fin-bank-balance-unified"],
    queryFn: async () => {
      // Get all active bank accounts
      const { data: accounts } = await supabase
        .from("fin_bank_accounts")
        .select("id, nickname, opening_balance, opening_balance_date")
        .eq("active", true);

      // Get all ledger entries
      const { data: entries } = await supabase
        .from("fin_ledger_entries")
        .select("bank_account_id, type, amount, status, cash_date")
        .neq("status", "CANCELADO")
        .not("cash_date", "is", null);

      // Calculate balance per account
      let totalSaldoInicial = 0;
      let totalEntradas = 0;
      let totalSaidas = 0;

      accounts?.forEach(account => {
        totalSaldoInicial += Number(account.opening_balance || 0);
        
        const accountEntries = entries?.filter(e => e.bank_account_id === account.id) || [];
        accountEntries.forEach(entry => {
          if (entry.type === "RECEITA") {
            totalEntradas += Number(entry.amount);
          } else if (entry.type === "DESPESA") {
            totalSaidas += Number(entry.amount);
          }
        });
      });

      const saldoAtual = totalSaldoInicial + totalEntradas - totalSaidas;

      return {
        saldoInicial: totalSaldoInicial,
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldoAtual,
        contasAtivas: accounts?.length || 0,
      };
    },
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getPayableStatusBadge = (status: string) => {
    switch (status) {
      case "ABERTO":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Aberto</Badge>;
      case "VENCIDO":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Vencido</Badge>;
      case "PAGO":
        return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> Pago</Badge>;
      case "PARCIAL":
        return <Badge variant="secondary" className="gap-1">Parcial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReceivableStatusBadge = (status: string) => {
    switch (status) {
      case "ABERTO":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Aberto</Badge>;
      case "VENCIDO":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Vencido</Badge>;
      case "RECEBIDO":
        return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> Recebido</Badge>;
      case "PARCIAL":
        return <Badge variant="secondary" className="gap-1">Parcial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handlePay = (payable: any) => {
    setSelectedPayable(payable);
    setPayDialogOpen(true);
  };

  const handleReceive = (receivable: any) => {
    setSelectedReceivable(receivable);
    setReceiveDialogOpen(true);
  };

  const showPayables = viewType === "all" || viewType === "payables";
  const showReceivables = viewType === "all" || viewType === "receivables";

  return (
    <div className="space-y-4">
      {/* View Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">Todas</TabsTrigger>
            <TabsTrigger value="payables" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <ArrowDownCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
              <span className="hidden xs:inline">A Pagar</span>
              <span className="xs:hidden">Pagar</span>
            </TabsTrigger>
            <TabsTrigger value="receivables" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <ArrowUpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
              <span className="hidden xs:inline">A Receber</span>
              <span className="xs:hidden">Receber</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setCreatePayableOpen(true)} variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Conta a</span> Pagar
          </Button>
          <Button onClick={() => setCreateReceivableOpen(true)} size="sm" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Conta a</span> Receber
          </Button>
        </div>
      </div>

      {/* Bank Balance Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          {bankBalanceLoading ? (
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-8 w-32" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Landmark className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Consolidado ({bankBalance?.contasAtivas || 0} contas)</p>
                  <p className={`text-2xl font-bold ${(bankBalance?.saldoAtual || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(bankBalance?.saldoAtual || 0)}
                  </p>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-muted-foreground text-xs">Total Entradas</p>
                    <p className="font-semibold text-green-600">{formatCurrency(bankBalance?.entradas || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-muted-foreground text-xs">Total Saídas</p>
                    <p className="font-semibold text-red-600">{formatCurrency(bankBalance?.saidas || 0)}</p>
                  </div>
                </div>
                <div className="border-l pl-6">
                  <p className="text-muted-foreground text-xs">Saldo Inicial</p>
                  <p className="font-semibold">{formatCurrency(bankBalance?.saldoInicial || 0)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Contas a Pagar Summary */}
        <Card className={!showPayables ? "opacity-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
              Contas a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payablesSummaryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Em Aberto</span>
                  <span className="font-semibold">
                    {payablesSummary?.abertasCount || 0} títulos - {formatCurrency(payablesSummary?.abertasValor || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-red-600">
                  <span className="text-sm">Vencidas</span>
                  <span className="font-semibold">
                    {payablesSummary?.vencidasCount || 0} títulos - {formatCurrency(payablesSummary?.vencidasValor || 0)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    7d: {payablesSummary?.aVencer7d || 0}
                  </span>
                  <span>15d: {payablesSummary?.aVencer15d || 0}</span>
                  <span>30d: {payablesSummary?.aVencer30d || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contas a Receber Summary */}
        <Card className={!showReceivables ? "opacity-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-500" />
              Contas a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receivablesSummaryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Em Aberto</span>
                  <span className="font-semibold">
                    {receivablesSummary?.abertasCount || 0} títulos - {formatCurrency(receivablesSummary?.abertasValor || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-green-600">
                  <span className="text-sm">Vencidas</span>
                  <span className="font-semibold">
                    {receivablesSummary?.vencidasCount || 0} títulos - {formatCurrency(receivablesSummary?.vencidasValor || 0)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    7d: {receivablesSummary?.aVencer7d || 0}
                  </span>
                  <span>15d: {receivablesSummary?.aVencer15d || 0}</span>
                  <span>30d: {receivablesSummary?.aVencer30d || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payables Table */}
      {showPayables && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              Contas a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payablesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Vencimento</TableHead>
                      <TableHead className="text-xs sm:text-sm">Fornecedor</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Descrição</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Categoria</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">Valor</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payables?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                          Nenhuma conta a pagar encontrada no período
                        </TableCell>
                      </TableRow>
                    ) : (
                      payables?.map((payable) => (
                        <TableRow key={payable.id}>
                          <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                            {format(new Date(payable.due_date), "dd/MM/yy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm max-w-[120px] sm:max-w-none truncate">{payable.supplier?.name || "-"}</TableCell>
                          <TableCell className="text-xs sm:text-sm max-w-[150px] truncate hidden md:table-cell">{payable.description || "-"}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">
                            {payable.chart_account ? `${payable.chart_account.code}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs sm:text-sm whitespace-nowrap">
                            {formatCurrency(Number(payable.amount))}
                            {payable.paid_amount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Pago: {formatCurrency(Number(payable.paid_amount))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getPayableStatusBadge(payable.status)}</TableCell>
                          <TableCell>
                            {payable.status !== "PAGO" && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => handlePay(payable)}
                              >
                                Pagar
                              </Button>
                            )}
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
      )}

      {/* Receivables Table */}
      {showReceivables && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-500" />
              Contas a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receivablesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Vencimento</TableHead>
                      <TableHead className="text-xs sm:text-sm">Cliente</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Descrição</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Categoria</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">Valor</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivables?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                          Nenhuma conta a receber encontrada no período
                        </TableCell>
                      </TableRow>
                    ) : (
                      receivables?.map((receivable) => (
                        <TableRow key={receivable.id}>
                          <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                            {format(new Date(receivable.due_date), "dd/MM/yy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm max-w-[120px] sm:max-w-none truncate">{receivable.customer?.name || "-"}</TableCell>
                          <TableCell className="text-xs sm:text-sm max-w-[150px] truncate hidden md:table-cell">{receivable.description || "-"}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">
                            {receivable.chart_account ? `${receivable.chart_account.code}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs sm:text-sm whitespace-nowrap">
                            {formatCurrency(Number(receivable.amount))}
                            {receivable.received_amount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Recebido: {formatCurrency(Number(receivable.received_amount))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getReceivableStatusBadge(receivable.status)}</TableCell>
                          <TableCell>
                            {receivable.status !== "RECEBIDO" && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => handleReceive(receivable)}
                              >
                                Receber
                              </Button>
                            )}
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
      )}

      <CreatePayableDialog open={createPayableOpen} onOpenChange={setCreatePayableOpen} onSuccess={refetchPayables} />
      <PayPayableDialog 
        open={payDialogOpen} 
        onOpenChange={setPayDialogOpen} 
        payable={selectedPayable}
        onSuccess={refetchPayables}
      />
      <CreateReceivableDialog open={createReceivableOpen} onOpenChange={setCreateReceivableOpen} onSuccess={refetchReceivables} />
      <ReceivePaymentDialog 
        open={receiveDialogOpen} 
        onOpenChange={setReceiveDialogOpen} 
        receivable={selectedReceivable}
        onSuccess={refetchReceivables}
      />
    </div>
  );
}
