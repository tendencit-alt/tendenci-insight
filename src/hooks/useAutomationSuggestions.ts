import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AutomationSuggestion {
  id: string;
  tenant_id: string;
  suggestion_type: string;
  module: string | null;
  title: string;
  description: string | null;
  evidence: any;
  impact_preview: any;
  proposed_action: any;
  confidence: number;
  occurrences: number;
  status: "pending" | "accepted" | "dismissed" | "expired" | "applied";
  applied_resource_id: string | null;
  applied_resource_type: string | null;
  expires_at: string | null;
  created_at: string;
}

export function useAutomationSuggestions(opts: { status?: string; limit?: number; module?: string } = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["automation-suggestions", opts],
    queryFn: async () => {
      let q = supabase
        .from("automation_suggestions" as any)
        .select("*")
        .order("confidence", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(opts.limit ?? 50);
      if (opts.status) q = q.eq("status", opts.status);
      else q = q.eq("status", "pending");
      if (opts.module) q = q.eq("module", opts.module);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as AutomationSuggestion[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useApplySuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, overrides }: { id: string; overrides?: Record<string, any> }) => {
      const { data, error } = await supabase.functions.invoke("apply-automation-suggestion", {
        body: { suggestion_id: id, overrides: overrides || {} },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Automação criada");
      qc.invalidateQueries({ queryKey: ["automation-suggestions"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao aplicar sugestão"),
  });
}

export function useDismissSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automation_suggestions" as any)
        .update({ status: "dismissed", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
      await supabase.from("automation_suggestion_events" as any).insert({
        tenant_id: tenantId,
        suggestion_id: id,
        event_type: "dismissed",
      } as any);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-suggestions"] }),
  });
}

export function useTriggerDetection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("detect-automation-patterns", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Detecção concluída: ${data?.created ?? 0} sugestões`);
      qc.invalidateQueries({ queryKey: ["automation-suggestions"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro na detecção"),
  });
}

export function useSuggestionAnalytics() {
  return useQuery({
    queryKey: ["automation-suggestion-analytics"],
    queryFn: async () => {
      const [{ data: events }, { data: suggestions }] = await Promise.all([
        supabase.from("automation_suggestion_events" as any).select("event_type, created_at").limit(1000),
        supabase.from("automation_suggestions" as any).select("status, suggestion_type").limit(1000),
      ]);

      const byEvent: Record<string, number> = {};
      (events || []).forEach((e: any) => (byEvent[e.event_type] = (byEvent[e.event_type] || 0) + 1));
      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};
      (suggestions || []).forEach((s: any) => {
        byStatus[s.status] = (byStatus[s.status] || 0) + 1;
        byType[s.suggestion_type] = (byType[s.suggestion_type] || 0) + 1;
      });
      return { byEvent, byStatus, byType, totalSuggestions: (suggestions || []).length };
    },
  });
}
