import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModuleNode {
  id: string;
  code: string;
  name: string;
  module_group: string;
  is_active: boolean;
  description: string | null;
}

export interface IntegrationEdge {
  id: string;
  source_module_code: string;
  target_module_code: string;
  integration_type: string;
  criticality: "high" | "medium" | "low";
  expected_interval_minutes: number;
  is_required: boolean;
  description: string | null;
}

export interface HealthSnapshot {
  source_module_code: string;
  target_module_code: string;
  current_status: "green" | "yellow" | "red" | "gray";
  last_success_at: string | null;
  last_error_at: string | null;
  last_event_at: string | null;
  delay_minutes: number | null;
  health_score: number;
  events_24h: number;
  errors_24h: number;
}

export interface IntegrationOverview {
  total: number;
  green: number;
  yellow: number;
  red: number;
  gray: number;
  healthy_pct: number;
  critical_red: number;
  last_systemic_error: string | null;
}

export function useIntegrationMap() {
  return useQuery({
    queryKey: ["integration-map"],
    queryFn: async () => {
      const [modulesRes, edgesRes, snapshotsRes, overviewRes] = await Promise.all([
        supabase.from("system_modules" as any).select("*").eq("is_active", true).order("module_group"),
        supabase.from("system_module_integrations" as any).select("*"),
        supabase.from("integration_health_snapshots" as any).select("*"),
        supabase.rpc("get_integration_map_overview" as any),
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (edgesRes.error) throw edgesRes.error;
      if (snapshotsRes.error) throw snapshotsRes.error;

      return {
        modules: (modulesRes.data ?? []) as unknown as ModuleNode[],
        edges: (edgesRes.data ?? []) as unknown as IntegrationEdge[],
        snapshots: (snapshotsRes.data ?? []) as unknown as HealthSnapshot[],
        overview: (overviewRes.data ?? null) as unknown as IntegrationOverview | null,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useModuleDetail(moduleCode: string | null) {
  return useQuery({
    queryKey: ["integration-module-detail", moduleCode],
    enabled: !!moduleCode,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_module_integration_detail" as any, {
        p_module_code: moduleCode!,
      });
      if (error) throw error;
      return data as any;
    },
  });
}

export function useReconcileIntegrationHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("reconcile-integration-health");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-map"] });
    },
  });
}
