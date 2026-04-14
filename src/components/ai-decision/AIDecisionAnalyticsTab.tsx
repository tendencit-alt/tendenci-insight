import { useDecisionMetrics } from '@/hooks/useAIDecisionData';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, HeartPulse, Zap, AlertTriangle, FlaskConical, CheckCircle2, Brain, Target, BarChart3 } from 'lucide-react';

function MetricCard({ title, value, subtitle, icon: Icon, color }: { title: string; value: string; subtitle?: string; icon: any; color: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </CardContent></Card>
  );
}

export function AIDecisionAnalyticsTab() {
  const { data: m, isLoading } = useDecisionMetrics();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!m) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Decision Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Diagnósticos Ativos" value={String(m.totalDiagnoses)} subtitle={`${m.criticalDiagnoses} críticos`} icon={HeartPulse} color="bg-red-500/10 text-red-500" />
        <MetricCard title="Ações Pendentes" value={String(m.pendingActions)} subtitle={`${m.completedActions} concluídas`} icon={Zap} color="bg-yellow-500/10 text-yellow-500" />
        <MetricCard title="Alertas Abertos" value={String(m.openAlerts)} subtitle={`${m.criticalAlerts} críticos`} icon={AlertTriangle} color="bg-orange-500/10 text-orange-500" />
        <MetricCard title="Simulações" value={String(m.totalSimulations)} icon={FlaskConical} color="bg-blue-500/10 text-blue-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard title="Decisões Sugeridas" value={String(m.suggestedDecisions)} icon={Brain} color="bg-primary/10 text-primary" />
        <MetricCard title="Decisões Executadas" value={String(m.executedDecisions)} icon={CheckCircle2} color="bg-green-500/10 text-green-500" />
      </div>
    </div>
  );
}
