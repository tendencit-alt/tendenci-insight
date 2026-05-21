import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ComparisonCardsProps {
  ranking?: {
    position: number;
    total: number;
    topPercentage: number;
    teamAveragePercentage: number;
  };
  trend?: {
    currentSales: number;
    projectedSales: number;
    goalAmount: number;
  };
  pace?: {
    dailyAverage: number;
    idealDaily: number;
    projectedMonth: number;
  };
}

export function ComparisonCards({ ranking, trend, pace }: ComparisonCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {/* Ranking da Equipe */}
      {ranking && (
        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              Ranking da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-5xl font-bold text-primary mb-2">
                {ranking.position}º
              </p>
              <p className="text-sm text-muted-foreground">
                de {ranking.total} vendedores
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Top 1:</span>
                  <span className="font-medium">{ranking.topPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={ranking.topPercentage} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Média da equipe:</span>
                  <span className="font-medium">{ranking.teamAveragePercentage.toFixed(1)}%</span>
                </div>
                <Progress value={ranking.teamAveragePercentage} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tendência Mensal */}
      {trend && (
        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Tendência Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendido até agora:</span>
                <span className="font-bold">R$ {trend.currentSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Projeção mês:</span>
                <span className="font-bold text-primary">R$ {trend.projectedSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meta:</span>
                <span className="font-medium">R$ {trend.goalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="pt-2">
              {trend.projectedSales >= trend.goalAmount ? (
                <p className="text-sm text-success font-medium">
                  ✅ No caminho certo para bater a meta!
                </p>
              ) : (
                <p className="text-sm text-warning font-medium">
                  ⚠️ Precisa acelerar para atingir a meta
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ritmo de Performance */}
      {pace && (
        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-destructive" />
              Seu Ritmo Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Média diária:</span>
                <span className="font-bold">R$ {pace.dailyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ideal por dia:</span>
                <span className="font-medium">R$ {pace.idealDaily.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fechará em:</span>
                <span className="font-bold text-primary">R$ {pace.projectedMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="pt-2">
              {pace.dailyAverage >= pace.idealDaily ? (
                <p className="text-sm text-success font-medium">
                  🔥 Ritmo acima do ideal!
                </p>
              ) : (
                <p className="text-sm text-warning font-medium">
                  ⚡ Acelere o ritmo para bater a meta
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
