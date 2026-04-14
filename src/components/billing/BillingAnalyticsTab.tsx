import { useBillingMetrics } from '@/hooks/useBillingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, BarChart3 } from 'lucide-react';

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

export function BillingAnalyticsTab() {
  const { data: metrics, isLoading } = useBillingMetrics();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Billing Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="MRR" value={`R$ ${metrics.mrr.toFixed(2)}`} subtitle="Receita Recorrente Mensal" icon={DollarSign} color="bg-green-500/10 text-green-500" />
        <MetricCard title="ARR" value={`R$ ${metrics.arr.toFixed(2)}`} subtitle="Receita Recorrente Anual" icon={TrendingUp} color="bg-blue-500/10 text-blue-500" />
        <MetricCard title="Churn Rate" value={`${metrics.churnRate.toFixed(1)}%`} subtitle={`${metrics.cancelledSubs} cancelamentos`} icon={TrendingDown} color="bg-red-500/10 text-red-500" />
        <MetricCard title="Inadimplência" value={`${metrics.inadimplencia.toFixed(1)}%`} subtitle={`${metrics.pastDue} inadimplentes`} icon={AlertTriangle} color="bg-yellow-500/10 text-yellow-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Assinaturas Ativas" value={String(metrics.activeSubs)} icon={Users} color="bg-primary/10 text-primary" />
        <MetricCard title="Em Trial" value={String(metrics.trialSubs)} icon={Users} color="bg-blue-500/10 text-blue-500" />
        <MetricCard title="Receita Total" value={`R$ ${metrics.totalRevenue.toFixed(2)}`} subtitle="Faturas pagas" icon={BarChart3} color="bg-green-500/10 text-green-500" />
      </div>
    </div>
  );
}
