import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import {
  useOwnerKPIs, useActivationMonitor, useLifecycleHeatmap,
  useBillingRadar, useChurnRadar, useExpansionSignals, useSystemHealthRealtime
} from '@/hooks/useOwnerControlTower';
import {
  Activity, TrendingUp, AlertTriangle, Heart, DollarSign,
  Users, Rocket, ShieldAlert, Server, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

const fmtMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents ?? 0) / 100);

export default function OwnerControlTower() {
  const { isOwner } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);

  const kpis = useOwnerKPIs();
  const activation = useActivationMonitor();
  const heatmap = useLifecycleHeatmap();
  const billing = useBillingRadar();
  const churn = useChurnRadar();
  const expansion = useExpansionSignals();
  const health = useSystemHealthRealtime();

  if (!isOwner) return <Navigate to="/" replace />;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('compute-system-health');
      if (error) throw error;
      toast.success('Snapshot atualizado');
      kpis.refetch(); health.refetch();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao atualizar');
    } finally {
      setRefreshing(false);
    }
  };

  const k = kpis.data;
  const h = health.data;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              🛰️ Owner Control Tower
            </h1>
            <p className="text-muted-foreground text-lg">
              Cockpit executivo SaaS — visão consolidada da base de tenants
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
            Atualizar snapshot
          </Button>
        </div>

        {/* KPIs Executivos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard icon={Users} label="Tenants ativos" value={k?.active_tenants ?? 0} sub={`${k?.total_tenants ?? 0} total`} />
          <KPICard icon={Rocket} label="Activation rate" value={`${Math.round(k?.avg_activation_score ?? 0)}%`} />
          <KPICard icon={Heart} label="Health médio" value={`${Math.round(k?.avg_health_index ?? 0)}/100`} />
          <KPICard icon={DollarSign} label="MRR" value={fmtMoney(k?.mrr_cents ?? 0)} sub={`ARR ${fmtMoney(k?.arr_cents ?? 0)}`} />
          <KPICard icon={ShieldAlert} label="Churn risk médio" value={`${Math.round(k?.avg_churn_risk ?? 0)}/100`} sub={`${k?.high_churn_risk_count ?? 0} em alto risco`} />
          <KPICard icon={TrendingUp} label="Upgrade ready" value={`${Math.round(k?.avg_expansion_ready ?? 0)}/100`} sub={`${k?.expansion_ready_count ?? 0} prontos`} />
        </div>

        <Tabs defaultValue="activation" className="w-full">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="activation"><Rocket className="h-4 w-4 mr-1.5" />Activation</TabsTrigger>
            <TabsTrigger value="lifecycle"><Activity className="h-4 w-4 mr-1.5" />Lifecycle</TabsTrigger>
            <TabsTrigger value="billing"><DollarSign className="h-4 w-4 mr-1.5" />Billing</TabsTrigger>
            <TabsTrigger value="churn"><AlertTriangle className="h-4 w-4 mr-1.5" />Churn</TabsTrigger>
            <TabsTrigger value="expansion"><TrendingUp className="h-4 w-4 mr-1.5" />Expansion</TabsTrigger>
            <TabsTrigger value="health"><Server className="h-4 w-4 mr-1.5" />System Health</TabsTrigger>
          </TabsList>

          {/* ACTIVATION MONITOR */}
          <TabsContent value="activation" className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard label="Tenants ativados" value={activation.data?.activated ?? 0} color="text-green-500" />
              <MetricCard label="Onboarding incompleto" value={activation.data?.incomplete_onboarding ?? 0} color="text-yellow-500" />
              <MetricCard label="Score médio" value={`${activation.data?.avg_activation_score ?? 0}%`} color="text-primary" />
              <MetricCard label="Dias médios p/ ativar" value={activation.data?.avg_days_to_activate ?? 0} color="text-blue-500" />
            </div>
          </TabsContent>

          {/* LIFECYCLE HEATMAP */}
          <TabsContent value="lifecycle" className="pt-6">
            <Card>
              <CardHeader><CardTitle>Distribuição por estágio de maturidade</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'setup', label: 'Setup', color: 'bg-gray-500' },
                  { key: 'operational', label: 'Operacional', color: 'bg-blue-500' },
                  { key: 'active_management', label: 'Gestão ativa', color: 'bg-green-500' },
                  { key: 'strategic_management', label: 'Gestão estratégica', color: 'bg-purple-500' },
                  { key: 'data_driven', label: 'Empresa data-driven', color: 'bg-yellow-500' },
                  { key: 'unclassified', label: 'Não classificado', color: 'bg-muted-foreground' },
                ].map(s => {
                  const count = heatmap.data?.[s.key] ?? 0;
                  const total = Object.values(heatmap.data ?? {}).reduce<number>((a, b) => a + Number(b), 0);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={s.key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{s.label}</span>
                        <span className="text-muted-foreground">{count} tenants ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-3 bg-muted rounded overflow-hidden">
                        <div className={`h-full ${s.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BILLING RADAR */}
          <TabsContent value="billing" className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard label="MRR" value={fmtMoney(billing.data?.mrr_cents ?? 0)} color="text-green-500" />
              <MetricCard label="ARR" value={fmtMoney(billing.data?.arr_cents ?? 0)} color="text-primary" />
              <MetricCard label="Inadimplência" value={`${Number(billing.data?.delinquency_rate ?? 0).toFixed(1)}%`} sub={`${billing.data?.delinquent_tenants ?? 0} tenants`} color="text-red-500" />
              <MetricCard label="Cancelamentos 30d" value={billing.data?.recent_cancellations ?? 0} color="text-orange-500" />
            </div>
            <Card>
              <CardHeader><CardTitle>Receita por plano</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(billing.data?.revenue_by_plan ?? []).map((p: any) => (
                    <div key={p.plan} className="flex justify-between p-3 rounded border">
                      <div><Badge variant="outline">{p.plan ?? 'Sem plano'}</Badge> <span className="ml-2 text-sm text-muted-foreground">{p.count} tenants</span></div>
                      <span className="font-bold">{fmtMoney(p.mrr_cents)}</span>
                    </div>
                  ))}
                  {(billing.data?.revenue_by_plan ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sem dados de plano</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHURN RADAR */}
          <TabsContent value="churn" className="pt-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <MetricCard label="Risco alto" value={churn.data?.high_risk_count ?? 0} color="text-red-500" />
              <MetricCard label="Risco moderado" value={churn.data?.moderate_risk_count ?? 0} color="text-yellow-500" />
              <MetricCard label="Risco baixo" value={churn.data?.low_risk_count ?? 0} color="text-green-500" />
            </div>
            <Card>
              <CardHeader><CardTitle>Tenants em alto risco</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(churn.data?.high_risk_tenants ?? []).map((t: any) => (
                  <div key={t.tenant_id} className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <p className="font-medium">{t.tenant_name ?? t.tenant_id}</p>
                      <p className="text-xs text-muted-foreground">Engagement: {t.engagement_band ?? '—'} · Health: {t.lifecycle_health_index ?? 0}</p>
                    </div>
                    <Badge variant="destructive">Risco {t.churn_risk_score}</Badge>
                  </div>
                ))}
                {(churn.data?.high_risk_tenants ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum tenant em risco alto 🎉</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EXPANSION SIGNALS */}
          <TabsContent value="expansion" className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Tenants prontos p/ upgrade" value={expansion.data?.ready_count ?? 0} color="text-green-500" />
              <MetricCard label="Score médio expansão" value={`${expansion.data?.avg_expansion_score ?? 0}/100`} color="text-primary" />
            </div>
            <Card>
              <CardHeader><CardTitle>Oportunidades de upgrade</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(expansion.data?.ready_tenants ?? []).map((t: any) => (
                  <div key={t.tenant_id} className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <p className="font-medium">{t.tenant_name ?? t.tenant_id}</p>
                      <p className="text-xs text-muted-foreground">Estágio: {t.maturity_stage ?? '—'} · Engagement: {t.engagement_band ?? '—'}</p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Score {t.expansion_ready_score}</Badge>
                  </div>
                ))}
                {(expansion.data?.ready_tenants ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum tenant pronto no momento</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SYSTEM HEALTH */}
          <TabsContent value="health" className="pt-6 space-y-4">
            <Card>
              <CardHeader><CardTitle>Saúde geral do sistema</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-5xl font-bold">{h?.overall_health_score ?? 100}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <Progress value={h?.overall_health_score ?? 100} />
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard label="Erros 24h" value={h?.errors_24h ?? 0} color="text-red-500" />
              <MetricCard label="Automações falhas 24h" value={h?.failed_automations_24h ?? 0} color="text-orange-500" />
              <MetricCard label="Alertas críticos" value={h?.critical_alerts ?? 0} color="text-yellow-500" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function KPICard({ icon: Icon, label, value, sub }: any) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-4 w-4" />{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, sub, color = 'text-foreground' }: any) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
