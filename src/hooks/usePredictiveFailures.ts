import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FailureScore {
  id: string;
  target_code: string;
  target_type: string;
  failure_probability_score: number;
  severity_band: "critical" | "high" | "medium" | "low";
  recommended_preventive_action: string | null;
  contributing_factors: any;
  updated_at: string;
}

export interface RiskSignal {
  id: string;
  module_code: string;
  signal_type: string;
  signal_value: number;
  baseline_value: number;
  deviation_percent: number;
  created_at: string;
}

export interface Anomaly {
  id: string;
  target_type: string;
  target_code: string;
  anomaly_type: string;
  severity: string;
  confidence_score: number;
  description: string | null;
  detected_at: string;
}

export interface DriftSnapshot {
  id: string;
  target_code: string;
  metric_name: string;
  trend_direction: "degrading" | "improving" | "stable";
  trend_strength: number;
  current_value: number | null;
  baseline_value: number | null;
  created_at: string;
}

export interface PreventiveActionLog {
  id: string;
  target_code: string;
  action_code: string;
  execution_mode: string;
  result: string;
  reason: string | null;
  created_at: string;
}

export interface PredictiveSummary {
  total_modules_scored: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  signals_24h: number;
  anomalies_24h: number;
  drifts_degrading: number;
  preventive_actions_24h: number;
  last_sweep: string | null;
}

export function usePredictiveFailures() {
  const qc = useQueryClient();

  const summary = useQuery({
    queryKey: ["predictive_layer", "summary"],
    queryFn: async (): Promise<PredictiveSummary> => {
      const { data, error } = await supabase.rpc("predictive_layer_summary");
      if (error) throw error;
      return data as unknown as PredictiveSummary;
    },
    refetchInterval: 60000,
  });

  const topRisks = useQuery({
    queryKey: ["predictive_layer", "top_risks"],
    queryFn: async (): Promise<FailureScore[]> => {
      const { data, error } = await supabase.rpc("predictive_top_risks", { p_limit: 25 });
      if (error) throw error;
      return (data ?? []) as FailureScore[];
    },
    refetchInterval: 60000,
  });

  const signals = useQuery({
    queryKey: ["predictive_layer", "signals"],
    queryFn: async (): Promise<RiskSignal[]> => {
      const { data, error } = await supabase
        .from("predictive_risk_signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as RiskSignal[];
    },
  });

  const anomalies = useQuery({
    queryKey: ["predictive_layer", "anomalies"],
    queryFn: async (): Promise<Anomaly[]> => {
      const { data, error } = await supabase
        .from("predictive_anomalies")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Anomaly[];
    },
  });

  const drifts = useQuery({
    queryKey: ["predictive_layer", "drifts"],
    queryFn: async (): Promise<DriftSnapshot[]> => {
      const { data, error } = await supabase
        .from("predictive_drift_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as DriftSnapshot[];
    },
  });

  const preventiveLogs = useQuery({
    queryKey: ["predictive_layer", "preventive_logs"],
    queryFn: async (): Promise<PreventiveActionLog[]> => {
      const { data, error } = await supabase
        .from("preventive_action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PreventiveActionLog[];
    },
  });

  const runSweep = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("run_predictive_sweep");
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      toast.success(
        `Sweep preditivo: ${data?.signals_detected ?? 0} sinais, ${data?.anomalies_detected ?? 0} anomalias, ${data?.scores_updated ?? 0} scores`,
      );
      qc.invalidateQueries({ queryKey: ["predictive_layer"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const executePreventiveAction = useMutation({
    mutationFn: async (params: { target_code: string; action_code: string }) => {
      const { data, error } = await supabase.rpc("execute_preventive_action", {
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
      if (result === "success") toast.success(`Ação preventiva: ${reason}`);
      else toast.error(`Falhou: ${reason}`);
      qc.invalidateQueries({ queryKey: ["predictive_layer"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    summary: summary.data,
    topRisks: topRisks.data ?? [],
    signals: signals.data ?? [],
    anomalies: anomalies.data ?? [],
    drifts: drifts.data ?? [],
    preventiveLogs: preventiveLogs.data ?? [],
    isLoading: summary.isLoading || topRisks.isLoading,
    runSweep,
    executePreventiveAction,
  };
}
