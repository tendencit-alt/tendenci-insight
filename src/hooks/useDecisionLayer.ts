import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface DecisionSuggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  route: string;
  priority: 1 | 2 | 3; // 1=critical, 2=relevant, 3=recommended
  impact: {
    type: "caixa" | "resultado" | "faturamento";
    label: string;
    amount?: number;
    formatted?: string;
  };
}

export interface TimelineEvent {
  id: string;
  date: string;
  label: string;
  type: "payment" | "receivable" | "delivery" | "order";
  amount?: number;
  formatted?: string;
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function useDecisionSuggestions() {
  return useQuery({
    queryKey: ["decision-suggestions"],
    queryFn: async (): Promise<DecisionSuggestion[]> => {
      const suggestions: DecisionSuggestion[] = [];
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const _next7 = format(addDays(now, 7), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
      const prevMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

      // 1. Overdue payables → suggest postpone
      const overduePayRes = await supabase
        .from("fin_payables")
        .select("id, amount")
        .in("status", ["ABERTO", "VENCIDO"])
        .lt("due_date", today);
      const overduePayCount = overduePayRes.data?.length || 0;
      const overduePayAmt = overduePayRes.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;

      if (overduePayCount > 0) {
        suggestions.push({
          id: "overdue-pay",
          title: `${overduePayCount} conta(s) vencida(s)`,
          description: `Total ${fmt(overduePayAmt)} em atraso. Considere renegociar prazos.`,
          action: "Postergar pagamentos",
          route: "/financeiro",
          priority: overduePayCount > 3 ? 1 : 2,
          impact: { type: "caixa", label: `Impacto caixa: ${fmt(overduePayAmt)}`, amount: overduePayAmt, formatted: fmt(overduePayAmt) },
        });
      }

      // 2. Overdue receivables → suggest accelerate collection
      const overdueRecRes = await supabase
        .from("fin_receivables")
        .select("id, amount")
        .in("status", ["ABERTO", "VENCIDO"])
        .lt("due_date", today);
      const overdueRecCount = overdueRecRes.data?.length || 0;
      const overdueRecAmt = overdueRecRes.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;

      if (overdueRecCount > 0) {
        suggestions.push({
          id: "overdue-rec",
          title: `${overdueRecCount} recebível(is) em atraso`,
          description: `Total ${fmt(overdueRecAmt)} a cobrar. Antecipe recebíveis.`,
          action: "Antecipar recebíveis",
          route: "/financeiro",
          priority: overdueRecCount > 3 ? 1 : 2,
          impact: { type: "caixa", label: `Impacto caixa: +${fmt(overdueRecAmt)}`, amount: overdueRecAmt, formatted: fmt(overdueRecAmt) },
        });
      }

      // 3. Pending reconciliation → suggest reconcile
      const unreconRes = await supabase
        .from("fin_bank_transactions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      const unreconCount = unreconRes.count || 0;

      if (unreconCount > 5) {
        suggestions.push({
          id: "pending-recon",
          title: `${unreconCount} transações sem conciliar`,
          description: "Conciliação pendente pode mascarar erros financeiros.",
          action: "Executar conciliação",
          route: "/financeiro",
          priority: unreconCount > 20 ? 1 : 3,
          impact: { type: "resultado", label: "Impacto: visibilidade financeira" },
        });
      }

      // 4. Stalled orders → suggest release production
      const stalledRes = await supabase
        .from("orders")
        .select("id, total")
        .in("status", ["aprovado", "pendente_aprovacao"])
        .lt("updated_at", format(addDays(now, -3), "yyyy-MM-dd'T'HH:mm:ss")) as unknown as { data: { id: string; total: number | null }[] | null };
      const stalledCount = stalledRes.data?.length || 0;
      const stalledAmt = stalledRes.data?.reduce((s, r) => s + Number(r.total || 0), 0) || 0;

      if (stalledCount > 0) {
        suggestions.push({
          id: "stalled-orders",
          title: `${stalledCount} pedido(s) parado(s)`,
          description: "Pedidos aprovados sem progressão há 3+ dias.",
          action: "Liberar produção",
          route: "/pedidos",
          priority: 2,
          impact: { type: "faturamento", label: `Impacto faturamento: ${fmt(stalledAmt)}`, amount: stalledAmt, formatted: fmt(stalledAmt) },
        });
      }

      // 5. Revenue declining → suggest review expenses
      const ledgerQ = (et: string, d1: string, d2: string) =>
        (supabase.from("fin_ledger_entries").select("amount") as any).eq("entry_type", et).gte("competence_date", d1).lte("competence_date", d2);
      const revRes = await ledgerQ("credit", monthStart, monthEnd) as { data: { amount: number | null }[] | null };
      const prevRevRes = await ledgerQ("credit", prevMonthStart, prevMonthEnd) as { data: { amount: number | null }[] | null };

      const revenue = revRes.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const prevRevenue = prevRevRes.data?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;

      if (prevRevenue > 0 && revenue < prevRevenue * 0.7) {
        const diff = prevRevenue - revenue;
        suggestions.push({
          id: "revenue-drop",
          title: "Receita abaixo da meta",
          description: `Receita ${((revenue / prevRevenue) * 100).toFixed(0)}% do mês anterior.`,
          action: "Revisar despesas variáveis",
          route: "/dashboard",
          priority: 1,
          impact: { type: "resultado", label: `Impacto resultado: -${fmt(diff)}`, amount: diff, formatted: fmt(diff) },
        });
      }

      // Sort by priority, limit 3
      return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 3);
    },
    refetchInterval: 180000,
    staleTime: 90000,
  });
}

export function useOperationalTimeline() {
  return useQuery({
    queryKey: ["operational-timeline-7d"],
    queryFn: async (): Promise<TimelineEvent[]> => {
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const next7 = format(addDays(now, 7), "yyyy-MM-dd");
      const events: TimelineEvent[] = [];

      // Upcoming payables
      const payRes = await supabase
        .from("fin_payables")
        .select("id, description, amount, due_date")
        .in("status", ["ABERTO", "CONFIRMADO"])
        .gte("due_date", today)
        .lte("due_date", next7)
        .order("due_date")
        .limit(10);

      payRes.data?.forEach((r) => {
        events.push({
          id: `pay-${r.id}`,
          date: r.due_date,
          label: r.description || "Pagamento",
          type: "payment",
          amount: Number(r.amount || 0),
          formatted: fmt(Number(r.amount || 0)),
        });
      });

      // Upcoming receivables
      const recRes = await supabase
        .from("fin_receivables")
        .select("id, description, amount, due_date")
        .in("status", ["ABERTO", "CONFIRMADO"])
        .gte("due_date", today)
        .lte("due_date", next7)
        .order("due_date")
        .limit(10);

      recRes.data?.forEach((r) => {
        events.push({
          id: `rec-${r.id}`,
          date: r.due_date,
          label: r.description || "Recebimento",
          type: "receivable",
          amount: Number(r.amount || 0),
          formatted: fmt(Number(r.amount || 0)),
        });
      });

      // Sort by date
      return events.sort((a, b) => a.date.localeCompare(b.date));
    },
    refetchInterval: 300000,
    staleTime: 120000,
  });
}
