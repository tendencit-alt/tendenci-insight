import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Target, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SellerGoalCardsProps {
  salesGoal?: {
    target: number;
    current: number;
    percentage: number;
  };
  captationGoal?: {
    target: number;
    current: number;
    percentage: number;
  };
  architectsGoal?: {
    target: number;
    current: number;
    percentage: number;
  };
}

export function SellerGoalCards({ salesGoal, captationGoal, architectsGoal }: SellerGoalCardsProps) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-success";
    if (percentage >= 70) return "bg-warning";
    if (percentage >= 40) return "bg-chart-3";
    return "bg-destructive";
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Meta de Vendas */}
      {salesGoal && (
        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                Meta de Vendas
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meta:</span>
                <span className="font-medium">{formatCurrency(salesGoal.target)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendido:</span>
                <span className="font-bold text-success">{formatCurrency(salesGoal.current)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={salesGoal.percentage} 
                className="h-3"
              />
              <p className="text-right text-2xl font-bold">
                {salesGoal.percentage.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meta de Captação */}
      {captationGoal && (
        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Meta de Captação
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meta:</span>
                <span className="font-medium">{captationGoal.target} arquitetos</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Captados:</span>
                <span className="font-bold text-primary">{captationGoal.current}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={captationGoal.percentage}
                className="h-3"
              />
              <p className="text-right text-2xl font-bold">
                {captationGoal.percentage.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meta de Profissionais Parceiros Efetivados */}
      {architectsGoal && (
        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-warning" />
                Arquitetos Efetivados
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meta:</span>
                <span className="font-medium">{architectsGoal.target} projetos</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Efetivados:</span>
                <span className="font-bold text-warning">{architectsGoal.current}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={architectsGoal.percentage}
                className="h-3"
              />
              <p className="text-right text-2xl font-bold">
                {architectsGoal.percentage.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
