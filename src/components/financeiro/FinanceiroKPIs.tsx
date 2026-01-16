import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Flame, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceiroKPIsProps {
  metrics?: {
    entradas: number;
    saidas: number;
    resultado: number;
    saldoConsolidado: number;
  };
  isLoading: boolean;
}

export function FinanceiroKPIs({ metrics, isLoading }: FinanceiroKPIsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const burnRate = metrics?.saidas ? metrics.saidas / 30 : 0; // Simplified daily burn
  const runway = burnRate > 0 && metrics?.saldoConsolidado 
    ? Math.floor(metrics.saldoConsolidado / (burnRate * 30)) 
    : 0;

  const kpis = [
    {
      title: "Saldo Consolidado",
      value: metrics?.saldoConsolidado || 0,
      icon: Wallet,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Entradas",
      value: metrics?.entradas || 0,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Saídas",
      value: metrics?.saidas || 0,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Resultado",
      value: metrics?.resultado || 0,
      icon: PiggyBank,
      color: (metrics?.resultado || 0) >= 0 ? "text-green-600" : "text-red-600",
      bgColor: (metrics?.resultado || 0) >= 0 ? "bg-green-50" : "bg-red-50",
    },
    {
      title: "Burn Rate (Mensal)",
      value: burnRate * 30,
      icon: Flame,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Runway",
      value: runway,
      icon: Calendar,
      color: runway > 6 ? "text-green-600" : runway > 3 ? "text-yellow-600" : "text-red-600",
      bgColor: runway > 6 ? "bg-green-50" : runway > 3 ? "bg-yellow-50" : "bg-red-50",
      isMeses: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {kpis.map((kpi, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{kpi.title}</p>
                <p className={cn("text-xl font-bold", kpi.color)}>
                  {kpi.isMeses 
                    ? `${kpi.value} meses` 
                    : formatCurrency(kpi.value)
                  }
                </p>
              </div>
              <div className={cn("p-2 rounded-full", kpi.bgColor)}>
                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
