import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePlanGoals, usePlanBudgets } from "@/hooks/usePlanningData";
import { Target, DollarSign, TrendingUp, AlertTriangle, BarChart3, CheckCircle } from "lucide-react";

export default function PlanTrackingTab() {
  const { data: goals = [] } = usePlanGoals();
  const { data: budgets = [] } = usePlanBudgets();
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const stats = useMemo(() => {
    const goalsOnTrack = goals.filter((g: any) => (g.achievement_pct || 0) >= 80).length;
    const goalsAtRisk = goals.filter((g: any) => (g.achievement_pct || 0) >= 50 && (g.achievement_pct || 0) < 80).length;
    const goalsBehind = goals.filter((g: any) => (g.achievement_pct || 0) < 50).length;

    const budgetRevenue = budgets.filter((b: any) => b.category === "receita");
    const revPlanned = budgetRevenue.reduce((s: number, b: any) => s + (b.planned_value || 0), 0);
    const revActual = budgetRevenue.reduce((s: number, b: any) => s + (b.actual_value || 0), 0);

    const budgetCosts = budgets.filter((b: any) => b.category !== "receita");
    const costPlanned = budgetCosts.reduce((s: number, b: any) => s + (b.planned_value || 0), 0);
    const costActual = budgetCosts.reduce((s: number, b: any) => s + (b.actual_value || 0), 0);

    return { goalsOnTrack, goalsAtRisk, goalsBehind, revPlanned, revActual, costPlanned, costActual };
  }, [goals, budgets]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><CheckCircle className="h-7 w-7 text-green-500" /><div><p className="text-xs text-muted-foreground">Metas no Alvo</p><p className="text-lg font-bold text-green-600">{stats.goalsOnTrack}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-7 w-7 text-amber-500" /><div><p className="text-xs text-muted-foreground">Metas em Risco</p><p className="text-lg font-bold text-amber-600">{stats.goalsAtRisk}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Target className="h-7 w-7 text-destructive" /><div><p className="text-xs text-muted-foreground">Metas Atrasadas</p><p className="text-lg font-bold text-destructive">{stats.goalsBehind}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><BarChart3 className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Total Metas</p><p className="text-lg font-bold">{goals.length}</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-sm font-medium">Receita Orçada vs Realizada</p>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Orçado:</span><span className="font-mono">{fmt(stats.revPlanned)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Realizado:</span><span className="font-mono">{fmt(stats.revActual)}</span></div>
            <Progress value={stats.revPlanned > 0 ? Math.min((stats.revActual / stats.revPlanned) * 100, 100) : 0} className="h-2" />
            <p className="text-xs text-right font-mono">{stats.revPlanned > 0 ? ((stats.revActual / stats.revPlanned) * 100).toFixed(0) : 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-sm font-medium">Custo Orçado vs Realizado</p>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Orçado:</span><span className="font-mono">{fmt(stats.costPlanned)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Realizado:</span><span className="font-mono">{fmt(stats.costActual)}</span></div>
            <Progress value={stats.costPlanned > 0 ? Math.min((stats.costActual / stats.costPlanned) * 100, 100) : 0} className="h-2" />
            <p className="text-xs text-right font-mono">{stats.costPlanned > 0 ? ((stats.costActual / stats.costPlanned) * 100).toFixed(0) : 0}%</p>
          </CardContent>
        </Card>
      </div>

      {goals.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">Meta vs Realizado — Detalhamento</p>
            <Table>
              <TableHeader><TableRow><TableHead>Meta</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Meta</TableHead><TableHead className="text-right">Realizado</TableHead><TableHead>Atingimento</TableHead></TableRow></TableHeader>
              <TableBody>
                {goals.map((g: any) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.title}</TableCell>
                    <TableCell><Badge variant="outline">{g.goal_type}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{fmt(g.target_value)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(g.current_value)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={Math.min(g.achievement_pct || 0, 100)} className="h-2 flex-1" />
                        <span className="text-xs font-mono">{(g.achievement_pct || 0).toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
