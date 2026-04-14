import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusDef, STATUS_BG, STATUS_TEXT, STATUS_DOT } from "@/lib/status-registry";
import type { StatusColor } from "@/lib/status-registry";
import { Clock } from "lucide-react";

interface UniversalStatusBadgeProps {
  module: string;
  status: string;
  /** Override label */
  label?: string;
  /** Show dot instead of icon */
  dotOnly?: boolean;
  /** Show icon */
  showIcon?: boolean;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Universal status badge that reads from the global status registry.
 * Use this everywhere instead of inline status rendering.
 *
 * @example
 * <UniversalStatusBadge module="orders" status="aprovado" />
 * <UniversalStatusBadge module="fin_payables" status="pago" showIcon />
 */
export function UniversalStatusBadge({
  module,
  status,
  label,
  dotOnly = false,
  showIcon = false,
  className,
  size = "sm",
}: UniversalStatusBadgeProps) {
  const def = getStatusDef(module, status);
  const color: StatusColor = def?.color ?? "gray";
  const displayLabel = label || def?.label || status;
  const Icon = def?.icon ?? Clock;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border gap-1.5 inline-flex items-center",
        STATUS_BG[color],
        STATUS_TEXT[color],
        size === "sm" ? "text-[11px] h-5 px-2" : "text-xs h-6 px-2.5",
        className,
      )}
    >
      {dotOnly && <span className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_DOT[color])} />}
      {showIcon && !dotOnly && <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {displayLabel}
    </Badge>
  );
}
