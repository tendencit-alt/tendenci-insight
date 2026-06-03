import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

// ── Types ──
export type NotificationPriority = "informativa" | "atencao" | "urgente" | "critica";
export type NotificationChannel = "in-app" | "email" | "push";

export interface SmartNotification {
  id: string;
  title: string;
  message: string | null;
  module: string;
  category: string;
  priority: NotificationPriority;
  channel: string | null;
  is_read: boolean;
  created_at: string;
  link_path: string | null;
  entity_id: string | null;
  entity_table: string | null;
  /** Computed: can the user act on it directly? */
  actionable: boolean;
  /** Computed: action type for quick execution */
  actionType: string | null;
  /** Computed: action label */
  actionLabel: string | null;
}

export interface DailySummary {
  contasVencidas: number;
  conciliacoesPendentes: number;
  pedidosAguardando: number;
  aprovacoesPendentes: number;
  ordensAtrasadas: number;
  totalCritico: number;
}

export interface WeeklySummary {
  receitaSemana: number;
  despesaSemana: number;
  resultadoSemana: number;
  metasAtingidas: number;
  metasTotal: number;
  fluxoPrevisto: number;
}

type RoleKey = "owner" | "financeiro" | "comercial" | "operacional" | "admin";

// ── Priority classification logic ──
function classifyPriority(n: any): NotificationPriority {
  const p = n.priority as string;
  if (p === "critica" || p === "bloqueante") return "critica";
  if (p === "urgente" || p === "alta") return "urgente";
  if (p === "atencao" || p === "media") return "atencao";
  return "informativa";
}

// ── Action detection ──
const ACTIONABLE_MAP: Record<string, { type: string; label: string }> = {
  "contas-pagar": { type: "pagar_conta", label: "Pagar" },
  "contas-receber": { type: "registrar_recebimento", label: "Receber" },
  "conciliacao": { type: "conciliar", label: "Conciliar" },
  "aprovacao": { type: "aprovar", label: "Aprovar" },
  "pedidos": { type: "ver_pedido", label: "Ver Pedido" },
  "producao": { type: "ver_op", label: "Ver OP" },
};

function detectAction(n: any): { actionable: boolean; actionType: string | null; actionLabel: string | null } {
  const cat = n.category as string;
  const match = ACTIONABLE_MAP[cat];
  if (match && n.link_path) {
    return { actionable: true, actionType: match.type, actionLabel: match.label };
  }
  return { actionable: false, actionType: null, actionLabel: null };
}

// ── Profile-based relevance sorting ──
const ROLE_MODULE_PRIORITY: Record<RoleKey, string[]> = {
  owner: ["financeiro", "planejamento", "controladoria", "comercial"],
  financeiro: ["financeiro", "controladoria", "comercial"],
  comercial: ["comercial", "operacional"],
  operacional: ["operacional", "comercial"],
  admin: [],
};

const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  critica: 4,
  urgente: 3,
  atencao: 2,
  informativa: 1,
};

function resolveRole(level: string): RoleKey {
  if (level === "system_owner" || level === "tenant_owner") return "owner";
  return "admin";
}

// ── Smart silence: detect ignored notification patterns ──
const SILENCE_THRESHOLD = 5; // If ignored N+ times in same category, reduce

// ── Hook ──
export function useNotificationIntelligence() {
  const { user } = useAuth();
  const { userLevel } = usePermissions();
  const queryClient = useQueryClient();
  const role = resolveRole(userLevel);

  // Fetch notifications
  const { data: rawNotifications, isLoading, refetch } = useQuery({
    queryKey: ["notification-intelligence", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("erp_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("notification-intelligence-rt")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "erp_notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refetch]);

  // Fetch daily summary counts
  const { data: dailySummary } = useQuery({
    queryKey: ["daily-summary", user?.id],
    queryFn: async (): Promise<DailySummary> => {
      const today = new Date().toISOString().split("T")[0];

      const [payables, receivables, orders, production] = await Promise.all([
        supabase.from("fin_payables").select("id", { count: "exact", head: true })
          .lt("due_date", today).not("status", "in", '("pago","cancelado")'),
        supabase.from("fin_receivables").select("id", { count: "exact", head: true })
          .lt("due_date", today).not("status", "in", '("recebido","cancelado")'),
        supabase.from("orders").select("id", { count: "exact", head: true })
          .in("status", ["rascunho", "negociacao"]),
        supabase.from("production_orders").select("id", { count: "exact", head: true })
          .in("status", ["pendente", "atrasado"]),
      ]);

      const cv = payables.count || 0;
      const cp = 0; // conciliações from attention layer
      const pa = 0;
      const po = orders.count || 0;
      const oa = production.count || 0;
      const rv = receivables.count || 0;

      return {
        contasVencidas: cv + rv,
        conciliacoesPendentes: cp,
        pedidosAguardando: po,
        aprovacoesPendentes: pa,
        ordensAtrasadas: oa,
        totalCritico: cv + rv,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });

  // Process notifications with intelligence
  const notifications: SmartNotification[] = useMemo(() => {
    if (!rawNotifications) return [];

    // Detect ignored patterns for smart silence
    const readByCategory = new Map<string, number>();
    const unreadByCategory = new Map<string, number>();

    rawNotifications.forEach((n: any) => {
      const cat = n.category;
      if (n.is_read) {
        readByCategory.set(cat, (readByCategory.get(cat) || 0) + 1);
      } else {
        unreadByCategory.set(cat, (unreadByCategory.get(cat) || 0) + 1);
      }
    });

    // Categories where user consistently ignores notifications
    const silencedCategories = new Set<string>();
    unreadByCategory.forEach((count, cat) => {
      const readCount = readByCategory.get(cat) || 0;
      if (count >= SILENCE_THRESHOLD && readCount === 0) {
        silencedCategories.add(cat);
      }
    });

    const modulePriority = ROLE_MODULE_PRIORITY[role] || [];

    return rawNotifications
      .map((n: any): SmartNotification => {
        const priority = classifyPriority(n);
        const { actionable, actionType, actionLabel } = detectAction(n);
        return {
          id: n.id,
          title: n.title,
          message: n.message,
          module: n.module,
          category: n.category,
          priority,
          channel: n.channel,
          is_read: n.is_read ?? false,
          created_at: n.created_at,
          link_path: n.link_path,
          entity_id: n.entity_id,
          entity_table: n.entity_table,
          actionable,
          actionType,
          actionLabel,
        };
      })
      .filter((n) => {
        // Smart silence: demote silenced categories (still show critica)
        if (silencedCategories.has(n.category) && n.priority === "informativa") {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort: unread first, then by priority, then by role-relevance
        if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
        const pa = PRIORITY_ORDER[a.priority] || 0;
        const pb = PRIORITY_ORDER[b.priority] || 0;
        if (pa !== pb) return pb - pa;
        // Role-based module priority
        const ma = modulePriority.indexOf(a.module);
        const mb = modulePriority.indexOf(b.module);
        const maPrio = ma >= 0 ? ma : 99;
        const mbPrio = mb >= 0 ? mb : 99;
        if (maPrio !== mbPrio) return maPrio - mbPrio;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [rawNotifications, role]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);
  const criticalCount = useMemo(() => notifications.filter(n => !n.is_read && (n.priority === "critica" || n.priority === "urgente")).length, [notifications]);

  // Group by priority for display
  const grouped = useMemo(() => {
    const groups: Record<NotificationPriority, SmartNotification[]> = {
      critica: [],
      urgente: [],
      atencao: [],
      informativa: [],
    };
    notifications.filter(n => !n.is_read).forEach(n => groups[n.priority].push(n));
    return groups;
  }, [notifications]);

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("erp_notifications").update({
      is_read: true,
      read_at: new Date().toISOString(),
    }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notification-intelligence"] });
  }, [queryClient]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    await supabase.from("erp_notifications").update({
      is_read: true,
      read_at: new Date().toISOString(),
    }).eq("user_id", user.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notification-intelligence"] });
  }, [user?.id, queryClient]);

  return {
    notifications,
    unreadCount,
    criticalCount,
    grouped,
    dailySummary: dailySummary || null,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch,
    role,
  };
}
