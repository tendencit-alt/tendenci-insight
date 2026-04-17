export type ShortcutProfile = "owner" | "financeiro" | "comercial" | "operacional" | "geral";

export interface Shortcut {
  id: string;
  label: string;
  description?: string;
  icon: string; // lucide icon name
  route: string;
  keys?: string; // sequence like "n d" or combo like "mod+k"
  profiles?: ShortcutProfile[]; // visible for these profiles
  contextRoutes?: string[]; // visible only when current path startsWith one of these
  category: "create" | "navigate" | "report" | "action" | "context";
  isDefault?: boolean;
}

export interface PersonalShortcut {
  id: string;
  shortcutId: string; // reference to registry, or custom id
  pinnedAt: number;
  position: number;
}

export interface ShortcutAnalyticsEvent {
  shortcutId: string;
  triggeredVia: "click" | "keyboard" | "quickbar" | "contextual";
  route?: string;
  at: number;
}
