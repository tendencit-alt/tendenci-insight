import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ListViewColumn } from "@/components/list-view/types";
import type { AggregationType } from "@/hooks/useSmartTable";
import { cn } from "@/lib/utils";

interface GroupedTableSectionProps<T> {
  groupKey: string;
  rows: T[];
  columns: ListViewColumn<T>[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  aggregations: AggregationType[];
  onRowClick?: (row: T) => void;
  renderActions?: (row: T) => React.ReactNode;
}

export function GroupedTableSection<T extends { id: string }>({
  groupKey,
  rows,
  columns,
  collapsed,
  onToggleCollapse,
  aggregations,
  onRowClick,
  renderActions,
}: GroupedTableSectionProps<T>) {
  const groupAggregations = useMemo(() => {
    const results: Record<string, string> = {};
    for (const agg of aggregations) {
      const values = rows.map((r) => Number((r as any)[agg.column])).filter((v) => !isNaN(v));
      let val = 0;
      if (agg.fn === "sum") val = values.reduce((a, b) => a + b, 0);
      else if (agg.fn === "avg") val = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      else if (agg.fn === "count") val = values.length;
      else if (agg.fn === "min") val = values.length ? Math.min(...values) : 0;
      else if (agg.fn === "max") val = values.length ? Math.max(...values) : 0;

      const label = agg.fn === "count" ? String(val) : val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      results[`${agg.column}_${agg.fn}`] = label;
    }
    return results;
  }, [rows, aggregations]);

  return (
    <div className="space-y-0">
      {/* Group header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center gap-2 px-4 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left border-b border-border/40"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs font-semibold">{groupKey}</span>
        <Badge variant="secondary" className="text-[9px] h-4">
          {rows.length}
        </Badge>
        {aggregations.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            {Object.entries(groupAggregations).map(([key, val]) => (
              <Badge key={key} variant="outline" className="text-[9px] h-4 font-mono">
                {val}
              </Badge>
            ))}
          </div>
        )}
      </button>

      {/* Group rows */}
      {!collapsed && (
        <Table>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow
                key={row.id}
                className="cursor-pointer group/row hover:bg-muted/20"
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => {
                  const value = (row as any)[col.key];
                  return (
                    <TableCell
                      key={col.key}
                      style={{ width: col.width }}
                      className={cn("text-sm", col.align === "right" && "text-right")}
                    >
                      {col.render ? col.render(value, row, idx) : (
                        <span className="truncate max-w-[250px] inline-block">{value ?? "—"}</span>
                      )}
                    </TableCell>
                  );
                })}
                {renderActions && (
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {renderActions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
