import { ReactNode } from "react";

// ── Column Definition ──
export interface ListViewColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  visible?: boolean;
  pinned?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: any, row: T, index: number) => ReactNode;
}

// ── Filter Definition ──
export interface ListViewFilter {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "daterange";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

// ── Row Action ──
export interface ListViewAction<T = any> {
  key: string;
  label: string;
  icon?: any;
  variant?: "default" | "destructive" | "outline" | "ghost";
  onClick: (row: T) => void;
  visible?: (row: T) => boolean;
  /** Show as inline button on row hover (max 2 recommended) */
  inline?: boolean;
}

// ── Batch Action ──
export interface ListViewBatchAction<T = any> {
  key: string;
  label: string;
  icon?: any;
  variant?: "default" | "destructive" | "outline";
  onClick: (rows: T[]) => void;
}

// ── Status Config ──
export interface StatusConfig {
  label: string;
  color: "green" | "yellow" | "red" | "blue" | "gray" | "orange" | "purple";
}

// ── Badge / Alert ──
export interface ListViewBadge {
  label: string;
  color: "green" | "yellow" | "red" | "blue" | "gray" | "orange";
  icon?: any;
}

// ── Summary Indicator ──
export interface ListViewIndicator {
  label: string;
  value: string | number;
  color?: string;
}

// ── Sort State ──
export interface SortState {
  column: string;
  direction: "asc" | "desc";
}

// ── Saved View ──
export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, string>;
  visibleColumns: string[];
  sort?: SortState;
}

// ── Main Props ──
export interface ListViewProps<T extends { id: string }> {
  // Header
  title: string;
  subtitle?: string;
  totalLabel?: string;

  // Data
  data: T[];
  loading?: boolean;
  totalCount?: number;

  // Columns
  columns: ListViewColumn<T>[];

  // Filters
  filters?: ListViewFilter[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;

  // Search
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  // Sort
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;

  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;

  // Row actions
  actions?: ListViewAction<T>[];
  onRowClick?: (row: T) => void;

  // Batch actions
  batchActions?: ListViewBatchAction<T>[];

  // Pagination
  page?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;

  // Detail panel
  detailPanel?: (row: T, onClose: () => void) => ReactNode;

  // Status
  getRowStatus?: (row: T) => StatusConfig | null;
  getRowBadges?: (row: T) => ListViewBadge[];

  // Indicators
  indicators?: ListViewIndicator[];

  // New record
  onNewRecord?: () => void;
  newRecordLabel?: string;

  // Export
  onExport?: (format: "xlsx" | "csv" | "pdf") => void;

  // Saved views
  savedViews?: SavedView[];
  activeViewId?: string;
  onSaveView?: (name: string) => void;
  onLoadView?: (view: SavedView) => void;

  // Empty state
  emptyIcon?: any;
  emptyTitle?: string;
  emptyDescription?: string;
}

// ── Color helpers ──
export const STATUS_COLORS: Record<string, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  gray: "bg-muted text-muted-foreground",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

export const BADGE_DOT_COLORS: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  gray: "bg-gray-400",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
};
