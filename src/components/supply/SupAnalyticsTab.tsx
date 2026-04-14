import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePurchaseAnalytics } from "@/hooks/useSupplyData";
import { DollarSign, Clock, TrendingDown, AlertTriangle } from "lucide-react";

export function SupAnalyticsTab() {
  const { orders, evaluations } = usePurchaseAnalytics();
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const stats = useMemo(() => {
    const total = orders.length;
    const totalValue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const received = orders.filter((o: any) => o.status === "recebido");
    const avgDeliveryDays = received.length > 0
      ? received.reduce((s: number, o: any) => {
          if (o.received_date && o.issue_date) {
            const diff = (new Date(o.received_date).getTime() - new Date(o.issue_date).getTime()) / (1000 * 60 * 60 * 24);
            return s + diff;
          }
          return s;
        }, 0) / received.length
      : 0;

    const supplierTotals: Record<string, { name: string; total: number; count: number; avgScore: number }> = {};
    orders.forEach((o: any) => {
      const sid = o.supplier_id;
      if (!sid) return;
      if (!supplierTotals[sid]) supplierTotals[sid] = { name: o.suppliers?.name || "—", total: 0, count: 0, avgScore: 0 };
      supplierTotals[sid].total += o.total || 0;
      supplierTotals[sid].count += 1;
    });
    evaluations.forEach((e: any) => {
      if (supplierTotals[e.supplier_id]) {
        supplierTotals[e.supplier_id].avgScore = e.overall_score || 0;
      }
    });

    const topSuppliers = Object.values(supplierTotals).sort((a, b) => b.total - a.total).slice(0, 10);

    return { total, totalValue, avgDeliveryDays, topSuppliers };
  }, [orders, evaluations]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Total Compras</p><p className="text-lg font-bold font-mono">{fmt(stats.totalValue)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Clock className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Prazo Médio Entrega</p><p className="text-lg font-bold">{stats.avgDeliveryDays.toFixed(0)} dias</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingDown className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Total Pedidos</p><p className="text-lg font-bold">{stats.total}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-7 w-7 text-amber-500" /><div><p className="text-xs text-muted-foreground">Avaliações</p><p className="text-lg font-bold">{evaluations.length}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Top Fornecedores por Volume</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Total Comprado</TableHead>
                <TableHead className="text-right">Avaliação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.topSuppliers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>}
              {stats.topSuppliers.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{s.count}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(s.total)}</TableCell>
                  <TableCell className="text-right">
                    {s.avgScore > 0 ? <Badge variant={s.avgScore >= 4 ? "default" : s.avgScore >= 3 ? "secondary" : "destructive"}>{s.avgScore.toFixed(1)}</Badge> : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
