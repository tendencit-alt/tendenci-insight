import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Activity, Network, Sparkles, Target, RefreshCw } from 'lucide-react';
import {
  useDependencyImpactOverview,
  useDependencyImpactSnapshots,
  useActiveImpactEvents,
  useRootCauseAnalyses,
  useRunImpactAnalysis,
  useAIRootCauseAnalysis,
} from '@/hooks/useDependencyImpact';
import { DependencyCascadeMap } from '@/components/owner/DependencyCascadeMap';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const severityVariant = (s: string): any => {
  switch (s) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'moderate': return 'default';
    default: return 'secondary';
  }
};

const severityLabel: Record<string, string> = {
  critical: 'Crítico', high: 'Alto', moderate: 'Moderado', low: 'Baixo',
};

export default function OwnerDependencyImpact() {
  const [, setSelectedIncident] = useState<string | null>(null);
  const overview = useDependencyImpactOverview();
  const snapshots = useDependencyImpactSnapshots();
  const events = useActiveImpactEvents();
  const rcas = useRootCauseAnalyses();
  const runAnalysis = useRunImpactAnalysis();
  const runAI = useAIRootCauseAnalysis();

  const ov = overview.data;
  const activeEvents = events.data || [];
  const cascadeGroups = Array.from(new Set(activeEvents.map((e: any) => e.incident_group_id).filter(Boolean)));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="h-8 w-8 text-primary" />
            Dependency Impact
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise de impacto em cascata e detecção de causa-raiz entre módulos do ERP.
          </p>
        </div>
        <Button onClick={() => runAnalysis.mutate()} disabled={runAnalysis.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${runAnalysis.isPending ? 'animate-spin' : ''}`} />
          Reanalisar agora
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />Cascatas ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? <Skeleton className="h-8 w-12" /> :
              <div className="text-3xl font-bold">{ov?.active_cascades ?? 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />Módulos impactados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? <Skeleton className="h-8 w-12" /> :
              <div className="text-3xl font-bold">{ov?.impacted_modules ?? 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />Causa-raiz provável
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-xl font-bold truncate">{ov?.root_cause_module || '—'}</div>
                {ov?.root_cause_confidence ? (
                  <p className="text-xs text-muted-foreground mt-1">{Number(ov.root_cause_confidence).toFixed(0)}% confiança</p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Severidade média</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? <Skeleton className="h-8 w-16" /> :
              <Badge variant={severityVariant(ov?.avg_severity || 'low')} className="text-base px-3 py-1">
                {severityLabel[ov?.avg_severity || 'low']}
              </Badge>}
          </CardContent>
        </Card>
      </div>

      {/* Alertas de cascata */}
      {cascadeGroups.length > 0 && (
        <div className="space-y-2">
          {cascadeGroups.slice(0, 3).map(gid => {
            const groupEvents = activeEvents.filter((e: any) => e.incident_group_id === gid);
            const root = groupEvents.find((e: any) => e.root_cause_candidate);
            const impacted = Array.from(new Set(groupEvents.map((e: any) => e.impacted_module_code)));
            return (
              <Alert key={gid} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>Falha em <strong>{root?.failed_module_code || groupEvents[0]?.failed_module_code}</strong> impactando {impacted.length} módulo(s)</span>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedIncident(gid as string); runAI.mutate(gid as string); }} disabled={runAI.isPending}>
                    <Sparkles className="h-3 w-3 mr-1" /> Analisar com IA
                  </Button>
                </AlertTitle>
                <AlertDescription>
                  {impacted.join(', ')}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Mapa em camadas */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de cascata em camadas</CardTitle>
        </CardHeader>
        <CardContent>
          <DependencyCascadeMap
            events={activeEvents}
            rootCauseModule={ov?.root_cause_module || null}
          />
          <div className="flex flex-wrap gap-3 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'hsl(280 70% 50%)' }} /> Causa-raiz</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'hsl(0 84% 55%)' }} /> Módulo falho</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'hsl(38 92% 50%)' }} /> Impactado</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabela técnica */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos de impacto ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {events.isLoading ? <Skeleton className="h-32" /> : activeEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum impacto ativo no momento. Sistema saudável.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead>Impactado</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Profundidade</TableHead>
                  <TableHead>Causa-raiz?</TableHead>
                  <TableHead>Em impacto há</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEvents.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.failed_module_code}</TableCell>
                    <TableCell className="font-mono text-xs">{e.impacted_module_code}</TableCell>
                    <TableCell><Badge variant={severityVariant(e.impact_level)}>{severityLabel[e.impact_level]}</Badge></TableCell>
                    <TableCell>{e.cascade_depth}</TableCell>
                    <TableCell>{e.root_cause_candidate ? <Badge className="bg-purple-600">Sim</Badge> : '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(e.detected_at), { locale: ptBR, addSuffix: false })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Snapshot por módulo */}
      <Card>
        <CardHeader>
          <CardTitle>Severidade por módulo</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.isLoading ? <Skeleton className="h-32" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Causando</TableHead>
                  <TableHead>Impactado por</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Causa-raiz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(snapshots.data || []).filter((s: any) => s.active_incidents > 0).slice(0, 15).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.module_code}</TableCell>
                    <TableCell className="font-bold">{Number(s.current_impact_score).toFixed(0)}</TableCell>
                    <TableCell>{s.causing_count}</TableCell>
                    <TableCell>{s.impacted_by_count}</TableCell>
                    <TableCell><Badge variant={severityVariant(s.severity_class)}>{severityLabel[s.severity_class]}</Badge></TableCell>
                    <TableCell>{s.is_root_cause_active ? <Badge className="bg-purple-600">Sim</Badge> : '—'}</TableCell>
                  </TableRow>
                ))}
                {(snapshots.data || []).filter((s: any) => s.active_incidents > 0).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum módulo com incidente ativo.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* RCAs históricas */}
      <Card>
        <CardHeader>
          <CardTitle>Análises de causa-raiz recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {rcas.isLoading ? <Skeleton className="h-24" /> : (rcas.data || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma análise registrada.</p>
          ) : (
            <div className="space-y-2">
              {(rcas.data || []).slice(0, 8).map((r: any) => (
                <div key={r.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">{r.root_cause_module_code}</Badge>
                      <Badge variant={r.derived_from === 'ai_analysis' ? 'default' : 'secondary'} className="text-xs">
                        {r.derived_from === 'ai_analysis' ? <><Sparkles className="h-3 w-3 mr-1" />IA</> : 'SQL'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{Number(r.confidence_score).toFixed(0)}% confiança</span>
                    </div>
                    {r.reasoning && <p className="text-sm text-muted-foreground">{r.reasoning}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(r.created_at), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
