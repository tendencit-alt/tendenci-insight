import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  RotateCcw,
  ShoppingCart
} from "lucide-react";

interface AdvancedMetrics {
  total_products: number;
  total_stock_value: number;
  products_below_minimum: number;
  products_zero_stock: number;
  products_above_maximum: number;
  total_entries: number;
  total_exits: number;
  entries_value: number;
  exits_value: number;
  average_turnover_days: number;
  products_to_reorder: number;
  reorder_estimated_value: number;
  top_products_movements: Array<{ name: string; code: string; movements: number; total_quantity: number }>;
  movements_by_type: Array<{ movement_type: string; count: number; total_quantity: number }>;
}

interface InventoryAdvancedKPIsProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export default function InventoryAdvancedKPIs({ dateFrom, dateTo }: InventoryAdvancedKPIsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["inventory-advanced-metrics", dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("inventory_metrics_advanced", {
        p_date_from: dateFrom?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_date_to: dateTo?.toISOString() || new Date().toISOString(),
      });
      if (error) throw error;
      return data as unknown as AdvancedMetrics;
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const kpis = [
    {
      title: "Valor do Estoque",
      value: formatCurrency(metrics.total_stock_value),
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Produtos Ativos",
      value: metrics.total_products,
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Abaixo do Mínimo",
      value: metrics.products_below_minimum,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
      alert: metrics.products_below_minimum > 0,
    },
    {
      title: "Estoque Zerado",
      value: metrics.products_zero_stock,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      alert: metrics.products_zero_stock > 0,
    },
    {
      title: "Entradas (período)",
      value: metrics.total_entries,
      subtitle: formatCurrency(metrics.entries_value),
      icon: ArrowDownToLine,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Saídas (período)",
      value: metrics.total_exits,
      subtitle: formatCurrency(metrics.exits_value),
      icon: ArrowUpFromLine,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Giro Médio (dias)",
      value: Math.round(metrics.average_turnover_days) || "N/A",
      icon: RotateCcw,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Para Reposição",
      value: metrics.products_to_reorder,
      subtitle: formatCurrency(metrics.reorder_estimated_value),
      icon: ShoppingCart,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      alert: metrics.products_to_reorder > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <Card key={index} className={kpi.alert ? "border-warning/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
              {kpi.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Produtos Movimentados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top 5 Produtos Mais Movimentados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.top_products_movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação no período</p>
            ) : (
              <div className="space-y-3">
                {metrics.top_products_movements.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-5">{index + 1}.</span>
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        {product.code && (
                          <p className="text-xs text-muted-foreground">{product.code}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{product.movements} mov.</p>
                      <p className="text-xs text-muted-foreground">{product.total_quantity} un.</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Movimentações por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Movimentações por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.movements_by_type.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação no período</p>
            ) : (
              <div className="space-y-3">
                {metrics.movements_by_type.map((mov, index) => {
                  const typeLabels: Record<string, string> = {
                    entrada: "Entrada",
                    saida: "Saída",
                    ajuste_positivo: "Ajuste (+)",
                    ajuste_negativo: "Ajuste (-)",
                    producao_consumo: "Consumo Produção",
                    producao_saida: "Saída Produção",
                  };
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{typeLabels[mov.movement_type] || mov.movement_type}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium">{mov.count} mov.</span>
                        <span className="text-xs text-muted-foreground ml-2">({mov.total_quantity} un.)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
