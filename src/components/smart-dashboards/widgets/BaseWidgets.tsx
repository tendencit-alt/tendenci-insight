import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricWidget({
  value,
  label,
  trend,
  trendValue,
  loading,
  format = "number",
  critical,
}: {
  value: number | string | null | undefined;
  label?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  loading?: boolean;
  format?: "number" | "currency" | "percent" | "text";
  critical?: boolean;
}) {
  if (loading) return <Skeleton className="h-12 w-full" />;

  let display: string;
  if (value == null || value === undefined) {
    display = "—";
  } else if (format === "currency" && typeof value === "number") {
    display = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  } else if (format === "percent" && typeof value === "number") {
    display = `${value.toFixed(1)}%`;
  } else if (format === "number" && typeof value === "number") {
    display = new Intl.NumberFormat("pt-BR").format(value);
  } else {
    display = String(value);
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <div>
      <div className={cn("text-2xl font-bold leading-tight", critical && "text-destructive")}>
        {display}
      </div>
      {label && <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>}
      {trend && (
        <div className={cn("flex items-center gap-1 text-[11px] mt-1", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          {trendValue}
        </div>
      )}
    </div>
  );
}

export function ListWidget({
  items,
  loading,
  emptyText = "Nenhum item",
  onItemClick,
}: {
  items: Array<{ id: string; title: string; subtitle?: string; value?: string; critical?: boolean }>;
  loading?: boolean;
  emptyText?: string;
  onItemClick?: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">{emptyText}</p>;
  }
  return (
    <ul className="space-y-1">
      {items.slice(0, 5).map((item) => (
        <li key={item.id}>
          <button
            onClick={(e) => { e.stopPropagation(); onItemClick?.(item.id); }}
            className="w-full text-left flex items-center justify-between gap-2 py-1 px-1.5 rounded hover:bg-muted text-xs"
          >
            <div className="min-w-0 flex-1">
              <div className={cn("truncate font-medium", item.critical && "text-destructive")}>
                {item.title}
              </div>
              {item.subtitle && (
                <div className="text-[10px] text-muted-foreground truncate">{item.subtitle}</div>
              )}
            </div>
            {item.value && (
              <span className={cn("font-semibold tabular-nums", item.critical && "text-destructive")}>
                {item.value}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
