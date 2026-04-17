import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import {
  useDecisionRules, useDecisionExecutions, useDecisionStats,
  useToggleRule, useProcessEvents,
} from '@/hooks/useDecisionEngine';
import { Loader2, Play, Bot, Activity, AlertTriangle, CheckCircle2, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const bandColor: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  moderate: 'bg-blue-500/10 text-blue-500',
  high: 'bg-yellow-500/10 text-yellow-500',
  critical: 'bg-red-500/10 text-red-500',
};

const statusColor: Record<string, string> = {
  success: 'bg-green-500/10 text-green-500',
  failed: 'bg-red-500/10 text-red-500',
  skipped: 'bg-muted text-muted-foreground',
  partial: 'bg-yellow-500/10 text-yellow-500',
};

export default function AutomationCenter() {
  const { isOwner } = usePermissions();
  const rules = useDecisionRules();
  const executions = useDecisionExecutions();
  const stats = useDecisionStats();
  const toggle = useToggleRule();
  const process = useProcessEvents();

  if (!isOwner) return <Navigate to="/" replace />;

  const handleProcess = async () => {
    try {
      const r = await process.mutateAsync();
      toast.success(`Processado: ${r?.processed ?? 0} eventos · ${r?.executions ?? 0} execuções`);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao processar');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              🤖 Automation Decision Engine
            </h1>
            <p className="text-muted-foreground text-lg">
              Motor autônomo de regras lifecycle, billing, onboarding e engagement
            </p>
          </div>
          <Button onClick={handleProcess} disabled={process.isPending}>
            {process.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Processar fila agora
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Bot} label="Regras ativas" value={stats.data?.active_rules ?? 0} />
          <StatCard icon={Activity} label="Execuções (7d)" value={stats.data?.total_7d ?? 0} />
          <StatCard icon={AlertTriangle} label="Críticas (7d)" value={stats.data?.critical_7d ?? 0} color="text-red-500" />
          <StatCard icon={Inbox} label="Eventos pendentes" value={stats.data?.pending_events ?? 0} color="text-yellow-500" />
        </div>

        <Tabs defaultValue="executions">
          <TabsList>
            <TabsTrigger value="executions">Execuções recentes</TabsTrigger>
            <TabsTrigger value="rules">Regras ativas</TabsTrigger>
            <TabsTrigger value="critical">Alertas críticos</TabsTrigger>
          </TabsList>

          {/* EXECUTIONS */}
          <TabsContent value="executions" className="pt-6">
            <Card>
              <CardHeader><CardTitle>Últimas execuções</CardTitle></CardHeader>
              <CardContent>
                {executions.isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (executions.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma execução ainda</p>
                ) : (
                  <div className="space-y-2">
                    {executions.data!.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between p-3 rounded border hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{e.rule_name ?? '—'}</span>
                            <Badge variant="outline" className="text-xs">{e.event_type}</Badge>
                            <Badge className={statusColor[e.status] ?? ''}>{e.status}</Badge>
                            {e.confidence_band && (
                              <Badge className={bandColor[e.confidence_band] ?? ''}>conf. {e.confidence_band}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            ação: <span className="font-mono">{e.action_type}</span> · tenant: {e.tenant_id?.slice(0, 8) ?? '—'}
                            {e.error_message && <span className="text-red-500 ml-2">· {e.error_message}</span>}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {formatDistanceToNow(new Date(e.executed_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RULES */}
          <TabsContent value="rules" className="pt-6">
            <Card>
              <CardHeader><CardTitle>Regras configuradas</CardTitle></CardHeader>
              <CardContent>
                {rules.isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-2">
                    {(rules.data ?? []).map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-4 rounded border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{r.name}</span>
                            <Badge variant="outline" className="text-xs">{r.event_type}</Badge>
                            <Badge className={bandColor[r.confidence_band] ?? ''}>conf. {r.confidence_score}%</Badge>
                            {r.is_system && <Badge variant="secondary" className="text-xs">sistema</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ação: <span className="font-mono">{r.action?.type}</span> · executada {r.execution_count}x
                          </p>
                        </div>
                        <Switch
                          checked={r.active}
                          onCheckedChange={(active) => toggle.mutate({ id: r.id, active })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CRITICAL */}
          <TabsContent value="critical" className="pt-6">
            <Card>
              <CardHeader><CardTitle>Execuções críticas (últimos 7 dias)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(executions.data ?? [])
                    .filter((e: any) => e.confidence_band === 'critical')
                    .map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between p-3 rounded border border-red-500/20 bg-red-500/5">
                        <div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="font-medium">{e.rule_name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            tenant {e.tenant_id?.slice(0, 8)} · {e.event_type}
                          </p>
                        </div>
                        <CheckCircle2 className={`h-5 w-5 ${e.status === 'success' ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </div>
                    ))}
                  {(executions.data ?? []).filter((e: any) => e.confidence_band === 'critical').length === 0 && (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma execução crítica recente 🎉</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, label, value, color = 'text-foreground' }: any) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-4 w-4" />{label}</div>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
