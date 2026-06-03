import { useQuery } from "@tanstack/react-query";
import { auditStub } from "@/lib/audit-stub";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CollabFilter = "mine" | "financeiro" | "comercial" | "operacional";

export interface CollabTask {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  assigneeName: string | null;
  assigneeId: string | null;
  module: string | null;
  isOverdue: boolean;
  isUnassigned: boolean;
}

export interface CollabEvent {
  id: string;
  description: string;
  actorName: string | null;
  actorId: string | null;
  action: string;
  timestamp: string;
  entityTable: string | null;
  entityId: string | null;
}

export interface BottleneckAlert {
  type: "unassigned" | "overdue";
  count: number;
  label: string;
}

export function useCollaborationLayer(filter: CollabFilter = "mine") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["collaboration-layer", user?.id, filter],
    queryFn: async () => {
      const now = new Date().toISOString();

      // ── Fetch tasks ──
      let taskQuery = supabase
        .from("erp_tasks")
        .select("id, title, status, priority, due_date, assignee_id, module, category")
        .in("status", ["pendente", "em_andamento"])
        .order("due_date", { ascending: true })
        .limit(50);

      if (filter === "mine" && user?.id) {
        taskQuery = taskQuery.or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`);
      } else if (filter !== "mine") {
        taskQuery = taskQuery.eq("module", filter);
      }

      const { data: rawTasks } = await taskQuery;
      const tasks = ((rawTasks || []) as any[]);

      // Get assignee names
      const assigneeIds = [...new Set(tasks.map((t) => t.assignee_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", assigneeIds.slice(0, 20));
        for (const p of (profiles || []) as any[]) {
          profileMap[p.id] = p.full_name || "Usuário";
        }
      }

      const collabTasks: CollabTask[] = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
        assigneeName: t.assignee_id ? (profileMap[t.assignee_id] || "Usuário") : null,
        assigneeId: t.assignee_id,
        module: t.module,
        isOverdue: t.due_date ? new Date(t.due_date) < new Date(now) : false,
        isUnassigned: !t.assignee_id,
      }));

      // ── Assigned by me ──
      const assignedByMe = collabTasks.filter((t) => t.assigneeId && t.assigneeId !== user?.id);
      const assignedToMe = collabTasks.filter((t) => t.assigneeId === user?.id);
      const overdue = collabTasks.filter((t) => t.isOverdue);

      // ── Recent collaborative events (audit_log) ──
      const { data: rawEvents } = await auditStub()
        .select("id, event_type, table_name, record_id, user_id, created_at, metadata")
        .in("event_type", ["APPROVE", "UPDATE", "CREATE"])
        .order("created_at", { ascending: false })
        .limit(10);

      const eventUserIds = [...new Set(((rawEvents || []) as any[]).map((e) => e.user_id).filter(Boolean))];
      let eventProfileMap: Record<string, string> = {};
      if (eventUserIds.length > 0) {
        const { data: ep } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", eventUserIds.slice(0, 20));
        for (const p of (ep || []) as any[]) {
          eventProfileMap[p.id] = p.full_name || "Usuário";
        }
      }

      const actionLabels: Record<string, string> = {
        APPROVE: "aprovou",
        UPDATE: "editou",
        CREATE: "criou",
      };

      const collabEvents: CollabEvent[] = ((rawEvents || []) as any[]).map((e) => ({
        id: e.id,
        description: `${actionLabels[e.event_type] || e.event_type} em ${e.table_name}`,
        actorName: e.user_id ? (eventProfileMap[e.user_id] || "Usuário") : null,
        actorId: e.user_id,
        action: e.event_type,
        timestamp: e.created_at,
        entityTable: e.table_name,
        entityId: e.record_id,
      }));

      // ── Bottleneck Detection ──
      const bottlenecks: BottleneckAlert[] = [];

      const unassigned = collabTasks.filter((t) => t.isUnassigned).length;
      if (unassigned > 0) {
        bottlenecks.push({ type: "unassigned", count: unassigned, label: `${unassigned} tarefa(s) sem responsável` });
      }

      if (overdue.length > 0) {
        bottlenecks.push({ type: "overdue", count: overdue.length, label: `${overdue.length} tarefa(s) atrasada(s)` });
      }




      return {
        assignedToMe,
        assignedByMe,
        overdue,
        allTasks: collabTasks,
        events: collabEvents,
        bottlenecks,
      };
    },
    refetchInterval: 60000,
  });
}
