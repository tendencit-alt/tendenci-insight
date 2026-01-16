import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Upload, CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ReconciliationTabProps {
  filters: FinanceiroFiltersState;
}

export function ReconciliationTab({ filters }: ReconciliationTabProps) {
  const [importing, setImporting] = useState(false);

  const { data: transactions, isLoading, refetch } = useQuery({
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

  // Calculate KPIs
  const kpis = transactions?.reduce(
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

  const conciliationPercent = kpis.total > 0 
    ? Math.round((kpis.conciliadas / kpis.total) * 100) 
    : 0;

  const getStatusBadge = (status: string) => {
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

  const formatCurrency = (value: number, direction: string) => {
    const formatted = Math.abs(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    if (direction === "OUT") {
      return <span className="text-red-600">-{formatted}</span>;
    }
    return <span className="text-green-600">+{formatted}</span>;
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
      // TODO: Implement OFX parsing via edge function
      toast.info("Funcionalidade de importação OFX em desenvolvimento");
    } catch (error: any) {
      toast.error("Erro ao importar arquivo: " + error.message);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const handleReconcile = async (transactionId: string) => {
    // TODO: Implement reconciliation logic
    toast.info("Funcionalidade de conciliação manual em desenvolvimento");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Conciliação Bancária
          </h2>
          <p className="text-sm text-muted-foreground">
            Importe extratos OFX e concilie com os lançamentos
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".ofx"
            onChange={handleFileUpload}
            className="hidden"
            id="ofx-upload"
          />
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => document.getElementById("ofx-upload")?.click()}
            disabled={importing}
          >
            <Upload className="h-4 w-4" />
            Importar OFX
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Importadas</p>
            <p className="text-2xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{kpis.pendentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Sugestões</p>
            <p className="text-2xl font-bold text-blue-600">{kpis.sugeridas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Conciliadas</p>
            <p className="text-2xl font-bold text-green-600">{kpis.conciliadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">% Conciliação</p>
            <p className="text-2xl font-bold">{conciliationPercent}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Transações do Extrato</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                  <TableHead>Data</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Descrição (Memo)</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lançamento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {format(new Date(tx.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{tx.bank_account?.nickname || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{tx.bank_memo || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(tx.amount), tx.direction)}
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell className="text-sm">
                      {tx.reconciliation_links?.[0]?.ledger_entry?.description || "-"}
                    </TableCell>
                    <TableCell>
                      {tx.status !== "CONCILIADA" && tx.status !== "IGNORADA" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReconcile(tx.id)}
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
    </div>
  );
}
