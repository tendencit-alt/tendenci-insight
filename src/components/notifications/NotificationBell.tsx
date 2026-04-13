import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const MODULE_ICONS: Record<string, string> = {
  comercial: "🛒",
  financeiro: "💰",
  operacional: "🏭",
  aprovacao: "✅",
  planejamento: "📊",
  sistema: "⚙️",
};

const PRIORITY_COLORS: Record<string, string> = {
  critica: "border-l-red-500",
  alta: "border-l-orange-500",
  media: "border-l-blue-500",
  baixa: "border-l-muted",
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      fetchNotifications(user.id);

      const channel = supabase
        .channel("erp-notifications-bell")
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "erp_notifications",
          filter: `user_id=eq.${user.id}`,
        }, () => fetchNotifications(user.id))
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    init();
  }, []);

  const fetchNotifications = async (uid: string) => {
    const { data } = await supabase
      .from("erp_notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(30);

    setNotifications(data || []);
    setUnreadCount((data || []).filter((n: any) => !n.is_read).length);
  };

  const markAsRead = async (id: string) => {
    if (!userId) return;
    await supabase.from("erp_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
    fetchNotifications(userId);
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase.from("erp_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", userId).eq("is_read", false);
    fetchNotifications(userId);
  };

  const handleClick = (n: any) => {
    markAsRead(n.id);
    if (n.link_path) navigate(n.link_path);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                Marcar todas como lidas
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/tarefas")} className="text-xs h-7">
              Ver tarefas
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[420px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors border-l-2 ${PRIORITY_COLORS[n.priority] || ""} ${!n.is_read ? "bg-accent/30" : ""}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{MODULE_ICONS[n.module] || "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{n.title}</p>
                        {!n.is_read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                      </div>
                      {n.message && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] h-4">{n.module}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(n.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
