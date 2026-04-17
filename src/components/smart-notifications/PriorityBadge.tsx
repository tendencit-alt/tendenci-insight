import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, Zap } from "lucide-react";
import type { NotificationPriority } from "@/hooks/useNotificationIntelligence";

const CONFIG: Record<NotificationPriority, { label: string; className: string; Icon: any }> = {
  critica: {
    label: "Crítica",
    className: "bg-destructive text-destructive-foreground border-transparent",
    Icon: Zap,
  },
  urgente: {
    label: "Urgente",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    Icon: AlertTriangle,
  },
  atencao: {
    label: "Atenção",
    className: "bg-warning/15 text-warning border-warning/30",
    Icon: AlertCircle,
  },
  informativa: {
    label: "Info",
    className: "bg-muted text-muted-foreground border-border",
    Icon: Info,
  },
};

export function PriorityBadge({
  priority,
  showIcon = true,
  className,
}: {
  priority: NotificationPriority;
  showIcon?: boolean;
  className?: string;
}) {
  const cfg = CONFIG[priority];
  const Icon = cfg.Icon;
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1 h-5 px-1.5", cfg.className, className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {cfg.label}
    </Badge>
  );
}
