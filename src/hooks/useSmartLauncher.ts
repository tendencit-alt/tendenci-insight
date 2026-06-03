import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissionsContext } from "@/contexts/PermissionsContext";
import { format, differenceInDays } from "date-fns";

// ─── Types ───
export interface ActionItem {
  id: string;
  label: string;
  detail: string;
  severity: "green" | "yellow" | "red";
  route: string;
  amount?: number;
  count?: number;
}

export interface ContinueItem {
  label: string;
  route: string;
  time: string;
  type: "pedido" | "relatorio" | "conciliacao" | "financeiro" | "outro";
}

export type UserProfile = "owner" | "financeiro" | "comercial" | "operacional" | "geral";

// ─── Detect user profile for layout ordering ───
export function useUserProfile(): UserProfile {
  const { permissions } = usePermissionsContext();
  const role = permissions?.role?.toLowerCase() || "";
  if (role.includes("owner") || role === "master") return "owner";
  if (role.includes("financ") || role.includes("contab")) return "financeiro";
  if (role.includes("comercial") || role.includes("vendas")) return "comercial";
  if (role.includes("operac") || role.includes("produc")) return "operacional";
  return "geral";
}

// ─── "Hoje Preciso Fazer" block ───
export function useActionItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["smart-launcher-actions", user?.id],
    queryFn: async () => {
      const items: ActionItem[] = [];
      const today = format(new Date(), "yyyy-MM-dd");

      // 1. Overdue payables
      const { data: overdue, count: overdueCount } = await supabase
        .from("fin_payables")
        .select("id, description, amount, due_date", { count: "exact" })
        .in("status", ["ABERTO", "VENCIDO"])
        .lt("due_date", today)
        .order("due_date")
        .limit(1);

      if (overdueCount && overdueCount > 0) {
        const totalAmount = overdue?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
        items.push({
          id: "overdue-payables",
          label: `${overdueCount} conta(s) vencida(s)`,
          detail: `R$ ${totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em atraso`,
          severity: overdueCount > 3 ? "red" : "yellow",
          route: "/financeiro",
          amount: totalAmount,
          count: overdueCount,
        });
      }

      // 2. Pending reconciliation
      const { count: unreconciledCount } = await supabase
        .from("fin_bank_transactions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      if (unreconciledCount && unreconciledCount > 0) {
        items.push({
          id: "pending-reconciliation",
          label: `${unreconciledCount} transação(ões) sem conciliar`,
          detail: "Conciliação bancária pendente",
          severity: unreconciledCount > 10 ? "red" : "yellow",
          route: "/financeiro",
          count: unreconciledCount,
        });
      }




      // 4. Overdue receivables
      const { count: overdueRecCount } = await supabase
        .from("fin_receivables")
        .select("id", { count: "exact", head: true })
        .in("status", ["ABERTO", "VENCIDO"])
        .lt("due_date", today);

      if (overdueRecCount && overdueRecCount > 0) {
        items.push({
          id: "overdue-receivables",
          label: `${overdueRecCount} recebível(is) vencido(s)`,
          detail: "Cobranças em atraso",
          severity: overdueRecCount > 3 ? "red" : "yellow",
          route: "/financeiro",
          count: overdueRecCount,
        });
      }

      // 5. Critical tasks overdue
      const { count: critTaskCount } = await supabase
        .from("erp_tasks")
        .select("id", { count: "exact", head: true })
        .in("status", ["pendente", "em_andamento"])
        .eq("priority", "critica")
        .lt("due_date", new Date().toISOString());

      if (critTaskCount && critTaskCount > 0) {
        items.push({
          id: "critical-tasks",
          label: `${critTaskCount} tarefa(s) crítica(s) atrasada(s)`,
          detail: "Requer atenção imediata",
          severity: "red",
          route: "/tarefas",
          count: critTaskCount,
        });
      }

      // Sort by severity (red first), limit to 5
      const order = { red: 0, yellow: 1, green: 2 };
      return items.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 5);
    },
    refetchInterval: 120000,
  });
}

// ─── Continue where left off ───
export function useContinueItems(): ContinueItem[] {
  try {
    const stored = localStorage.getItem("erp-home-recents");
    if (!stored) return [];
    const recents: { label: string; route: string; time: string }[] = JSON.parse(stored);
    return recents.slice(0, 4).map((r) => ({
      ...r,
      type: r.route.includes("pedido") ? "pedido"
        : r.route.includes("relatorio") ? "relatorio"
        : r.route.includes("concilia") ? "conciliacao"
        : r.route.includes("financeiro") ? "financeiro"
        : "outro",
    }));
  } catch {
    return [];
  }
}

// ─── Profile-based module ordering ───
export function getModuleOrder(profile: UserProfile): string[] {
  switch (profile) {
    case "owner":
      return ["controladoria", "financeiro", "operacoes", "relatorios", "cadastros", "configuracoes"];
    case "financeiro":
      return ["financeiro", "controladoria", "operacoes", "relatorios", "cadastros", "configuracoes"];
    case "comercial":
      return ["operacoes", "cadastros", "relatorios", "financeiro", "controladoria", "configuracoes"];
    case "operacional":
      return ["operacoes", "financeiro", "relatorios", "cadastros", "controladoria", "configuracoes"];
    default:
      return ["operacoes", "financeiro", "controladoria", "relatorios", "cadastros", "configuracoes"];
  }
}
