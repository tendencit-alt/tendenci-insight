import { useCompanyStatus } from '@/hooks/useCompanyStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, Target, Flame, Clock, Wallet } from 'lucide-react';

const trendIcon = (t: string) => t === 'up' ? <TrendingUp className="h-4 w-4 text-green-500" /> : t === 'down' ? <TrendingDown className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4 text-muted-foreground" />;

const icons = [DollarSign, BarChart3, Target, Wallet, Flame, Clock];

export function ControlTowerFinancialStatus() {
  const { data, isLoading } = useCompanyStatus();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!data) return <p className="text-center text-muted-foreground py-8">Sem dados financeiros disponíveis</p>;

  const kpis = [data.cashBalance, data.monthlyResult, data.openOrders, data.overduePayables, data.goalProgress];
  const healthColor = data.health === 'estavel' ? 'bg-green-500/10 text-green-500' : data.health === 'atencao' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Status Financeiro Atual</h2>
        <Badge className={healthColor}>{data.health.toUpperCase()} ({data.healthScore}%)</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = icons[idx] || DollarSign;
          return (
            <Card key={kpi.label}>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{kpi.formatted}</span>
                  {trendIcon(kpi.trend)}
                </div>
                {kpi.trendLabel && <p className="text-xs text-muted-foreground mt-1">{kpi.trendLabel}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
