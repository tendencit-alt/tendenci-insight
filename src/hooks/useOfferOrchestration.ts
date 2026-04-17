import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ResolvedOffer {
  offer_code: string;
  offer_type: string;
  name: string;
  message: string;
  cta_label: string;
  channel: string;
  priority_score: number;
  signal_id: string | null;
  reasoning: string;
}

/** Hook contextual: useBestOffer('dashboard_widget') -> melhor oferta para o canal. */
export function useBestOffer(channel: string = "in_app_contextual") {
  const { profile } = useAuth() as any;
  const tenantId = profile?.tenant_id as string | undefined;

  return useQuery({
    queryKey: ["best-offer", tenantId, channel],
    queryFn: async (): Promise<ResolvedOffer | null> => {
      if (!tenantId) return null;
      const { data, error } = await (supabase as any).rpc("resolve_best_offer_for_tenant", {
        _tenant_id: tenantId,
        _channel: channel,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row ?? null;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useRecordOfferEvent() {
  const { profile, user } = useAuth() as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      offer_code: string;
      channel: string;
      event_type: "shown" | "clicked" | "accepted" | "ignored" | "dismissed" | "converted" | "expired" | "suppressed";
      signal_id?: string | null;
      metadata?: Record<string, any>;
    }) => {
      if (!profile?.tenant_id) return;
      await (supabase as any).rpc("record_offer_event", {
        _tenant_id: profile.tenant_id,
        _offer_code: payload.offer_code,
        _channel: payload.channel,
        _event_type: payload.event_type,
        _signal_id: payload.signal_id ?? null,
        _user_id: user?.id ?? null,
        _metadata: payload.metadata ?? {},
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["best-offer"] });
    },
  });
}

export function usePersonalizeOffer() {
  return useMutation({
    mutationFn: async (payload: {
      tenant_id: string;
      offer_code: string;
      base_message: string;
      context?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.functions.invoke("offer-personalize", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.personalized_message as string;
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============================================================================
// OWNER MANAGEMENT
// ============================================================================

export function useOfferCatalog() {
  return useQuery({
    queryKey: ["offer-catalog"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("offer_catalog")
        .select("*, tenant_plans(name)")
        .order("priority_base", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOfferPriorityRules() {
  return useQuery({
    queryKey: ["offer-priority-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("offer_priority_rules")
        .select("*")
        .order("priority_weight", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOfferDeliveryEvents(filters?: { offerCode?: string; tenantId?: string; limit?: number }) {
  return useQuery({
    queryKey: ["offer-delivery-events", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("offer_delivery_events")
        .select("*, tenants(name), offer_catalog(name, offer_type)")
        .order("created_at", { ascending: false })
        .limit(filters?.limit ?? 100);
      if (filters?.offerCode) q = q.eq("offer_code", filters.offerCode);
      if (filters?.tenantId) q = q.eq("tenant_id", filters.tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOfferAnalytics() {
  return useQuery({
    queryKey: ["offer-analytics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_offer_analytics");
      if (error) throw error;
      return data as any;
    },
  });
}

export function useUpsertOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await (supabase as any)
        .from("offer_catalog")
        .upsert(payload, { onConflict: "offer_code" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oferta salva");
      qc.invalidateQueries({ queryKey: ["offer-catalog"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpsertPriorityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await (supabase as any)
        .from("offer_priority_rules")
        .upsert(payload, { onConflict: "rule_name" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regra atualizada");
      qc.invalidateQueries({ queryKey: ["offer-priority-rules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
