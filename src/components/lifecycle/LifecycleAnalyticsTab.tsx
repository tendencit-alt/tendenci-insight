import { useLifecycleMetrics } from '@/hooks/useLifecycleData';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Heart, Users, AlertTriangle, Rocket, CheckCircle2, XCircle } from 'lucide-react';

function MetricCard({ title, value, subtitle, icon: Icon, color }: { title: string; value: string; subtitle?: string; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LifecycleAnalyticsTab() {
  const { data: m, isLoading } = useLifecycleMetrics();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!m) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Indicadores do Ciclo de Vida</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total de Contas" value={String(m.totalAccounts)} icon={Users} color="bg-primary/10 text-primary" />
        <MetricCard title="Saudáveis" value={String(m.healthy)} subtitle={`${m.totalAccounts > 0 ? ((m.healthy / m.totalAccounts) * 100).toFixed(0) : 0}% do total`} icon={CheckCircle2} color="bg-green-500/10 text-green-500" />
        <MetricCard title="Em Risco / Crítico" value={String(m.risk + m.critical)} subtitle={`${m.risk} risco, ${m.critical} crítico`} icon={XCircle} color="bg-red-500/10 text-red-500" />
        <MetricCard title="Onboarding Médio" value={`${m.avgOnboarding.toFixed(0)}%`} icon={Heart} color="bg-blue-500/10 text-blue-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Alertas Retenção Abertos" value={String(m.openRetention)} subtitle={`${m.criticalRetention} críticos`} icon={AlertTriangle} color="bg-orange-500/10 text-orange-500" />
        <MetricCard title="Expansão Detectada" value={String(m.detectedExpansion)} subtitle={`R$ ${m.expansionValue.toFixed(2)} potencial`} icon={Rocket} color="bg-green-500/10 text-green-500" />
        <MetricCard title="Atenção" value={String(m.attention)} subtitle="Empresas precisando atenção" icon={AlertTriangle} color="bg-yellow-500/10 text-yellow-500" />
      </div>
    </div>
  );
}
