import { useState } from "react";
import { Bell, CheckCheck, AlertTriangle, AlertCircle, Info, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useNotificationIntelligence, type NotificationPriority, type SmartNotification } from "@/hooks/useNotificationIntelligence";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<string, string> = {
  comercial: "🛒",
  financeiro: "💰",
  operacional: "🏭",
  aprovacao: "✅",
  planejamento: "📊",
  sistema: "⚙️",
  controladoria: "📈",
};

const PRIORITY_STYLES: Record<NotificationPriority, { border: string; icon: typeof AlertTriangle; color: string }> = {
  critica: { border: "border-l-destructive", icon: AlertTriangle, color: "text-destructive" },
  urgente: { border: "border-l-orange-500", icon: AlertCircle, color: "text-orange-500" },
  atencao: { border: "border-l-yellow-500", icon: Info, color: "text-yellow-500" },
  informativa: { border: "border-l-muted", icon: Info, color: "text-muted-foreground" },
};

function NotificationRow({ n, onAction }: { n: SmartNotification; onAction: (n: SmartNotification) => void }) {
  const navigate = useNavigate();
  const style = PRIORITY_STYLES[n.priority];
  const PriorityIcon = style.icon;

  const handleClick = () => {
    onAction(n);
    if (n.link_path) navigate(n.link_path);
  };

  const handleQuickAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAction(n);
    if (n.link_path) navigate(n.link_path + (n.actionType ? `?action=${n.actionType}` : ""));
  };

  return (
    <div
      className={cn(
        "p-3 cursor-pointer hover:bg-muted/50 transition-colors border-l-2",
        style.border,
        !n.is_read && "bg-accent/30"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        <span className="text-base mt-0.5">{MODULE_ICONS[n.module] || "📌"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <PriorityIcon className={cn("h-3 w-3 shrink-0", style.color)} />
            <p className="font-medium text-sm truncate">{n.title}</p>
            {!n.is_read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
          </div>
          {n.message && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] h-4">{n.module}</Badge>
            <Badge
              variant="outline"
              className={cn("text-[10px] h-4", n.priority === "critica" && "border-destructive text-destructive", n.priority === "urgente" && "border-orange-500 text-orange-500")}
            >
              {n.priority}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(n.created_at), "dd/MM HH:mm", { locale: ptBR })}
            </span>
          </div>
          {n.actionable && n.actionLabel && (
            <Button
              variant="outline"
              size="sm"
              className="mt-1.5 h-6 text-[10px] gap-1"
              onClick={handleQuickAction}
            >
              <Zap className="h-3 w-3" />
              {n.actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DailySummaryBlock({ summary }: { summary: NonNullable<ReturnType<typeof useNotificationIntelligence>["dailySummary"]> }) {
  const navigate = useNavigate();
  const items = [
    { label: "Contas vencidas", count: summary.contasVencidas, route: "/contas-pagar", critical: true },
    
    { label: "Pedidos aguardando", count: summary.pedidosAguardando, route: "/pedidos", critical: false },
    { label: "Ordens atrasadas", count: summary.ordensAtrasadas, route: "/producao-operacoes", critical: false },
  ].filter(i => i.count > 0);

  if (items.length === 0) return null;

  return (
    <div className="p-3 border-b bg-muted/30">
      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Resumo do Dia
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.route)}
            className={cn(
              "text-left p-1.5 rounded text-[11px] hover:bg-muted transition-colors",
              item.critical && item.count > 0 && "bg-destructive/10"
            )}
          >
            <span className="font-bold text-sm">{item.count}</span>
            <span className="block text-muted-foreground">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    criticalCount,
    grouped,
    dailySummary,
    markAsRead,
    markAllAsRead,
  } = useNotificationIntelligence();

  const handleAction = (n: SmartNotification) => {
    markAsRead(n.id);
  };

  const hasCritical = criticalCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={cn("h-5 w-5", hasCritical && "text-destructive")} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs",
                hasCritical && "animate-pulse"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7 gap-1">
                <CheckCheck className="h-3 w-3" />
                Marcar lidas
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); navigate("/tarefas"); }} className="text-xs h-7">
              Ver tarefas
            </Button>
          </div>
        </div>

        {/* Daily Summary */}
        {dailySummary && dailySummary.totalCritico > 0 && (
          <DailySummaryBlock summary={dailySummary} />
        )}

        {/* Tabs */}
        <Tabs defaultValue="todas" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-8 rounded-none border-b">
            <TabsTrigger value="todas" className="text-[10px] h-7">
              Todas {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="critica" className="text-[10px] h-7 text-destructive">
              Críticas {grouped.critica.length > 0 && `(${grouped.critica.length})`}
            </TabsTrigger>
            <TabsTrigger value="urgente" className="text-[10px] h-7 text-orange-500">
              Urgentes {grouped.urgente.length > 0 && `(${grouped.urgente.length})`}
            </TabsTrigger>
            <TabsTrigger value="acoes" className="text-[10px] h-7">
              Ações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todas" className="mt-0">
            <ScrollArea className="h-[360px]">
              {notifications.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="divide-y">
                  {notifications.slice(0, 50).map(n => (
                    <NotificationRow key={n.id} n={n} onAction={handleAction} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="critica" className="mt-0">
            <ScrollArea className="h-[360px]">
              {grouped.critica.length === 0 ? (
                <EmptyState message="Nenhuma notificação crítica" />
              ) : (
                <div className="divide-y">
                  {grouped.critica.map(n => (
                    <NotificationRow key={n.id} n={n} onAction={handleAction} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="urgente" className="mt-0">
            <ScrollArea className="h-[360px]">
              {grouped.urgente.length === 0 ? (
                <EmptyState message="Nenhuma notificação urgente" />
              ) : (
                <div className="divide-y">
                  {grouped.urgente.map(n => (
                    <NotificationRow key={n.id} n={n} onAction={handleAction} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="acoes" className="mt-0">
            <ScrollArea className="h-[360px]">
              {notifications.filter(n => n.actionable && !n.is_read).length === 0 ? (
                <EmptyState message="Nenhuma ação pendente" />
              ) : (
                <div className="divide-y">
                  {notifications.filter(n => n.actionable && !n.is_read).map(n => (
                    <NotificationRow key={n.id} n={n} onAction={handleAction} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

function EmptyState({ message = "Nenhuma notificação" }: { message?: string }) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
