import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface CashflowTabProps {
  filters: FinanceiroFiltersState;
}

export function CashflowTab({ filters }: CashflowTabProps) {
  const { data: cashflowData, isLoading } = useQuery({
    queryKey: ["fin-cashflow", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      // Get opening balance
      let balanceQuery = supabase
        .from("fin_bank_accounts")
        .select("opening_balance")
        .eq("active", true);

      if (filters.bankAccountId) {
        balanceQuery = balanceQuery.eq("id", filters.bankAccountId);
      }

      const { data: accounts } = await balanceQuery;
      const openingBalance = accounts?.reduce((sum, a) => sum + Number(a.opening_balance || 0), 0) || 0;

      // Get entries
      let entriesQuery = supabase
        .from("fin_ledger_entries")
        .select("type, amount, cash_date, status")
        .neq("status", "CANCELADO")
        .not("cash_date", "is", null)
        .gte("cash_date", dateFrom)
        .lte("cash_date", dateTo);

      if (filters.bankAccountId) {
        entriesQuery = entriesQuery.eq("bank_account_id", filters.bankAccountId);
      }
      if (filters.costCenterId) {
        entriesQuery = entriesQuery.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        entriesQuery = entriesQuery.eq("project_id", filters.projectId);
      }

      const { data: entries } = await entriesQuery;

      // Build daily cashflow
      const days = eachDayOfInterval({ start: filters.dateFrom, end: filters.dateTo });
      let runningBalance = openingBalance;

      const dailyData = days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayEntries = entries?.filter((e) => e.cash_date === dayStr) || [];

        const entradas = dayEntries
          .filter((e) => e.type === "RECEITA")
          .reduce((sum, e) => sum + Number(e.amount), 0);
        const saidas = dayEntries
          .filter((e) => e.type === "DESPESA")
          .reduce((sum, e) => sum + Number(e.amount), 0);

        runningBalance += entradas - saidas;

        return {
          date: format(day, "dd/MM", { locale: ptBR }),
          fullDate: format(day, "dd/MM/yyyy", { locale: ptBR }),
          entradas,
          saidas,
          saldo: runningBalance,
        };
      });

      const totalEntradas = entries?.filter((e) => e.type === "RECEITA").reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalSaidas = entries?.filter((e) => e.type === "DESPESA").reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      return {
        openingBalance,
        totalEntradas,
        totalSaidas,
        closingBalance: openingBalance + totalEntradas - totalSaidas,
        dailyData,
      };
    },
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Saldo Inicial</p>
                <p className="text-xl font-bold">{formatCurrency(cashflowData?.openingBalance || 0)}</p>
              </div>
              <Wallet className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(cashflowData?.totalEntradas || 0)}</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Saídas</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(cashflowData?.totalSaidas || 0)}</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Saldo Final</p>
                <p className={`text-xl font-bold ${(cashflowData?.closingBalance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(cashflowData?.closingBalance || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Evolução do Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cashflowData?.dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Saldo"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Movimentações Diárias</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Saídas</TableHead>
                <TableHead className="text-right">Saldo Acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashflowData?.dailyData.filter((d) => d.entradas > 0 || d.saidas > 0).map((day, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{day.fullDate}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {day.entradas > 0 ? `+${formatCurrency(day.entradas)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {day.saidas > 0 ? `-${formatCurrency(day.saidas)}` : "-"}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${day.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(day.saldo)}
                  </TableCell>
                </TableRow>
              ))}
              {cashflowData?.dailyData.filter((d) => d.entradas > 0 || d.saidas > 0).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhuma movimentação no período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
