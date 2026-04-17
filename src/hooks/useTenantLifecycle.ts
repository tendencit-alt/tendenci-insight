import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

export interface LifecycleOverviewRow {
  tenant_id: string;
  tenant_name: string;
  activation_score: number;
  engagement_score: number;
  engagement_band: string;
  maturity_stage: string;
  expansion_ready_score: number;
  churn_risk_score: number;
  churn_risk_band: string;
  lifecycle_health_index: number;
  updated_at: string | null;
}

export function useLifecycleOverview() {
  return useQuery({
    queryKey: ["tenant-lifecycle-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tenant_lifecycle_overview");
      if (error) throw error;
      return (data ?? []) as LifecycleOverviewRow[];
    },
    staleTime: 60_000,
  });
}

export function useLifecycleSnapshots(tenantId?: string | null, days = 30) {
  return useQuery({
    queryKey: ["tenant-lifecycle-snapshots", tenantId, days],
    enabled: !!tenantId,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("tenant_lifecycle_snapshots")
        .select("*")
        .eq("tenant_id", tenantId!)
        .gte("snapshot_date", since)
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecomputeLifecycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tenantId?: string) => {
      const { data, error } = await supabase.functions.invoke("compute-tenant-lifecycle", {
        body: tenantId ? { tenant_id: tenantId } : {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-lifecycle-overview"] });
      qc.invalidateQueries({ queryKey: ["tenant-lifecycle-snapshots"] });
    },
  });
}

export function useLifecycleAiInsight() {
  return useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.functions.invoke("lifecycle-insights-ai", {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      return data as { insight: string | null };
    },
  });
}

/** Tracking client-side: registra eventos de sessão. Idempotente por sessão (login = 1x por aba). */
export function useTrackSessionEvent() {
  return useMutation({
    mutationFn: async (input: {
      event_type: "login" | "dashboard_view" | "report_view" | "module_view";
      module?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return null;
      const { data: profile } = await supabase
        .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
      if (!profile?.tenant_id) return null;
      await supabase.from("tenant_session_events").insert([{
        tenant_id: profile.tenant_id,
        user_id: userId,
        event_type: input.event_type,
        module: input.module ?? undefined,
        metadata: (input.metadata ?? {}) as never,
      }]);
      return true;
    },
  });
}

/** Hook auto-track de view (dashboard/report/module). Dispara 1x ao montar. */
export function useAutoTrackView(
  event_type: "dashboard_view" | "report_view" | "module_view",
  module?: string,
) {
  const track = useTrackSessionEvent();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track.mutate({ event_type, module });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event_type, module]);
}
