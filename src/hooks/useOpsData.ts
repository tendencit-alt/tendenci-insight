import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { toast } from "sonner";

// ── Orders ── (canonical table: production_orders)
export function useOpsOrders(filters?: { status?: string; type?: string }) {
  const { activeTenantId } = useActiveTenant();
  return useQuery({
    queryKey: ["ops-orders", activeTenantId, filters],
    enabled: !!activeTenantId,
    queryFn: async () => {
      let q = supabase
        .from("production_orders")
        .select("*, clients(name), production_types(name), suppliers(name)")
        .eq("tenant_id", activeTenantId!)
        .order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.type) q = q.eq("production_type_id", filters.type);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}


export function useCreateOpsOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("production_orders").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ops-orders"] }); toast.success("Ordem criada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateOpsOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("production_orders").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ops-orders"] }); toast.success("Ordem atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteOpsOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ops-orders"] }); toast.success("Ordem excluída"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Production types (for select inputs) ──
export function useProductionTypes() {
  return useQuery({
    queryKey: ["production-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("production_types").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Activities ──
export function useOpsActivities(orderId?: string) {
  return useQuery({
    queryKey: ["ops-activities", orderId],
    queryFn: async () => {
      let q = supabase
        .from("ops_activities")
        .select("*, hr_employees(name, hourly_cost), hr_teams(name)")
        .order("created_at", { ascending: false });
      if (orderId) q = q.eq("ops_order_id", orderId);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orderId || orderId === undefined,
  });
}

export function useCreateOpsActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("ops_activities").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ops-activities"] }); toast.success("Atividade registrada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Materials ──
export function useOpsMaterials(orderId?: string) {
  return useQuery({
    queryKey: ["ops-materials", orderId],
    queryFn: async () => {
      let q = supabase.from("ops_material_usage").select("*").order("created_at", { ascending: false });
      if (orderId) q = q.eq("ops_order_id", orderId);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orderId || orderId === undefined,
  });
}

export function useCreateOpsMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("ops_material_usage").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ops-materials"] }); toast.success("Material registrado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Occurrences ──
export function useOpsOccurrences(orderId?: string) {
  return useQuery({
    queryKey: ["ops-occurrences", orderId],
    queryFn: async () => {
      let q = supabase.from("ops_occurrences").select("*").order("created_at", { ascending: false });
      if (orderId) q = q.eq("ops_order_id", orderId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orderId || orderId === undefined,
  });
}

// ── Scheduling ──
export function useOpsScheduling() {
  return useQuery({
    queryKey: ["ops-scheduling"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_scheduling")
        .select("*, ops_orders(title, order_type, status, priority)")
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Capacity ──
export function useOpsCapacity() {
  return useQuery({
    queryKey: ["ops-capacity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_capacity")
        .select("*, hr_teams(name)")
        .order("period_start");
      if (error) throw error;
      return data ?? [];
    },
  });
}
