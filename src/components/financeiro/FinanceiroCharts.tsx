import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinanceiroChartsProps {
  filters: FinanceiroFiltersState;
}

export function FinanceiroCharts({ filters }: FinanceiroChartsProps) {
  const dateField = "cash_date";

  // Fetch monthly data for charts
  const { data: monthlyData, isLoading } = useQuery({
    queryKey: ["fin-monthly-chart", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      let query = supabase
        .from("fin_ledger_entries")
        .select(`type, amount, ${dateField}`)
        .neq("status", "CANCELADO")
        .gte(dateField, dateFrom)
        .lte(dateField, dateTo)
        .not(dateField, "is", null);

      if (filters.bankAccountId) {
        query = query.eq("bank_account_id", filters.bankAccountId);
      }

      const { data } = await query;

      // Group by date
      const days = eachDayOfInterval({ start: filters.dateFrom, end: filters.dateTo });
      
      let runningBalance = 0;
      const chartData = days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayEntries = data?.filter(d => {
          const entryDate = d[dateField as keyof typeof d];
          return entryDate && format(new Date(entryDate as string), "yyyy-MM-dd") === dayStr;
        }) || [];

        const entradas = dayEntries
          .filter(d => d.type === "RECEITA")
          .reduce((sum, d) => sum + Number(d.amount), 0);
        
        const saidas = dayEntries
          .filter(d => d.type === "DESPESA")
          .reduce((sum, d) => sum + Number(d.amount), 0);

        runningBalance += entradas - saidas;

        return {
          date: format(day, "dd/MM", { locale: ptBR }),
          entradas,
          saidas,
          saldo: runningBalance,
        };
      });

      return chartData;
    },
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Evolução do Saldo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Evolução do Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
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

      {/* Entradas vs Saídas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Entradas vs Saídas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Legend />
              <Bar dataKey="entradas" fill="hsl(142, 76%, 36%)" name="Entradas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="hsl(0, 84%, 60%)" name="Saídas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
