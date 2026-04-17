import { useUpgradeSignals, useDetectUpgradeSignals, useGenerateUpgradePitch, useDismissUpgradeSignal } from "@/hooks/useBillingOps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, RefreshCw, Sparkles, Building2, X } from "lucide-react";

const priorityColors: Record<number, string> = {
  1: "bg-red-500/10 text-red-500",
  2: "bg-orange-500/10 text-orange-500",
  5: "bg-blue-500/10 text-blue-500",
};

export function UpgradeSignalsTab() {
  const { data, isLoading } = useUpgradeSignals();
  const detect = useDetectUpgradeSignals();
  const pitch = useGenerateUpgradePitch();
  const dismiss = useDismissUpgradeSignal();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" />Upgrade Signals Engine</h2>
          <p className="text-sm text-muted-foreground">Detecta uso ≥80% e sugere upgrade com pitch personalizado por IA.</p>
        </div>
        <Button variant="outline" onClick={() => detect.mutate()} disabled={detect.isPending} className="gap-2">
          {detect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Rodar varredura
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !data?.length ? (
        <Card><CardContent className="text-center py-8 text-muted-foreground">Nenhum sinal de upgrade aberto</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((s: any) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />{s.tenants?.name ?? "—"}</CardTitle>
                  <Badge className={priorityColors[s.priority] ?? ""}>P{s.priority}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{s.current_plan?.name ?? "—"} · {s.metric_key}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{Number(s.current_usage).toLocaleString("pt-BR")} / {Number(s.limit_value).toLocaleString("pt-BR")}</span>
                    <span className="font-medium">{Number(s.usage_percent).toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(s.usage_percent, 100)} className="h-2" />
                </div>

                {s.ai_pitch ? (
                  <div className="bg-muted/50 p-3 rounded-md text-sm border-l-2 border-primary">
                    <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground"><Sparkles className="h-3 w-3" />IA</div>
                    {s.ai_pitch}
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => pitch.mutate(s.id)} disabled={pitch.isPending}>
                    {pitch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Gerar pitch IA
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => dismiss.mutate(s.id)}>
                    <X className="h-4 w-4" />Dispensar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
