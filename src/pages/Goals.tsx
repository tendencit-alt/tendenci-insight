import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SellerDashboard } from "@/components/goals/seller/SellerDashboard";
import { useGoalStatus } from "@/hooks/useGoalStatus";

interface GoalData {
  meta_ativa: {
    id: string;
    valor_meta: number;
    data_inicio: string;
    data_fim: string;
    descricao: string;
    valor_vendido: number;
    percentual: number;
  } | null;
  ranking: {
    posicao: number;
    total_vendedores: number;
  } | null;
  insignias: Array<{
    type: string;
    earned_at: string;
    percentual: number;
  }> | null;
}

export default function Goals() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const goalStatus = useGoalStatus();
  const [loading, setLoading] = useState(true);
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [companyGoal, setCompanyGoal] = useState<any>(null);
  const [teamAverage, setTeamAverage] = useState<number>(0);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    // Redirecionar admins para página de gestão
    if (isAdmin) {
      navigate('/metas/gestao');
      return;
    }
    
    if (user) {
      fetchGoalData();
      fetchCompanyGoal();
      fetchTeamAverage();
    }
  }, [user, isAdmin, navigate]);

  const fetchGoalData = async () => {
    try {
      const { data, error } = await supabase.rpc("get_seller_goal_stats" as any, {
        p_vendedor_id: user?.id,
      });

      if (error) throw error;
      setGoalData(data as unknown as GoalData);
    } catch (error) {
      console.error("Erro ao buscar dados da meta:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyGoal = async () => {
    try {
      const now = new Date().toISOString();
      const { data: goals, error } = await supabase
        .from("tendenci_company_goals" as any)
        .select("*, tendenci_goal_progress(*)")
        .eq("status", "ativa")
        .lte("data_inicio", now)
        .gte("data_fim", now)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      if (goals && goals.length > 0) {
        setCompanyGoal(goals[0]);
      } else {
        setCompanyGoal(null);
      }
    } catch (error) {
      console.error("Erro ao buscar meta da empresa:", error);
      setCompanyGoal(null);
    }
  };

  const fetchTeamAverage = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("tendenci_seller_ranking" as any)
        .select("percentual_meta_atualizado, periodo_inicio, periodo_fim")
        .lte("periodo_inicio", now)
        .gte("periodo_fim", now);

      if (error) throw error;
      if (data && data.length > 0) {
        const avg = data.reduce((acc: number, curr: any) => acc + (curr.percentual_meta_atualizado || 0), 0) / data.length;
        setTeamAverage(avg);
      } else {
        setTeamAverage(0);
      }
    } catch (error) {
      console.error("Erro ao buscar média da equipe:", error);
      setTeamAverage(0);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregando suas metas...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground">Acompanhe seu desempenho e conquistas</p>
        </div>

        <SellerDashboard 
          userName={profile?.full_name || user?.email || "Vendedor"}
          userAvatar={profile?.avatar_url}
          goalData={goalData}
          companyGoal={companyGoal}
          teamAverage={teamAverage}
          goalStatus={goalStatus}
        />
      </div>
    </DashboardLayout>
  );
}
