import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GoalStatus {
  hasActiveSellerGoal: boolean;
  hasActiveCompanyGoal: boolean;
  currentMonth: string;
  sellerGoal: {
    id: string | null;
    target: number;
    current: number;
    percentage: number;
  } | null;
  companyGoal: {
    id: string | null;
    target: number;
    current: number;
    percentage: number;
  } | null;
  loading: boolean;
  sellersWithoutGoals: number;
}

export function useGoalStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<GoalStatus>({
    hasActiveSellerGoal: false,
    hasActiveCompanyGoal: false,
    currentMonth: "",
    sellerGoal: null,
    companyGoal: null,
    loading: true,
    sellersWithoutGoals: 0,
  });

  useEffect(() => {
    if (user) {
      fetchGoalStatus();
    }
  }, [user]);

  const fetchGoalStatus = async () => {
    try {
      // Buscar status de metas usando a nova RPC
      const { data, error } = await supabase.rpc("get_current_goals_status" as any, {
        p_user_id: user?.id,
      });

      if (error) {
        console.error("Erro ao buscar status de metas:", error);
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const result = data?.[0] || data;

      // Buscar vendedores sem meta (para admins)
      const { data: sellersData } = await supabase.rpc("get_sellers_without_goals" as any);
      const sellersCount = sellersData?.length || 0;

      setStatus({
        hasActiveSellerGoal: result?.has_active_seller_goal || false,
        hasActiveCompanyGoal: result?.has_active_company_goal || false,
        currentMonth: result?.current_month || "",
        sellerGoal: result?.seller_goal_id ? {
          id: result.seller_goal_id,
          target: Number(result.seller_goal_target) || 0,
          current: Number(result.seller_goal_current) || 0,
          percentage: Number(result.seller_goal_percentage) || 0,
        } : null,
        companyGoal: result?.company_goal_id ? {
          id: result.company_goal_id,
          target: Number(result.company_goal_target) || 0,
          current: Number(result.company_goal_current) || 0,
          percentage: Number(result.company_goal_percentage) || 0,
        } : null,
        loading: false,
        sellersWithoutGoals: sellersCount,
      });
    } catch (error) {
      console.error("Erro ao buscar status de metas:", error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const refetch = () => {
    if (user) {
      fetchGoalStatus();
    }
  };

  return { ...status, refetch };
}