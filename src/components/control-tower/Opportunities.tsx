import { useFinancialDiagnoses, usePriorityActions } from '@/hooks/useAIDecisionData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lightbulb } from 'lucide-react';

export function ControlTowerOpportunities() {
  const { data: diags, isLoading: dl } = useFinancialDiagnoses();
  const { data: actions, isLoading: al } = usePriorityActions();
  if (dl || al) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const lowSev = (diags || []).filter((d: any) => d.severity === 'low' || d.severity === 'medium').slice(0, 5);
  const pendingActions = (actions || []).filter((a: any) => a.status === 'pending').slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Oportunidades Detectadas</h2>
      {lowSev.length === 0 && pendingActions.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhuma oportunidade detectada no momento</p>
      )}
      {lowSev.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Melhorias Financeiras</h3>
          {lowSev.map((d: any) => (
            <Card key={d.id}><CardContent className="p-4 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{d.diagnosis_type}</Badge>
                  <span className="text-sm text-muted-foreground">{d.tenants?.name}</span>
                </div>
                <p className="text-sm">{d.description}</p>
                {d.estimated_impact && <p className="text-sm text-muted-foreground">📈 Impacto: {d.estimated_impact}</p>}
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {pendingActions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Ações de Melhoria Disponíveis</h3>
          {pendingActions.map((a: any) => (
            <Card key={a.id}><CardContent className="p-4 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1">
                <span className="font-medium">{a.title}</span>
                {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                <Badge variant="outline">{a.source_module || a.action_type}</Badge>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
