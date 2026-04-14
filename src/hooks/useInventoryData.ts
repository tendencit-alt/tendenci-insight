import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useStockReservations(filters?: { status?: string; productId?: string }) {
  return useQuery({
    queryKey: ["inv-reservations", filters],
    queryFn: async () => {
      let q = supabase
        .from("inv_stock_reservations")
        .select("*, products(name, code, unit, current_stock), prj_projects(title, project_number), ops_orders(title, order_number)")
        .order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.productId) q = q.eq("product_id", filters.productId);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("inv_stock_reservations").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inv-reservations"] }); toast.success("Reserva criada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("inv_stock_reservations").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inv-reservations"] }); toast.success("Reserva atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });
}
