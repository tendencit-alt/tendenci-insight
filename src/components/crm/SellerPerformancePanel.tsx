import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Target, TrendingUp, Trophy, Award } from "lucide-react";

export function SellerPerformancePanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salesGoal, setSalesGoal] = useState<any>(null);
  const [dailyGoals, setDailyGoals] = useState<any>(null);
  const [monthlyProspecting, setMonthlyProspecting] = useState({ done: 0, target: 0 });
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSalesGoal(),
      fetchDailyGoals(),
      fetchMonthlyProspecting(),
      fetchBadges()
    ]);
    setLoading(false);
  };

  const fetchSalesGoal = async () => {
    const { data } = await supabase
      .from("tendenci_seller_goals")
      .select(`
        *,
        tendenci_goal_progress(valor_vendido, percentual)
      `)
      .eq("vendedor_id", user?.id)
      .eq("status", "ativa")
      .single();

    if (data) {
      setSalesGoal({
        target: data.valor_meta,
        current: data.tendenci_goal_progress?.[0]?.valor_vendido || 0,
        percentage: data.tendenci_goal_progress?.[0]?.percentual || 0
      });
    }
  };

  const fetchDailyGoals = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("tendenci_daily_architect_goals")
      .select("*")
      .eq("vendedor_id", user?.id)
      .eq("data", today)
      .single();

    if (data) {
      setDailyGoals({
        target: data.meta_captacoes,
        done: data.captacoes_realizadas
      });
    }
  };

  const fetchMonthlyProspecting = async () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data } = await supabase
      .from("tendenci_daily_architect_goals")
      .select("meta_captacoes, captacoes_realizadas")
      .eq("vendedor_id", user?.id)
      .gte("data", firstDay)
      .lte("data", lastDay);

    if (data) {
      const target = data.reduce((sum, d) => sum + (d.meta_captacoes || 0), 0);
      const done = data.reduce((sum, d) => sum + (d.captacoes_realizadas || 0), 0);
      setMonthlyProspecting({ target, done });
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        Meu Desempenho
      </h3>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Metas de Vendas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Metas de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {salesGoal ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meta</span>
                  <span className="font-semibold">R$ {salesGoal.target.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Atingido</span>
                  <span className="font-semibold text-primary">R$ {salesGoal.current.toLocaleString()}</span>
                </div>
                <Progress value={salesGoal.percentage} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">{salesGoal.percentage.toFixed(1)}%</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Sem meta ativa</p>
            )}
          </CardContent>
        </Card>

        {/* Metas de Prospecção - Diária */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Meta Diária</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyGoals ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{dailyGoals.done}</span>
                  <span className="text-sm text-muted-foreground">/ {dailyGoals.target}</span>
                </div>
                <Progress value={(dailyGoals.done / dailyGoals.target) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">Captações hoje</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem meta configurada</p>
            )}
          </CardContent>
        </Card>

        {/* Metas de Prospecção - Mensal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Meta Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{monthlyProspecting.done}</span>
                <span className="text-sm text-muted-foreground">/ {monthlyProspecting.target}</span>
              </div>
              <Progress value={(monthlyProspecting.done / monthlyProspecting.target) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">Captações no mês</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
              <div className="flex flex-wrap gap-2">
                {getTodayBadges().slice(0, 1).map((badge, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    <Award className="h-3 w-3" />
                    Meta batida
                  </Badge>
                ))}
                {getTodayBadges().length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma insígnia hoje</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="week" className="mt-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {getWeekBadges().slice(0, 5).map((badge, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      <Award className="h-3 w-3" />
                      Dia {new Date(badge.earned_at).getDate()}
                    </Badge>
                  ))}
                  {getWeekBadges().length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma insígnia esta semana</p>
                  )}
                </div>
                
                {getWeekBadges().length >= 5 && (
                  <div className="pt-2 border-t">
                    <Badge variant="default" className="gap-1">
                      <Trophy className="h-4 w-4" />
                      Troféu da Semana
                    </Badge>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
