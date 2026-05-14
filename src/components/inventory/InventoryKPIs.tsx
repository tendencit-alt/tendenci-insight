import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, DollarSign, AlertTriangle, TrendingUp, TrendingDown, XCircle } from "lucide-react";

export default function InventoryKPIs() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["inventory-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("inventory_metrics");
      if (error) throw error;
      return data as {
        total_products: number;
        total_stock_value: number;
        low_stock_count: number;
        out_of_stock_count: number;
        entries_this_month: number;
        exits_this_month: number;
      };
    }
  });

  const { data: negativeCount } = useQuery({
    queryKey: ["inventory-negative-stock-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .lt("current_stock", 0);
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Produtos",
      value: metrics?.total_products || 0,
      icon: Package,
      color: "text-blue-500"
    },
    {
      label: "Valor em Estoque",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metrics?.total_stock_value || 0),
      icon: DollarSign,
      color: "text-emerald-500"
    },
    {
      label: "Estoque Baixo",
      value: metrics?.low_stock_count || 0,
      icon: AlertTriangle,
      color: "text-amber-500"
    },
    {
      label: "Sem Estoque",
      value: metrics?.out_of_stock_count || 0,
      icon: XCircle,
      color: "text-red-500"
    },
    {
      label: "Estoque Negativo",
      value: negativeCount || 0,
      icon: AlertTriangle,
      color: "text-destructive"
    },
    {
      label: "Entradas (Mês)",
      value: metrics?.entries_this_month || 0,
      icon: TrendingUp,
      color: "text-green-500"
    },
    {
      label: "Saídas (Mês)",
      value: metrics?.exits_this_month || 0,
      icon: TrendingDown,
      color: "text-orange-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold">{kpi.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
