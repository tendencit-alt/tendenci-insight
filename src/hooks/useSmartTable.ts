import { useState, useCallback, useMemo, useEffect } from "react";
import type { ListViewColumn, SortState, SavedView } from "@/components/list-view/types";

// ── Types ──
export interface SmartTableColumnState {
  key: string;
  visible: boolean;
  pinned: boolean;
  width?: string;
  position: number;
}

export interface AggregationType {
  column: string;
  fn: "sum" | "avg" | "count" | "min" | "max";
}

export interface GroupByState {
  column: string;
  collapsed: Set<string>;
}

export interface SmartTableView {
  id: string;
  name: string;
  columns: SmartTableColumnState[];
  filters: Record<string, string>;
  sort?: SortState;
  groupBy?: string;
  aggregations?: AggregationType[];
}

interface UseSmartTableOptions<T> {
  /** Unique key for localStorage persistence */
  storageKey: string;
  columns: ListViewColumn<T>[];
  data: T[];
  defaultSort?: SortState;
}

const STORAGE_PREFIX = "smart_table_";

export function useSmartTable<T extends { id: string }>({
  storageKey,
  columns,
  data,
  defaultSort,
}: UseSmartTableOptions<T>) {
  // ── Column state ──
  const [columnStates, setColumnStates] = useState<SmartTableColumnState[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}cols_${storageKey}`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return columns.map((c, i) => ({
      key: c.key,
      visible: c.visible !== false,
      pinned: c.pinned ?? false,
      width: c.width,
      position: i,
    }));
  });

  // Persist column state
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}cols_${storageKey}`, JSON.stringify(columnStates));
  }, [columnStates, storageKey]);

  // ── Sort ──
  const [sort, setSort] = useState<SortState | undefined>(defaultSort);

  // ── Filters ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}filters_${storageKey}`);
    if (saved) try { return JSON.parse(saved); } catch { /* ignore */ }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}filters_${storageKey}`, JSON.stringify(filterValues));
  }, [filterValues, storageKey]);

  const onFilterChange = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Group By ──
  const [groupBy, setGroupBy] = useState<string | undefined>(() => {
    return localStorage.getItem(`${STORAGE_PREFIX}group_${storageKey}`) || undefined;
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (groupBy) localStorage.setItem(`${STORAGE_PREFIX}group_${storageKey}`, groupBy);
    else localStorage.removeItem(`${STORAGE_PREFIX}group_${storageKey}`);
  }, [groupBy, storageKey]);

  // ── Aggregations ──
  const [aggregations, setAggregations] = useState<AggregationType[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}agg_${storageKey}`);
    if (saved) try { return JSON.parse(saved); } catch { /* ignore */ }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}agg_${storageKey}`, JSON.stringify(aggregations));
  }, [aggregations, storageKey]);

  // ── Saved Views ──
  const [savedViews, setSavedViews] = useState<SmartTableView[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}views_${storageKey}`);
    if (saved) try { return JSON.parse(saved); } catch { /* ignore */ }
    return [];
  });

  const [activeViewId, setActiveViewId] = useState<string | undefined>();

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}views_${storageKey}`, JSON.stringify(savedViews));
  }, [savedViews, storageKey]);

  // ── Column operations ──
  const toggleColumn = useCallback((key: string) => {
    setColumnStates((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  }, []);

  const togglePinColumn = useCallback((key: string) => {
    setColumnStates((prev) =>
      prev.map((c) => (c.key === key ? { ...c, pinned: !c.pinned } : c))
    );
  }, []);

  const reorderColumns = useCallback((fromIdx: number, toIdx: number) => {
    setColumnStates((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next.map((c, i) => ({ ...c, position: i }));
    });
  }, []);

  const resizeColumn = useCallback((key: string, width: string) => {
    setColumnStates((prev) =>
      prev.map((c) => (c.key === key ? { ...c, width } : c))
    );
  }, []);

  // ── Derived: ordered visible columns ──
  const orderedColumns = useMemo(() => {
    const sorted = [...columnStates].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.position - b.position;
    });

    return sorted
      .filter((cs) => cs.visible)
      .map((cs) => {
        const original = columns.find((c) => c.key === cs.key);
        if (!original) return null;
        return {
          ...original,
          width: cs.width || original.width,
          pinned: cs.pinned,
          visible: true,
        };
      })
      .filter(Boolean) as ListViewColumn<T>[];
  }, [columnStates, columns]);

  // ── Aggregation computations ──
  const computedAggregations = useMemo(() => {
    if (aggregations.length === 0) return {};
    const result: Record<string, Record<string, number>> = {};

    for (const agg of aggregations) {
      const values = data
        .map((row) => Number((row as any)[agg.column]))
        .filter((v) => !isNaN(v));

      const computed: Record<string, number> = {};

      if (agg.fn === "sum") computed.value = values.reduce((a, b) => a + b, 0);
      else if (agg.fn === "avg") computed.value = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      else if (agg.fn === "count") computed.value = values.length;
      else if (agg.fn === "min") computed.value = values.length ? Math.min(...values) : 0;
      else if (agg.fn === "max") computed.value = values.length ? Math.max(...values) : 0;

      result[`${agg.column}_${agg.fn}`] = { ...computed, fn: agg.fn as any };
    }
    return result;
  }, [aggregations, data]);

  // ── Grouped data ──
  const groupedData = useMemo(() => {
    if (!groupBy) return null;
    const groups: Record<string, T[]> = {};
    for (const row of data) {
      const key = String((row as any)[groupBy] ?? "Sem grupo");
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    return groups;
  }, [data, groupBy]);

  // ── Save / Load views ──
  const saveView = useCallback((name: string) => {
    const view: SmartTableView = {
      id: crypto.randomUUID(),
      name,
      columns: columnStates,
      filters: filterValues,
      sort,
      groupBy,
      aggregations,
    };
    setSavedViews((prev) => [...prev, view]);
    setActiveViewId(view.id);
    return view;
  }, [columnStates, filterValues, sort, groupBy, aggregations]);

  const loadView = useCallback((view: SmartTableView) => {
    setColumnStates(view.columns);
    setFilterValues(view.filters);
    if (view.sort) setSort(view.sort);
    if (view.groupBy) setGroupBy(view.groupBy);
    if (view.aggregations) setAggregations(view.aggregations);
    setActiveViewId(view.id);
  }, []);

  const deleteView = useCallback((id: string) => {
    setSavedViews((prev) => prev.filter((v) => v.id !== id));
    if (activeViewId === id) setActiveViewId(undefined);
  }, [activeViewId]);

  // ── Toggle group collapse ──
  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  return {
    // Column control
    columnStates,
    orderedColumns,
    toggleColumn,
    togglePinColumn,
    reorderColumns,
    resizeColumn,

    // Sort
    sort,
    setSort,

    // Filters
    filterValues,
    onFilterChange,
    setFilterValues,

    // Group by
    groupBy,
    setGroupBy,
    groupedData,
    collapsedGroups,
    toggleGroupCollapse,

    // Aggregations
    aggregations,
    setAggregations,
    computedAggregations,

    // Views
    savedViews,
    activeViewId,
    saveView,
    loadView,
    deleteView,
  };
}
