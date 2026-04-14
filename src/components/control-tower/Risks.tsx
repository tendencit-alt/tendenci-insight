import { useFinancialDiagnoses, useStrategyAlerts } from '@/hooks/useAIDecisionData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';

const sevColors: Record<string, string> = { low: 'bg-muted text-muted-foreground', medium: 'bg-yellow-500/10 text-yellow-500', high: 'bg-orange-500/10 text-orange-500', critical: 'bg-red-500/10 text-red-500' };

export function ControlTowerRisks() {
  const { data: diags, isLoading: dl } = useFinancialDiagnoses();
  const { data: alerts, isLoading: al } = useStrategyAlerts();
  if (dl || al) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const criticalDiags = (diags || []).filter((d: any) => d.severity === 'critical' || d.severity === 'high').slice(0, 5);
  const openAlerts = (alerts || []).filter((a: any) => !a.acknowledged).slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Riscos Estratégicos Detectados</h2>
      {criticalDiags.length === 0 && openAlerts.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhum risco crítico detectado no momento</p>
      )}
      {criticalDiags.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Diagnósticos Financeiros Críticos</h3>
          {criticalDiags.map((d: any) => (
            <Card key={d.id}><CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={sevColors[d.severity]}>{d.severity}</Badge>
                  <span className="font-medium">{d.diagnosis_type}</span>
                  <span className="text-sm text-muted-foreground">— {d.tenants?.name || 'Empresa'}</span>
                </div>
                <p className="text-sm">{d.description}</p>
                {d.suggested_action && <p className="text-sm text-muted-foreground">💡 {d.suggested_action}</p>}
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {openAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Alertas Estratégicos Abertos</h3>
          {openAlerts.map((a: any) => (
            <Card key={a.id}><CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={sevColors[a.severity]}>{a.severity}</Badge>
                  <span className="font-medium">{a.title}</span>
                </div>
                {a.explanation && <p className="text-sm">{a.explanation}</p>}
                {a.recommended_action && <p className="text-sm text-muted-foreground">💡 {a.recommended_action}</p>}
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
