import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Priority levels ──
export type AttentionLevel = "normal" | "atencao" | "urgente" | "bloqueante";

export interface AttentionAlert {
  id: string;
  label: string;
  count: number;
  level: AttentionLevel;
  route: string;
  /** Which sidebar group this alert belongs to */
  group: string;
  /** Which item URL this alert maps to */
  itemUrl?: string;
}

export interface AttentionData {
  alerts: AttentionAlert[];
  /** Total action items */
  totalActions: number;
  /** Get badge count for a specific group */
  getGroupBadge: (groupLabel: string) => { count: number; level: AttentionLevel } | null;
  /** Get badge for a specific item URL */
  getItemBadge: (url: string) => { count: number; level: AttentionLevel } | null;
  isLoading: boolean;
}

function maxLevel(a: AttentionLevel, b: AttentionLevel): AttentionLevel {
  const order: AttentionLevel[] = ["normal", "atencao", "urgente", "bloqueante"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

export function useAttentionLayer(): AttentionData {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["attention-layer", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const today = new Date().toISOString().split("T")[0];
      const alerts: AttentionAlert[] = [];

      // 1. Contas a Pagar vencidas
      const { count: payablesOverdue } = await supabase
        .from("fin_payables")
        .select("id", { count: "exact", head: true })
        .lt("due_date", today)
        .not("status", "in", '("pago","cancelado")');

      if (payablesOverdue && payablesOverdue > 0) {
        alerts.push({
          id: "payables-overdue",
          label: "Contas vencidas",
          count: payablesOverdue,
          level: payablesOverdue > 5 ? "bloqueante" : "urgente",
          route: "/contas-pagar",
          group: "Financeiro",
          itemUrl: "/contas-pagar",
        });
      }

      // 2. Contas a Pagar vencendo hoje
      const { count: payablesToday } = await supabase
        .from("fin_payables")
        .select("id", { count: "exact", head: true })
        .eq("due_date", today)
        .not("status", "in", '("pago","cancelado")');

      if (payablesToday && payablesToday > 0) {
        alerts.push({
          id: "payables-today",
          label: "Vencem hoje",
          count: payablesToday,
          level: "atencao",
          route: "/contas-pagar",
          group: "Financeiro",
          itemUrl: "/contas-pagar",
        });
      }

      // 3. Contas a Receber vencidas
      const { count: receivablesOverdue } = await supabase
        .from("fin_receivables")
        .select("id", { count: "exact", head: true })
        .lt("due_date", today)
        .not("status", "in", '("recebido","cancelado")');

      if (receivablesOverdue && receivablesOverdue > 0) {
        alerts.push({
          id: "receivables-overdue",
          label: "Recebíveis vencidos",
          count: receivablesOverdue,
          level: receivablesOverdue > 3 ? "urgente" : "atencao",
          route: "/contas-receber",
          group: "Financeiro",
          itemUrl: "/contas-receber",
        });
      }

      // 4. Aprovações pendentes
      const { count: pendingApprovals } = await supabase
        .from("approval_instances")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      if (pendingApprovals && pendingApprovals > 0) {
        alerts.push({
          id: "approvals-pending",
          label: "Aprovações pendentes",
          count: pendingApprovals,
          level: pendingApprovals > 3 ? "urgente" : "atencao",
          route: "/aprovacoes",
          group: "Comercial",
          itemUrl: "/pedidos",
        });
      }

      // 5. Pedidos em aberto (não finalizados nem cancelados)
      const { count: openOrders } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .not("status", "in", '("cancelado","concluido","finalizado","entregue")');

      if (openOrders && openOrders > 0) {
        alerts.push({
          id: "orders-open",
          label: "Pedidos em aberto",
          count: openOrders,
          level: openOrders > 20 ? "atencao" : "normal",
          route: "/pedidos",
          group: "Comercial",
          itemUrl: "/pedidos",
        });
      }

      // 5b. Leads novos aguardando triagem
      const { count: newLeads } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "novo");

      if (newLeads && newLeads > 0) {
        alerts.push({
          id: "leads-new",
          label: "Leads novos",
          count: newLeads,
          level: newLeads > 10 ? "urgente" : "atencao",
          route: "/leads",
          group: "Comercial",
          itemUrl: "/leads",
        });
      }

      // 5c. Propostas aguardando ação (enviadas/em negociação)
      const { count: openProposals } = await supabase
        .from("crm_proposals")
        .select("id", { count: "exact", head: true })
        .in("status", ["enviada", "negociacao"]);

      if (openProposals && openProposals > 0) {
        alerts.push({
          id: "proposals-pending",
          label: "Propostas aguardando",
          count: openProposals,
          level: "atencao",
          route: "/propostas",
          group: "Comercial",
          itemUrl: "/propostas",
        });
      }

      // 6. Produção pendente
      const { count: pendingProduction } = await supabase
        .from("production_orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["pendente", "em_producao"]);

      if (pendingProduction && pendingProduction > 0) {
        alerts.push({
          id: "production-pending",
          label: "OPs em andamento",
          count: pendingProduction,
          level: "normal",
          route: "/producao",
          group: "Operações",
          itemUrl: "/producao",
        });
      }

      // 7. Lançamentos não conciliados
      const { count: unconciled } = await supabase
        .from("fin_ledger_entries")
        .select("id", { count: "exact", head: true })
        .eq("reconciled", false);

      if (unconciled && unconciled > 0) {
        alerts.push({
          id: "reconciliation-pending",
          label: "Conciliações pendentes",
          count: unconciled,
          level: unconciled > 20 ? "atencao" : "normal",
          route: "/conciliacao",
          group: "Financeiro",
          itemUrl: "/conciliacao",
        });
      }

      return alerts;
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
    staleTime: 2 * 60 * 1000,
  });

  const alerts = data || [];
  const totalActions = alerts.reduce((s, a) => s + a.count, 0);

  const getGroupBadge = (groupLabel: string) => {
    const groupAlerts = alerts.filter(a => a.group === groupLabel);
    if (groupAlerts.length === 0) return null;
    const count = groupAlerts.reduce((s, a) => s + a.count, 0);
    const level = groupAlerts.reduce<AttentionLevel>((l, a) => maxLevel(l, a.level), "normal");
    return { count, level };
  };

  const getItemBadge = (url: string) => {
    const itemAlerts = alerts.filter(a => a.itemUrl === url);
    if (itemAlerts.length === 0) return null;
    const count = itemAlerts.reduce((s, a) => s + a.count, 0);
    const level = itemAlerts.reduce<AttentionLevel>((l, a) => maxLevel(l, a.level), "normal");
    return { count, level };
  };

  return { alerts, totalActions, getGroupBadge, getItemBadge, isLoading };
}
