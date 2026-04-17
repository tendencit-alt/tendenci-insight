import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PriorityLevel = "critical" | "high" | "medium" | "low";

export interface ExecutionPriorityRow {
  id: string;
  layer_code: string;
  impact_score: number;
  dependency_score: number;
  incident_score: number;
  visibility_score: number;
  integration_score: number;
  completion_score: number;
  execution_priority_index: number;
  priority_level: PriorityLevel;
  priority_reason: string | null;
  dependency_count: number;
  impacted_count: number;
  incident_count: number;
  updated_at: string;
}

export interface ExecutionPrioritySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  blocking_hubs: number;
  incomplete: number;
  no_integration: number;
  invisible_menu: number;
  no_route: number;
  last_recalculated_at: string | null;
}

export function useExecutionPriority() {
  const qc = useQueryClient();

  const rowsQuery = useQuery({
    queryKey: ["execution_priority", "rows"],
    queryFn: async (): Promise<ExecutionPriorityRow[]> => {
      const { data, error } = await supabase
        .from("execution_priority_registry")
        .select("*")
        .order("execution_priority_index", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExecutionPriorityRow[];
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["execution_priority", "summary"],
    queryFn: async (): Promise<ExecutionPrioritySummary> => {
      const { data, error } = await supabase.rpc("execution_priority_summary");
      if (error) throw error;
      return data as unknown as ExecutionPrioritySummary;
    },
  });

  const recompute = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("recompute_execution_priorities");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast.success(`Prioridades recalculadas (${count} camadas)`);
      qc.invalidateQueries({ queryKey: ["execution_priority"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    rows: rowsQuery.data ?? [],
    summary: summaryQuery.data,
    isLoading: rowsQuery.isLoading || summaryQuery.isLoading,
    recompute,
  };
}
