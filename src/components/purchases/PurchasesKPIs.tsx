import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, CheckCircle, DollarSign } from "lucide-react";

export default function PurchasesKPIs() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["purchases-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("purchases_metrics");
      if (error) throw error;
      return data as {
        draft_orders: number;
        pending_orders: number;
        received_this_month: number;
        pending_value: number;
        received_value_this_month: number;
      };
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
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
      label: "Rascunhos",
      value: metrics?.draft_orders || 0,
      icon: FileText,
      color: "text-gray-500"
    },
    {
      label: "Pendentes",
      value: metrics?.pending_orders || 0,
      icon: Clock,
      color: "text-amber-500"
    },
    {
      label: "Recebidos (Mês)",
      value: metrics?.received_this_month || 0,
      icon: CheckCircle,
      color: "text-green-500"
    },
    {
      label: "Valor Pendente",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metrics?.pending_value || 0),
      icon: DollarSign,
      color: "text-orange-500"
    },
    {
      label: "Recebido (Mês)",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metrics?.received_value_this_month || 0),
      icon: DollarSign,
      color: "text-emerald-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
