import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Activity, RefreshCw, Clock, Zap, GitBranch, CheckCircle2, AlertTriangle, XCircle, User, Bot, Shield } from 'lucide-react';
import { useIncidentOverview, useIncidents, useIncidentTimeline, useGroupIncidents, useUpdateIncidentStatus } from '@/hooks/useIncidentTimeline';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  moderate: 'bg-yellow-500 text-black',
  low: 'bg-muted text-muted-foreground',
  info: 'bg-blue-500 text-white',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-destructive/20 text-destructive border-destructive/40',
  investigating: 'bg-orange-500/20 text-orange-600 border-orange-500/40',
  recovering: 'bg-blue-500/20 text-blue-600 border-blue-500/40',
  resolved: 'bg-green-500/20 text-green-600 border-green-500/40',
  resolved_with_degradation: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/40',
  reopened: 'bg-purple-500/20 text-purple-600 border-purple-500/40',
};

const ROLE_ICONS: Record<string, any> = {
  root: AlertCircle,
  derived: Activity,
  aggravation: AlertTriangle,
  stabilization: CheckCircle2,
  recovery: RefreshCw,
  resolution: CheckCircle2,
};

const ACTOR_ICONS: Record<string, any> = {
  system: Activity,
  owner: Shield,
  admin: User,
  auto: Bot,
  ai: Zap,
};

function formatDuration(seconds: number | null) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function OwnerIncidentTimeline() {
  const [filters, setFilters] = useState<{ status?: string; severity?: string; module?: string }>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: overview, isLoading: loadingOverview } = useIncidentOverview();
  const { data: incidents = [], isLoading: loadingList } = useIncidents(filters);
  const { data: timeline, isLoading: loadingTimeline } = useIncidentTimeline(selectedId);
  const groupMut = useGroupIncidents();
  const statusMut = useUpdateIncidentStatus();

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incident Timeline</h1>
          <p className="text-muted-foreground">Linha do tempo cronológica de incidentes sistêmicos</p>
        </div>
        <Button onClick={() => groupMut.mutate()} disabled={groupMut.isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${groupMut.isPending ? 'animate-spin' : ''}`} />
          Agrupar incidentes
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Incidentes abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loadingOverview ? '—' : overview?.open_incidents ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Críticos (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{overview?.critical_7d ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tempo médio resolução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatDuration(overview?.avg_resolution_seconds ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Auto-recovery %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{overview?.auto_recovery_pct ?? 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Select value={filters.status || 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? undefined : v }))}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="investigating">Investigando</SelectItem>
                <SelectItem value="recovering">Recuperando</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="resolved_with_degradation">Resolvido c/ degradação</SelectItem>
                <SelectItem value="reopened">Reaberto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.severity || 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, severity: v === 'all' ? undefined : v }))}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Severidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas severidades</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="moderate">Moderada</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Incidentes recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum incidente encontrado.</p>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc: any) => (
                <button
                  key={inc.id}
                  onClick={() => setSelectedId(inc.id)}
                  className="w-full text-left p-4 rounded-lg border hover:bg-accent/50 transition flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono text-muted-foreground">{inc.incident_code}</code>
                      <Badge className={STATUS_COLORS[inc.current_status]} variant="outline">{inc.current_status}</Badge>
                      <Badge className={SEVERITY_COLORS[inc.severity]}>{inc.severity}</Badge>
                    </div>
                    <div className="font-medium truncate">{inc.title || `Incidente em ${inc.origin_module_code}`}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{inc.origin_module_code}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(inc.started_at), { locale: ptBR, addSuffix: true })}</span>
                      {inc.impacted_modules?.length > 1 && <span>{inc.impacted_modules.length} módulos impactados</span>}
                      {inc.recovery_attempts > 0 && <span>{inc.recovery_success_count}/{inc.recovery_attempts} recoveries</span>}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    {inc.duration_seconds ? formatDuration(inc.duration_seconds) : 'em curso'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              {timeline?.incident?.incident_code || 'Carregando...'}
            </DialogTitle>
          </DialogHeader>
          {loadingTimeline ? (
            <p className="text-sm text-muted-foreground">Carregando timeline...</p>
          ) : timeline?.incident ? (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                {/* Header summary */}
                <Card>
                  <CardContent className="pt-6 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[timeline.incident.current_status]} variant="outline">{timeline.incident.current_status}</Badge>
                      <Badge className={SEVERITY_COLORS[timeline.incident.severity]}>{timeline.incident.severity}</Badge>
                    </div>
                    <div className="text-sm">{timeline.incident.title}</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Origem: <code>{timeline.incident.origin_module_code}</code></div>
                      <div>Iniciado: {format(new Date(timeline.incident.started_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</div>
                      {timeline.incident.resolved_at && <div>Resolvido: {format(new Date(timeline.incident.resolved_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</div>}
                      {timeline.incident.impacted_modules?.length > 0 && (
                        <div>Módulos impactados: {timeline.incident.impacted_modules.join(', ')}</div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      {timeline.incident.current_status !== 'resolved' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: timeline.incident.id, status: 'investigating' })}>Investigar</Button>
                          <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: timeline.incident.id, status: 'recovering' })}>Recuperar</Button>
                          <Button size="sm" onClick={() => statusMut.mutate({ id: timeline.incident.id, status: 'resolved' })}>Marcar resolvido</Button>
                        </>
                      )}
                      {timeline.incident.current_status === 'resolved' && (
                        <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: timeline.incident.id, status: 'reopened' })}>Reabrir</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Vertical timeline */}
                <div className="relative pl-6 border-l-2 border-border space-y-4">
                  {(timeline.events || []).map((ev: any) => {
                    const RoleIcon = ROLE_ICONS[ev.event_role] || Activity;
                    const ActorIcon = ACTOR_ICONS[ev.actor_type] || Activity;
                    const isRoot = ev.event_role === 'root';
                    return (
                      <div key={ev.id} className="relative">
                        <div className={`absolute -left-[31px] flex items-center justify-center w-6 h-6 rounded-full ${isRoot ? 'bg-purple-500' : ev.event_role === 'stabilization' ? 'bg-green-500' : ev.event_role === 'aggravation' ? 'bg-destructive' : 'bg-muted'}`}>
                          <RoleIcon className="h-3 w-3 text-white" />
                        </div>
                        <Card className={isRoot ? 'border-purple-500/50 bg-purple-500/5' : ''}>
                          <CardContent className="pt-4 pb-3">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">{ev.event_source}</Badge>
                                <Badge variant="outline" className="text-xs">{ev.event_role}</Badge>
                                <Badge className={`${SEVERITY_COLORS[ev.severity]} text-xs`}>{ev.severity}</Badge>
                                {isRoot && <Badge className="bg-purple-500 text-white text-xs">CAUSA RAIZ</Badge>}
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                                <ActorIcon className="h-3 w-3" />
                                {format(new Date(ev.event_time), "HH:mm:ss")}
                              </span>
                            </div>
                            <div className="text-sm">{ev.message}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              <code>{ev.module_code}</code> · {ev.event_type}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                  {(!timeline.events || timeline.events.length === 0) && (
                    <p className="text-sm text-muted-foreground">Nenhum evento normalizado ainda. Execute "Agrupar incidentes".</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">Incidente não encontrado.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
