import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TrafficLightProps {
  actual: number;
  target: number;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
}

export function TrafficLight({ actual, target, showPercentage = true, size = "md" }: TrafficLightProps) {
  const percentage = target > 0 ? (actual / target) * 100 : 0;
  
  let color: "green" | "yellow" | "red";
  let bgClass: string;
  let textClass: string;
  
  if (percentage >= 100) {
    color = "green";
    bgClass = "bg-green-500";
    textClass = "text-green-600";
  } else if (percentage >= 80) {
    color = "yellow";
    bgClass = "bg-yellow-500";
    textClass = "text-yellow-600";
  } else {
    color = "red";
    bgClass = "bg-red-500";
    textClass = "text-red-600";
  }

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <div className={cn("rounded-full", bgClass, sizeClasses[size])} />
          {showPercentage && (
            <span className={cn("font-semibold", textClass)}>
              {percentage.toFixed(1)}%
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-xs">
          <p><strong>Realizado:</strong> {formatCurrency(actual)}</p>
          <p><strong>Meta:</strong> {formatCurrency(target)}</p>
          <p><strong>Evolução:</strong> {percentage.toFixed(1)}%</p>
          <p className={cn("font-medium", textClass)}>
            {color === "green" && "✓ Meta atingida"}
            {color === "yellow" && "⚠ Próximo da meta"}
            {color === "red" && "✗ Abaixo da meta"}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface TrafficLightBadgeProps {
  actual: number;
  target: number;
  label?: string;
}

export function TrafficLightBadge({ actual, target, label }: TrafficLightBadgeProps) {
  const percentage = target > 0 ? (actual / target) * 100 : 0;
  
  let bgClass: string;
  let borderClass: string;
  
  if (percentage >= 100) {
    bgClass = "bg-green-100 dark:bg-green-950/50";
    borderClass = "border-green-300 dark:border-green-800";
  } else if (percentage >= 80) {
    bgClass = "bg-yellow-100 dark:bg-yellow-950/50";
    borderClass = "border-yellow-300 dark:border-yellow-800";
  } else {
    bgClass = "bg-red-100 dark:bg-red-950/50";
    borderClass = "border-red-300 dark:border-red-800";
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className={cn("rounded-lg border p-3", bgClass, borderClass)}>
      {label && (
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{formatCurrency(actual)}</p>
          <p className="text-xs text-muted-foreground">de {formatCurrency(target)}</p>
        </div>
        <TrafficLight actual={actual} target={target} size="lg" />
      </div>
    </div>
  );
}