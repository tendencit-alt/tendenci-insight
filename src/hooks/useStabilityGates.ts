import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GateStatus = "green" | "yellow" | "red";

export interface StabilityGate {
  id: string;
  gate_code: string;
  gate_name: string;
  gate_description: string | null;
  gate_type: string;
  gate_status: GateStatus;
  is_blocking: boolean;
  last_reason: string | null;
  last_blocking_count: number;
  last_checked_at: string | null;
  created_at: string;
}

export interface GateEvaluation {
  id: string;
  gate_code: string;
  evaluation_result: GateStatus;
  evaluation_reason: string | null;
  blocking_detected: boolean;
  blocking_count: number;
  related_layer: string | null;
  related_release: string | null;
  evaluated_at: string;
}

export interface GatesSummary {
  total: number;
  green: number;
  yellow: number;
  red: number;
  blocking: number;
  last_evaluated_at: string | null;
  can_release: boolean;
}

export function useStabilityGates() {
  const qc = useQueryClient();

  const gatesQuery = useQuery({
    queryKey: ["stability_gates", "registry"],
    queryFn: async (): Promise<StabilityGate[]> => {
      const { data, error } = await supabase
        .from("stability_gate_registry")
        .select("*")
        .order("gate_code");
      if (error) throw error;
      return (data ?? []) as StabilityGate[];
    },
    refetchInterval: 60000,
  });

  const summaryQuery = useQuery({
    queryKey: ["stability_gates", "summary"],
    queryFn: async (): Promise<GatesSummary> => {
      const { data, error } = await supabase.rpc("stability_gates_summary");
      if (error) throw error;
      return data as unknown as GatesSummary;
    },
    refetchInterval: 60000,
  });

  const evaluationsQuery = useQuery({
    queryKey: ["stability_gates", "evaluations"],
    queryFn: async (): Promise<GateEvaluation[]> => {
      const { data, error } = await supabase
        .from("stability_gate_evaluations")
        .select("*")
        .order("evaluated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as GateEvaluation[];
    },
  });

  const evaluate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("evaluate_stability_gates");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Gates re-avaliados");
      qc.invalidateQueries({ queryKey: ["stability_gates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    gates: gatesQuery.data ?? [],
    summary: summaryQuery.data,
    evaluations: evaluationsQuery.data ?? [],
    isLoading: gatesQuery.isLoading || summaryQuery.isLoading,
    evaluate,
  };
}
