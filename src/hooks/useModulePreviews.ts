import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface ModulePreview {
  alerts: { label: string; severity: "red" | "yellow" | "green" }[];
  stats: { label: string; value: string }[];
}

export function useModulePreviews() {
  return useQuery({
    queryKey: ["module-previews"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const previews: Record<string, ModulePreview> = {};

      // ── Financeiro ──
      const [
        { count: overduePayCount },
        { count: unreconCount },
        { count: overdueRecCount },
      ] = await Promise.all([
        supabase.from("fin_payables").select("id", { count: "exact", head: true }).in("status", ["ABERTO", "VENCIDO"]).lt("due_date", today),
        supabase.from("fin_bank_transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("fin_receivables").select("id", { count: "exact", head: true }).in("status", ["ABERTO", "VENCIDO"]).lt("due_date", today),
      ]);
      previews.financeiro = {
        alerts: [
          ...(overduePayCount ? [{ label: `${overduePayCount} conta(s) vencida(s)`, severity: overduePayCount > 3 ? "red" as const : "yellow" as const }] : []),
          ...(unreconCount ? [{ label: `${unreconCount} sem conciliar`, severity: unreconCount > 10 ? "red" as const : "yellow" as const }] : []),
          ...(overdueRecCount ? [{ label: `${overdueRecCount} recebível(is) vencido(s)`, severity: "yellow" as const }] : []),
        ],
        stats: [],
      };

      // ── Operações ──
      const [
        { count: pendingOrders },
        { count: stalledOrders },
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["rascunho", "pendente_aprovacao"]),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["aprovado", "liberado_producao"]),
      ]);
      previews.operacoes = {
        alerts: [
          ...(pendingOrders ? [{ label: `${pendingOrders} pedido(s) aguardando`, severity: "yellow" as const }] : []),
          ...(stalledOrders ? [{ label: `${stalledOrders} em produção/liberado`, severity: "green" as const }] : []),
        ],
        stats: [],
      };

      previews.controladoria = { alerts: [], stats: [] };

      // Defaults for others
      previews.relatorios = { alerts: [], stats: [{ label: "KPI's disponíveis", value: "13+" }] };
      previews.cadastros = { alerts: [], stats: [] };
      previews.configuracoes = { alerts: [], stats: [] };

      return previews;
    },
    refetchInterval: 120000,
    staleTime: 60000,
  });
}
