import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Clock, TrendingUp, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyGoalCardProps {
  meta: number;
  realizado: number;
  mediaSemanal: number;
  loading?: boolean;
}

export function DailyGoalCard({ meta, realizado, mediaSemanal, loading }: DailyGoalCardProps) {
  const progresso = meta > 0 ? Math.min((realizado / meta) * 100, 100) : 0;
  const metaBatida = realizado >= meta;
  const horasRestantes = Math.max(0, 18 - new Date().getHours()); // Considera fim do dia às 18h
  
  const getProgressColor = () => {
    if (metaBatida) return 'bg-green-500';
    if (progresso >= 80) return 'bg-green-400';
    if (progresso >= 50) return 'bg-yellow-500';
    if (progresso >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/20">
        <CardContent className="p-6 animate-pulse">
          <div className="h-32 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br ${metaBatida ? 'from-green-500/20 via-green-500/10' : 'from-primary/10 via-primary/5'} to-background border-2 ${metaBatida ? 'border-green-500/40' : 'border-primary/20'} shadow-lg`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${metaBatida ? 'bg-green-500/20' : 'bg-primary/20'}`}>
              <Target className={`h-5 w-5 ${metaBatida ? 'text-green-500' : 'text-primary'}`} />
            </div>
            <div>
              <span className="text-lg font-bold">Meta Diária</span>
              <p className="text-xs text-muted-foreground font-normal">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          {metaBatida && (
            <div className="flex items-center gap-1 text-green-500 animate-pulse">
              <Award className="h-5 w-5" />
              <span className="text-sm font-bold">META BATIDA!</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valores principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-background/50">
            <p className="text-3xl font-bold text-primary">{meta}</p>
            <p className="text-xs text-muted-foreground">Meta do Dia</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50">
            <p className={`text-3xl font-bold ${metaBatida ? 'text-green-500' : realizado > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
              {realizado}
            </p>
            <p className="text-xs text-muted-foreground">Captados Hoje</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{progresso.toFixed(0)}% concluído</span>
            <span className="text-muted-foreground">
              {meta - realizado > 0 ? `Faltam ${meta - realizado}` : 'Completo!'}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        {/* Métricas adicionais */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Restam</p>
              <p className="text-sm font-semibold">{horasRestantes}h úteis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Média 7 dias</p>
              <p className="text-sm font-semibold">{mediaSemanal.toFixed(1)}/dia</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}