import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePlanGoals() {
  return useQuery({
    queryKey: ["plan-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_goals")
        .select("*, fin_cost_centers(name), prj_projects(title)")
        .order("period_start", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("plan_goals").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plan-goals"] }); toast.success("Meta criada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("plan_goals").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plan-goals"] }); toast.success("Meta atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePlanBudgets(month?: string) {
  return useQuery({
    queryKey: ["plan-budgets", month],
    queryFn: async () => {
      let q = supabase.from("plan_budgets").select("*, fin_cost_centers(name)").order("reference_month");
      if (month) q = q.eq("reference_month", month);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("plan_budgets").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plan-budgets"] }); toast.success("Orçamento criado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePlanScenarios() {
  return useQuery({
    queryKey: ["plan-scenarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plan_scenarios").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("plan_scenarios").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plan-scenarios"] }); toast.success("Cenário criado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("plan_scenarios").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plan-scenarios"] }); toast.success("Cenário atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });
}
