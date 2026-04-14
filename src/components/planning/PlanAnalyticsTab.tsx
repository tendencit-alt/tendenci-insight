import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlanGoals, usePlanBudgets, usePlanScenarios } from "@/hooks/usePlanningData";
import { Target, DollarSign, TrendingUp, TrendingDown, BarChart3, AlertTriangle } from "lucide-react";

export default function PlanAnalyticsTab() {
  const { data: goals = [] } = usePlanGoals();
  const { data: budgets = [] } = usePlanBudgets();
  const { data: scenarios = [] } = usePlanScenarios();
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const stats = useMemo(() => {
    const avgAchievement = goals.length > 0 ? goals.reduce((s: number, g: any) => s + (g.achievement_pct || 0), 0) / goals.length : 0;

    const revBudgets = budgets.filter((b: any) => b.category === "receita");
    const revPlanned = revBudgets.reduce((s: number, b: any) => s + (b.planned_value || 0), 0);
    const revActual = revBudgets.reduce((s: number, b: any) => s + (b.actual_value || 0), 0);
    const revDeviation = revPlanned > 0 ? ((revActual - revPlanned) / revPlanned) * 100 : 0;

    const costBudgets = budgets.filter((b: any) => b.category !== "receita");
    const costPlanned = costBudgets.reduce((s: number, b: any) => s + (b.planned_value || 0), 0);
    const costActual = costBudgets.reduce((s: number, b: any) => s + (b.actual_value || 0), 0);
    const costDeviation = costPlanned > 0 ? ((costActual - costPlanned) / costPlanned) * 100 : 0;

    const marginPlanned = revPlanned - costPlanned;
    const marginActual = revActual - costActual;
    const marginDeviation = marginPlanned !== 0 ? ((marginActual - marginPlanned) / Math.abs(marginPlanned)) * 100 : 0;

    const bestScenario = scenarios.reduce((best: any, s: any) => (!best || (s.projected_profit || 0) > (best.projected_profit || 0)) ? s : best, null);

    return { avgAchievement, revDeviation, costDeviation, marginDeviation, marginPlanned, marginActual, revPlanned, revActual, costPlanned, costActual, bestScenario, totalGoals: goals.length, totalBudgetLines: budgets.length, totalScenarios: scenarios.length };
  }, [goals, budgets, scenarios]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Target className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Atingimento Médio Metas</p><p className="text-lg font-bold">{stats.avgAchievement.toFixed(0)}%</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Desvio Receita</p><p className={`text-lg font-bold ${stats.revDeviation >= 0 ? "text-green-600" : "text-destructive"}`}>{stats.revDeviation >= 0 ? "+" : ""}{stats.revDeviation.toFixed(1)}%</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingDown className="h-7 w-7 text-destructive" /><div><p className="text-xs text-muted-foreground">Desvio Custo</p><p className={`text-lg font-bold ${stats.costDeviation <= 0 ? "text-green-600" : "text-destructive"}`}>{stats.costDeviation >= 0 ? "+" : ""}{stats.costDeviation.toFixed(1)}%</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Desvio Margem</p><p className={`text-lg font-bold ${stats.marginDeviation >= 0 ? "text-green-600" : "text-destructive"}`}>{stats.marginDeviation >= 0 ? "+" : ""}{stats.marginDeviation.toFixed(1)}%</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 space-y-2">
          <p className="text-sm font-medium">Receita</p>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Orçado</span><span className="font-mono">{fmt(stats.revPlanned)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Realizado</span><span className="font-mono">{fmt(stats.revActual)}</span></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 space-y-2">
          <p className="text-sm font-medium">Custos</p>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Orçado</span><span className="font-mono">{fmt(stats.costPlanned)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Realizado</span><span className="font-mono">{fmt(stats.costActual)}</span></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 space-y-2">
          <p className="text-sm font-medium">Margem</p>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Orçado</span><span className="font-mono">{fmt(stats.marginPlanned)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Realizado</span><span className="font-mono font-bold">{fmt(stats.marginActual)}</span></div>
        </CardContent></Card>
      </div>

      {stats.bestScenario && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Melhor Cenário: {stats.bestScenario.name}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-4 gap-2 text-sm">
            <div><span className="text-muted-foreground">Lucro:</span> <span className="font-mono font-bold">{fmt(stats.bestScenario.projected_profit)}</span></div>
            <div><span className="text-muted-foreground">Margem:</span> <span className="font-mono">{(stats.bestScenario.projected_margin_pct || 0).toFixed(1)}%</span></div>
            <div><span className="text-muted-foreground">Nec. Caixa:</span> <span className="font-mono">{fmt(stats.bestScenario.cash_need)}</span></div>
            <div><span className="text-muted-foreground">Runway:</span> <span className="font-mono">{stats.bestScenario.runway_months}m</span></div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><BarChart3 className="h-6 w-6 mx-auto text-muted-foreground mb-1" /><p className="text-2xl font-bold">{stats.totalGoals}</p><p className="text-xs text-muted-foreground">Metas</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><DollarSign className="h-6 w-6 mx-auto text-muted-foreground mb-1" /><p className="text-2xl font-bold">{stats.totalBudgetLines}</p><p className="text-xs text-muted-foreground">Linhas Orçamento</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><AlertTriangle className="h-6 w-6 mx-auto text-muted-foreground mb-1" /><p className="text-2xl font-bold">{stats.totalScenarios}</p><p className="text-xs text-muted-foreground">Cenários</p></CardContent></Card>
      </div>
    </div>
  );
}
