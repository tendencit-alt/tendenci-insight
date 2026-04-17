import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export function useBillingOpsOverview() {
  return useQuery({
    queryKey: ["billing-ops", "overview"],
    queryFn: async () => {
      const { data, error } = await sb.rpc("get_billing_ops_overview");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBillingKpis() {
  return useQuery({
    queryKey: ["billing-ops", "kpis"],
    queryFn: async () => {
      const { data, error } = await sb.rpc("get_billing_analytics_kpis");
      if (error) throw error;
      return data ?? {};
    },
  });
}

export function useDunningSteps() {
  return useQuery({
    queryKey: ["billing-ops", "dunning"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("billing_dunning_steps")
        .select("*, tenants(name), invoices(total, due_date)")
        .order("triggered_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpgradeSignals() {
  return useQuery({
    queryKey: ["billing-ops", "upgrade-signals"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("upgrade_signals")
        .select("*, tenants(name), current_plan:tenant_plans!upgrade_signals_current_plan_id_fkey(name)")
        .eq("status", "open")
        .order("priority", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePlanVersions(planId?: string) {
  return useQuery({
    queryKey: ["billing-ops", "plan-versions", planId],
    queryFn: async () => {
      if (!planId) return [];
      const { data, error } = await sb
        .from("plan_versions")
        .select("*")
        .eq("plan_id", planId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!planId,
  });
}

export function useSubscriptionActionsLog(tenantId?: string) {
  return useQuery({
    queryKey: ["billing-ops", "actions-log", tenantId ?? "all"],
    queryFn: async () => {
      let q = sb.from("subscription_actions_log").select("*, tenants(name)").order("created_at", { ascending: false }).limit(100);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDetectDunning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await sb.rpc("detect_billing_dunning");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast.success(`${count} novos passos de cobrança detectados`);
      qc.invalidateQueries({ queryKey: ["billing-ops"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDetectUpgradeSignals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await sb.rpc("detect_upgrade_signals");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast.success(`${count} novos sinais de upgrade detectados`);
      qc.invalidateQueries({ queryKey: ["billing-ops"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGenerateUpgradePitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (signalId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-upgrade-pitch", { body: { signalId } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Pitch gerado");
      qc.invalidateQueries({ queryKey: ["billing-ops", "upgrade-signals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSubscriptionAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      tenant_id: string;
      subscription_id?: string;
      action_type: string;
      reason: string;
      new_plan_id?: string;
      discount?: { type: "percent" | "fixed" | "free_period"; value: number; ends_at?: string };
    }) => {
      const { data, error } = await supabase.functions.invoke("billing-ops-action", { body: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ação executada");
      qc.invalidateQueries({ queryKey: ["billing-ops"] });
      qc.invalidateQueries({ queryKey: ["billing-subscriptions"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro na ação"),
  });
}

export function useExecuteDunningStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ stepId, action }: { stepId: string; action: "execute" | "cancel" | "resolve" }) => {
      const newStatus = action === "execute" ? "executed" : action === "cancel" ? "cancelled" : "resolved";
      const { error } = await sb
        .from("billing_dunning_steps")
        .update({ status: newStatus, executed_at: action === "execute" ? new Date().toISOString() : null })
        .eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Passo atualizado");
      qc.invalidateQueries({ queryKey: ["billing-ops", "dunning"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDismissUpgradeSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("upgrade_signals").update({ status: "dismissed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-ops", "upgrade-signals"] });
    },
  });
}
