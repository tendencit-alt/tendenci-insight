import { useMemo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ListViewColumn } from "@/components/list-view/types";
import type { AggregationType } from "@/hooks/useSmartTable";
import { cn } from "@/lib/utils";

const AGG_LABELS: Record<string, string> = {
  sum: "Soma",
  avg: "Média",
  count: "Qtd",
  min: "Mín",
  max: "Máx",
};

function formatAggValue(value: number, fn: string): string {
  if (fn === "count") return String(Math.round(value));
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface InlineAggregationsProps<T> {
  columns: ListViewColumn<T>[];
  aggregations: AggregationType[];
  computedValues: Record<string, Record<string, number>>;
  hasCheckbox?: boolean;
  hasActions?: boolean;
}

export function InlineAggregationRow<T>({
  columns,
  aggregations,
  computedValues,
  hasCheckbox,
  hasActions,
}: InlineAggregationsProps<T>) {
  if (aggregations.length === 0) return null;

  const aggByColumn = useMemo(() => {
    const map: Record<string, { fn: string; value: number }[]> = {};
    for (const agg of aggregations) {
      const key = `${agg.column}_${agg.fn}`;
      const computed = computedValues[key];
      if (computed) {
        if (!map[agg.column]) map[agg.column] = [];
        map[agg.column].push({ fn: agg.fn, value: computed.value });
      }
    }
    return map;
  }, [aggregations, computedValues]);

  return (
    <TableRow className="bg-muted/30 border-t-2 border-border/60 font-medium">
      {hasCheckbox && <TableCell />}
      {columns.map((col) => {
        const aggs = aggByColumn[col.key];
        return (
          <TableCell key={col.key} className={cn("text-xs", col.align === "right" && "text-right")}>
            {aggs ? (
              <div className="flex flex-wrap gap-1">
                {aggs.map((a) => (
                  <Badge key={a.fn} variant="outline" className="text-[9px] h-4 gap-0.5 font-mono">
                    {AGG_LABELS[a.fn]}: {formatAggValue(a.value, a.fn)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </TableCell>
        );
      })}
      {hasActions && <TableCell />}
    </TableRow>
  );
}
