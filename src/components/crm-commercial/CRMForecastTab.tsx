import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCRMDealsWithProbability } from "@/hooks/useCRMCommercial";
import { DollarSign, Calendar, TrendingUp } from "lucide-react";

export default function CRMForecastTab() {
  const { data: deals = [], isLoading } = useCRMDealsWithProbability();
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const forecast = useMemo(() => {
    const now = new Date();
    const months: { label: string; key: string; gross: number; weighted: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({ label: d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, gross: 0, weighted: 0 });
    }

    deals.filter((d: any) => d.status === "open").forEach((deal: any) => {
      const prob = deal.crm_stages?.probability_percent || 0;
      const val = deal.value || 0;
      // Distribute into current month (simplified)
      const dealDate = new Date(deal.updated_at || deal.created_at);
      const key = `${dealDate.getFullYear()}-${String(dealDate.getMonth() + 1).padStart(2, "0")}`;
      const month = months.find(m => m.key === key) || months[0];
      if (month) {
        month.gross += val;
        month.weighted += val * prob / 100;
      }
    });

    return months;
  }, [deals]);

  const totalGross = forecast.reduce((s, m) => s + m.gross, 0);
  const totalWeighted = forecast.reduce((s, m) => s + m.weighted, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Forecast Bruto (6m)</p><p className="text-lg font-bold font-mono">{fmt(totalGross)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Forecast Ponderado (6m)</p><p className="text-lg font-bold font-mono">{fmt(totalWeighted)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Calendar className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Oport. Abertas</p><p className="text-lg font-bold">{deals.filter((d: any) => d.status === "open").length}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Forecast Receita por Mês</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Receita Bruta</TableHead>
                  <TableHead className="text-right">Receita Ponderada</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecast.map(m => (
                  <TableRow key={m.key}>
                    <TableCell className="font-medium capitalize">{m.label}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(m.gross)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">{fmt(m.weighted)}</TableCell>
                    <TableCell className="text-right text-sm">{m.gross > 0 ? `${((m.weighted / m.gross) * 100).toFixed(0)}%` : "—"}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totalGross)}</TableCell>
                  <TableCell className="text-right font-mono text-primary">{fmt(totalWeighted)}</TableCell>
                  <TableCell className="text-right">{totalGross > 0 ? `${((totalWeighted / totalGross) * 100).toFixed(0)}%` : "—"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
