import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Circle, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

export function DailyArchitectGoals() {
  const { user } = useAuth();
  const { isMaster } = usePermissions();
  const [dailyProgress, setDailyProgress] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Apenas vendedores (não masters) devem ter metas diárias
    if (!isMaster && user) {
      fetchProgress();
      initializeTodayGoal();
    } else {
      setLoading(false);
    }
  }, [isMaster, user]);

  const initializeTodayGoal = async () => {
    try {
      // Chamar edge function para inicializar metas diárias de todos os vendedores
      const { data, error } = await supabase.functions.invoke('initialize-daily-goals');
      
      if (error) {
        console.error("Erro ao inicializar metas diárias:", error);
      } else {
        console.log("Metas diárias inicializadas:", data);
      }
    } catch (error) {
      console.error("Erro ao chamar função de inicialização:", error);
    }
  };

  const fetchProgress = async () => {
    try {
      if (!user) return;

      // Buscar progresso diário
      const { data: dailyData } = await supabase.rpc('get_daily_architect_goal_progress', {
        p_vendedor_id: user.id,
        p_date: new Date().toISOString().split('T')[0]
      });

      // Buscar progresso semanal
      const { data: weeklyData } = await supabase.rpc('get_weekly_architect_goal_progress', {
        p_vendedor_id: user.id
      });

      setDailyProgress(dailyData);
      setWeeklyProgress(weeklyData);
    } catch (error) {
      console.error("Erro ao buscar progresso:", error);
    } finally {
      setLoading(false);
    }
  };

  // Se for master, não mostrar metas diárias
  if (isMaster) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            Metas diárias são aplicadas apenas para vendedores. Use o botão "Editar Metas Diárias" para configurar as metas de cada vendedor.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "EEE", { locale: ptBR });
  };

  return (
    <div className="space-y-4">
      {/* Meta Diária */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Meta Diária de Captação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Hoje</p>
              <p className="text-2xl font-bold">
                {dailyProgress?.realizadas || 0} / {dailyProgress?.meta || 30}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Faltam {dailyProgress?.faltam || 30} captações
              </p>
            </div>
            <div className="text-right">
              {dailyProgress?.atingiu_meta ? (
                <Badge variant="default" className="mb-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Meta Atingida!
                </Badge>
              ) : (
                <Badge variant="secondary" className="mb-2">
                  <Circle className="h-3 w-3 mr-1" />
                  Em andamento
                </Badge>
              )}
              <div className="text-3xl font-bold text-primary">
                {dailyProgress?.percentual || 0}%
              </div>
            </div>
          </div>
          
          <Progress 
            value={dailyProgress?.percentual || 0} 
            className="h-3"
          />

          <div className="text-xs text-muted-foreground">
            💡 Meta fixa: 30 captações de parceiros profissionais por dia útil (segunda a sexta)
          </div>
        </CardContent>
      </Card>

      {/* Progresso Semanal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progresso Semanal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total da Semana</p>
              <p className="text-2xl font-bold">
                {weeklyProgress?.realizadas_total || 0} / {weeklyProgress?.meta_total || 150}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Média Diária</p>
              <p className="text-2xl font-bold">
                {weeklyProgress?.media_diaria || 0}
              </p>
            </div>
          </div>

          <Progress 
            value={weeklyProgress?.percentual || 0} 
            className="h-3"
          />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {weeklyProgress?.dias_meta_atingida || 0} de 5 dias com meta atingida
            </span>
            <span className="font-semibold">
              {weeklyProgress?.percentual || 0}%
            </span>
          </div>

          {/* Detalhes por Dia */}
          {weeklyProgress?.detalhes_dias && weeklyProgress.detalhes_dias.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium">Detalhes por Dia</p>
              <div className="space-y-2">
                {weeklyProgress.detalhes_dias.map((dia: any) => (
                  <div key={dia.data} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      {dia.realizadas >= dia.meta ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">
                        {getDayOfWeek(dia.data)} - {format(new Date(dia.data), "dd/MM")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {dia.realizadas} / {dia.meta}
                      </span>
                      <Badge 
                        variant={dia.percentual >= 100 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {dia.percentual}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}