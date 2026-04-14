import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCRMDealsWithProbability } from "@/hooks/useCRMCommercial";
import { DollarSign, TrendingUp, Target } from "lucide-react";

export default function CRMPipelineTab() {
  const { data: deals = [], isLoading } = useCRMDealsWithProbability();
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const stages = useMemo(() => {
    const map = new Map<string, { name: string; position: number; probability: number; deals: any[] }>();
    deals.forEach((d: any) => {
      const stageName = d.crm_stages?.name || "Sem Etapa";
      const prob = d.crm_stages?.probability_percent || 0;
      const pos = d.crm_stages?.position ?? 99;
      if (!map.has(stageName)) map.set(stageName, { name: stageName, position: pos, probability: prob, deals: [] });
      map.get(stageName)!.deals.push(d);
    });
    return Array.from(map.values()).sort((a, b) => a.position - b.position);
  }, [deals]);

  const totalPipeline = deals.filter((d: any) => d.status === "open").reduce((s: number, d: any) => s + (d.value || 0), 0);
  const weightedPipeline = deals.filter((d: any) => d.status === "open").reduce((s: number, d: any) => s + ((d.value || 0) * (d.crm_stages?.probability_percent || 0) / 100), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Pipeline Total</p><p className="text-lg font-bold font-mono">{fmt(totalPipeline)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Pipeline Ponderado</p><p className="text-lg font-bold font-mono">{fmt(weightedPipeline)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Target className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Oportunidades Abertas</p><p className="text-lg font-bold">{deals.filter((d: any) => d.status === "open").length}</p></div></CardContent></Card>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stages.map(stage => {
            const stageValue = stage.deals.reduce((s: number, d: any) => s + (d.value || 0), 0);
            const weighted = stageValue * stage.probability / 100;
            return (
              <Card key={stage.name} className="border-t-4" style={{ borderTopColor: `hsl(${stage.probability * 1.2}, 70%, 50%)` }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex justify-between">
                    {stage.name}
                    <Badge variant="outline">{stage.probability}%</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Negócios</span>
                    <span className="font-bold">{stage.deals.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor Total</span>
                    <span className="font-mono text-sm">{fmt(stageValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ponderado</span>
                    <span className="font-mono text-sm font-bold text-primary">{fmt(weighted)}</span>
                  </div>
                  <div className="mt-2 space-y-1 max-h-32 overflow-auto">
                    {stage.deals.slice(0, 5).map((d: any) => (
                      <div key={d.id} className="text-xs flex justify-between p-1 rounded bg-muted/50">
                        <span className="truncate max-w-[120px]">{d.title}</span>
                        <span className="font-mono">{fmt(d.value)}</span>
                      </div>
                    ))}
                    {stage.deals.length > 5 && <p className="text-xs text-muted-foreground text-center">+{stage.deals.length - 5} mais</p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
