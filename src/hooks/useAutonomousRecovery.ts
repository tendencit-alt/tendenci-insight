import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecoveryPolicy {
  id: string;
  policy_code: string;
  policy_name: string;
  policy_description: string | null;
  policy_type: string;
  recovery_scope: string;
  is_auto_execute: boolean;
  requires_owner_approval: boolean;
  is_enabled: boolean;
  cooldown_minutes: number;
  last_executed_at: string | null;
  last_result: string | null;
  created_at: string;
}

export interface RecoveryHistory {
  id: string;
  policy_code: string;
  target_layer: string | null;
  execution_mode: string;
  execution_result: string;
  execution_reason: string | null;
  execution_logs: any;
  duration_ms: number | null;
  executed_at: string;
}

export interface RecoverySummary {
  executed_today: number;
  success_today: number;
  failed_today: number;
  auto_policies: number;
  pending_approval: number;
  total_policies: number;
  last_run_at: string | null;
}

export function useAutonomousRecovery() {
  const qc = useQueryClient();

  const policies = useQuery({
    queryKey: ["recovery_layer", "policies"],
    queryFn: async (): Promise<RecoveryPolicy[]> => {
      const { data, error } = await supabase
        .from("recovery_policy_registry")
        .select("*")
        .order("policy_code");
      if (error) throw error;
      return (data ?? []) as RecoveryPolicy[];
    },
    refetchInterval: 60000,
  });

  const summary = useQuery({
    queryKey: ["recovery_layer", "summary"],
    queryFn: async (): Promise<RecoverySummary> => {
      const { data, error } = await supabase.rpc("recovery_layer_summary");
      if (error) throw error;
      return data as unknown as RecoverySummary;
    },
    refetchInterval: 60000,
  });

  const history = useQuery({
    queryKey: ["recovery_layer", "history"],
    queryFn: async (): Promise<RecoveryHistory[]> => {
      const { data, error } = await supabase
        .from("recovery_execution_history")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as RecoveryHistory[];
    },
    refetchInterval: 60000,
  });

  const executePolicy = useMutation({
    mutationFn: async (policy_code: string) => {
      const { data, error } = await supabase.rpc("execute_recovery_policy", {
        p_policy_code: policy_code,
        p_mode: "manual",
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      const result = data?.result;
      const reason = data?.reason ?? "";
      if (result === "success") toast.success(`Recovery executado: ${reason}`);
      else if (data?.error) toast.error(`Recovery bloqueado: ${data.error}`);
      else toast.error(`Recovery falhou: ${reason}`);
      qc.invalidateQueries({ queryKey: ["recovery_layer"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runSweep = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("run_autonomous_recovery_sweep");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Sweep autônomo executado");
      qc.invalidateQueries({ queryKey: ["recovery_layer"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    policies: policies.data ?? [],
    summary: summary.data,
    history: history.data ?? [],
    isLoading: policies.isLoading || summary.isLoading,
    executePolicy,
    runSweep,
  };
}
