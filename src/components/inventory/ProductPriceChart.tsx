import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, TrendingUp } from "lucide-react";

interface ProductPriceChartProps {
  productId: string;
}

export default function ProductPriceChart({ productId }: ProductPriceChartProps) {
  const { data: priceHistory = [], isLoading } = useQuery({
    queryKey: ["product-price-history", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_price_history")
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (priceHistory.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum histórico de preços</p>
        <p className="text-xs">O histórico será alimentado automaticamente nas entradas de estoque</p>
      </div>
    );
  }

  const chartData = priceHistory.map((item: any) => ({
    date: format(new Date(item.created_at), "dd/MM", { locale: ptBR }),
    preco: item.cost_price,
    fornecedor: item.supplier?.name || "N/A",
    quantidade: item.quantity
  }));

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução do Preço de Custo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={(v) => `R$${v}`} 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), "Preço"]}
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Line 
                type="monotone" 
                dataKey="preco" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Últimas Compras</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {priceHistory.slice().reverse().map((item: any) => (
            <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
              <div>
                <span className="text-muted-foreground">
                  {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <span className="mx-2">·</span>
                <span>{item.supplier?.name || "Sem fornecedor"}</span>
              </div>
              <div className="text-right">
                <span className="font-medium">{formatCurrency(item.cost_price)}</span>
                <span className="text-muted-foreground ml-2">({item.quantity} un)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
