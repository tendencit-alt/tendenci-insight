import { usePriorityActions, useFinancialDiagnoses, useStrategyAlerts } from '@/hooks/useAIDecisionData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target, AlertTriangle, TrendingUp, Zap } from 'lucide-react';

export function ControlTowerPriorities() {
  const { data: actions, isLoading: al } = usePriorityActions();
  const { data: diags, isLoading: dl } = useFinancialDiagnoses();
  const { data: alerts, isLoading: sl } = useStrategyAlerts();
  if (al || dl || sl) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const topActions = (actions || []).filter((a: any) => a.status === 'pending').slice(0, 3);
  const topRisks = (diags || []).filter((d: any) => d.severity === 'critical' || d.severity === 'high').slice(0, 3);
  const topAlerts = (alerts || []).filter((a: any) => !a.acknowledged).slice(0, 3);

  const Section = ({ title, icon: Icon, items, renderItem }: { title: string; icon: any; items: any[]; renderItem: (i: any) => React.ReactNode }) => (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Icon className="h-5 w-5" />{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum item</p> : items.map(renderItem)}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Prioridades da Semana</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Section title="Top 3 Ações Críticas" icon={Zap} items={topActions} renderItem={(a: any) => (
          <div key={a.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="font-medium text-sm">{a.title}</p>
            <Badge variant="outline" className="text-xs">{a.source_module || a.action_type}</Badge>
          </div>
        )} />
        <Section title="Top 3 Riscos Imediatos" icon={AlertTriangle} items={topRisks} renderItem={(d: any) => (
          <div key={d.id} className="p-3 rounded-lg bg-red-500/5 space-y-1">
            <p className="font-medium text-sm">{d.description.slice(0, 80)}</p>
            <Badge className="bg-red-500/10 text-red-500 text-xs">{d.severity}</Badge>
          </div>
        )} />
        <Section title="Top 3 Alertas Estratégicos" icon={TrendingUp} items={topAlerts} renderItem={(a: any) => (
          <div key={a.id} className="p-3 rounded-lg bg-orange-500/5 space-y-1">
            <p className="font-medium text-sm">{a.title}</p>
            {a.recommended_action && <p className="text-xs text-muted-foreground">{a.recommended_action}</p>}
          </div>
        )} />
      </div>
    </div>
  );
}
