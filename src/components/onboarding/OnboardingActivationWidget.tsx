import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useActivationScore } from '@/hooks/useActivationScore';
import {
  Rocket, CheckCircle2, Circle, Clock, ArrowRight,
  Lightbulb, Trophy, Upload, ChevronDown, ChevronUp
} from 'lucide-react';
import { useState } from 'react';

export function OnboardingActivationWidget() {
  const navigate = useNavigate();
  const { data: activation, isLoading } = useActivationScore();
  const [expanded, setExpanded] = useState(false);

  if (isLoading || !activation) return null;

  // Don't show if fully complete
  if (activation.onboardingCompleted && activation.score >= 95) return null;

  const scoreColor = activation.score >= 80 ? 'text-green-600' : activation.score >= 50 ? 'text-amber-600' : 'text-primary';
  const progressColor = activation.score >= 80 ? 'bg-green-500' : activation.score >= 50 ? 'bg-amber-500' : '';

  return (
    <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activation.isComplete ? (
              <Trophy className="h-5 w-5 text-green-600" />
            ) : (
              <Rocket className="h-5 w-5 text-primary" />
            )}
            <div>
              <h2 className="text-sm font-semibold">
                {activation.isComplete ? 'Sistema Ativo!' : 'Ativação do Sistema'}
              </h2>
              {!activation.isComplete && activation.estimatedMinutesRemaining > 0 && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{activation.estimatedMinutesRemaining} min restantes
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${scoreColor}`}>{activation.score}%</span>
            <Badge variant="outline" className="text-[10px]">
              {activation.doneCount}/{activation.totalChecks}
            </Badge>
          </div>
        </div>

        {/* Progress */}
        <div>
          <Progress value={activation.score} className={`h-2 ${progressColor}`} />
        </div>

        {/* Checklist (collapsible) */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Ocultar checklist' : 'Ver checklist completo'}
          </button>

          {expanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {activation.checks.map(check => (
                <button
                  key={check.key}
                  onClick={() => !check.done && navigate(check.route)}
                  className={`flex items-center gap-2 p-2 rounded-md text-xs text-left transition-colors ${
                    check.done
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'bg-background hover:bg-muted cursor-pointer border border-border/50'
                  }`}
                  disabled={check.done}
                >
                  {check.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className={check.done ? 'line-through opacity-70' : ''}>{check.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Segment-adaptive info */}
        {activation.segmento && activation.extraSteps.length > 0 && (
          <div className="p-2 rounded-md bg-muted/50 text-xs">
            <p className="text-muted-foreground mb-1">
              Configurações extras para <strong>{activation.segmento.replace('_', ' ')}</strong>:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activation.extraSteps.map(s => (
                <Badge key={s.key} variant="secondary" className="text-[10px]">{s.label}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {!activation.isComplete && activation.recommendations.length > 0 && (
          <div>
            <h3 className="text-xs font-medium flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              Próximos Passos Recomendados
            </h3>
            <div className="space-y-1.5">
              {activation.recommendations.slice(0, 3).map(rec => (
                <button
                  key={rec.label}
                  onClick={() => navigate(rec.route)}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-background border border-border/50 hover:border-primary/30 transition-colors text-left"
                >
                  <div>
                    <p className="text-xs font-medium">{rec.label}</p>
                    <p className="text-[10px] text-muted-foreground">{rec.description}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {!activation.onboardingCompleted && (
            <Button size="sm" variant="default" className="text-xs h-8" onClick={() => navigate('/onboarding')}>
              <Rocket className="h-3.5 w-3.5 mr-1" /> Setup Guiado
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate('/financeiro')}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Importar Dados
          </Button>
        </div>

        {/* Completion message */}
        {activation.isComplete && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <Trophy className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-green-700 dark:text-green-400">
              Sistema pronto para uso gerencial!
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              DRE, Fluxo de Caixa e KPIs disponíveis no dashboard.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
