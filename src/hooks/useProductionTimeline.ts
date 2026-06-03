import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TimelineSegment {
  slug: string;
  label: string;
  color: string;
  sort_order: number;
  duration_days: number;
  planned_start: string | null;
  planned_end: string | null;
}

export interface TimelinePhaseHistory {
  phase: string;
  entered_at: string;
  exited_at: string | null;
  direction: "forward" | "regress" | "initial" | "deadline";
  reason: string | null;
  duration_hours: number;
}

export interface TimelineOp {
  id: string;
  tenant_id: string;
  order_number: number;
  title: string;
  status: string;
  priority: string;
  client_id: string | null;
  client_name: string | null;
  order_id: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status_changed_at: string;
  current_phase_label: string | null;
  current_phase_color: string | null;
  current_duration_days: number | null;
  days_in_current: number | null;
  remaining_days: number | null;
  eta: string;
  is_late_planned: boolean;
  is_vencida: boolean;
  is_atraso_projetado: boolean;
  is_alerta_prazo: boolean;
  segments: TimelineSegment[];
  history: TimelinePhaseHistory[];
}

export interface TimelineKpis {
  total: number;
  em_producao: number;
  aguardando: number;
  concluidas: number;
  vencidas: number;
  atraso_projetado: number;
  /** @deprecated use vencidas + atraso_projetado */
  atrasadas: number;
  alerta_prazo: number;
  pct_concluidas: number;
}

export interface TimelinePayload {
  ops: TimelineOp[];
  kpis: TimelineKpis;
}

const QK = ["production-timeline"] as const;

export function useProductionTimeline() {
  const qc = useQueryClient();

  // Realtime: invalida quando OP ou histórico de fase muda
  useEffect(() => {
    const channel = supabase
      .channel("production-timeline-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_orders" }, () => {
        qc.invalidateQueries({ queryKey: QK });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "production_order_phase_history" }, () => {
        qc.invalidateQueries({ queryKey: QK });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "production_status_columns" }, () => {
        qc.invalidateQueries({ queryKey: QK });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "production_order_phase_plan" }, () => {
        qc.invalidateQueries({ queryKey: QK });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: QK,
    queryFn: async (): Promise<TimelinePayload> => {
      const { data, error } = await supabase.rpc("get_production_timeline" as any, {});
      if (error) throw error;
      const payload = (data ?? { ops: [], kpis: {} }) as any;
      return {
        ops: Array.isArray(payload.ops) ? payload.ops : [],
        kpis: payload.kpis ?? {
          total: 0,
          em_producao: 0,
          aguardando: 0,
          concluidas: 0,
          vencidas: 0,
          atraso_projetado: 0,
          atrasadas: 0,
          alerta_prazo: 0,
          pct_concluidas: 0,
        },
      };
    },
    refetchInterval: 60_000,
    staleTime: 15_000,
  });
}

export function useProductionKPIs() {
  const { data, isLoading } = useProductionTimeline();
  return {
    kpis: data?.kpis ?? {
      total: 0,
      em_producao: 0,
      aguardando: 0,
      concluidas: 0,
      vencidas: 0,
      atraso_projetado: 0,
      atrasadas: 0,
      alerta_prazo: 0,
      pct_concluidas: 0,
    },
    loading: isLoading,
  };
}
