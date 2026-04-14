import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOpsOrders, useOpsActivities, useOpsMaterials } from "@/hooks/useOpsData";
import { DollarSign, Wrench, Package } from "lucide-react";

export function OpsCostsTab() {
  const { data: orders = [] } = useOpsOrders();
  const { data: activities = [] } = useOpsActivities();
  const { data: materials = [] } = useOpsMaterials();

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const totalLaborCost = activities.reduce((s: number, a: any) => s + (a.total_cost || 0), 0);
  const totalMaterialCost = materials.reduce((s: number, m: any) => s + (m.total_cost || 0), 0);
  const totalCost = totalLaborCost + totalMaterialCost;

  const costByOrder = useMemo(() => {
    const map: Record<string, { title: string; number: number; labor: number; material: number }> = {};
    orders.forEach((o: any) => { map[o.id] = { title: o.title, number: o.order_number, labor: 0, material: 0 }; });
    activities.forEach((a: any) => { if (map[a.ops_order_id]) map[a.ops_order_id].labor += a.total_cost || 0; });
    materials.forEach((m: any) => { if (map[m.ops_order_id]) map[m.ops_order_id].material += m.total_cost || 0; });
    return Object.entries(map)
      .map(([id, d]) => ({ id, ...d, total: d.labor + d.material }))
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [orders, activities, materials]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Custo Total Operacional</p><p className="text-xl font-bold font-mono">{fmt(totalCost)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Wrench className="h-8 w-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Mão de Obra</p><p className="text-xl font-bold font-mono">{fmt(totalLaborCost)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Materiais</p><p className="text-xl font-bold font-mono">{fmt(totalMaterialCost)}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Custo Real por Ordem</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead className="text-right">Mão de Obra</TableHead>
                <TableHead className="text-right">Materiais</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costByOrder.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem dados de custo</TableCell></TableRow>}
              {costByOrder.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.number}</TableCell>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(c.labor)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(c.material)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(c.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
