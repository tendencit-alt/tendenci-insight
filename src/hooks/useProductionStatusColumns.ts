import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { toast } from "sonner";

export type SlaUnit = "days" | "hours";

export interface ProductionStatusColumn {
  id: string;
  tenant_id: string;
  slug: string;
  label: string;
  color: string;
  sort_order: number;
  is_system: boolean;
  sla_days: number | null;
  duration_days?: number | null;
  sla_unit: SlaUnit;
}

/** Compute SLA state for an entry that has been at a given status since `since`. */
export function slaState(
  slaValue: number | null | undefined,
  since: string | null | undefined,
  unit: SlaUnit = "days",
) {
  if (!slaValue || slaValue <= 0 || !since) {
    return { elapsed: 0, days: 0, hours: 0, level: "ok" as const, ratio: 0, unit };
  }
  const ms = Date.now() - new Date(since).getTime();
  const unitMs = unit === "hours" ? 3_600_000 : 86_400_000;
  const elapsed = Math.max(0, Math.floor(ms / unitMs));
  const ratio = elapsed / slaValue;
  const level = ratio >= 1 ? "overdue" : ratio >= 0.75 ? "warning" : "ok";
  return {
    elapsed,
    days: unit === "days" ? elapsed : Math.floor(elapsed / 24),
    hours: unit === "hours" ? elapsed : elapsed * 24,
    level,
    ratio,
    unit,
  };
}

export function slaSuffix(unit: SlaUnit): string {
  return unit === "hours" ? "h" : "d";
}


export const STATUS_COLOR_PALETTE = [
  { key: "slate",   tone: "bg-slate-500/10 text-slate-700 border-slate-500/30 dark:text-slate-300",     swatch: "bg-slate-500" },
  { key: "gray",    tone: "bg-gray-500/10 text-gray-700 border-gray-500/30 dark:text-gray-300",         swatch: "bg-gray-500" },
  { key: "red",     tone: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300",             swatch: "bg-red-600" },
  { key: "orange",  tone: "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-300", swatch: "bg-orange-600" },
  { key: "amber",   tone: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",     swatch: "bg-amber-600" },
  { key: "yellow",  tone: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-300", swatch: "bg-yellow-500" },
  { key: "lime",    tone: "bg-lime-500/10 text-lime-700 border-lime-500/30 dark:text-lime-300",         swatch: "bg-lime-500" },
  { key: "green",   tone: "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-300",     swatch: "bg-green-600" },
  { key: "emerald", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300", swatch: "bg-emerald-600" },
  { key: "teal",    tone: "bg-teal-500/10 text-teal-700 border-teal-500/30 dark:text-teal-300",         swatch: "bg-teal-600" },
  { key: "cyan",    tone: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30 dark:text-cyan-300",         swatch: "bg-cyan-600" },
  { key: "sky",     tone: "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300",             swatch: "bg-sky-600" },
  { key: "blue",    tone: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300",         swatch: "bg-blue-600" },
  { key: "indigo",  tone: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30 dark:text-indigo-300", swatch: "bg-indigo-600" },
  { key: "violet",  tone: "bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-300", swatch: "bg-violet-600" },
  { key: "purple",  tone: "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-300", swatch: "bg-purple-600" },
  { key: "fuchsia", tone: "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/30 dark:text-fuchsia-300", swatch: "bg-fuchsia-600" },
  { key: "pink",    tone: "bg-pink-500/10 text-pink-700 border-pink-500/30 dark:text-pink-300",         swatch: "bg-pink-600" },
  { key: "rose",    tone: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300",         swatch: "bg-rose-600" },
];

export function colorTone(color: string): string {
  return STATUS_COLOR_PALETTE.find((c) => c.key === color)?.tone ?? STATUS_COLOR_PALETTE[0].tone;
}

export function colorSwatch(color: string): string {
  return STATUS_COLOR_PALETTE.find((c) => c.key === color)?.swatch ?? "bg-muted-foreground";
}

export function useProductionStatusColumns() {
  const { activeTenantId } = useActiveTenant();

  return useQuery({
    queryKey: ["production_status_columns", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_status_columns" as any)
        .select("*")
        .eq("tenant_id", activeTenantId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProductionStatusColumn[];
    },
  });
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || `status_${Date.now()}`;
}

function makeSlugCandidate(baseSlug: string, attempt: number): string {
  if (attempt <= 1) return baseSlug;
  const suffix = `_${attempt}`;
  const trimmedBase = baseSlug.slice(0, Math.max(1, 40 - suffix.length));
  return `${trimmedBase}${suffix}`;
}

export function useCreateProductionStatusColumn() {
  const qc = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  return useMutation({
    mutationFn: async (input: { label: string; color?: string; sort_order?: number; sla_days?: number | null; sla_unit?: SlaUnit }) => {
      if (!activeTenantId) throw new Error("Sem empresa ativa");
      const baseSlug = slugify(input.label);
      const { data: existing } = await supabase
        .from("production_status_columns" as any)
        .select("slug")
        .eq("tenant_id", activeTenantId);
      const taken = new Set((existing ?? []).map((r: any) => r.slug));
      let attempt = 1;
      while (taken.has(makeSlugCandidate(baseSlug, attempt))) attempt += 1;

      for (let retries = 0; retries < 8; retries += 1) {
        const slug = makeSlugCandidate(baseSlug, attempt);
        const { error } = await supabase.from("production_status_columns" as any).insert({
          tenant_id: activeTenantId,
          slug,
          label: input.label,
          color: "blue", // Padronizado para azul conforme solicitação do usuário
          sort_order: input.sort_order ?? 100,
          sla_days: input.sla_days ?? null,
          duration_days: input.sla_days ?? null,
          sla_unit: input.sla_unit ?? "days",
          is_system: false,
        } as any);


        if (!error) return;

        const isDuplicateSlug =
          error.code === "23505" ||
          error.message?.includes("production_status_columns_tenant_id_slug_key") ||
          error.message?.toLowerCase().includes("duplicate key value");

        if (!isDuplicateSlug) throw error;

        taken.add(slug);
        attempt += 1;
      }

      throw new Error("Não foi possível gerar um identificador único para o status. Tente novamente.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production_status_columns"] });
      qc.invalidateQueries({ queryKey: ["production-timeline"] });
      toast.success("Status criado");
    },
    onError: (e: any) => toast.error("Erro ao criar status", { description: e.message }),
  });
}

export function useUpdateProductionStatusColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; label?: string; color?: string; sort_order?: number; sla_days?: number | null; sla_unit?: SlaUnit }) => {
      const { id, ...patch } = input;
      const payload = {
        ...patch,
        ...(Object.prototype.hasOwnProperty.call(patch, "sla_days")
          ? { duration_days: patch.sla_days ?? null }
          : {}),
      };
      const { error } = await supabase
        .from("production_status_columns" as any)
        .update(payload as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production_status_columns"] });
      qc.invalidateQueries({ queryKey: ["production-timeline"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error("Erro ao atualizar status", { description: e.message }),
  });
}

export function useDeleteProductionStatusColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("production_status_columns" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production_status_columns"] });
      qc.invalidateQueries({ queryKey: ["production-timeline"] });
      toast.success("Status removido");
    },
    onError: (e: any) => toast.error("Erro ao remover status", { description: e.message }),
  });
}

export function useSetTenantSlaUnit() {
  const qc = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  return useMutation({
    mutationFn: async (unit: SlaUnit) => {
      if (!activeTenantId) throw new Error("Sem empresa ativa");
      const { error } = await supabase
        .from("production_status_columns" as any)
        .update({ sla_unit: unit } as any)
        .eq("tenant_id", activeTenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production_status_columns"] });
      qc.invalidateQueries({ queryKey: ["production-timeline"] });
      toast.success("Unidade de prazo atualizada");
    },
    onError: (e: any) => toast.error("Erro ao atualizar unidade", { description: e.message }),
  });
}

export function useUpdateProductionOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const { error } = await supabase
        .from("production_orders")
        .update({ status: input.status } as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-orders"] });
      qc.invalidateQueries({ queryKey: ["production_orders"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error("Erro ao alterar status", { description: e.message }),
  });
}
