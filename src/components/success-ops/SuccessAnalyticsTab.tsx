import { useSuccessMetrics } from '@/hooks/useSuccessOpsData';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Ticket, Bell, AlertTriangle, Rocket, Clock, Zap } from 'lucide-react';

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

export function SuccessAnalyticsTab() {
  const { data: m, isLoading } = useSuccessMetrics();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!m) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Success Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Tickets Abertos" value={String(m.openTickets)} subtitle={`${m.urgentTickets} urgentes`} icon={Ticket} color="bg-blue-500/10 text-blue-500" />
        <MetricCard title="Tempo Médio Resolução" value={`${m.avgResolution.toFixed(1)}h`} icon={Clock} color="bg-primary/10 text-primary" />
        <MetricCard title="Alertas Abertos" value={String(m.openAlerts)} subtitle={`${m.criticalAlerts} críticos`} icon={Bell} color="bg-orange-500/10 text-orange-500" />
        <MetricCard title="Intervenções Pendentes" value={String(m.pendingInterventions)} icon={Zap} color="bg-yellow-500/10 text-yellow-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard title="Sinais Expansão Detectados" value={String(m.detectedSignals)} icon={Rocket} color="bg-green-500/10 text-green-500" />
        <MetricCard title="Total Tickets" value={String(m.totalTickets)} icon={AlertTriangle} color="bg-muted text-muted-foreground" />
      </div>
    </div>
  );
}
