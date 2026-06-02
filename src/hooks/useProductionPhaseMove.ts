import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PhaseDirection = "forward" | "regress" | "initial" | "deadline";

export interface PhaseHistoryRow {
  id: string;
  tenant_id: string;
  production_order_id: string;
  phase: string;
  entered_at: string;
  exited_at: string | null;
  moved_by: string | null;
  direction: PhaseDirection;
  reason: string | null;
  created_at: string;
}

/** Single RPC used by BOTH dropdown and drag-drop. */
export function useMoveProductionPhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { op_id: string; target_slug: string; reason?: string | null }) => {
      const { data, error } = await supabase.rpc("move_production_phase", {
        _op_id: input.op_id,
        _target_slug: input.target_slug,
        _reason: input.reason ?? null,
      } as any);
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-orders"] });
      qc.invalidateQueries({ queryKey: ["production_orders"] });
      qc.invalidateQueries({ queryKey: ["production_order_phase_history"] });
    },
  });
}

export function useReprogramOp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { op_id: string; new_due_date: string; reason: string }) => {
      const { data, error } = await supabase.rpc("reprogram_op", {
        _op_id: input.op_id,
        _new_due_date: input.new_due_date,
        _reason: input.reason,
      } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-orders"] });
      toast.success("Prazo reprogramado");
    },
    onError: (e: any) => toast.error("Erro ao reprogramar", { description: e.message }),
  });
}

export function useProductionPhaseHistory(opId?: string | null) {
  return useQuery({
    queryKey: ["production_order_phase_history", opId],
    enabled: !!opId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_order_phase_history" as any)
        .select("*")
        .eq("production_order_id", opId!)
        .order("entered_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PhaseHistoryRow[];
    },
  });
}

/** Returns history summary for ALL ops in a tenant (regress counts + current phase since). */
export function useProductionPhaseSummary(opIds: string[]) {
  return useQuery({
    queryKey: ["production_phase_summary", opIds.sort().join(",")],
    enabled: opIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_order_phase_history" as any)
        .select("production_order_id, direction, entered_at, exited_at")
        .in("production_order_id", opIds);
      if (error) throw error;
      const map: Record<string, { regressCount: number; currentPhaseSince: string | null }> = {};
      for (const id of opIds) map[id] = { regressCount: 0, currentPhaseSince: null };
      for (const row of (data ?? []) as any[]) {
        const m = map[row.production_order_id];
        if (!m) continue;
        if (row.direction === "regress") m.regressCount += 1;
        if (!row.exited_at) m.currentPhaseSince = row.entered_at;
      }
      return map;
    },
  });
}

/** Format duration since ISO string, in pt-BR. */
export function formatElapsed(sinceIso: string | null): string {
  if (!sinceIso) return "—";
  const ms = Date.now() - new Date(sinceIso).getTime();
  if (ms < 0) return "agora";
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Compute due-date urgency from created_at + planned_end_date. */
export function dueDateUrgency(
  createdAt: string | null,
  plannedEndDate: string | null,
): { hasDue: boolean; elapsedDays: number; totalDays: number; pct: number; level: "ok" | "warn" | "late" } {
  if (!plannedEndDate || !createdAt) {
    return { hasDue: false, elapsedDays: 0, totalDays: 0, pct: 0, level: "ok" };
  }
  const start = new Date(createdAt).getTime();
  const end = new Date(plannedEndDate).getTime();
  const now = Date.now();
  const dayMs = 86_400_000;
  const totalDays = Math.max(1, Math.round((end - start) / dayMs));
  const elapsedDays = Math.max(0, Math.round((now - start) / dayMs));
  const pct = Math.min(999, Math.round((elapsedDays / totalDays) * 100));
  const level: "ok" | "warn" | "late" = now > end ? "late" : pct > 90 ? "late" : pct > 60 ? "warn" : "ok";
  return { hasDue: true, elapsedDays, totalDays, pct, level };
}
