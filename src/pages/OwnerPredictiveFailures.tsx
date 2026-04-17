import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, AlertTriangle, Brain, Gauge, RefreshCw, Shield, TrendingDown,
  TrendingUp, Zap, ChevronRight, Sparkles
} from "lucide-react";
import { usePredictiveFailures, type FailureScore } from "@/hooks/usePredictiveFailures";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const KPI = ({ label, value, tone = "default", icon: Icon }: {
  label: string; value: number | string; tone?: "default" | "ok" | "warn" | "bad" | "info"; icon?: any;
}) => {
  const cls = tone === "ok" ? "text-emerald-600"
    : tone === "warn" ? "text-amber-600"
    : tone === "bad" ? "text-destructive"
    : tone === "info" ? "text-primary"
    : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          {Icon && <Icon className={`h-4 w-4 ${cls}`} />}
        </div>
        <div className={`mt-1 text-2xl font-semibold ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
};

const bandBadge = (band: string) => {
  if (band === "critical") return <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">critical</Badge>;
  if (band === "high") return <Badge variant="outline" className="bg-orange-500/15 text-orange-700 border-orange-500/30">high</Badge>;
  if (band === "medium") return <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30">medium</Badge>;
  return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">low</Badge>;
};

const driftIcon = (dir: string) => {
  if (dir === "degrading") return <TrendingDown className="h-3 w-3 text-destructive" />;
  if (dir === "improving") return <TrendingUp className="h-3 w-3 text-emerald-600" />;
  return <Activity className="h-3 w-3 text-muted-foreground" />;
};

const ACTION_LABELS: Record<string, string> = {
  refresh_snapshot: "Refresh snapshot preventivo",
  rerun_sync: "Rerun sync antecipado",
  owner_alert: "Alertar owner",
  extra_validation: "Validação extra",
  preventive_stability_gate: "Stability gate preventivo",
  block_rollout: "Bloquear rollout",
};

export default function OwnerPredictiveFailures() {
  const {
    summary, topRisks, signals, anomalies, drifts, preventiveLogs,
    isLoading, runSweep, executePreventiveAction
  } = usePredictiveFailures();
  const [selected, setSelected] = useState<FailureScore | null>(null);

  const critical = summary?.critical_count ?? 0;
  const high = summary?.high_count ?? 0;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Predictive Failures</h1>
            <p className="text-sm text-muted-foreground">
              Motor preditivo de risco de falhas baseado em sinais, anomalias, drift e recorrência.
            </p>
          </div>
        </div>
        <Button onClick={() => runSweep.mutate()} disabled={runSweep.isPending}>
          <Sparkles className={`mr-2 h-4 w-4 ${runSweep.isPending ? "animate-pulse" : ""}`} />
          Executar sweep preditivo
        </Button>
      </div>

      {critical > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{critical} módulo(s) com risco crítico de falha nas próximas 24h</AlertTitle>
          <AlertDescription>
            Ações preventivas recomendadas. Verifique a tabela de Top Riscos abaixo.
          </AlertDescription>
        </Alert>
      )}
      {critical === 0 && high > 0 && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>{high} módulo(s) com risco elevado</AlertTitle>
          <AlertDescription>Recomenda-se refresh de snapshot e rerun de sync.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KPI label="Críticos" value={summary?.critical_count ?? "—"} tone={critical > 0 ? "bad" : "ok"} icon={AlertTriangle} />
        <KPI label="Alto risco" value={summary?.high_count ?? "—"} tone={high > 0 ? "warn" : "ok"} icon={Gauge} />
        <KPI label="Sinais 24h" value={summary?.signals_24h ?? "—"} tone="info" icon={Activity} />
        <KPI label="Anomalias 24h" value={summary?.anomalies_24h ?? "—"} tone="info" icon={Zap} />
        <KPI label="Drift degradando" value={summary?.drifts_degrading ?? "—"} tone={(summary?.drifts_degrading ?? 0) > 0 ? "warn" : "ok"} icon={TrendingDown} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Top Riscos — Próximas 24h
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead className="w-[200px]">Probabilidade</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Ação recomendada</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && topRisks.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem scores disponíveis. Execute um sweep.</TableCell></TableRow>
              )}
              {topRisks.map((s) => (
                <TableRow key={s.target_code} className="cursor-pointer" onClick={() => setSelected(s)}>
                  <TableCell>
                    <div className="font-medium">{s.target_code}</div>
                    <div className="text-xs text-muted-foreground">{s.target_type}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Number(s.failure_probability_score)} className="h-2" />
                      <span className="text-xs tabular-nums w-10 text-right">{Number(s.failure_probability_score).toFixed(0)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{bandBadge(s.severity_band)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {ACTION_LABELS[s.recommended_preventive_action ?? ""] ?? s.recommended_preventive_action}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true, locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Tabs defaultValue="signals">
        <TabsList>
          <TabsTrigger value="signals">Sinais ({signals.length})</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalias ({anomalies.length})</TabsTrigger>
          <TabsTrigger value="drifts">Drift ({drifts.length})</TabsTrigger>
          <TabsTrigger value="actions">Ações preventivas ({preventiveLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="signals">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Baseline</TableHead>
                    <TableHead className="text-right">Desvio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem sinais</TableCell></TableRow>
                  )}
                  {signals.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{s.module_code}</TableCell>
                      <TableCell><Badge variant="outline">{s.signal_type}</Badge></TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{Number(s.signal_value).toFixed(1)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{Number(s.baseline_value).toFixed(1)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{Number(s.deviation_percent).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead className="text-right">Confiança</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem anomalias</TableCell></TableRow>
                  )}
                  {anomalies.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.detected_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{a.target_code}</TableCell>
                      <TableCell><Badge variant="outline">{a.anomaly_type}</Badge></TableCell>
                      <TableCell>{bandBadge(a.severity)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{Number(a.confidence_score).toFixed(0)}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drifts">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Métrica</TableHead>
                    <TableHead>Direção</TableHead>
                    <TableHead className="text-right">Força</TableHead>
                    <TableHead className="text-right">Atual / Baseline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drifts.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem drift</TableCell></TableRow>
                  )}
                  {drifts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{d.target_code}</TableCell>
                      <TableCell className="text-xs">{d.metric_name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs">
                          {driftIcon(d.trend_direction)}
                          {d.trend_direction}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{Number(d.trend_strength).toFixed(1)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {d.current_value !== null ? Number(d.current_value).toFixed(1) : "—"} / {d.baseline_value !== null ? Number(d.baseline_value).toFixed(1) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Modo</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Razão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preventiveLogs.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem ações executadas</TableCell></TableRow>
                  )}
                  {preventiveLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{l.target_code}</TableCell>
                      <TableCell><Badge variant="outline">{l.action_code}</Badge></TableCell>
                      <TableCell className="text-xs">{l.execution_mode}</TableCell>
                      <TableCell>
                        {l.result === "success"
                          ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">success</Badge>
                          : <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">{l.result}</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.target_code}
                  {bandBadge(selected.severity_band)}
                </SheetTitle>
                <SheetDescription>
                  Probabilidade de falha: {Number(selected.failure_probability_score).toFixed(0)}/100
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Fatores contribuintes</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selected.contributing_factors && Object.entries(selected.contributing_factors).map(([k, v]) => (
                      <div key={k} className="rounded border border-border/50 p-2">
                        <div className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</div>
                        <div className="font-medium tabular-nums">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold">Ação recomendada</h3>
                  <Badge variant="outline" className="text-xs">
                    {ACTION_LABELS[selected.recommended_preventive_action ?? ""] ?? selected.recommended_preventive_action}
                  </Badge>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold">Executar ação preventiva</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(ACTION_LABELS).map(([code, label]) => (
                      <Button
                        key={code}
                        variant="outline"
                        size="sm"
                        disabled={executePreventiveAction.isPending}
                        onClick={() => executePreventiveAction.mutate({ target_code: selected.target_code, action_code: code })}
                      >
                        <RefreshCw className={`mr-2 h-3 w-3 ${executePreventiveAction.isPending ? "animate-spin" : ""}`} />
                        <span className="text-xs">{label}</span>
                      </Button>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
