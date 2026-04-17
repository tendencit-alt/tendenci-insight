import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useNotificationIntelligence } from "@/hooks/useNotificationIntelligence";
import { ActionableNotificationItem } from "./ActionableNotificationItem";
import { NotificationGroup, groupBySummary } from "./NotificationGroup";
import { DailyDigest } from "./DailyDigest";

type ViewMode = "all" | "grouped" | "digest";

export function SmartNotificationCenter() {
  const { notifications, grouped, unreadCount, markAsRead, markAllAsRead, dailySummary } =
    useNotificationIntelligence();
  const [filter, setFilter] = useState<"unread" | "all">("unread");
  const [view, setView] = useState<ViewMode>("grouped");

  const visible = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications),
    [notifications, filter]
  );

  const summaryGroups = useMemo(() => groupBySummary(visible), [visible]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">({unreadCount} não lidas)</span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
            <CheckCheck className="h-3 w-3 mr-1" />
            Marcar todas
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30">
        <Button
          size="sm"
          variant={filter === "unread" ? "secondary" : "ghost"}
          className="h-6 text-xs"
          onClick={() => setFilter("unread")}
        >
          Não lidas
        </Button>
        <Button
          size="sm"
          variant={filter === "all" ? "secondary" : "ghost"}
          className="h-6 text-xs"
          onClick={() => setFilter("all")}
        >
          Todas
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant={view === "grouped" ? "secondary" : "ghost"}
            className="h-6 text-xs"
            onClick={() => setView("grouped")}
          >
            Agrupar
          </Button>
          <Button
            size="sm"
            variant={view === "all" ? "secondary" : "ghost"}
            className="h-6 text-xs"
            onClick={() => setView("all")}
          >
            Lista
          </Button>
          <Button
            size="sm"
            variant={view === "digest" ? "secondary" : "ghost"}
            className="h-6 text-xs"
            onClick={() => setView("digest")}
          >
            Resumo
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {view === "digest" && <DailyDigest />}

          {view === "grouped" && (
            <>
              {(["critica", "urgente", "atencao", "informativa"] as const).map((p) => {
                const items = grouped[p].filter((n) => filter === "all" || !n.is_read);
                if (items.length === 0) return null;
                return (
                  <NotificationGroup
                    key={p}
                    title={p === "critica" ? "Crítica" : p === "urgente" ? "Urgente" : p === "atencao" ? "Atenção" : "Informativa"}
                    priority={p}
                    notifications={items}
                    onMarkRead={markAsRead}
                    defaultOpen={p === "critica" || p === "urgente"}
                  />
                );
              })}
              {visible.length === 0 && <EmptyState />}
            </>
          )}

          {view === "all" && (
            <>
              {summaryGroups.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-2.5 mb-2">
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
                    Resumo agrupado
                  </div>
                  <ul className="space-y-0.5">
                    {summaryGroups.slice(0, 5).map((g) => (
                      <li key={g.key} className="text-xs text-foreground">
                        • {g.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {visible.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-1.5">
                  {visible.map((n) => (
                    <ActionableNotificationItem key={n.id} notification={n} onMarkRead={markAsRead} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
      <p className="text-xs text-muted-foreground/70 mt-1">Você está em dia 🎉</p>
    </div>
  );
}
