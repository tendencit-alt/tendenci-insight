import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Layers, Plus, X, Calculator } from "lucide-react";
import type { AggregationType } from "@/hooks/useSmartTable";
import { cn } from "@/lib/utils";
import { useState } from "react";

const AGG_FN_OPTIONS = [
  { value: "sum", label: "Soma" },
  { value: "avg", label: "Média" },
  { value: "count", label: "Quantidade" },
  { value: "min", label: "Mínimo" },
  { value: "max", label: "Máximo" },
];

interface GroupByControlProps {
  groupBy?: string;
  onGroupByChange: (col: string | undefined) => void;
  groupableColumns: { key: string; label: string }[];
  aggregations: AggregationType[];
  onAggregationsChange: (aggs: AggregationType[]) => void;
  numericColumns: { key: string; label: string }[];
  className?: string;
}

export function GroupByControl({
  groupBy,
  onGroupByChange,
  groupableColumns,
  aggregations,
  onAggregationsChange,
  numericColumns,
  className,
}: GroupByControlProps) {
  const [aggOpen, setAggOpen] = useState(false);
  const [newAggCol, setNewAggCol] = useState("");
  const [newAggFn, setNewAggFn] = useState("sum");

  const addAggregation = () => {
    if (!newAggCol) return;
    onAggregationsChange([
      ...aggregations,
      { column: newAggCol, fn: newAggFn as AggregationType["fn"] },
    ]);
    setNewAggCol("");
    setNewAggFn("sum");
  };

  const removeAggregation = (idx: number) => {
    onAggregationsChange(aggregations.filter((_, i) => i !== idx));
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Group By selector */}
      <div className="flex items-center gap-1">
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <Select
          value={groupBy || "__none__"}
          onValueChange={(v) => onGroupByChange(v === "__none__" ? undefined : v)}
        >
          <SelectTrigger className="h-7 text-[10px] w-auto min-w-[120px]">
            <SelectValue placeholder="Agrupar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem agrupamento</SelectItem>
            {groupableColumns.map((c) => (
              <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Aggregations */}
      {aggregations.map((agg, idx) => (
        <Badge key={idx} variant="outline" className="text-[9px] h-5 gap-1">
          <Calculator className="h-2.5 w-2.5" />
          {AGG_FN_OPTIONS.find((f) => f.value === agg.fn)?.label}({numericColumns.find((c) => c.key === agg.column)?.label || agg.column})
          <button onClick={() => removeAggregation(idx)} className="ml-0.5 hover:text-destructive">
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}

      {/* Add aggregation */}
      <Popover open={aggOpen} onOpenChange={setAggOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1">
            <Calculator className="h-3 w-3" /> Agregação
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 space-y-2" align="start">
          <Select value={newAggCol} onValueChange={setNewAggCol}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Coluna..." />
            </SelectTrigger>
            <SelectContent>
              {numericColumns.map((c) => (
                <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newAggFn} onValueChange={setNewAggFn}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGG_FN_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-[10px] w-full" onClick={addAggregation} disabled={!newAggCol}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
