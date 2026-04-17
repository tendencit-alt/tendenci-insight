import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type EventType = "started" | "completed" | "skipped" | "abandoned" | "viewed";

export function useOnboardingAnalytics() {
  const { user } = useAuth();

  const track = useCallback(
    async (step_key: string, event_type: EventType, extra: { duration_seconds?: number; metadata?: Record<string, any> } = {}) => {
      try {
        const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
        if (!tenantId) return;
        await supabase.from("onboarding_analytics" as any).insert({
          tenant_id: tenantId,
          user_id: user?.id ?? null,
          step_key,
          event_type,
          duration_seconds: extra.duration_seconds ?? null,
          metadata: extra.metadata ?? {},
        } as any);
      } catch (err) {
        console.warn("[onboarding-analytics] failed", err);
      }
    },
    [user?.id],
  );

  return { track };
}

export function useOnboardingAnalyticsSummary() {
  return useQuery({
    queryKey: ["onboarding-analytics-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_analytics" as any)
        .select("step_key, event_type, duration_seconds, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = (data || []) as any[];

      const byStep: Record<string, { started: number; completed: number; skipped: number; abandoned: number; avgDuration: number }> = {};
      const durations: Record<string, number[]> = {};

      rows.forEach(r => {
        const k = r.step_key;
        if (!byStep[k]) byStep[k] = { started: 0, completed: 0, skipped: 0, abandoned: 0, avgDuration: 0 };
        if (r.event_type in byStep[k]) (byStep[k] as any)[r.event_type] += 1;
        if (r.duration_seconds) {
          durations[k] = durations[k] || [];
          durations[k].push(r.duration_seconds);
        }
      });

      Object.keys(durations).forEach(k => {
        const arr = durations[k];
        byStep[k].avgDuration = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      });

      return { rows, byStep };
    },
  });
}
