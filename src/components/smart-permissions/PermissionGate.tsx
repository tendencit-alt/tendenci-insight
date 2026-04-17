import { useEffect, type ReactNode } from "react";
import { useHasPermission } from "@/hooks/useHasPermission";
import { BlockedAccessMessage } from "./BlockedAccessMessage";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  permission: string;
  module?: string;
  children: ReactNode;
  /** What to render when access is denied. */
  fallback?: "hide" | "disable" | "message" | "tooltip" | ReactNode;
  /** Extra context to record on denial (record id, etc.). */
  context?: Record<string, unknown>;
  /** When true, automatically logs a denial as soon as the gate renders blocked. */
  auditOnRender?: boolean;
  className?: string;
}

/**
 * Wraps any UI to enforce a permission key with consistent UX:
 *  - hide:    renders nothing
 *  - disable: clones child and adds disabled + lock badge
 *  - message: shows BlockedAccessMessage
 *  - tooltip: keeps child but disables clicks and shows tooltip with reason
 */
export function PermissionGate({
  permission,
  children,
  fallback = "tooltip",
  context,
  auditOnRender = false,
  className,
}: Props) {
  const decision = useHasPermission(permission);

  useEffect(() => {
    if (auditOnRender && !decision.allowed) {
      decision.audit(context);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditOnRender, decision.allowed]);

  if (decision.allowed) return <>{children}</>;

  if (fallback === "hide") return null;

  if (fallback === "message") {
    return (
      <BlockedAccessMessage
        reason={decision.reason}
        label={decision.label}
        className={className}
      />
    );
  }

  if (fallback === "disable") {
    return (
      <div className={cn("relative inline-flex items-center", className)}>
        <div className="pointer-events-none opacity-50">{children}</div>
        <Lock className="absolute -right-1 -top-1 h-3 w-3 text-muted-foreground" />
      </div>
    );
  }

  if (fallback === "tooltip") {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn("inline-flex relative cursor-not-allowed", className)}
              onClickCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
                decision.audit(context);
              }}
            >
              <div className="pointer-events-none opacity-50">{children}</div>
              <Lock className="absolute -right-1 -top-1 h-3 w-3 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs font-medium">{decision.label ?? "Acesso restrito"}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{decision.reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <>{fallback}</>;
}
