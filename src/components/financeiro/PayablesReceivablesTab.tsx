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
import { Plus, CreditCard, Receipt, AlertTriangle, Clock, CheckCircle, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="payables" className="gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
              A Pagar
            </TabsTrigger>
            <TabsTrigger value="receivables" className="gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
              A Receber
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button onClick={() => setCreatePayableOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Conta a Pagar
          </Button>
          <Button onClick={() => setCreateReceivableOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Conta a Receber
          </Button>
        </div>
      </div>

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma conta a pagar encontrada no período
                      </TableCell>
                    </TableRow>
                  ) : (
                    payables?.map((payable) => (
                      <TableRow key={payable.id}>
                        <TableCell className="font-medium">
                          {format(new Date(payable.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{payable.supplier?.name || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{payable.description || "-"}</TableCell>
                        <TableCell className="text-xs">
                          {payable.chart_account ? `${payable.chart_account.code} - ${payable.chart_account.name}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma conta a receber encontrada no período
                      </TableCell>
                    </TableRow>
                  ) : (
                    receivables?.map((receivable) => (
                      <TableRow key={receivable.id}>
                        <TableCell className="font-medium">
                          {format(new Date(receivable.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{receivable.customer?.name || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{receivable.description || "-"}</TableCell>
                        <TableCell className="text-xs">
                          {receivable.chart_account ? `${receivable.chart_account.code} - ${receivable.chart_account.name}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
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
