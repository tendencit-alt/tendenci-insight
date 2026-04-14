import { ReactNode } from "react";
import type { StatusStep, StatusAction } from "@/components/ui/StatusBanner";

// ── Field Definition ──
export interface FormViewField {
  key: string;
  label: string;
  type: "text" | "number" | "currency" | "date" | "select" | "textarea" | "checkbox" | "readonly" | "custom";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  disabled?: boolean;
  span?: 1 | 2 | 3; // grid column span (out of 3)
  helperText?: string;
  /** Show field only when condition is met */
  visibleWhen?: (values: Record<string, any>) => boolean;
  /** Custom render for type="custom" */
  render?: (value: any, onChange: (v: any) => void, values: Record<string, any>) => ReactNode;
  /** Auto-fill other fields when this changes */
  onChangeEffect?: (value: any, setValues: (patch: Record<string, any>) => void) => void;
}

// ── Tab Definition ──
export interface FormViewTab {
  key: string;
  label: string;
  icon?: any;
  fields?: FormViewField[];
  /** Custom content instead of auto-generated fields */
  content?: (values: Record<string, any>, onChange: (key: string, value: any) => void) => ReactNode;
  badge?: string | number;
}

// ── Action Button ──
export interface FormViewAction {
  key: string;
  label: string;
  icon?: any;
  variant?: "default" | "destructive" | "outline" | "ghost" | "secondary";
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

// ── Status Config ──
export interface FormViewStatus {
  label: string;
  color: "green" | "yellow" | "red" | "blue" | "gray" | "orange" | "purple";
}

// ── Timeline Entry ──
export interface FormViewTimelineEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  detail?: string;
}

// ── Related Record ──
export interface FormViewRelation {
  label: string;
  type: string;
  id: string;
  title: string;
  status?: string;
  link?: string;
}

// ── Side Panel Alert ──
export interface FormViewAlert {
  message: string;
  severity: "info" | "warning" | "error";
}

// ── Validation Error ──
export interface FormValidationError {
  field: string;
  message: string;
}

// ── Main Props ──
export interface FormViewProps {
  // Header
  title: string;
  subtitle?: string;
  status?: FormViewStatus;
  isNew?: boolean;

  // Status Banner (dominant visual status)
  statusBanner?: {
    status: string;
    statusLabel: string;
    statusColor?: "gray" | "blue" | "yellow" | "green" | "red" | "orange" | "purple";
    steps?: StatusStep[];
    primaryAction?: StatusAction;
    secondaryAction?: StatusAction;
  };

  // Side Panel Tabs
  sidePanelTabs?: FormViewSidePanelTab[];

  // Data
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onBatchChange?: (patch: Record<string, any>) => void;

  // Top fields (essential fields shown above tabs)
  topFields?: FormViewField[];

  // Tabs
  tabs: FormViewTab[];
  defaultTab?: string;

  // Actions
  onSave?: () => void;
  onSaveAndClose?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  extraActions?: FormViewAction[];
  saving?: boolean;

  // Validation
  errors?: FormValidationError[];
  validate?: (values: Record<string, any>) => FormValidationError[];

  // Autosave
  autosave?: boolean;
  autosaveDelay?: number; // ms, default 3000
  onAutosave?: (values: Record<string, any>) => void;
  lastSavedAt?: string;

  // Side Panel
  showSidePanel?: boolean;
  timeline?: FormViewTimelineEntry[];
  relations?: FormViewRelation[];
  alerts?: FormViewAlert[];
  sidePanelExtra?: ReactNode;

  // Audit
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;

  // Back navigation
  onBack?: () => void;
  backLabel?: string;
}

// ── Color map ──
export const FORM_STATUS_COLORS: Record<string, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  gray: "bg-muted text-muted-foreground",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};
