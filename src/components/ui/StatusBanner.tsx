import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStatusDef, STATUS_BG, STATUS_TEXT, STATUS_BORDER } from "@/lib/status-registry";
import type { StatusColor } from "@/lib/status-registry";
import { CheckCircle2, ChevronRight, ArrowRight, Clock } from "lucide-react";

export interface StatusStep {
  key: string;
  label: string;
  completed?: boolean;
  active?: boolean;
}

export interface StatusAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
  loading?: boolean;
  disabled?: boolean;
}

interface StatusBannerProps {
  /** Module key from the registry */
  module?: string;
  status: string;
  /** Override label (otherwise pulled from registry) */
  statusLabel?: string;
  /** Override color (otherwise pulled from registry) */
  statusColor?: StatusColor;
  steps?: StatusStep[];
  primaryAction?: StatusAction;
  secondaryAction?: StatusAction;
  className?: string;
}

/**
 * Prominent status banner shown at the top of detail views.
 * Reads icon + color from the global status registry when `module` is provided.
 */
export function StatusBanner({
  module,
  status,
  statusLabel,
  statusColor,
  steps,
  primaryAction,
  secondaryAction,
  className,
}: StatusBannerProps) {
  const def = module ? getStatusDef(module, status) : undefined;
  const color: StatusColor = statusColor ?? def?.color ?? "gray";
  const label = statusLabel ?? def?.label ?? status;
  const Icon = def?.icon ?? Clock;

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3",
        STATUS_BG[color],
        STATUS_BORDER[color],
        className,
      )}
    >
      {/* Status label */}
      <div className={cn("flex items-center gap-2 font-semibold text-sm", STATUS_TEXT[color])}>
        <Icon className="h-4.5 w-4.5" />
        <span>{label}</span>
      </div>

      {/* Stepper */}
      {steps && steps.length > 0 && (
        <div className="flex items-center gap-1 ml-0 sm:ml-4 flex-wrap">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-center gap-1">
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors",
                  step.active
                    ? "bg-primary text-primary-foreground"
                    : step.completed
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground/60",
                )}
              >
                {step.completed && <CheckCircle2 className="h-3 w-3" />}
                <span>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {secondaryAction && (
          <Button
            variant={secondaryAction.variant || "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled || secondaryAction.loading}
          >
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button
            variant={primaryAction.variant || "default"}
            size="sm"
            className="h-7 text-xs"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled || primaryAction.loading}
          >
            {primaryAction.label}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
