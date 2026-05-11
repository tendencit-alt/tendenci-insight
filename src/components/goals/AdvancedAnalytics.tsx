import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Users, Target, Award, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdvancedAnalytics({ refreshTrigger }: { refreshTrigger: number }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>({
    totalSellers: 0,
    activeSellers: 0,
    totalGoals: 0,
    activeGoals: 0,
    completedGoals: 0,
    canceledGoals: 0,
    avgProgress: 0,
    sellersAboveAvg: 0,
    sellersBelowAvg: 0,
    sellersMetGoal: 0,
    totalSalesValue: 0,
    totalArchitects: 0,
    totalProjects: 0,
    companyGoalProgress: null,
    topPerformers: [],
    needsAttention: [],
  });

  useEffect(() => {
    fetchAnalytics();
  }, [refreshTrigger]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Buscar todos os vendedores
      const { data: sellers, error: sellersError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("role", "vendedor");

      if (sellersError) throw sellersError;

      // Buscar metas individuais ativas
      const { data: sellerGoals, error: goalsError } = await supabase
        .from("tendenci_seller_goals" as any)
        .select(`
          *,
          profiles:vendedor_id (full_name),
          tendenci_goal_progress (valor_vendido, percentual, quantidade_alcancada)
        `)
        .eq("status", "ativa");

      if (goalsError) throw goalsError;

      // Buscar todas as metas (para estatísticas gerais)
      const { data: allGoals } = await supabase
        .from("tendenci_seller_goals" as any)
        .select("status");

      // Buscar meta da empresa ativa
      const { data: companyGoals } = await supabase
        .from("tendenci_company_goals" as any)
        .select(`
          *,
          tendenci_goal_progress (valor_vendido, percentual, quantidade_alcancada)
        `)
        .eq("status", "ativa")
        .order("created_at", { ascending: false })
        .limit(1);

      // Calcular métricas
      const progressValues = (sellerGoals || [])
        .map((g: any) => g.tendenci_goal_progress?.[0]?.percentual || 0);
      
      const avgProgress = progressValues.length > 0
        ? progressValues.reduce((a: number, b: number) => a + b, 0) / progressValues.length
        : 0;

      const sellersAboveAvg = progressValues.filter((p: number) => p >= avgProgress).length;
      const sellersBelowAvg = progressValues.filter((p: number) => p < avgProgress).length;
      const sellersMetGoal = progressValues.filter((p: number) => p >= 100).length;

      // Total de vendas, parceiros profissionais e projetos
      const totalSalesValue = (sellerGoals || [])
        .filter((g: any) => g.tipo_meta === "vendas")
        .reduce((sum: number, g: any) => sum + (g.tendenci_goal_progress?.[0]?.valor_vendido || 0), 0);

      const totalArchitects = (sellerGoals || [])
        .filter((g: any) => g.tipo_meta === "captacao")
        .reduce((sum: number, g: any) => sum + (g.tendenci_goal_progress?.[0]?.quantidade_alcancada || 0), 0);

      const totalProjects = (sellerGoals || [])
        .filter((g: any) => g.tipo_meta === "efetivacao")
        .reduce((sum: number, g: any) => sum + (g.tendenci_goal_progress?.[0]?.quantidade_alcancada || 0), 0);

      // Top performers (acima de 80%)
      const topPerformers = (sellerGoals || [])
        .filter((g: any) => (g.tendenci_goal_progress?.[0]?.percentual || 0) >= 80)
        .sort((a: any, b: any) => 
          (b.tendenci_goal_progress?.[0]?.percentual || 0) - (a.tendenci_goal_progress?.[0]?.percentual || 0)
        )
        .slice(0, 5);

      // Precisa de atenção (abaixo de 50%)
      const needsAttention = (sellerGoals || [])
        .filter((g: any) => (g.tendenci_goal_progress?.[0]?.percentual || 0) < 50)
        .sort((a: any, b: any) => 
          (a.tendenci_goal_progress?.[0]?.percentual || 0) - (b.tendenci_goal_progress?.[0]?.percentual || 0)
        )
        .slice(0, 5);

      setAnalytics({
        totalSellers: sellers?.length || 0,
        activeSellers: (sellerGoals || []).length,
        totalGoals: allGoals?.length || 0,
        activeGoals: (sellerGoals || []).length,
        completedGoals: allGoals?.filter((g: any) => g.status === "concluida").length || 0,
        canceledGoals: allGoals?.filter((g: any) => g.status === "cancelada").length || 0,
        avgProgress,
        sellersAboveAvg,
        sellersBelowAvg,
        sellersMetGoal,
        totalSalesValue,
        totalArchitects,
        totalProjects,
        companyGoalProgress: companyGoals?.[0] || null,
        topPerformers,
        needsAttention,
      });
    } catch (error) {
      console.error("Erro ao buscar analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Carregando análises...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendedores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSellers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeSellers} com metas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Ativas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeGoals}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedGoals} concluídas | {analytics.canceledGoals} canceladas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
            {analytics.avgProgress >= 70 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgProgress.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.sellersAboveAvg} acima | {analytics.sellersBelowAvg} abaixo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Alcançadas</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.sellersMetGoal}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeGoals > 0 
                ? ((analytics.sellersMetGoal / analytics.activeGoals) * 100).toFixed(1) 
                : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Performance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total em Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalSalesValue.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
            <p className="text-xs text-muted-foreground">Acumulado no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Parceiros Profissionais Captados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalArchitects}</div>
            <p className="text-xs text-muted-foreground">Total captado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Projetos Efetivados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalProjects}</div>
            <p className="text-xs text-muted-foreground">Total efetivado</p>
          </CardContent>
        </Card>
      </div>

      {/* Meta da Empresa */}
      {analytics.companyGoalProgress && (
        <Card>
          <CardHeader>
            <CardTitle>Meta Consolidada da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Meta</p>
                <Badge variant="outline">
                  {analytics.companyGoalProgress.tipo_meta === "vendas" 
                    ? "Vendas" 
                    : analytics.companyGoalProgress.tipo_meta === "captacao"
                    ? "Captação"
                    : "Efetivação"}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={
                    analytics.companyGoalProgress.status === "ativa"
                      ? "default"
                      : analytics.companyGoalProgress.status === "concluida"
                      ? "outline"
                      : "destructive"
                  }
                >
                  {analytics.companyGoalProgress.status}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso</span>
                <span className="font-bold">
                  {analytics.companyGoalProgress.tendenci_goal_progress?.[0]?.percentual?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(analytics.companyGoalProgress.tendenci_goal_progress?.[0]?.percentual || 0, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Meta</p>
                <p className="text-lg font-bold">
                  {analytics.companyGoalProgress.tipo_meta === "vendas"
                    ? analytics.companyGoalProgress.valor_meta_total?.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : `${analytics.companyGoalProgress.quantidade_meta} ${
                        analytics.companyGoalProgress.tipo_meta === "captacao" ? "parceiros profissionais" : "projetos"
                      }`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alcançado</p>
                <p className="text-lg font-bold">
                  {analytics.companyGoalProgress.tipo_meta === "vendas"
                    ? (analytics.companyGoalProgress.tendenci_goal_progress?.[0]?.valor_vendido || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : `${analytics.companyGoalProgress.tendenci_goal_progress?.[0]?.quantidade_alcancada || 0} ${
                        analytics.companyGoalProgress.tipo_meta === "captacao" ? "parceiros profissionais" : "projetos"
                      }`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers e Precisa de Atenção */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-success" />
              Top Performers (≥80%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topPerformers.length > 0 ? (
              <div className="space-y-3">
                {analytics.topPerformers.map((goal: any) => (
                  <div key={goal.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{goal.profiles?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {goal.tipo_meta === "vendas" ? "Vendas" : goal.tipo_meta === "captacao" ? "Captação" : "Efetivação"}
                      </p>
                    </div>
                    <Badge variant="default">
                      {goal.tendenci_goal_progress?.[0]?.percentual?.toFixed(1) || 0}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum vendedor acima de 80%
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Precisa de Atenção (&lt;50%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.needsAttention.length > 0 ? (
              <div className="space-y-3">
                {analytics.needsAttention.map((goal: any) => (
                  <div key={goal.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{goal.profiles?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {goal.tipo_meta === "vendas" ? "Vendas" : goal.tipo_meta === "captacao" ? "Captação" : "Efetivação"}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {goal.tendenci_goal_progress?.[0]?.percentual?.toFixed(1) || 0}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todos vendedores acima de 50%
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
