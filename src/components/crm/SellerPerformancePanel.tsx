import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Target, Trophy, Award } from "lucide-react";
import { ComparisonCards } from "@/components/goals/seller/ComparisonCards";
import { NoActiveGoalAlert } from "@/components/goals/NoActiveGoalAlert";
import { useGoalStatus } from "@/hooks/useGoalStatus";

export function SellerPerformancePanel() {
  const { user } = useAuth();
  const goalStatus = useGoalStatus();
  const [loading, setLoading] = useState(true);
  const [salesGoal, setSalesGoal] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchAllData();
      
      // Realtime subscriptions para atualização automática
      const goalsChannel = supabase
        .channel('seller-performance-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tendenci_seller_goals',
            filter: `vendedor_id=eq.${user.id}`
          },
          () => {
            fetchSalesGoal();
            fetchRanking();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tendenci_goal_progress'
          },
          () => {
            fetchSalesGoal();
            fetchRanking();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tendenci_badges',
            filter: `vendedor_id=eq.${user.id}`
          },
          () => {
            fetchBadges();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'crm_deals',
            filter: `owner_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.new.status === 'won' || payload.new.status === 'lost') {
              fetchSalesGoal();
              fetchRanking();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(goalsChannel);
      };
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    await fetchSalesGoal();
    await Promise.all([
      fetchBadges(),
      fetchRanking()
    ]);
    setLoading(false);
  };

  const fetchSalesGoal = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("tendenci_seller_goals")
        .select(`
          *,
          tendenci_goal_progress(valor_vendido, percentual)
        `)
        .eq("vendedor_id", user?.id)
        .eq("status", "ativa")
        .lte("data_inicio", now)
        .gte("data_fim", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setSalesGoal(null);
        return;
      }

      if (data) {
        const progress = Array.isArray(data.tendenci_goal_progress) 
          ? data.tendenci_goal_progress[0] 
          : data.tendenci_goal_progress;

        const goalData = {
          target: Number(data.valor_meta) || 0,
          current: Number(progress?.valor_vendido) || 0,
          percentage: Number(progress?.percentual) || 0
        };
        setSalesGoal(goalData);
      } else {
        setSalesGoal(null);
      }
    } catch (error) {
      setSalesGoal(null);
    }
  };

  const fetchBadges = async () => {
    const { data } = await supabase
      .from("tendenci_badges")
      .select("*")
      .eq("vendedor_id", user?.id)
      .order("earned_at", { ascending: false })
      .limit(20);

    setBadges(data || []);
  };

  const fetchRanking = async () => {
    try {
      const now = new Date().toISOString();
      const { data: allSellers, error } = await supabase
        .from("tendenci_seller_goals")
        .select(`
          vendedor_id,
          valor_meta,
          tendenci_goal_progress(valor_vendido, percentual)
        `)
        .eq("status", "ativa")
        .lte("data_inicio", now)
        .gte("data_fim", now);

      if (error) return;

      if (allSellers && allSellers.length > 0) {
        const percentages = allSellers.map(s => {
          const progress = Array.isArray(s.tendenci_goal_progress) 
            ? s.tendenci_goal_progress[0] 
            : s.tendenci_goal_progress;
          return progress?.percentual || 0;
        });
        
        const avg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

        const sorted = allSellers.sort((a, b) => {
          const aProgress = Array.isArray(a.tendenci_goal_progress) 
            ? a.tendenci_goal_progress[0] 
            : a.tendenci_goal_progress;
          const bProgress = Array.isArray(b.tendenci_goal_progress) 
            ? b.tendenci_goal_progress[0] 
            : b.tendenci_goal_progress;
          
          return (bProgress?.percentual || 0) - (aProgress?.percentual || 0);
        });

        const position = sorted.findIndex(s => s.vendedor_id === user?.id) + 1;
        
        const userSeller = sorted.find(s => s.vendedor_id === user?.id);
        const userProgress = userSeller 
          ? (Array.isArray(userSeller.tendenci_goal_progress) 
              ? userSeller.tendenci_goal_progress[0] 
              : userSeller.tendenci_goal_progress)
          : null;
        const userPercentage = userProgress?.percentual || 0;

        setRanking({
          position,
          total: allSellers.length,
          topPercentage: userPercentage,
          teamAveragePercentage: avg
        });
      } else {
        setRanking(null);
      }
    } catch (error) {
      // Silenciar erro
    }
  };

  const getWeekBadges = () => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return badges.filter(b => new Date(b.earned_at) >= weekStart);
  };

  const getTodayBadges = () => {
    const today = new Date().toISOString().split('T')[0];
    return badges.filter(b => b.earned_at?.startsWith(today));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  // Calcular dados para ComparisonCards (tendência mensal)
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDay = today.getDate();
  const dailyAverage = salesGoal ? salesGoal.current / currentDay : 0;
  const projectedMonth = dailyAverage * daysInMonth;

  const trend = salesGoal ? {
    currentSales: salesGoal.current,
    projectedSales: projectedMonth,
    goalAmount: salesGoal.target
  } : undefined;

  const pace = salesGoal ? {
    dailyAverage: dailyAverage,
    idealDaily: salesGoal.target / daysInMonth,
    projectedMonth: projectedMonth
  } : undefined;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        Meu Desempenho
      </h3>

      {/* Alerta quando não há meta de vendas configurada */}
      {!salesGoal && !goalStatus.loading && (
        <NoActiveGoalAlert 
          type="sales" 
          currentMonth={goalStatus.currentMonth}
          sellersWithoutGoals={goalStatus.sellersWithoutGoals}
        />
      )}

      {/* Cards de Comparação - Ranking e Tendência */}
      {salesGoal && (
        <ComparisonCards 
          ranking={ranking}
          trend={trend}
          pace={pace}
        />
      )}

      {/* Insígnias e Troféus */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Insígnias e Troféus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="day" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
            
            <TabsContent value="day" className="mt-4">
              <div className="flex items-center gap-2">
                {getTodayBadges().length > 0 ? (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500/20 border border-amber-500/50">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700">Meta batida</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-muted/50 border border-border">
                    <Award className="h-4 w-4 text-muted-foreground/50" />
                    <span className="text-sm text-muted-foreground/50">Meta batida</span>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="week" className="mt-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4].map((dayIndex) => {
                    const earned = getWeekBadges()[dayIndex];
                    return earned ? (
                      <div key={dayIndex} className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/50">
                        <Award className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-medium text-amber-700">Dia {new Date(earned.earned_at).getDate()}</span>
                      </div>
                    ) : (
                      <div key={dayIndex} className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 border border-border">
                        <Award className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground/50">Dia {dayIndex + 1}</span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="pt-2 border-t">
                  {getWeekBadges().length >= 5 ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/20 border border-primary/50">
                      <Trophy className="h-5 w-5 text-primary" />
                      <span className="text-sm font-semibold text-primary">Troféu da Semana</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
                      <Trophy className="h-5 w-5 text-muted-foreground/50" />
                      <span className="text-sm text-muted-foreground/50">Troféu da Semana</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
