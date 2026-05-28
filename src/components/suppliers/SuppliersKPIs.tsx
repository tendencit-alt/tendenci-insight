import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, ShoppingCart, DollarSign, Clock } from "lucide-react";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { MASTER_OWNER_TENANT_ID } from "@/components/tenant/OwnerTenantEmptyState";

export default function SuppliersKPIs() {
  const { activeTenantId, isOwner, homeTenantId } = useActiveTenant();
  const onMasterOwner =
    isOwner && (activeTenantId === MASTER_OWNER_TENANT_ID || activeTenantId === homeTenantId);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["suppliers-metrics", activeTenantId],
    enabled: !!activeTenantId && !onMasterOwner,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("suppliers_metrics");
      if (error) throw error;
      return data as {
        total_suppliers: number;
        purchases_this_month: number;
        purchases_value_this_month: number;
        pending_orders: number;
      };
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
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
      label: "Total Fornecedores",
      value: metrics?.total_suppliers || 0,
      icon: Truck,
      color: "text-blue-500"
    },
    {
      label: "Compras no Mês",
      value: metrics?.purchases_this_month || 0,
      icon: ShoppingCart,
      color: "text-green-500"
    },
    {
      label: "Valor no Mês",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metrics?.purchases_value_this_month || 0),
      icon: DollarSign,
      color: "text-emerald-500"
    },
    {
      label: "Pedidos Pendentes",
      value: metrics?.pending_orders || 0,
      icon: Clock,
      color: "text-amber-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold">{kpi.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
