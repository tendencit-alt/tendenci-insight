import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, Users, Target, Award } from "lucide-react";
import { CreateSellerGoalDialog } from "@/components/goals/CreateSellerGoalDialog";
import { CreateCompanyGoalDialog } from "@/components/goals/CreateCompanyGoalDialog";
import { GoalsTable } from "@/components/goals/GoalsTable";
import { GoalsAnalytics } from "@/components/goals/GoalsAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

export default function GoalsManagement() {
  const { isMaster } = usePermissions();
  const { user } = useAuth();
  const [showSellerDialog, setShowSellerDialog] = useState(false);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({
    totalSellers: 0,
    activeGoals: 0,
    avgProgress: 0,
    completedGoals: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      if (isMaster) {
        // Masters veem estatísticas de todos
        const { count: totalSellers } = await supabase
          .from("tendenci_seller_goals" as any)
          .select("vendedor_id", { count: "exact", head: true })
          .eq("status", "ativa");

        const { count: activeGoals } = await supabase
          .from("tendenci_seller_goals" as any)
          .select("*", { count: "exact", head: true })
          .eq("status", "ativa");

        const { count: completedGoals } = await supabase
          .from("tendenci_seller_goals" as any)
          .select("*", { count: "exact", head: true })
          .eq("status", "concluída");

        const { data: progressData } = await supabase
          .from("tendenci_goal_progress" as any)
          .select("percentual");

        const avgProgress =
          progressData && progressData.length > 0
            ? progressData.reduce((sum: number, p: any) => sum + (p.percentual || 0), 0) / progressData.length
            : 0;

        setStats({
          totalSellers: totalSellers || 0,
          activeGoals: activeGoals || 0,
          avgProgress: Math.round(avgProgress),
          completedGoals: completedGoals || 0,
        });
      } else {
        // Vendedores veem apenas suas próprias estatísticas
        const { count: activeGoals } = await supabase
          .from("tendenci_seller_goals" as any)
          .select("*", { count: "exact", head: true })
          .eq("vendedor_id", user?.id)
          .eq("status", "ativa");

        const { count: completedGoals } = await supabase
          .from("tendenci_seller_goals" as any)
          .select("*", { count: "exact", head: true })
          .eq("vendedor_id", user?.id)
          .eq("status", "concluída");

        // Buscar IDs das metas do vendedor
        const { data: sellerGoals } = await supabase
          .from("tendenci_seller_goals" as any)
          .select("id")
          .eq("vendedor_id", user?.id);

        const goalIds = sellerGoals?.map((g: any) => g.id) || [];

        // Buscar progresso apenas das metas do vendedor
        const { data: progressData } = await supabase
          .from("tendenci_goal_progress" as any)
          .select("percentual")
          .in("seller_goal_id", goalIds);

        const avgProgress =
          progressData && progressData.length > 0
            ? progressData.reduce((sum: number, p: any) => sum + (p.percentual || 0), 0) / progressData.length
            : 0;

        setStats({
          totalSellers: 0,
          activeGoals: activeGoals || 0,
          avgProgress: Math.round(avgProgress),
          completedGoals: completedGoals || 0,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{isMaster ? "Gestão de Metas" : "Minhas Metas"}</h1>
            <p className="text-muted-foreground">
              {isMaster ? "Gerencie metas individuais e consolidadas" : "Acompanhe suas metas e progresso"}
            </p>
          </div>
          {isMaster && (
            <div className="flex gap-2">
              <Button onClick={() => setShowSellerDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Meta Individual
              </Button>
              <Button onClick={() => setShowCompanyDialog(true)} variant="secondary">
                <Plus className="mr-2 h-4 w-4" />
                Meta da Empresa
              </Button>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          {isMaster && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendedores com Metas</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSellers}</div>
                <p className="text-xs text-muted-foreground">Ativos no sistema</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Metas Ativas</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeGoals}</div>
              <p className="text-xs text-muted-foreground">{isMaster ? "Em andamento" : "Suas metas ativas"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progresso {isMaster ? "Médio" : ""}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgProgress}%</div>
              <p className="text-xs text-muted-foreground">{isMaster ? "Da equipe" : "Seu progresso"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Metas Concluídas</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedGoals}</div>
              <p className="text-xs text-muted-foreground">{isMaster ? "Total histórico" : "Suas conquistas"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs com conteúdo */}
        <Tabs defaultValue={isMaster ? "seller" : "company"} className="space-y-4">
          <TabsList>
            {isMaster && <TabsTrigger value="seller">Metas Individuais</TabsTrigger>}
            <TabsTrigger value="company">Meta da Empresa</TabsTrigger>
            <TabsTrigger value="analytics">{isMaster ? "Análise Avançada" : "Meu Desempenho"}</TabsTrigger>
          </TabsList>

          {isMaster && (
            <TabsContent value="seller" className="space-y-4">
              <GoalsTable type="seller" refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
            </TabsContent>
          )}

          <TabsContent value="company" className="space-y-4">
            <GoalsTable type="company" refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <GoalsAnalytics refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>

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
      </div>
    </DashboardLayout>
  );
}
