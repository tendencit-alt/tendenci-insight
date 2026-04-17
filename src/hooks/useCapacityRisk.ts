import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CapacityScore {
  target_type: string;
  target_code: string;
  capacity_risk_score: number;
  severity_band: "critical" | "high" | "medium" | "low";
  recommended_action: string | null;
  contributing_factors: any;
  updated_at: string;
}

export interface CapacitySignal {
  id: string;
  target_type: string;
  target_code: string;
  signal_type: string;
  signal_value: number;
  baseline_value: number;
  deviation_percent: number;
  created_at: string;
}

export interface QueueSnapshot {
  id: string;
  queue_code: string;
  queue_depth: number;
  oldest_job_age_minutes: number;
  processing_rate: number;
  failure_rate: number;
  captured_at: string;
}

export interface JobSaturation {
  id: string;
  job_code: string;
  avg_duration_ms: number;
  p95_duration_ms: number;
  run_frequency: number;
  failure_rate: number;
  captured_at: string;
}

export interface TenantLoad {
  id: string;
  tenant_id: string | null;
  tenant_label: string | null;
  job_count: number;
  retry_count: number;
  automation_count: number;
  load_share_percent: number;
  captured_at: string;
}

export interface CapacityActionLog {
  id: string;
  target_type: string;
  target_code: string;
  action_code: string;
  execution_mode: string;
  result: string;
  reason: string | null;
  created_at: string;
}

export interface CapacitySummary {
  total_targets_scored: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  modules: number;
  queues: number;
  tenants: number;
  signals_24h: number;
  preventive_actions_24h: number;
  last_sweep: string | null;
}

export function useCapacityRisk() {
  const qc = useQueryClient();

  const summary = useQuery({
    queryKey: ["capacity_layer", "summary"],
    queryFn: async (): Promise<CapacitySummary> => {
      const { data, error } = await supabase.rpc("capacity_layer_summary");
      if (error) throw error;
      return data as unknown as CapacitySummary;
    },
    refetchInterval: 60000,
  });

  const topRisks = useQuery({
    queryKey: ["capacity_layer", "top_risks"],
    queryFn: async (): Promise<CapacityScore[]> => {
      const { data, error } = await supabase.rpc("capacity_top_risks", { p_limit: 30 });
      if (error) throw error;
      return (data ?? []) as CapacityScore[];
    },
    refetchInterval: 60000,
  });

  const signals = useQuery({
    queryKey: ["capacity_layer", "signals"],
    queryFn: async (): Promise<CapacitySignal[]> => {
      const { data, error } = await supabase
        .from("capacity_risk_signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CapacitySignal[];
    },
  });

  const queues = useQuery({
    queryKey: ["capacity_layer", "queues"],
    queryFn: async (): Promise<QueueSnapshot[]> => {
      const { data, error } = await supabase
        .from("queue_pressure_snapshots")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as QueueSnapshot[];
    },
  });

  const jobs = useQuery({
    queryKey: ["capacity_layer", "jobs"],
    queryFn: async (): Promise<JobSaturation[]> => {
      const { data, error } = await supabase
        .from("job_saturation_snapshots")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as JobSaturation[];
    },
  });

  const tenants = useQuery({
    queryKey: ["capacity_layer", "tenants"],
    queryFn: async (): Promise<TenantLoad[]> => {
      const { data, error } = await supabase
        .from("tenant_load_distribution")
        .select("*")
        .order("load_share_percent", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as TenantLoad[];
    },
  });

  const actionLogs = useQuery({
    queryKey: ["capacity_layer", "action_logs"],
    queryFn: async (): Promise<CapacityActionLog[]> => {
      const { data, error } = await supabase
        .from("capacity_preventive_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CapacityActionLog[];
    },
  });

  const runSweep = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("run_capacity_sweep");
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      toast.success(
        `Sweep capacity: ${data?.signals_detected ?? 0} sinais, ${data?.scores_updated ?? 0} scores atualizados`,
      );
      qc.invalidateQueries({ queryKey: ["capacity_layer"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const executeAction = useMutation({
    mutationFn: async (params: { target_type: string; target_code: string; action_code: string }) => {
      const { data, error } = await supabase.rpc("execute_capacity_action", {
        p_target_type: params.target_type,
        p_target_code: params.target_code,
        p_action_code: params.action_code,
        p_mode: "manual",
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      const result = data?.result;
      const reason = data?.reason ?? "";
      if (result === "success") toast.success(`Ação capacity: ${reason}`);
      else toast.error(`Falhou: ${reason}`);
      qc.invalidateQueries({ queryKey: ["capacity_layer"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    summary: summary.data,
    topRisks: topRisks.data ?? [],
    signals: signals.data ?? [],
    queues: queues.data ?? [],
    jobs: jobs.data ?? [],
    tenants: tenants.data ?? [],
    actionLogs: actionLogs.data ?? [],
    isLoading: summary.isLoading || topRisks.isLoading,
    runSweep,
    executeAction,
  };
}
