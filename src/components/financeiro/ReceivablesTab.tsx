import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Receipt, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateReceivableDialog } from "./CreateReceivableDialog";
import { ReceivePaymentDialog } from "./ReceivePaymentDialog";

interface ReceivablesTabProps {
  filters: FinanceiroFiltersState;
}

export function ReceivablesTab({ filters }: ReceivablesTabProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);

  const { data: receivables, isLoading, refetch } = useQuery({
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

  // Calculate KPIs
  const kpis = receivables?.reduce(
    (acc, r) => {
      const pendingAmount = Number(r.amount) - Number(r.received_amount || 0);
      if (r.status === "ABERTO") {
        acc.aberto += pendingAmount;
        acc.abertoCount++;
      } else if (r.status === "VENCIDO") {
        acc.vencido += pendingAmount;
        acc.vencidoCount++;
      } else if (r.status === "RECEBIDO") {
        acc.recebido += Number(r.amount);
        acc.recebidoCount++;
      }
      return acc;
    },
    { aberto: 0, abertoCount: 0, vencido: 0, vencidoCount: 0, recebido: 0, recebidoCount: 0 }
  ) || { aberto: 0, abertoCount: 0, vencido: 0, vencidoCount: 0, recebido: 0, recebidoCount: 0 };

  const getStatusBadge = (status: string) => {
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleReceive = (receivable: any) => {
    setSelectedReceivable(receivable);
    setReceiveDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Em Aberto</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(kpis.aberto)}</p>
                <p className="text-xs text-muted-foreground">{kpis.abertoCount} títulos</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vencidas</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(kpis.vencido)}</p>
                <p className="text-xs text-muted-foreground">{kpis.vencidoCount} títulos</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Recebidas no Período</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(kpis.recebido)}</p>
                <p className="text-xs text-muted-foreground">{kpis.recebidoCount} títulos</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="flex items-center justify-center">
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Conta a Receber
          </Button>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Contas a Receber
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
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
                      <TableCell>{getStatusBadge(receivable.status)}</TableCell>
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

      <CreateReceivableDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={refetch} />
      <ReceivePaymentDialog 
        open={receiveDialogOpen} 
        onOpenChange={setReceiveDialogOpen} 
        receivable={selectedReceivable}
        onSuccess={refetch}
      />
    </div>
  );
}
