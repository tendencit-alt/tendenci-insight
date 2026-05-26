// Hooks for the "Entregas & Montagem" module.
// Multi-tenant: every insert is scoped to the active tenant.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type DeliveryStatus =
  | "pendente" | "agendada" | "em_transito" | "entregue" | "cancelada";
export type InstallationStatus =
  | "pendente" | "agendada" | "em_andamento" | "concluida" | "com_pendencia" | "cancelada";

export interface DeliveryOrder {
  id: string;
  tenant_id: string;
  order_id: string;
  production_order_id: string | null;
  code: string | null;
  status: DeliveryStatus;
  scheduled_date: string | null;
  delivered_date: string | null;
  endereco: string | null;
  transportadora: string | null;
  veiculo: string | null;
  motorista: string | null;
  proof_file_url: string | null;
  recebido_por: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  order?: { order_number: number; status: string; client_id: string | null } | null;
}

export interface InstallationOrder {
  id: string;
  tenant_id: string;
  order_id: string;
  delivery_order_id: string | null;
  status: InstallationStatus;
  scheduled_date: string | null;
  completed_date: string | null;
  equipe_responsavel: string | null;
  endereco: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  order?: { order_number: number; status: string; client_id: string | null } | null;
}

export interface ChecklistItem {
  id: string;
  installation_order_id: string;
  descricao: string;
  concluido: boolean;
  observacao: string | null;
}

export interface InstallationIssue {
  id: string;
  installation_order_id: string;
  descricao: string;
  severidade: "baixa" | "media" | "alta";
  status: "aberta" | "resolvida";
  foto_url: string | null;
  created_at: string;
}

// ============ DELIVERIES ============
export function useDeliveries() {
  const { activeTenantId } = useActiveTenant();
  return useQuery({
    queryKey: ["delivery_orders", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_orders" as any)
        .select("*, order:orders(order_number, status, client_id)")
        .eq("tenant_id", activeTenantId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DeliveryOrder[];
    },
  });
}

export function useCreateDelivery() {
  const qc = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      order_id: string;
      production_order_id?: string | null;
      scheduled_date?: string | null;
      endereco?: string | null;
      transportadora?: string | null;
      observacoes?: string | null;
    }) => {
      const payload: any = {
        ...input,
        tenant_id: activeTenantId,
        created_by: user?.id ?? null,
        status: "pendente",
      };
      const { data, error } = await supabase
        .from("delivery_orders" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DeliveryOrder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery_orders"] });
      qc.invalidateQueries({ queryKey: ["fulfillment_for_order"] });
      toast.success("Entrega criada");
    },
    onError: (e: any) => toast.error("Erro ao criar entrega: " + e.message),
  });
}

export function useUpdateDelivery() {
  const qc = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<DeliveryOrder> }) => {
      const { error } = await supabase
        .from("delivery_orders" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;

      // If marking as delivered, log a cross-module event for timeline
      if (patch.status === "entregue") {
        const { data: row } = await supabase
          .from("delivery_orders" as any)
          .select("order_id, code, tenant_id")
          .eq("id", id)
          .maybeSingle();
        if (row) {
          await supabase.from("cross_module_events" as any).insert({
            tenant_id: (row as any).tenant_id ?? activeTenantId,
            event_type: "delivery_completed",
            source_module: "fulfillment",
            source_entity: "delivery_orders",
            source_entity_id: id,
            target_module: "orders",
            target_entity: "orders",
            target_entity_id: (row as any).order_id,
            payload: { code: (row as any).code },
            status: "pending",
          } as any);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery_orders"] });
      qc.invalidateQueries({ queryKey: ["fulfillment_for_order"] });
      toast.success("Entrega atualizada");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}

// ============ INSTALLATIONS ============
export function useInstallations() {
  const { activeTenantId } = useActiveTenant();
  return useQuery({
    queryKey: ["installation_orders", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installation_orders" as any)
        .select("*, order:orders(order_number, status, client_id)")
        .eq("tenant_id", activeTenantId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InstallationOrder[];
    },
  });
}

export function useCreateInstallation() {
  const qc = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      order_id: string;
      delivery_order_id?: string | null;
      scheduled_date?: string | null;
      equipe_responsavel?: string | null;
      endereco?: string | null;
      observacoes?: string | null;
    }) => {
      const payload: any = {
        ...input,
        tenant_id: activeTenantId,
        created_by: user?.id ?? null,
        status: "pendente",
      };
      const { data, error } = await supabase
        .from("installation_orders" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as InstallationOrder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["installation_orders"] });
      qc.invalidateQueries({ queryKey: ["fulfillment_for_order"] });
      toast.success("Montagem criada");
    },
    onError: (e: any) => toast.error("Erro ao criar montagem: " + e.message),
  });
}

export function useUpdateInstallation() {
  const qc = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<InstallationOrder> }) => {
      const { error } = await supabase
        .from("installation_orders" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;

      if (patch.status === "concluida") {
        const { data: row } = await supabase
          .from("installation_orders" as any)
          .select("order_id, tenant_id")
          .eq("id", id)
          .maybeSingle();
        if (row) {
          await supabase.from("cross_module_events" as any).insert({
            tenant_id: (row as any).tenant_id ?? activeTenantId,
            event_type: "installation_completed",
            source_module: "fulfillment",
            source_entity: "installation_orders",
            source_entity_id: id,
            target_module: "orders",
            target_entity: "orders",
            target_entity_id: (row as any).order_id,
            payload: {},
            status: "pending",
          } as any);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["installation_orders"] });
      qc.invalidateQueries({ queryKey: ["fulfillment_for_order"] });
      toast.success("Montagem atualizada");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}

// ============ CHECKLIST + ISSUES ============
export function useChecklist(installationOrderId: string | null) {
  return useQuery({
    queryKey: ["installation_checklist_items", installationOrderId],
    enabled: !!installationOrderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installation_checklist_items" as any)
        .select("*")
        .eq("installation_order_id", installationOrderId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ChecklistItem[];
    },
  });
}

export function useChecklistOps(installationOrderId: string | null) {
  const qc = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  const add = useMutation({
    mutationFn: async (descricao: string) => {
      const { error } = await supabase
        .from("installation_checklist_items" as any)
        .insert({
          installation_order_id: installationOrderId,
          tenant_id: activeTenantId,
          descricao,
        } as any);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["installation_checklist_items", installationOrderId] }),
  });
  const toggle = useMutation({
    mutationFn: async (item: ChecklistItem) => {
      const { error } = await supabase
        .from("installation_checklist_items" as any)
        .update({ concluido: !item.concluido } as any)
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["installation_checklist_items", installationOrderId] }),
  });
  return { add, toggle };
}

export function useIssues(installationOrderId: string | null) {
  return useQuery({
    queryKey: ["installation_issues", installationOrderId],
    enabled: !!installationOrderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installation_issues" as any)
        .select("*")
        .eq("installation_order_id", installationOrderId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InstallationIssue[];
    },
  });
}

export function useIssueOps(installationOrderId: string | null) {
  const qc = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  const add = useMutation({
    mutationFn: async (input: { descricao: string; severidade: "baixa" | "media" | "alta" }) => {
      const { error } = await supabase
        .from("installation_issues" as any)
        .insert({
          installation_order_id: installationOrderId,
          tenant_id: activeTenantId,
          ...input,
        } as any);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["installation_issues", installationOrderId] }),
  });
  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("installation_issues" as any)
        .update({ status: "resolvida" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["installation_issues", installationOrderId] }),
  });
  return { add, resolve };
}

// ============ ORDER-LEVEL FULFILLMENT SUMMARY ============
export function useFulfillmentForOrder(orderId: string | null) {
  return useQuery({
    queryKey: ["fulfillment_for_order", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [d, i] = await Promise.all([
        supabase
          .from("delivery_orders" as any)
          .select("id, status, delivered_date")
          .eq("order_id", orderId as string),
        supabase
          .from("installation_orders" as any)
          .select("id, status, completed_date")
          .eq("order_id", orderId as string),
      ]);
      return {
        deliveries: (d.data ?? []) as any[],
        installations: (i.data ?? []) as any[],
      };
    },
  });
}

// ============ ORDERS PICKER (for create dialog) ============
export function useOrdersForFulfillment() {
  const { activeTenantId } = useActiveTenant();
  return useQuery({
    queryKey: ["orders_for_fulfillment", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, client:clients(name), entrega_logradouro, entrega_numero, entrega_bairro, entrega_cep")
        .eq("tenant_id", activeTenantId as string)
        .in("status", ["ativo", "faturado", "em_producao", "liberado_producao", "aprovado", "producao_concluida"])
        .order("order_number", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}
