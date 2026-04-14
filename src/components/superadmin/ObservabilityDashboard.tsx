import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Database,
  RefreshCw, Server, Shield, Zap, Cable, BarChart3,
  XCircle, AlertOctagon, Timer, Users, Building2,
} from "lucide-react";
import { useObservabilityLayer } from "@/hooks/useObservabilityLayer";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-500";
  if (score >= 70) return "text-amber-500";
  return "text-destructive";
}

function scoreBg(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-destructive";
}

function severityBadge(severity: string) {
  switch (severity) {
    case "critical": return <Badge variant="destructive" className="text-[10px]">Crítico</Badge>;
    case "warning": return <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">Aviso</Badge>;
    default: return <Badge variant="secondary" className="text-[10px]">Info</Badge>;
  }
}

export function ObservabilityDashboard() {
  const { data, isLoading, refetch } = useObservabilityLayer();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) return null;
  const { health, moduleScores, alerts, integrations, automations, criticalEvents, incidents } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Observabilidade do Sistema</h2>
            <p className="text-sm text-muted-foreground">Monitoramento técnico global — visível apenas para OWNER</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      {/* Global Health KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <HealthCard icon={<Server className="h-4 w-4" />} label="Score Global" value={`${health.overallScore}%`} color={scoreColor(health.overallScore)} />
        <HealthCard icon={<Database className="h-4 w-4" />} label="Integridade DB" value={`${health.dbIntegrity}%`} color={scoreColor(health.dbIntegrity)} />
        <HealthCard icon={<Clock className="h-4 w-4" />} label="Filas Pendentes" value={health.pendingQueues} color={health.pendingQueues > 5 ? "text-amber-500" : "text-emerald-500"} />
        <HealthCard icon={<AlertOctagon className="h-4 w-4" />} label="Jobs Travados" value={health.stuckJobs} color={health.stuckJobs > 0 ? "text-destructive" : "text-emerald-500"} />
        <HealthCard icon={<XCircle className="h-4 w-4" />} label="Erros 24h" value={health.recentErrors} color={health.recentErrors > 5 ? "text-destructive" : "text-emerald-500"} />
        <HealthCard icon={<Users className="h-4 w-4" />} label="Usuários 24h" value={health.activeUsers24h} color="text-primary" />
        <HealthCard icon={<Building2 className="h-4 w-4" />} label="Empresas" value={health.totalTenants} color="text-primary" />
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold">Alertas Técnicos ({alerts.length})</span>
            </div>
            <div className="space-y-1.5">
              {alerts.map(a => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  {severityBadge(a.severity)}
                  <span className="text-xs">{a.message}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{a.service}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="modules" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="modules" className="text-xs gap-1"><BarChart3 className="h-3 w-3" />Módulos</TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs gap-1"><Cable className="h-3 w-3" />Integrações</TabsTrigger>
          <TabsTrigger value="automations" className="text-xs gap-1"><Zap className="h-3 w-3" />Automações</TabsTrigger>
          <TabsTrigger value="events" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />Eventos</TabsTrigger>
          <TabsTrigger value="incidents" className="text-xs gap-1"><Shield className="h-3 w-3" />Incidentes</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs gap-1"><Timer className="h-3 w-3" />Timeline</TabsTrigger>
        </TabsList>

        {/* Module Health Scores */}
        <TabsContent value="modules">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Health Score por Módulo</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {moduleScores.map(m => (
                  <div key={m.module} className="rounded-lg border border-border/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">{m.module}</span>
                      <span className={`text-sm font-bold font-mono ${scoreColor(m.score)}`}>{m.score}%</span>
                    </div>
                    <Progress value={m.score} className="h-1.5" />
                    {m.issues > 0 && (
                      <p className="text-[10px] text-destructive mt-1">{m.issues} issue(s)</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Monitor */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Monitor de Integrações</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Integração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última Sync</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Resp. Média</TableHead>
                    <TableHead>Último Erro</TableHead>
                    <TableHead>Empresa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrations.map(int => (
                    <TableRow key={int.id}>
                      <TableCell className="font-medium text-xs">{int.name}</TableCell>
                      <TableCell>
                        {int.active
                          ? <Badge className="bg-emerald-600 text-[10px]">Ativo</Badge>
                          : <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {int.lastSyncAt ? formatDistanceToNow(new Date(int.lastSyncAt), { addSuffix: true, locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell className={`text-xs font-mono ${int.retryCount > 0 ? "text-amber-500" : ""}`}>{int.retryCount}</TableCell>
                      <TableCell className="text-xs font-mono">{int.avgResponseMs}ms</TableCell>
                      <TableCell className="text-[10px] text-destructive max-w-[150px] truncate">{int.lastError || "—"}</TableCell>
                      <TableCell className="text-[11px]">{int.affectedTenant || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automations Monitor */}
        <TabsContent value="automations">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <HealthCard icon={<Zap className="h-4 w-4" />} label="Executadas Hoje" value={automations.executedToday} color="text-primary" />
              <HealthCard icon={<XCircle className="h-4 w-4" />} label="Com Erro" value={automations.withErrors} color={automations.withErrors > 0 ? "text-destructive" : "text-emerald-500"} />
              <HealthCard icon={<Clock className="h-4 w-4" />} label="Pausadas" value={automations.paused} color={automations.paused > 0 ? "text-amber-500" : "text-muted-foreground"} />
              <HealthCard icon={<Shield className="h-4 w-4" />} label="Aguardando Validação" value={automations.awaitingValidation} color="text-primary" />
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Execuções Recentes</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Regra</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {automations.recentExecutions.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs font-medium max-w-[150px] truncate">{e.ruleName}</TableCell>
                        <TableCell className="text-[11px]">{e.eventType}</TableCell>
                        <TableCell>
                          {e.status === "success"
                            ? <Badge className="bg-emerald-600 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />OK</Badge>
                            : <Badge variant="destructive" className="text-[10px]"><XCircle className="h-2.5 w-2.5 mr-0.5" />Erro</Badge>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{e.executionTimeMs}ms</TableCell>
                        <TableCell className="text-[10px] text-destructive max-w-[200px] truncate">{e.errorMessage || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {automations.recentExecutions.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">Nenhuma execução nas últimas 24h</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Critical Events Queue */}
        <TabsContent value="events">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Fila de Eventos Críticos</CardTitle></CardHeader>
            <CardContent>
              {criticalEvents.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum evento crítico pendente ✓</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {criticalEvents.map(e => (
                    <div key={e.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <AlertOctagon className="h-3.5 w-3.5 text-destructive" />
                          <span className="text-xs font-medium">{e.message}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Serviço: {e.service}</span>
                        {e.tenantName && <span>Empresa: {e.tenantName}</span>}
                        <span>Tipo: {e.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Center */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Centro de Incidentes</CardTitle></CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum incidente aberto ✓</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Incidente</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Impacto</TableHead>
                      <TableHead>Criado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.map(inc => (
                      <TableRow key={inc.id}>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate">{inc.title}</TableCell>
                        <TableCell>
                          {inc.priority === "critical" ? <Badge variant="destructive" className="text-[10px]">Crítico</Badge>
                           : inc.priority === "high" ? <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">Alto</Badge>
                           : <Badge variant="secondary" className="text-[10px]">{inc.priority}</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{inc.status === "open" ? "Aberto" : inc.status === "investigating" ? "Investigando" : "Resolvido"}</Badge>
                        </TableCell>
                        <TableCell className="text-[11px]">{inc.service}</TableCell>
                        <TableCell className="text-[11px]">{inc.impact}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true, locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Timeline Técnica Global</CardTitle></CardHeader>
            <CardContent>
              {data.timeline.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum evento registrado nas últimas 24h ✓</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.timeline.map((e, i) => (
                    <div key={e.id + i} className="flex gap-3 border-l-2 border-border pl-3 py-1.5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{e.message}</span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1">{e.service}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                          {e.tenantName && <span>📦 {e.tenantName}</span>}
                          <span>🔧 {e.type}</span>
                          <span>⏰ {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HealthCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          {icon}
          <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
        <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
