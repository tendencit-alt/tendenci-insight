import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSupplyRequests(filters?: { status?: string }) {
  return useQuery({
    queryKey: ["sup-requests", filters],
    queryFn: async () => {
      let q = supabase
        .from("sup_requests")
        .select("*, fin_cost_centers(name), prj_projects(title, project_number), profiles:requester_id(full_name)")
        .order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateSupplyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("sup_requests").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sup-requests"] }); toast.success("Solicitação criada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateSupplyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("sup_requests").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sup-requests"] }); toast.success("Solicitação atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSupplyQuotations(requestId?: string) {
  return useQuery({
    queryKey: ["sup-quotations", requestId],
    queryFn: async () => {
      let q = supabase
        .from("sup_quotations")
        .select("*, suppliers(name), sup_quotation_items(*)")
        .order("created_at", { ascending: false });
      if (requestId) q = q.eq("request_id", requestId);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("sup_quotations").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sup-quotations"] }); toast.success("Cotação registrada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCreateQuotationItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("sup_quotation_items").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sup-quotations"] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSupplierEvaluations(supplierId?: string) {
  return useQuery({
    queryKey: ["sup-evaluations", supplierId],
    queryFn: async () => {
      let q = supabase
        .from("sup_supplier_evaluations")
        .select("*, suppliers(name), purchase_orders(order_number)")
        .order("created_at", { ascending: false });
      if (supplierId) q = q.eq("supplier_id", supplierId);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("sup_supplier_evaluations").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sup-evaluations"] }); toast.success("Avaliação registrada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePurchaseAnalytics() {
  const { data: orders = [] } = useQuery({
    queryKey: ["purchase-orders-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, suppliers(name), purchase_order_items(*)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: evaluations = [] } = useSupplierEvaluations();

  return { orders, evaluations };
}
