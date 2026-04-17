import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Play, AlertTriangle, CheckCircle2, Clock, Zap, ShieldCheck, ListOrdered } from 'lucide-react';
import { useRunbookOverview, useRunbookCatalog, useRunbookDetail, useStartRunbook, useToggleRunbook } from '@/hooks/useRunbooks';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  succeeded: 'bg-green-500/20 text-green-700 border-green-500/40',
  failed: 'bg-destructive/20 text-destructive border-destructive/40',
  escalated: 'bg-purple-500/20 text-purple-700 border-purple-500/40',
  running: 'bg-blue-500/20 text-blue-700 border-blue-500/40',
  queued: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
};

function formatDuration(seconds: number) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function OwnerRunbooks() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const { data: overview, isLoading: loadingOv } = useRunbookOverview();
  const { data: catalog = [] } = useRunbookCatalog();
  const { data: detail } = useRunbookDetail(selectedCode);
  const startMut = useStartRunbook();
  const toggleMut = useToggleRunbook();

  const lastExecByRunbook = new Map<string, any>();
  // We don't have this aggregated; show on detail.

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7" />
            Runbooks
          </h1>
          <p className="text-muted-foreground">Playbooks operacionais para incidentes recorrentes</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Runbooks ativos</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{loadingOv ? '—' : overview?.total_runbooks ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Execuções 30d</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{overview?.executions_30d ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Taxa de sucesso</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-green-600">{overview?.success_rate_30d ?? 0}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Escalonamentos</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-purple-600">{overview?.escalation_rate_30d ?? 0}%</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-2">
          {catalog.map((rb: any) => (
            <Card key={rb.id} className="hover:bg-accent/30 transition cursor-pointer" onClick={() => setSelectedCode(rb.code)}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <code className="text-xs font-mono text-muted-foreground">{rb.code}</code>
                    {rb.is_fallback && <Badge variant="outline" className="text-xs">fallback</Badge>}
                    {rb.auto_start_allowed && <Badge className="bg-blue-500 text-white text-xs">auto-start</Badge>}
                    {!rb.is_active && <Badge variant="outline" className="text-xs">inativo</Badge>}
                  </div>
                  <div className="font-medium">{rb.name}</div>
                  <div className="text-xs text-muted-foreground">
                    <code>{rb.target_module}</code> · {rb.incident_type} · severidades: {rb.severity_scope?.join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={rb.is_active}
                    onCheckedChange={(v) => toggleMut.mutate({ id: rb.id, is_active: v })}
                  />
                  <Button size="sm" variant="outline" onClick={() => startMut.mutate({ runbook_code: rb.code })} disabled={!rb.is_active || startMut.isPending}>
                    <Play className="h-3 w-3 mr-1" />Executar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {catalog.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhum runbook cadastrado.</p>}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />Top runbooks (30d)</CardTitle></CardHeader>
              <CardContent>
                {(overview?.top_runbooks || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <div className="space-y-2">
                    {overview!.top_runbooks.map((r) => (
                      <div key={r.runbook_code} className="flex items-center justify-between text-sm">
                        <code className="text-xs">{r.runbook_code}</code>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{r.count}x</span>
                          <Badge className="bg-green-500/20 text-green-700 text-xs">{r.success_pct ?? 0}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Passos que mais falham</CardTitle></CardHeader>
              <CardContent>
                {(overview?.failing_steps || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem falhas registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {overview!.failing_steps.map((r) => (
                      <div key={r.action_code} className="flex items-center justify-between text-sm">
                        <code className="text-xs">{r.action_code}</code>
                        <Badge className="bg-destructive/20 text-destructive text-xs">{r.fail_count} falhas</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Tempo médio</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(overview?.avg_duration_seconds ?? 0)}</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!selectedCode} onOpenChange={(o) => !o && setSelectedCode(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{selectedCode}</DialogTitle>
          </DialogHeader>
          {!detail ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ListOrdered className="h-4 w-4" />Passos</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {detail.steps.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded border">
                        <Badge variant="outline" className="shrink-0">{s.step_order}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{s.step_name}</div>
                          <code className="text-xs text-muted-foreground">{s.action_code}</code>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Badge variant="outline" className="text-xs">{s.execution_mode}</Badge>
                          {s.is_critical && <Badge className="bg-destructive text-destructive-foreground text-xs">crítico</Badge>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {detail.validations.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Validações</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {detail.validations.map((v: any) => (
                        <div key={v.id} className="text-xs space-y-1 p-2 rounded border">
                          <div className="flex gap-2">
                            <Badge variant="outline">passo {v.step_order}</Badge>
                            <Badge variant="outline">{v.validation_type}</Badge>
                            <Badge variant="outline">on_failure: {v.on_failure_action}</Badge>
                          </div>
                          <code className="text-muted-foreground block">{v.validation_query}</code>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {detail.escalations.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Escalonamento</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {detail.escalations.map((e: any) => (
                        <div key={e.id} className="text-xs flex items-center gap-2 p-2 rounded border">
                          <Badge variant="outline">{e.condition_type}</Badge>
                          {e.threshold && <Badge variant="outline">threshold {e.threshold}</Badge>}
                          <span className="text-muted-foreground">→ {e.escalation_action}</span>
                          {e.requires_owner && <Badge className="bg-purple-500 text-white text-xs">owner</Badge>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Histórico</CardTitle></CardHeader>
                  <CardContent>
                    {detail.executions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma execução registrada.</p>
                    ) : (
                      <div className="space-y-1">
                        {detail.executions.map((e: any) => (
                          <div key={e.id} className="flex items-center justify-between text-xs p-2 rounded border">
                            <div className="flex items-center gap-2">
                              <Badge className={STATUS_COLORS[e.status]} variant="outline">{e.status}</Badge>
                              <span className="text-muted-foreground">{e.triggered_by}</span>
                              <span>{e.succeeded_steps}/{e.total_steps} passos</span>
                            </div>
                            <div className="text-muted-foreground">
                              {formatDistanceToNow(new Date(e.started_at), { locale: ptBR, addSuffix: true })}
                              {e.duration_seconds && ` · ${formatDuration(e.duration_seconds)}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
