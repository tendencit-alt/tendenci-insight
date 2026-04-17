import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionableNotificationItem } from "./ActionableNotificationItem";
import { PriorityBadge } from "./PriorityBadge";
import type { SmartNotification, NotificationPriority } from "@/hooks/useNotificationIntelligence";

interface Props {
  title: string;
  priority?: NotificationPriority;
  notifications: SmartNotification[];
  onMarkRead: (id: string) => void;
  defaultOpen?: boolean;
}

export function NotificationGroup({ title, priority, notifications, onMarkRead, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (notifications.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-1 py-1 text-left hover:bg-muted/50 rounded"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        {priority && <PriorityBadge priority={priority} showIcon={false} />}
        <span className="ml-auto text-xs text-muted-foreground">{notifications.length}</span>
      </button>
      {open && (
        <div className={cn("space-y-1.5", "pl-1")}>
          {notifications.map((n) => (
            <ActionableNotificationItem key={n.id} notification={n} onMarkRead={onMarkRead} />
          ))}
        </div>
      )}
    </div>
  );
}

// Group notifications by category with smart summary headlines
export function groupBySummary(notifications: SmartNotification[]): Array<{ key: string; label: string; items: SmartNotification[] }> {
  const map = new Map<string, SmartNotification[]>();
  notifications.forEach((n) => {
    const key = `${n.module}:${n.category}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(n);
  });

  return Array.from(map.entries())
    .map(([key, items]) => {
      const [module, category] = key.split(":");
      const label = buildSummaryLabel(module, category, items.length);
      return { key, label, items };
    })
    .sort((a, b) => b.items.length - a.items.length);
}

function buildSummaryLabel(module: string, category: string, count: number): string {
  const labels: Record<string, (n: number) => string> = {
    "contas-pagar": (n) => `${n} ${n === 1 ? "conta vence" : "contas vencem"}`,
    "contas-receber": (n) => `${n} ${n === 1 ? "recebimento previsto" : "recebimentos previstos"}`,
    "conciliacao": (n) => `${n} ${n === 1 ? "conciliação pendente" : "conciliações pendentes"}`,
    "aprovacao": (n) => `${n} ${n === 1 ? "aprovação pendente" : "aprovações pendentes"}`,
    "pedidos": (n) => `${n} ${n === 1 ? "pedido aguardando" : "pedidos aguardando"}`,
    "producao": (n) => `${n} OP${n === 1 ? "" : "s"} em andamento`,
    "integracao": (n) => `${n} ${n === 1 ? "integração com erro" : "integrações com erro"}`,
  };
  return labels[category]?.(count) || `${count} ${module} · ${category}`;
}
