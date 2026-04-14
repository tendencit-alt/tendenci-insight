import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, ChevronLeft, ChevronRight, Loader2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListViewProps } from "./types";
import { BADGE_DOT_COLORS } from "./types";
import { ListViewHeader } from "./ListViewHeader";

export function ListView<T extends { id: string }>({
  title, subtitle, totalLabel,
  data, loading, totalCount,
  columns,
  filters, filterValues, onFilterChange,
  searchPlaceholder, searchValue, onSearchChange,
  sort, onSortChange,
  selectable, selectedIds: externalSelectedIds, onSelectionChange,
  actions, onRowClick,
  batchActions,
  page = 1, pageSize = 50, pageSizeOptions = [50, 100, 200], onPageChange, onPageSizeChange,
  detailPanel,
  getRowStatus, getRowBadges,
  indicators,
  onNewRecord, newRecordLabel,
  onExport,
  emptyIcon: EmptyIcon, emptyTitle, emptyDescription,
}: ListViewProps<T>) {
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());
  const [detailRow, setDetailRow] = useState<T | null>(null);

  const selectedIds = externalSelectedIds ?? internalSelected;
  const setSelectedIds = onSelectionChange ?? setInternalSelected;

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible !== false),
    [columns]
  );

  const handleSort = useCallback((colKey: string) => {
    if (!onSortChange) return;
    if (sort?.column === colKey) {
      onSortChange({ column: colKey, direction: sort.direction === "asc" ? "desc" : "asc" });
    } else {
      onSortChange({ column: colKey, direction: "asc" });
    }
  }, [sort, onSortChange]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((r) => r.id)));
    }
  }, [data, selectedIds, setSelectedIds]);

  const toggleSelect = useCallback((id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }, [selectedIds, setSelectedIds]);

  const selectedRows = useMemo(
    () => data.filter((r) => selectedIds.has(r.id)),
    [data, selectedIds]
  );

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

  const handleRowClick = (row: T) => {
    if (detailPanel) {
      setDetailRow(row);
    } else if (onRowClick) {
      onRowClick(row);
    }
  };

  return (
    <div className="space-y-3">
      <ListViewHeader
        title={title}
        subtitle={subtitle}
        totalCount={totalCount ?? data.length}
        totalLabel={totalLabel}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        onNewRecord={onNewRecord}
        newRecordLabel={newRecordLabel}
        onExport={onExport}
        indicators={indicators}
        selectedCount={selectedIds.size}
      />

      {/* Batch Actions Bar */}
      {batchActions && selectedIds.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-2 px-4 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium">{selectedIds.size} selecionado(s)</span>
            <div className="flex gap-2">
              {batchActions.map((ba) => (
                <Button
                  key={ba.key}
                  variant={ba.variant || "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => ba.onClick(selectedRows)}
                >
                  {ba.icon && <ba.icon className="h-3 w-3 mr-1" />}
                  {ba.label}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}>
              Limpar seleção
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={data.length > 0 && selectedIds.size === data.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                {visibleColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    style={{ width: col.width }}
                    className={cn(
                      col.sortable && onSortChange && "cursor-pointer select-none hover:text-foreground",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && onSortChange && (
                        sort?.column === col.key
                          ? sort.direction === "asc"
                            ? <ArrowUp className="h-3 w-3" />
                            : <ArrowDown className="h-3 w-3" />
                          : <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </TableHead>
                ))}
                {actions && actions.length > 0 && (
                  <TableHead className="w-12 text-right">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      {EmptyIcon ? <EmptyIcon className="h-8 w-8 text-muted-foreground/50" /> : <Inbox className="h-8 w-8 text-muted-foreground/50" />}
                      <p className="text-sm font-medium text-muted-foreground">{emptyTitle || "Nenhum registro encontrado"}</p>
                      {emptyDescription && <p className="text-xs text-muted-foreground">{emptyDescription}</p>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.map((row, idx) => {
                const status = getRowStatus?.(row);
                const _badges = getRowBadges?.(row);
                const inlineActions = actions?.filter((a) => a.inline && (!a.visible || a.visible(row))) || [];
                const menuActions = actions?.filter((a) => !a.inline && (!a.visible || a.visible(row))) || [];
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer group/row",
                      selectedIds.has(row.id) && "bg-primary/5"
                    )}
                    onClick={() => handleRowClick(row)}
                  >
                    {selectable && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.map((col, colIdx) => {
                      const value = (row as any)[col.key];
                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            "text-sm",
                            col.align === "right" && "text-right",
                            col.align === "center" && "text-center",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {/* Status dot on first column */}
                            {colIdx === 0 && status && (
                              <span className={cn(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                BADGE_DOT_COLORS[status.color] || "bg-gray-400"
                              )} title={status.label} />
                            )}
                            {col.render ? col.render(value, row, idx) : (
                              <span className="truncate max-w-[250px] inline-block">{value ?? "—"}</span>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}

                    {actions && actions.length > 0 && (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Inline actions visible on hover */}
                          {inlineActions.length > 0 && (
                            <div className="hidden group-hover/row:flex items-center gap-1">
                              {inlineActions.slice(0, 2).map((a) => (
                                <Button
                                  key={a.key}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs px-2"
                                  onClick={() => a.onClick(row)}
                                >
                                  {a.icon && <a.icon className="h-3 w-3 mr-1" />}
                                  {a.label}
                                </Button>
                              ))}
                            </div>
                          )}
                          {/* Dropdown for remaining actions */}
                          {menuActions.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {menuActions.map((a) => (
                                  <DropdownMenuItem key={a.key} onClick={() => a.onClick(row)}>
                                    {a.icon && <a.icon className="h-3.5 w-3.5 mr-2" />}
                                    {a.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {(onPageChange || onPageSizeChange) && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Registros por página:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange?.(Number(v))}
            >
              <SelectTrigger className="w-[80px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {detailPanel && (
        <Sheet open={!!detailRow} onOpenChange={(open) => { if (!open) setDetailRow(null); }}>
          <SheetContent side="right" className="w-[480px] sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Detalhes</SheetTitle>
            </SheetHeader>
            {detailRow && detailPanel(detailRow, () => setDetailRow(null))}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
