import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useOpsOrders, useOpsActivities } from "@/hooks/useOpsData";
import { Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";

export function OpsAnalyticsTab() {
  const { data: orders = [] } = useOpsOrders();
  const { data: activities = [] } = useOpsActivities();

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const completed = orders.filter((o: any) => o.status === "completed");
  const today = new Date().toISOString().split("T")[0];
  const delayed = orders.filter((o: any) => o.expected_end_date && o.expected_end_date < today && !["completed", "cancelled"].includes(o.status));
  const onTime = completed.filter((o: any) => !o.expected_end_date || (o.actual_end_date && o.actual_end_date <= o.expected_end_date));
  const reworkOrders = orders.filter((o: any) => o.order_type === "rework");
  const reworkPct = orders.length > 0 ? ((reworkOrders.length / orders.length) * 100).toFixed(1) : "0";

  const avgCost = completed.length > 0
    ? completed.reduce((s: number, o: any) => s + (o.actual_cost || 0), 0) / completed.length
    : 0;

  const avgHours = useMemo(() => {
    if (completed.length === 0) return 0;
    const totalHours = activities
      .filter((a: any) => completed.some((o: any) => o.id === a.ops_order_id))
      .reduce((s: number, a: any) => s + (a.hours_spent || 0), 0);
    return Math.round(totalHours / completed.length);
  }, [completed, activities]);

  const byType = useMemo(() => {
    const map: Record<string, { count: number; completed: number; cost: number }> = {};
    orders.forEach((o: any) => {
      if (!map[o.order_type]) map[o.order_type] = { count: 0, completed: 0, cost: 0 };
      map[o.order_type].count += 1;
      if (o.status === "completed") { map[o.order_type].completed += 1; map[o.order_type].cost += o.actual_cost || 0; }
    });
    return Object.entries(map).map(([type, d]) => ({ type, ...d, avgCost: d.completed > 0 ? d.cost / d.completed : 0 }));
  }, [orders]);

  const TYPE_LABEL: Record<string, string> = { production: "Produção", assembly: "Montagem", service: "Serviço", rework: "Retrabalho" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><CheckCircle className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Concluídas no Prazo</p><p className="text-xl font-bold">{onTime.length}/{completed.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-7 w-7 text-destructive" /><div><p className="text-xs text-muted-foreground">Atrasadas</p><p className="text-xl font-bold">{delayed.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Clock className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Tempo Médio (h)</p><p className="text-xl font-bold font-mono">{avgHours}h</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="h-7 w-7 text-destructive" /><div><p className="text-xs text-muted-foreground">Retrabalho</p><p className="text-xl font-bold">{reworkPct}%</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Indicadores por Tipo de Ordem</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Concluídas</TableHead><TableHead className="text-right">Custo Médio</TableHead></TableRow></TableHeader>
            <TableBody>
              {byType.map(t => (
                <TableRow key={t.type}>
                  <TableCell><Badge variant="outline">{TYPE_LABEL[t.type] || t.type}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{t.count}</TableCell>
                  <TableCell className="text-right font-mono">{t.completed}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(t.avgCost)}</TableCell>
                </TableRow>
              ))}
              {byType.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
