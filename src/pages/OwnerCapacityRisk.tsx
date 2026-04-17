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
  Activity, AlertTriangle, Boxes, ChevronRight, Gauge, Layers, RefreshCw,
  Server, Sparkles, Users, Zap
} from "lucide-react";
import { useCapacityRisk, type CapacityScore } from "@/hooks/useCapacityRisk";
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

const targetIcon = (type: string) => {
  if (type === "queue") return <Layers className="h-3 w-3" />;
  if (type === "tenant") return <Users className="h-3 w-3" />;
  if (type === "module") return <Boxes className="h-3 w-3" />;
  return <Server className="h-3 w-3" />;
};

const ACTION_LABELS: Record<string, string> = {
  staggered_rerun: "Rerun escalonado",
  throttle_temporary: "Throttle temporário",
  block_rollout: "Bloquear rollout",
  deprioritize_non_critical: "Despriorizar não-críticos",
  owner_alert: "Alertar owner",
  increase_cooldown: "Aumentar cooldown",
};

export default function OwnerCapacityRisk() {
  const {
    summary, topRisks, signals, queues, jobs, tenants, actionLogs,
    isLoading, runSweep, executeAction
  } = useCapacityRisk();
  const [selected, setSelected] = useState<CapacityScore | null>(null);

  const critical = summary?.critical_count ?? 0;
  const high = summary?.high_count ?? 0;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Gauge className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Capacity & Load Risk</h1>
            <p className="text-sm text-muted-foreground">
              Motor preditivo de saturação por módulo, fila, job e tenant.
            </p>
          </div>
        </div>
        <Button onClick={() => runSweep.mutate()} disabled={runSweep.isPending}>
          <Sparkles className={`mr-2 h-4 w-4 ${runSweep.isPending ? "animate-pulse" : ""}`} />
          Executar sweep capacity
        </Button>
      </div>

      {critical > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{critical} target(s) com risco crítico de saturação</AlertTitle>
          <AlertDescription>
            Aplique throttle ou bloqueie rollouts para evitar incidentes de carga.
          </AlertDescription>
        </Alert>
      )}
      {critical === 0 && high > 0 && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertTitle>{high} target(s) com pressão elevada</AlertTitle>
          <AlertDescription>Recomenda-se rerun escalonado e aumento de cooldown.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <KPI label="Críticos" value={summary?.critical_count ?? "—"} tone={critical > 0 ? "bad" : "ok"} icon={AlertTriangle} />
        <KPI label="Alto" value={summary?.high_count ?? "—"} tone={high > 0 ? "warn" : "ok"} icon={Gauge} />
        <KPI label="Módulos" value={summary?.modules ?? "—"} icon={Boxes} />
        <KPI label="Filas" value={summary?.queues ?? "—"} icon={Layers} />
        <KPI label="Tenants" value={summary?.tenants ?? "—"} icon={Users} />
        <KPI label="Sinais 24h" value={summary?.signals_24h ?? "—"} tone="info" icon={Zap} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Top Riscos de Capacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-[200px]">Risk Score</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Ação recomendada</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && topRisks.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sem scores. Execute um sweep.</TableCell></TableRow>
              )}
              {topRisks.map((s) => (
                <TableRow key={`${s.target_type}-${s.target_code}`} className="cursor-pointer" onClick={() => setSelected(s)}>
                  <TableCell className="font-medium">{s.target_code}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs">
                      {targetIcon(s.target_type)}
                      {s.target_type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Number(s.capacity_risk_score)} className="h-2" />
                      <span className="text-xs tabular-nums w-10 text-right">{Number(s.capacity_risk_score).toFixed(0)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{bandBadge(s.severity_band)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {ACTION_LABELS[s.recommended_action ?? ""] ?? s.recommended_action}
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

      <Tabs defaultValue="queues">
        <TabsList>
          <TabsTrigger value="queues">Filas ({queues.length})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="tenants">Tenants ({tenants.length})</TabsTrigger>
          <TabsTrigger value="signals">Sinais ({signals.length})</TabsTrigger>
          <TabsTrigger value="actions">Ações ({actionLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="queues">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Quando</TableHead><TableHead>Fila</TableHead>
                <TableHead className="text-right">Depth</TableHead>
                <TableHead className="text-right">Job mais antigo</TableHead>
                <TableHead className="text-right">Taxa proc.</TableHead>
                <TableHead className="text-right">Falha %</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {queues.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem snapshots</TableCell></TableRow>}
                {queues.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(q.captured_at), { addSuffix: true, locale: ptBR })}</TableCell>
                    <TableCell className="text-xs font-medium">{q.queue_code}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{q.queue_depth}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{q.oldest_job_age_minutes}min</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{Number(q.processing_rate).toFixed(1)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{Number(q.failure_rate).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Quando</TableHead><TableHead>Job</TableHead>
                <TableHead className="text-right">Avg ms</TableHead>
                <TableHead className="text-right">P95 ms</TableHead>
                <TableHead className="text-right">Frequência</TableHead>
                <TableHead className="text-right">Falha %</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {jobs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>}
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(j.captured_at), { addSuffix: true, locale: ptBR })}</TableCell>
                    <TableCell className="text-xs font-medium">{j.job_code}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{Number(j.avg_duration_ms).toFixed(0)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{Number(j.p95_duration_ms).toFixed(0)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{j.run_frequency}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{Number(j.failure_rate).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tenants">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Retries</TableHead>
                <TableHead className="text-right">Automações</TableHead>
                <TableHead className="w-[200px]">Share da carga</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tenants.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem distribuição</TableCell></TableRow>}
                {tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs font-medium">{t.tenant_label || t.tenant_id || "—"}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{t.job_count}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{t.retry_count}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{t.automation_count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Number(t.load_share_percent)} className="h-2" />
                        <span className="text-xs tabular-nums w-12 text-right">{Number(t.load_share_percent).toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="signals">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Quando</TableHead><TableHead>Target</TableHead><TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Baseline</TableHead>
                <TableHead className="text-right">Desvio</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {signals.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem sinais</TableCell></TableRow>}
                {signals.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: ptBR })}</TableCell>
                    <TableCell className="text-xs font-medium">{s.target_code}</TableCell>
                    <TableCell><Badge variant="outline">{s.signal_type}</Badge></TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{Number(s.signal_value).toFixed(1)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{Number(s.baseline_value).toFixed(1)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{Number(s.deviation_percent).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Quando</TableHead><TableHead>Target</TableHead><TableHead>Ação</TableHead>
                <TableHead>Modo</TableHead><TableHead>Resultado</TableHead><TableHead>Razão</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {actionLogs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem ações</TableCell></TableRow>}
                {actionLogs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}</TableCell>
                    <TableCell className="text-xs font-medium">{l.target_code} <span className="text-muted-foreground">({l.target_type})</span></TableCell>
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
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {targetIcon(selected.target_type)}
                  {selected.target_code}
                  {bandBadge(selected.severity_band)}
                </SheetTitle>
                <SheetDescription>
                  Risk score: {Number(selected.capacity_risk_score).toFixed(0)}/100 • {selected.target_type}
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
                    {ACTION_LABELS[selected.recommended_action ?? ""] ?? selected.recommended_action}
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
                        disabled={executeAction.isPending}
                        onClick={() => executeAction.mutate({
                          target_type: selected.target_type,
                          target_code: selected.target_code,
                          action_code: code,
                        })}
                      >
                        <RefreshCw className={`mr-2 h-3 w-3 ${executeAction.isPending ? "animate-spin" : ""}`} />
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
