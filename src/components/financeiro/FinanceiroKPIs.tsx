import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Flame, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      info: "Soma de todos os saldos das contas bancárias. Use para avaliar a liquidez imediata da empresa e capacidade de honrar compromissos de curto prazo.",
    },
    {
      title: "Entradas",
      value: metrics?.entradas || 0,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      info: "Total de receitas recebidas no período. Analise tendências de crescimento e sazonalidade. Quedas consecutivas indicam necessidade de ação comercial.",
    },
    {
      title: "Saídas",
      value: metrics?.saidas || 0,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
      info: "Total de despesas pagas no período. Monitore para identificar gastos excessivos ou oportunidades de redução de custos.",
    },
    {
      title: "Resultado",
      value: metrics?.resultado || 0,
      icon: PiggyBank,
      color: (metrics?.resultado || 0) >= 0 ? "text-green-600" : "text-red-600",
      bgColor: (metrics?.resultado || 0) >= 0 ? "bg-green-50" : "bg-red-50",
      info: "Diferença entre entradas e saídas. Resultado negativo recorrente indica que a operação não é sustentável. Avalie corte de custos ou aumento de receita.",
    },
    {
      title: "Consumo / Fôlego",
      value: burnRate * 30,
      secondaryValue: runway,
      icon: Flame,
      color: runway > 6 ? "text-green-600" : runway > 3 ? "text-yellow-600" : "text-red-600",
      bgColor: runway > 6 ? "bg-green-50" : runway > 3 ? "bg-yellow-50" : "bg-red-50",
      isCombo: true,
      info: "Consumo mensal médio e quantos meses a empresa pode operar com o saldo atual. Menos de 3 meses = urgente buscar capital ou cortar custos. 3-6 meses = atenção.",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
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
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground font-medium">{kpi.title}</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px] text-xs">
                        <p>{kpi.info}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {kpi.isCombo ? (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(kpi.value)}/mês
                      </p>
                      <p className={cn("text-xl font-bold", kpi.color)}>
                        {kpi.secondaryValue} meses
                      </p>
                    </div>
                  ) : (
                    <p className={cn("text-xl font-bold", kpi.color)}>
                      {formatCurrency(kpi.value)}
                    </p>
                  )}
                </div>
                <div className={cn("p-2 rounded-full", kpi.bgColor)}>
                  <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
}
