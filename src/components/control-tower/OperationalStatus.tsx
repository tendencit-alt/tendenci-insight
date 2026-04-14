import { useDecisionMetrics } from '@/hooks/useAIDecisionData';
import { useCompanyStatus } from '@/hooks/useCompanyStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, Zap, HeartPulse, Settings, Shield, BarChart3 } from 'lucide-react';

export function ControlTowerOperationalStatus() {
  const { data: metrics, isLoading: ml } = useDecisionMetrics();
  const { data: status, isLoading: sl } = useCompanyStatus();
  if (ml || sl) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const healthColor = status?.health === 'estavel' ? 'bg-green-500/10 text-green-500' : status?.health === 'atencao' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500';

  const cards = [
    { title: 'Health Score', value: `${status?.healthScore ?? 0}%`, icon: HeartPulse, color: healthColor },
    { title: 'Diagnósticos Ativos', value: String(metrics?.totalDiagnoses ?? 0), icon: Activity, color: 'bg-blue-500/10 text-blue-500' },
    { title: 'Ações Pendentes', value: String(metrics?.pendingActions ?? 0), icon: Zap, color: 'bg-yellow-500/10 text-yellow-500' },
    { title: 'Ações Concluídas', value: String(metrics?.completedActions ?? 0), icon: Settings, color: 'bg-green-500/10 text-green-500' },
    { title: 'Alertas Abertos', value: String(metrics?.openAlerts ?? 0), icon: Shield, color: 'bg-orange-500/10 text-orange-500' },
    { title: 'Simulações', value: String(metrics?.totalSimulations ?? 0), icon: BarChart3, color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Status Operacional</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <Card key={c.title}>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <div className={`p-2 rounded-lg ${c.color}`}><c.icon className="h-5 w-5" /></div>
            </CardHeader>
            <CardContent><span className="text-2xl font-bold">{c.value}</span></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
