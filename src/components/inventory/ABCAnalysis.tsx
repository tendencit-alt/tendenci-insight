import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PieChart, Pie, Legend } from "recharts";

interface ABCItem {
  product_id: string;
  product_name: string;
  product_code: string;
  stock_value: number;
  cumulative_percentage: number;
  abc_class: string;
}

export default function ABCAnalysis() {
  const { data: abcData = [], isLoading } = useQuery({
    queryKey: ["stock-abc-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("stock_abc_analysis");
      if (error) throw error;
      return (data || []) as ABCItem[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Curva ABC</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const classColors: Record<string, string> = {
    A: "hsl(var(--chart-1))",
    B: "hsl(var(--chart-2))",
    C: "hsl(var(--chart-3))",
  };

  const classBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
    A: "default",
    B: "secondary",
    C: "outline",
  };

  // Summary by class
  const summary = abcData.reduce(
    (acc, item) => {
      if (!acc[item.abc_class]) {
        acc[item.abc_class] = { count: 0, value: 0 };
      }
      acc[item.abc_class].count++;
      acc[item.abc_class].value += item.stock_value;
      return acc;
    },
    {} as Record<string, { count: number; value: number }>
  );

  const totalValue = abcData.reduce((sum, item) => sum + item.stock_value, 0);
  const totalProducts = abcData.length;

  const pieData = Object.entries(summary).map(([cls, data]) => ({
    name: `Classe ${cls}`,
    value: data.value,
    count: data.count,
    percentage: ((data.value / totalValue) * 100).toFixed(1),
    fill: classColors[cls],
  }));

  const barData = abcData.slice(0, 15).map((item) => ({
    name: item.product_name.length > 20 ? item.product_name.substring(0, 20) + "..." : item.product_name,
    value: item.stock_value,
    class: item.abc_class,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {["A", "B", "C"].map((cls) => {
          const data = summary[cls] || { count: 0, value: 0 };
          const valuePercentage = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : "0";
          const countPercentage = totalProducts > 0 ? ((data.count / totalProducts) * 100).toFixed(1) : "0";

          return (
            <Card key={cls}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base">Classe {cls}</span>
                  <Badge variant={classBadgeVariants[cls]} style={{ backgroundColor: classColors[cls], color: "white" }}>
                    {cls === "A" ? "Alto Valor" : cls === "B" ? "Médio Valor" : "Baixo Valor"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Produtos</span>
                    <span className="font-medium">{data.count} ({countPercentage}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Valor</span>
                    <span className="font-medium">{formatCurrency(data.value)} ({valuePercentage}%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Classe</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => label}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 15 Produtos por Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value">
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={classColors[entry.class]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento por Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Valor em Estoque</TableHead>
                  <TableHead className="text-right">% Acumulado</TableHead>
                  <TableHead className="text-center">Classe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abcData.map((item, index) => (
                  <TableRow key={item.product_id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.product_code || "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.stock_value)}</TableCell>
                    <TableCell className="text-right">{item.cumulative_percentage.toFixed(1)}%</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={classBadgeVariants[item.abc_class]}
                        style={{ backgroundColor: classColors[item.abc_class], color: "white" }}
                      >
                        {item.abc_class}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
