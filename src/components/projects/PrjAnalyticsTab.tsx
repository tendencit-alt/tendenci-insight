import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useProjects } from "@/hooks/useProjectData";
import { CheckCircle, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";

export function PrjAnalyticsTab() {
  const { data: projects = [] } = useProjects();
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const active = projects.filter((p: any) => !["cancelled"].includes(p.status));
  const completed = active.filter((p: any) => p.status === "completed");
  const today = new Date().toISOString().split("T")[0];
  const delayed = active.filter((p: any) => p.expected_end_date && p.expected_end_date < today && p.status !== "completed");
  const onTime = completed.filter((p: any) => !p.expected_end_date || (p.actual_end_date && p.actual_end_date <= p.expected_end_date));

  const avgMargin = completed.length > 0 ? completed.reduce((s: number, p: any) => s + (p.actual_margin || 0), 0) / completed.length : 0;
  const avgDeviation = active.length > 0 ? active.reduce((s: number, p: any) => s + (p.cost_deviation || 0), 0) / active.length : 0;
  const totalRevenue = active.reduce((s: number, p: any) => s + (p.sold_value || 0), 0);

  const projectRanking = useMemo(() => {
    return [...active]
      .sort((a: any, b: any) => (b.actual_margin || 0) - (a.actual_margin || 0))
      .slice(0, 10);
  }, [active]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Receita Total Projetos</p><p className="text-lg font-bold font-mono">{fmt(totalRevenue)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Margem Média</p><p className="text-lg font-bold">{avgMargin.toFixed(1)}%</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><CheckCircle className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">No Prazo</p><p className="text-lg font-bold">{onTime.length}/{completed.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-7 w-7 text-destructive" /><div><p className="text-xs text-muted-foreground">Atrasados</p><p className="text-lg font-bold">{delayed.length}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Ranking de Projetos por Margem</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Vendido</TableHead>
                <TableHead className="text-right">Custo Real</TableHead>
                <TableHead className="text-right">Desvio</TableHead>
                <TableHead className="text-right">Margem Real</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectRanking.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>}
              {projectRanking.map((p: any, i: number) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.clients?.name || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(p.sold_value)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(p.actual_cost)}</TableCell>
                  <TableCell className="text-right"><Badge variant={p.cost_deviation > 0 ? "destructive" : "default"}>{fmt(p.cost_deviation)}</Badge></TableCell>
                  <TableCell className="text-right"><Badge variant={p.actual_margin >= 20 ? "default" : p.actual_margin >= 0 ? "secondary" : "destructive"}>{p.actual_margin?.toFixed(1)}%</Badge></TableCell>
                  <TableCell><Badge variant={p.status === "completed" ? "outline" : "default"}>{p.status === "completed" ? "Concluído" : p.status === "in_progress" ? "Execução" : p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
