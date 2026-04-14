import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Columns3, Search, Pin, GripVertical, Eye, EyeOff } from "lucide-react";
import type { SmartTableColumnState } from "@/hooks/useSmartTable";
import { cn } from "@/lib/utils";

interface ColumnControlProps {
  columnStates: SmartTableColumnState[];
  onToggle: (key: string) => void;
  onTogglePin: (key: string) => void;
  onReorder: (from: number, to: number) => void;
  columnLabels: Record<string, string>;
  className?: string;
}

export function ColumnControl({
  columnStates,
  onToggle,
  onTogglePin,
  onReorder,
  columnLabels,
  className,
}: ColumnControlProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const sorted = [...columnStates].sort((a, b) => a.position - b.position);
  const filtered = sorted.filter((c) =>
    (columnLabels[c.key] || c.key).toLowerCase().includes(search.toLowerCase())
  );

  const visibleCount = columnStates.filter((c) => c.visible).length;
  const pinnedCount = columnStates.filter((c) => c.pinned).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5", className)}>
          <Columns3 className="h-3.5 w-3.5" />
          Colunas
          <Badge variant="secondary" className="text-[9px] h-4 ml-0.5">
            {visibleCount}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        {/* Search */}
        <div className="p-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar coluna..."
              className="h-7 text-xs pl-7"
            />
          </div>
        </div>

        {/* Column list */}
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.map((col, idx) => (
            <div
              key={col.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground/30 cursor-grab shrink-0" />
              <Checkbox
                checked={col.visible}
                onCheckedChange={() => onToggle(col.key)}
                className="h-3.5 w-3.5"
              />
              <span className="text-xs flex-1 truncate">
                {columnLabels[col.key] || col.key}
              </span>
              <button
                onClick={() => onTogglePin(col.key)}
                className={cn(
                  "h-5 w-5 flex items-center justify-center rounded transition-colors",
                  col.pinned
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10"
                )}
                title={col.pinned ? "Desafixar" : "Fixar"}
              >
                <Pin className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer stats */}
        <div className="p-2 border-t border-border/50 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {visibleCount} visíveis · {pinnedCount} fixas
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => {
              columnStates.forEach((c) => {
                if (!c.visible) onToggle(c.key);
              });
            }}
          >
            Mostrar todas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
