import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Settings, RefreshCw } from "lucide-react";
import { CreateSellerGoalDialog } from "@/components/goals/CreateSellerGoalDialog";
import { CreateCompanyGoalDialog } from "@/components/goals/CreateCompanyGoalDialog";
import { EditDailyGoalsDialog } from "@/components/goals/EditDailyGoalsDialog";
import { GoalsTable } from "@/components/goals/GoalsTable";
import { GoalsAnalytics } from "@/components/goals/GoalsAnalytics";
import { AdvancedAnalytics } from "@/components/goals/AdvancedAnalytics";
import { DailyArchitectGoals } from "@/components/goals/DailyArchitectGoals";
import { NoActiveGoalAlert } from "@/components/goals/NoActiveGoalAlert";
import { DailyGoalCard } from "@/components/goals/DailyGoalCard";
import { GoalCalendar } from "@/components/goals/GoalCalendar";
import { GoalStreak } from "@/components/goals/GoalStreak";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useGoalStatus } from "@/hooks/useGoalStatus";
import { useQuery } from "@tanstack/react-query";

export default function GoalsManagement() {
  const { isMaster } = usePermissions();
  const { user } = useAuth();
  const goalStatus = useGoalStatus();
  const [showSellerDialog, setShowSellerDialog] = useState(false);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showDailyGoalsDialog, setShowDailyGoalsDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Buscar meta diária do usuário
  const { data: dailyGoal, isLoading: loadingDaily, refetch: refetchDaily } = useQuery({
    queryKey: ['daily-goal', user?.id, refreshTrigger],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('tendenci_daily_architect_goals')
        .select('*')
        .eq('vendedor_id', user.id)
        .eq('data', new Date().toISOString().split('T')[0])
        .maybeSingle();
      
      if (error) throw error;
      return data || { meta_captacoes: 5, captacoes_realizadas: 0 };
    },
    enabled: !!user?.id
  });

  // Buscar estatísticas de metas diárias
  const { data: dailyStats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['daily-goal-stats', user?.id, refreshTrigger],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase.rpc('get_daily_goal_stats', {
        p_vendedor_id: isMaster ? null : user.id
      });
      
      if (error) throw error;
      return data as { current_streak: number; best_streak: number; total_days_met: number; average_daily: number };
    },
    enabled: !!user?.id
  });

  // Buscar registros do mês para o calendário
  const { data: monthlyRecords, isLoading: loadingRecords, refetch: refetchRecords } = useQuery({
    queryKey: ['monthly-goal-records', user?.id, refreshTrigger],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc('get_monthly_goal_records', {
        p_vendedor_id: isMaster ? null : user.id,
        p_month: new Date().toISOString().split('T')[0]
      });
      
      if (error) throw error;
      return (data || []) as { date: string; meta: number; realizado: number; batida: boolean }[];
    },
    enabled: !!user?.id
  });

  // Média semanal (últimos 7 dias)
  const { data: weeklyAvg } = useQuery({
    queryKey: ['weekly-avg', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('tendenci_daily_architect_goals')
        .select('captacoes_realizadas')
        .eq('vendedor_id', user.id)
        .gte('data', sevenDaysAgo.toISOString().split('T')[0]);
      
      if (error) return 0;
      if (!data || data.length === 0) return 0;
      
      const sum = data.reduce((acc, d) => acc + (d.captacoes_realizadas || 0), 0);
      return sum / data.length;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    goalStatus.refetch();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    refetchDaily();
    refetchStats();
    refetchRecords();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold">{isMaster ? "Gestão de Metas" : "Minhas Metas"}</h1>
            <p className="text-sm text-muted-foreground">
              {isMaster ? "Gerencie metas individuais e consolidadas" : "Acompanhe suas metas e progresso"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-1 h-4 w-4" />
              Atualizar
            </Button>
            {isMaster && (
              <>
                <Button onClick={() => setShowDailyGoalsDialog(true)} variant="outline" size="sm">
                  <Settings className="mr-1 h-4 w-4" />
                  Metas Diárias
                </Button>
                <Button onClick={() => setShowSellerDialog(true)} size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Meta Individual
                </Button>
                <Button onClick={() => setShowCompanyDialog(true)} variant="secondary" size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Meta Empresa
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Alerta quando há vendedores sem metas */}
        {isMaster && goalStatus.sellersWithoutGoals > 0 && !goalStatus.loading && (
          <NoActiveGoalAlert 
            type="sales" 
            currentMonth={goalStatus.currentMonth}
            sellersWithoutGoals={goalStatus.sellersWithoutGoals}
            onCreateClick={() => setShowSellerDialog(true)}
          />
        )}

        {/* Seção Principal: Meta Diária em Destaque */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Card de Meta Diária */}
          <DailyGoalCard 
            meta={dailyGoal?.meta_captacoes || 5}
            realizado={dailyGoal?.captacoes_realizadas || 0}
            mediaSemanal={weeklyAvg || 0}
            loading={loadingDaily}
          />

          {/* Calendário do Mês */}
          <GoalCalendar 
            records={monthlyRecords || []}
            currentMonth={new Date()}
            loading={loadingRecords}
          />
        </div>

        {/* Estatísticas de Sequência */}
        <GoalStreak 
          currentStreak={dailyStats?.current_streak || 0}
          bestStreak={dailyStats?.best_streak || 0}
          totalDaysMet={dailyStats?.total_days_met || 0}
          averageDaily={dailyStats?.average_daily || 0}
          loading={loadingStats}
        />

        {/* Tabs com conteúdo detalhado */}
        <Tabs defaultValue="daily" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="daily" className="text-xs">Meta Diária</TabsTrigger>
            {isMaster && <TabsTrigger value="seller" className="text-xs">Metas Individuais</TabsTrigger>}
            <TabsTrigger value="company" className="text-xs">Meta Empresa</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs">{isMaster ? "Análise" : "Desempenho"}</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <DailyArchitectGoals />
          </TabsContent>

          {isMaster && (
            <TabsContent value="seller" className="space-y-4">
              <GoalsTable type="seller" refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
            </TabsContent>
          )}

          <TabsContent value="company" className="space-y-4">
            <GoalsTable type="company" refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {isMaster ? (
              <AdvancedAnalytics refreshTrigger={refreshTrigger} />
            ) : (
              <GoalsAnalytics refreshTrigger={refreshTrigger} />
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <CreateSellerGoalDialog
          open={showSellerDialog}
          onOpenChange={setShowSellerDialog}
          onSuccess={handleRefresh}
        />

        <CreateCompanyGoalDialog
          open={showCompanyDialog}
          onOpenChange={setShowCompanyDialog}
          onSuccess={handleRefresh}
        />

        <EditDailyGoalsDialog
          open={showDailyGoalsDialog}
          onOpenChange={setShowDailyGoalsDialog}
          onSuccess={handleRefresh}
        />
      </div>
    </DashboardLayout>
  );
}