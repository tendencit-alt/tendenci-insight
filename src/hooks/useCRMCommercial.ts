import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCRMProposals(dealId?: string) {
  return useQuery({
    queryKey: ["crm-proposals", dealId],
    queryFn: async () => {
      let q = supabase
        .from("crm_proposals")
        .select("*, crm_deals(title, value, status)")
        .order("created_at", { ascending: false });
      if (dealId) q = q.eq("deal_id", dealId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("crm_proposals").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-proposals"] }); toast.success("Proposta criada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("crm_proposals").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-proposals"] }); toast.success("Proposta atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCRMRevenueForecast() {
  return useQuery({
    queryKey: ["crm-revenue-forecast"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_revenue_forecast")
        .select("*, crm_deals(title, value, status, owner_id)")
        .order("reference_month", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("crm_revenue_forecast").upsert(values, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-revenue-forecast"] }); toast.success("Forecast atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCRMDealsWithProbability() {
  return useQuery({
    queryKey: ["crm-deals-probability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deals")
        .select("id, title, value, status, created_at, updated_at, owner_id, stage_id, lead_id, categoria, crm_stages(name, probability_percent, position)")
        .in("status", ["open", "won"])
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCRMLeadsStats() {
  return useQuery({
    queryKey: ["crm-leads-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, status, created_at, source_id, temperature, lead_sources(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}
