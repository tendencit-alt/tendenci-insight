import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

const PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220 70% 55%)",
  "hsl(160 60% 45%)",
  "hsl(30 80% 55%)",
  "hsl(280 60% 55%)",
  "hsl(340 70% 55%)",
];

interface ProductRow {
  id: string;
  name: string;
  code: string | null;
  current_stock: number | null;
  average_cost: number | null;
  cost_price: number | null;
  category_id: string | null;
  product_categories?: { name: string } | null;
}

export default function ABCAnalysis() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["stock-by-category"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, code, current_stock, average_cost, cost_price, category_id, product_categories(name)")
        .eq("active", true);
      if (error) throw error;
      return (data || []) as ProductRow[];
    },
  });

  const formatCurrency = (value: number) =>
    (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const { items, summary, totalValue, categoryColors } = useMemo(() => {
    const items = products.map((p) => {
      const unit = Number(p.average_cost) || Number(p.cost_price) || 0;
      const stock = Number(p.current_stock) || 0;
      const value = unit * stock;
      const category = p.product_categories?.name || "Sem categoria";
      return {
        product_id: p.id,
        product_name: p.name,
        product_code: p.code || "",
        category,
        stock_value: value,
      };
    }).sort((a, b) => b.stock_value - a.stock_value);

    const summary: Record<string, { count: number; value: number }> = {};
    for (const it of items) {
      if (!summary[it.category]) summary[it.category] = { count: 0, value: 0 };
      summary[it.category].count++;
      summary[it.category].value += it.stock_value;
    }
    const totalValue = items.reduce((s, i) => s + i.stock_value, 0);

    const sortedCats = Object.entries(summary).sort((a, b) => b[1].value - a[1].value);
    const categoryColors: Record<string, string> = {};
    sortedCats.forEach(([cat], i) => { categoryColors[cat] = PALETTE[i % PALETTE.length]; });

    return { items, summary, totalValue, categoryColors };
  }, [products]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Curva ABC por Categoria</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  const totalProducts = items.length;
  const sortedCats = Object.entries(summary).sort((a, b) => b[1].value - a[1].value);

  const pieData = sortedCats.map(([cat, data]) => ({
    name: cat,
    value: data.value,
    count: data.count,
    percentage: totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : "0",
    fill: categoryColors[cat],
  }));

  const barData = items.slice(0, 15).map((item) => ({
    name: item.product_name.length > 20 ? item.product_name.substring(0, 20) + "..." : item.product_name,
    value: item.stock_value,
    category: item.category,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards por Categoria */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedCats.map(([cat, data]) => {
          const valuePercentage = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : "0";
          const countPercentage = totalProducts > 0 ? ((data.count / totalProducts) * 100).toFixed(1) : "0";
          return (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base truncate">{cat}</span>
                  <Badge style={{ backgroundColor: categoryColors[cat], color: "white" }}>
                    {valuePercentage}%
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
                    <span className="font-medium">{formatCurrency(data.value)}</span>
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
          <CardHeader><CardTitle className="text-base">Distribuição por Categoria</CardTitle></CardHeader>
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
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top 15 Produtos por Valor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value">
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={categoryColors[entry.category] || PALETTE[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Detalhamento por Produto</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor em Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.product_id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.product_code || "-"}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: categoryColors[item.category], color: "white" }}>
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.stock_value)}</TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum produto cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
