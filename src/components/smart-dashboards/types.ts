// Smart Dashboard types & registry
import type { LucideIcon } from "lucide-react";

export type DashboardProfile = "owner" | "financeiro" | "comercial" | "operacional";
export type WidgetSize = "sm" | "md" | "lg" | "xl";
export type WidgetCategory = "financeiro" | "comercial" | "operacional" | "estrategico";

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  category: WidgetCategory;
  defaultSize: WidgetSize;
  profiles: DashboardProfile[];
  icon?: LucideIcon;
  drillPath?: string;
}

export interface WidgetInstance {
  widgetId: string;
  size: WidgetSize;
  pinned?: boolean;
  position: number;
}

export interface SavedDashboard {
  id: string;
  name: string;
  profile: DashboardProfile;
  widgets: WidgetInstance[];
  filters?: Record<string, any>;
  period?: string;
  createdAt: string;
}

export const SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: "col-span-12 sm:col-span-6 lg:col-span-3",
  md: "col-span-12 sm:col-span-6 lg:col-span-4",
  lg: "col-span-12 lg:col-span-6",
  xl: "col-span-12",
};

export const PROFILE_LABELS: Record<DashboardProfile, string> = {
  owner: "Executivo (Owner)",
  financeiro: "Financeiro",
  comercial: "Comercial",
  operacional: "Operacional",
};
