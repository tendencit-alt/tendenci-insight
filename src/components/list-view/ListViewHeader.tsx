import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Download, Filter, X } from "lucide-react";
import type { ListViewFilter, ListViewIndicator } from "./types";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  title: string;
  subtitle?: string;
  totalCount?: number;
  totalLabel?: string;

  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;

  filters?: ListViewFilter[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;

  onNewRecord?: () => void;
  newRecordLabel?: string;

  onExport?: (format: "xlsx" | "csv" | "pdf") => void;

  indicators?: ListViewIndicator[];

  selectedCount?: number;
}

export function ListViewHeader({
  title, subtitle, totalCount, totalLabel,
  searchPlaceholder, searchValue, onSearchChange,
  filters, filterValues = {}, onFilterChange,
  onNewRecord, newRecordLabel,
  onExport, indicators, selectedCount,
}: Props) {
  const activeFilterCount = Object.values(filterValues).filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Indicators */}
      {indicators && indicators.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {indicators.map((ind, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <p className={`text-xl font-bold ${ind.color || "text-foreground"}`}>{ind.value}</p>
                <p className="text-[11px] text-muted-foreground">{ind.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Title + Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {totalCount !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {totalCount} {totalLabel || "registros"}
            </Badge>
          )}
          {selectedCount !== undefined && selectedCount > 0 && (
            <Badge variant="default" className="text-xs">
              {selectedCount} selecionado(s)
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Download className="h-3.5 w-3.5 mr-1.5" />Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("csv")}>CSV (.csv)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("pdf")}>PDF (.pdf)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {onNewRecord && (
            <Button size="sm" className="h-8" onClick={onNewRecord}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />{newRecordLabel || "Novo"}
            </Button>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px] max-w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder || "Buscar..."}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        )}

        {filters?.map((f) => {
          if (f.type === "select" && f.options) {
            return (
              <Select
                key={f.key}
                value={filterValues[f.key] || ""}
                onValueChange={(v) => onFilterChange?.(f.key, v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder={f.placeholder || f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {f.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }
          return null;
        })}

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              filters?.forEach((f) => onFilterChange?.(f.key, ""));
            }}
          >
            <X className="h-3 w-3 mr-1" />Limpar filtros ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  );
}
