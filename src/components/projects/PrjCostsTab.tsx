import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useProjects } from "@/hooks/useProjectData";
import { DollarSign, TrendingDown, TrendingUp, Wrench } from "lucide-react";

export function PrjCostsTab() {
  const { data: projects = [] } = useProjects();
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const activeProjects = projects.filter((p: any) => !["cancelled"].includes(p.status));
  const totalSold = activeProjects.reduce((s: number, p: any) => s + (p.sold_value || 0), 0);
  const totalEstCost = activeProjects.reduce((s: number, p: any) => s + (p.estimated_cost || 0), 0);
  const totalActCost = activeProjects.reduce((s: number, p: any) => s + (p.actual_cost || 0), 0);
  const totalDeviation = totalActCost - totalEstCost;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Valor Vendido Total</p><p className="text-lg font-bold font-mono">{fmt(totalSold)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Wrench className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Custo Estimado</p><p className="text-lg font-bold font-mono">{fmt(totalEstCost)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Custo Real</p><p className="text-lg font-bold font-mono">{fmt(totalActCost)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingDown className={`h-7 w-7 ${totalDeviation > 0 ? 'text-destructive' : 'text-primary'}`} /><div><p className="text-xs text-muted-foreground">Desvio Total</p><p className={`text-lg font-bold font-mono ${totalDeviation > 0 ? 'text-destructive' : ''}`}>{fmt(totalDeviation)}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Custos por Projeto</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-right">MO</TableHead>
                  <TableHead className="text-right">Material</TableHead>
                  <TableHead className="text-right">Terceiros</TableHead>
                  <TableHead className="text-right">Custo Real</TableHead>
                  <TableHead className="text-right">Desvio</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeProjects.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>}
                {activeProjects.sort((a: any, b: any) => (b.actual_cost || 0) - (a.actual_cost || 0)).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.project_number}</TableCell>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(p.sold_value)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(p.labor_cost)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(p.material_cost)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(p.outsourcing_cost)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{fmt(p.actual_cost)}</TableCell>
                    <TableCell className="text-right"><Badge variant={p.cost_deviation > 0 ? "destructive" : "default"}>{fmt(p.cost_deviation)}</Badge></TableCell>
                    <TableCell className="text-right"><Badge variant={p.actual_margin >= 0 ? "default" : "destructive"}>{p.actual_margin?.toFixed(1)}%</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
