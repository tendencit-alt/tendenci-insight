import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, format } from "date-fns";

export interface CriticalAlert {
  id: string;
  type: "overdue_payment" | "stalled_order" | "late_production" | "goal_risk" | "missing_doc";
  title: string;
  description: string;
  severity: "critical" | "high";
  link?: string;
  days?: number;
  amount?: number;
}

export interface AgendaItem {
  id: string;
  type: "delivery" | "payment" | "receivable" | "production";
  title: string;
  detail: string;
  time?: string;
  amount?: number;
}

export interface RecentEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  module: string;
}

export interface QuickIndicator {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

export function useCriticalAlerts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["central-op-critical-alerts", user?.id],
    queryFn: async () => {
      const alerts: CriticalAlert[] = [];
      const today = format(new Date(), "yyyy-MM-dd");

      // 1. Overdue payables
      const { data: overduePayables } = await supabase
        .from("fin_payables")
        .select("id, description, amount, due_date, status")
        .in("status", ["ABERTO", "VENCIDO"])
        .lt("due_date", today)
        .order("due_date")
        .limit(5);

      overduePayables?.forEach((p) => {
        const days = differenceInDays(new Date(), new Date(p.due_date));
        alerts.push({
          id: `pay-${p.id}`,
          type: "overdue_payment",
          title: `Conta vencida há ${days} dia(s)`,
          description: p.description || "Conta a pagar",
          severity: days > 7 ? "critical" : "high",
          link: "/financeiro",
          days,
          amount: Number(p.amount),
        });
      });

      // 2. Overdue receivables
      const { data: overdueReceivables } = await supabase
        .from("fin_receivables")
        .select("id, description, amount, due_date, status")
        .in("status", ["ABERTO", "VENCIDO"])
        .lt("due_date", today)
        .order("due_date")
        .limit(5);

      overdueReceivables?.forEach((r) => {
        const days = differenceInDays(new Date(), new Date(r.due_date));
        alerts.push({
          id: `rec-${r.id}`,
          type: "overdue_payment",
          title: `Recebível vencido há ${days} dia(s)`,
          description: r.description || "Conta a receber",
          severity: days > 7 ? "critical" : "high",
          link: "/financeiro",
          days,
          amount: Number(r.amount),
        });
      });




      // 4. Stalled orders
      const { data: stalledOrders } = await supabase
        .from("orders")
        .select("id, order_number, status, updated_at")
        .in("status", ["aprovado", "liberado_producao"])
        .order("updated_at")
        .limit(5);

      stalledOrders?.forEach((o) => {
        const days = differenceInDays(new Date(), new Date(o.updated_at));
        if (days >= 5) {
          alerts.push({
            id: `ord-${o.id}`,
            type: "stalled_order",
            title: `Pedido #${o.order_number} parado`,
            description: `Sem movimentação há ${days} dias`,
            severity: days > 10 ? "critical" : "high",
            link: "/pedidos",
            days,
          });
        }
      });

      // 5. Overdue tasks (critical priority)
      const { data: criticalTasks } = await supabase
        .from("erp_tasks")
        .select("id, title, due_date, priority")
        .in("status", ["pendente", "em_andamento"])
        .eq("priority", "critica")
        .lt("due_date", new Date().toISOString())
        .limit(5);

      criticalTasks?.forEach((t) => {
        alerts.push({
          id: `task-${t.id}`,
          type: "late_production",
          title: t.title,
          description: "Tarefa crítica atrasada",
          severity: "critical",
          link: "/tarefas",
        });
      });

      return alerts.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1));
    },
    refetchInterval: 120000,
  });
}

export function useTodayAgenda() {
  return useQuery({
    queryKey: ["central-op-agenda"],
    queryFn: async () => {
      const items: AgendaItem[] = [];
      const today = format(new Date(), "yyyy-MM-dd");

      // Payments due today
      const { data: payToday } = await supabase
        .from("fin_payables")
        .select("id, description, amount, due_date")
        .eq("due_date", today)
        .in("status", ["ABERTO", "CONFIRMADO"])
        .limit(10);

      payToday?.forEach((p) => {
        items.push({
          id: `pay-${p.id}`,
          type: "payment",
          title: p.description || "Pagamento",
          detail: `R$ ${Number(p.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          amount: Number(p.amount),
        });
      });

      // Receivables due today
      const { data: recToday } = await supabase
        .from("fin_receivables")
        .select("id, description, amount, due_date")
        .eq("due_date", today)
        .in("status", ["ABERTO", "CONFIRMADO"])
        .limit(10);

      recToday?.forEach((r) => {
        items.push({
          id: `rec-${r.id}`,
          type: "receivable",
          title: r.description || "Recebimento",
          detail: `R$ ${Number(r.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          amount: Number(r.amount),
        });
      });

      return items;
    },
    refetchInterval: 120000,
  });
}

export function useRecentEvents() {
  return useQuery({
    queryKey: ["central-op-recent-events"],
    queryFn: async () => {
      const events: RecentEvent[] = [];

      // Recent cross-module events
      const { data: crossEvents } = await supabase
        .from("cross_module_events")
        .select("id, event_type, payload, created_at, source_module")
        .order("created_at", { ascending: false })
        .limit(15);

      crossEvents?.forEach((e) => {
        events.push({
          id: e.id,
          type: e.event_type,
          description: formatEventType(e.event_type, e.payload as any),
          timestamp: e.created_at,
          module: e.source_module || "sistema",
        });
      });

      return events;
    },
    refetchInterval: 120000,
  });
}

export function useQuickIndicators() {
  return useQuery({
    queryKey: ["central-op-indicators"],
    queryFn: async () => {
      const indicators: QuickIndicator[] = [];
      const today = format(new Date(), "yyyy-MM-dd");

      // Pending tasks count
      const { count: pendingTasks } = await supabase
        .from("erp_tasks")
        .select("id", { count: "exact", head: true })
        .in("status", ["pendente", "em_andamento"]);

      indicators.push({
        label: "Tarefas Pendentes",
        value: pendingTasks || 0,
        color: (pendingTasks || 0) > 10 ? "text-destructive" : "text-foreground",
      });




      // Overdue financial
      const { count: overdueCount } = await supabase
        .from("fin_payables")
        .select("id", { count: "exact", head: true })
        .in("status", ["ABERTO", "VENCIDO"])
        .lt("due_date", today);

      indicators.push({
        label: "Contas Vencidas",
        value: overdueCount || 0,
        color: (overdueCount || 0) > 0 ? "text-destructive" : "text-green-600",
      });

      // Active orders
      const { count: activeOrders } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["aprovado", "liberado_producao", "em_producao"]);

      indicators.push({
        label: "Pedidos Ativos",
        value: activeOrders || 0,
      });

      return indicators;
    },
    refetchInterval: 120000,
  });
}

function formatEventType(type: string, _payload?: any): string {
  const map: Record<string, string> = {
    "order.approved": "Pedido aprovado",
    "order.cancelled": "Pedido cancelado",
    "payment.completed": "Pagamento realizado",
    "receivable.completed": "Recebimento registrado",
    "production.completed": "Produção concluída",
  };
  return map[type] || type.replace(/[._]/g, " ");
}
