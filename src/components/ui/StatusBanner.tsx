import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileEdit, CheckCircle2, Banknote, PackageCheck, XCircle,
  Clock, ArrowRight, ChevronRight
} from "lucide-react";

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
  status: string;
  statusLabel: string;
  statusColor?: "gray" | "blue" | "yellow" | "green" | "red" | "orange" | "purple";
  steps?: StatusStep[];
  primaryAction?: StatusAction;
  secondaryAction?: StatusAction;
  className?: string;
}

const STATUS_ICON_MAP: Record<string, any> = {
  rascunho: FileEdit,
  draft: FileEdit,
  pendente: Clock,
  pending: Clock,
  aprovado: CheckCircle2,
  approved: CheckCircle2,
  financeiro_gerado: Banknote,
  financial_generated: Banknote,
  concluido: PackageCheck,
  completed: PackageCheck,
  cancelado: XCircle,
  cancelled: XCircle,
};

const STATUS_BG: Record<string, string> = {
  gray: "bg-muted/60 border-border",
  blue: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  yellow: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",
  green: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
  red: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
  orange: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
  purple: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800",
};

const STATUS_TEXT: Record<string, string> = {
  gray: "text-muted-foreground",
  blue: "text-blue-700 dark:text-blue-400",
  yellow: "text-yellow-700 dark:text-yellow-400",
  green: "text-green-700 dark:text-green-400",
  red: "text-red-700 dark:text-red-400",
  orange: "text-orange-700 dark:text-orange-400",
  purple: "text-purple-700 dark:text-purple-400",
};

export function StatusBanner({
  status, statusLabel, statusColor = "gray",
  steps, primaryAction, secondaryAction, className,
}: StatusBannerProps) {
  const Icon = STATUS_ICON_MAP[status] || Clock;

  return (
    <div className={cn(
      "rounded-lg border px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3",
      STATUS_BG[statusColor],
      className,
    )}>
      {/* Status label */}
      <div className={cn("flex items-center gap-2 font-semibold text-sm", STATUS_TEXT[statusColor])}>
        <Icon className="h-4.5 w-4.5" />
        <span>{statusLabel}</span>
      </div>

      {/* Stepper */}
      {steps && steps.length > 0 && (
        <div className="flex items-center gap-1 ml-0 sm:ml-4">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-center gap-1">
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors",
                step.active
                  ? "bg-primary text-primary-foreground"
                  : step.completed
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground/60",
              )}>
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
