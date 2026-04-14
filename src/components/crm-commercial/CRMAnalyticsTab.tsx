import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCRMDealsWithProbability, useCRMLeadsStats } from "@/hooks/useCRMCommercial";
import { TrendingUp, Clock, Target, DollarSign, Users, BarChart3, Zap, Award } from "lucide-react";

export default function CRMAnalyticsTab() {
  const { data: deals = [] } = useCRMDealsWithProbability();
  const { data: leads = [] } = useCRMLeadsStats();
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const stats = useMemo(() => {
    const openDeals = deals.filter((d: any) => d.status === "open");
    const wonDeals = deals.filter((d: any) => d.status === "won");
    const totalDeals = deals.length;
    const conversionRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;
    const avgTicket = wonDeals.length > 0 ? wonDeals.reduce((s: number, d: any) => s + (d.value || 0), 0) / wonDeals.length : 0;
    const pipelineTotal = openDeals.reduce((s: number, d: any) => s + (d.value || 0), 0);
    const pipelineWeighted = openDeals.reduce((s: number, d: any) => s + ((d.value || 0) * (d.crm_stages?.probability_percent || 0) / 100), 0);

    // Tempo médio de fechamento (deals ganhos)
    const avgCloseDays = wonDeals.length > 0 ? wonDeals.reduce((s: number, d: any) => {
      const created = new Date(d.created_at).getTime();
      const updated = new Date(d.updated_at).getTime();
      return s + (updated - created) / (1000 * 60 * 60 * 24);
    }, 0) / wonDeals.length : 0;

    // Leads por origem
    const sourceMap = new Map<string, number>();
    leads.forEach((l: any) => {
      const src = (l.lead_sources as any)?.name || "Sem origem";
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
    });
    const topSources = Array.from(sourceMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { conversionRate, avgTicket, pipelineTotal, pipelineWeighted, avgCloseDays, totalDeals, wonDeals: wonDeals.length, openDeals: openDeals.length, totalLeads: leads.length, topSources };
  }, [deals, leads]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Taxa Conversão</p><p className="text-lg font-bold">{stats.conversionRate.toFixed(1)}%</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Ticket Médio</p><p className="text-lg font-bold font-mono">{fmt(stats.avgTicket)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Clock className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Tempo Médio Fechamento</p><p className="text-lg font-bold">{stats.avgCloseDays.toFixed(0)} dias</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Users className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Total Leads</p><p className="text-lg font-bold">{stats.totalLeads}</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Target className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Pipeline Aberto</p><p className="text-lg font-bold font-mono">{fmt(stats.pipelineTotal)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Zap className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Pipeline Ponderado</p><p className="text-lg font-bold font-mono">{fmt(stats.pipelineWeighted)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Award className="h-7 w-7 text-green-500" /><div><p className="text-xs text-muted-foreground">Negócios Ganhos</p><p className="text-lg font-bold text-green-600">{stats.wonDeals}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><BarChart3 className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Oportunidades Abertas</p><p className="text-lg font-bold">{stats.openDeals}</p></div></CardContent></Card>
      </div>

      {stats.topSources.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Origens de Leads Mais Eficientes</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Origem</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">% Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {stats.topSources.map(([src, count]) => (
                  <TableRow key={src}>
                    <TableCell className="font-medium">{src}</TableCell>
                    <TableCell className="text-right font-mono">{count}</TableCell>
                    <TableCell className="text-right"><Badge variant="outline">{((count / stats.totalLeads) * 100).toFixed(0)}%</Badge></TableCell>
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
