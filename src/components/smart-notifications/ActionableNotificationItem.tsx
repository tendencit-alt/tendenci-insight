import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PriorityBadge } from "./PriorityBadge";
import type { SmartNotification } from "@/hooks/useNotificationIntelligence";

interface Props {
  notification: SmartNotification;
  onMarkRead: (id: string) => void;
  onAction?: (n: SmartNotification) => void;
  compact?: boolean;
}

export function ActionableNotificationItem({ notification: n, onMarkRead, onAction, compact }: Props) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) onAction(n);
    else if (n.link_path) navigate(n.link_path);
    onMarkRead(n.id);
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border p-3 transition-colors hover:bg-muted/50",
        !n.is_read && "bg-muted/30 border-l-2",
        !n.is_read && n.priority === "critica" && "border-l-destructive",
        !n.is_read && n.priority === "urgente" && "border-l-destructive/60",
        !n.is_read && n.priority === "atencao" && "border-l-warning",
        !n.is_read && n.priority === "informativa" && "border-l-muted-foreground/40"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <PriorityBadge priority={n.priority} />
          <span className="text-[10px] text-muted-foreground capitalize">{n.module}</span>
          <span className="text-[10px] text-muted-foreground">
            · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        {!n.is_read && (
          <button
            onClick={() => onMarkRead(n.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            title="Marcar como lida"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <h4 className={cn("text-sm leading-tight mb-0.5", !n.is_read ? "font-semibold" : "font-medium")}>
        {n.title}
      </h4>
      {!compact && n.message && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{n.message}</p>
      )}

      {(n.actionable || n.link_path) && (
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleAction}>
            {n.actionLabel || "Abrir"}
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          {!n.is_read && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => onMarkRead(n.id)}
            >
              Dispensar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
