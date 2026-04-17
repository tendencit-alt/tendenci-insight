import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface UpgradeSignal {
  id: string;
  signal_type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence_score: number;
  recommended_entitlement_code: string | null;
  recommended_plan_id: string | null;
  recommended_plan_name: string | null;
  context: Record<string, any>;
  message_template: string | null;
  ai_message: string | null;
  detected_at: string;
  should_show: boolean;
}

const SIGNAL_TEMPLATES: Record<string, (ctx: any, plan?: string | null) => string> = {
  limit_reached: (ctx) => `Você atingiu o limite de ${ctx.limit_key?.replace(/_/g, " ") ?? "uso"} (${ctx.usage}/${ctx.limit}). Faça upgrade para continuar crescendo.`,
  limit_80_percent: (ctx) => `Você já usou ${Math.round(ctx.pct_used)}% do limite de ${ctx.limit_key?.replace(/_/g, " ") ?? "uso"}. Antecipe o upgrade.`,
  premium_feature_attempt: (_ctx, plan) => `Esse recurso faz parte do plano ${plan ?? "superior"}. Solicite um trial e teste sem compromisso.`,
  rapid_growth: () => "Sua operação cresceu rápido este mês. Veja recursos avançados que combinam com o seu ritmo.",
  multi_module_usage: () => "Você usa vários módulos integrados. O plano superior libera automações e relatórios cruzados.",
  forecast_candidate: () => "Com seu volume de lançamentos, o Forecast Financeiro projeta cenários e antecipa caixa.",
  automation_candidate: () => "Você executa fluxos repetitivos. Automações avançadas podem economizar horas por semana.",
  integration_candidate: () => "Conecte sua operação via API e webhooks para escalar sem limites.",
  health_premium_ready: () => "Seu engajamento está alto. Recursos premium podem multiplicar seu retorno.",
};

export function renderSignalMessage(s: Pick<UpgradeSignal, "signal_type" | "context" | "message_template" | "ai_message" | "recommended_plan_name">) {
  if (s.ai_message) return s.ai_message;
  if (s.message_template) return s.message_template;
  const fn = SIGNAL_TEMPLATES[s.signal_type];
  return fn ? fn(s.context ?? {}, s.recommended_plan_name) : "Há uma oportunidade de upgrade disponível.";
}

/** Carrega signals ativos do tenant atual (UI contextual). */
export function useUpgradeSignals() {
  const { profile } = useAuth() as any;
  const tenantId = profile?.tenant_id as string | undefined;

  return useQuery({
    queryKey: ["upgrade-signals", tenantId],
    queryFn: async (): Promise<UpgradeSignal[]> => {
      if (!tenantId) return [];
      const { data, error } = await (supabase as any).rpc("get_active_upgrade_signals_for_tenant", { _tenant_id: tenantId });
      if (error) throw error;
      return (data ?? []) as UpgradeSignal[];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

/** Encontra o melhor signal para um entitlement_code (usado pelo EntitlementGate). */
export function useUpgradeSignalForEntitlement(code?: string) {
  const { data } = useUpgradeSignals();
  return data?.find((s) => s.recommended_entitlement_code === code && s.should_show);
}

export function useTrackUpgradeEvent() {
  const { user, profile } = useAuth() as any;
  return useMutation({
    mutationFn: async (payload: { signal_id?: string; signal_type: string; event_type: "shown" | "clicked" | "dismissed" | "ignored" | "converted"; surface?: string }) => {
      if (!profile?.tenant_id) return;
      await (supabase as any).from("upgrade_ui_events").insert({
        tenant_id: profile.tenant_id,
        user_id: user?.id,
        ...payload,
      });
    },
  });
}

export function useRecordPremiumAttempt() {
  const { profile } = useAuth() as any;
  return useMutation({
    mutationFn: async (code: string) => {
      if (!profile?.tenant_id) return;
      await (supabase as any).rpc("record_premium_feature_attempt", { _tenant_id: profile.tenant_id, _code: code });
    },
  });
}

// ============================================================================
// OWNER
// ============================================================================

export function useOwnerUpgradeDashboard() {
  return useQuery({
    queryKey: ["owner-upgrade-dashboard"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_owner_upgrade_dashboard");
      if (error) throw error;
      return data as any;
    },
  });
}

export function useAllUpgradeSignals(filters?: { severity?: string; signalType?: string }) {
  return useQuery({
    queryKey: ["all-upgrade-signals", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("upgrade_signals")
        .select("*, tenants(name), tenant_plans!upgrade_signals_recommended_plan_id_fkey(name, price)")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("severity", { ascending: false })
        .order("confidence_score", { ascending: false });
      if (filters?.severity) q = q.eq("severity", filters.severity);
      if (filters?.signalType) q = q.eq("signal_type", filters.signalType);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGenerateSignalsBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("generate_upgrade_signals_batch");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Signals atualizados");
      qc.invalidateQueries({ queryKey: ["all-upgrade-signals"] });
      qc.invalidateQueries({ queryKey: ["owner-upgrade-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePersonalizeSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (signal_id: string) => {
      const { data, error } = await supabase.functions.invoke("upgrade-message-personalize", { body: { signal_id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Mensagem personalizada com IA");
      qc.invalidateQueries({ queryKey: ["all-upgrade-signals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSignalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; status: "ignored" | "converted" | "dismissed" | "active" }) => {
      const { error } = await (supabase as any).from("upgrade_signals").update({ status: payload.status }).eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-upgrade-signals"] });
      qc.invalidateQueries({ queryKey: ["upgrade-signals"] });
      qc.invalidateQueries({ queryKey: ["owner-upgrade-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
