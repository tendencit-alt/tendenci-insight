// ── Global Status Color Tokens ──
// Single source of truth for all status colors across the ERP.

import type { StatusColor } from "./types";

export const STATUS_BG: Record<StatusColor, string> = {
  gray:   "bg-muted/60",
  blue:   "bg-blue-100 dark:bg-blue-950/30",
  yellow: "bg-yellow-100 dark:bg-yellow-950/30",
  green:  "bg-green-100 dark:bg-green-950/30",
  red:    "bg-red-100 dark:bg-red-950/30",
  black:  "bg-zinc-900 dark:bg-zinc-800",
  orange: "bg-orange-100 dark:bg-orange-950/30",
  purple: "bg-purple-100 dark:bg-purple-950/30",
  cyan:   "bg-cyan-100 dark:bg-cyan-950/30",
  indigo: "bg-indigo-100 dark:bg-indigo-950/30",
  teal:   "bg-teal-100 dark:bg-teal-950/30",
};

export const STATUS_TEXT: Record<StatusColor, string> = {
  gray:   "text-muted-foreground",
  blue:   "text-blue-800 dark:text-blue-400",
  yellow: "text-yellow-800 dark:text-yellow-400",
  green:  "text-green-800 dark:text-green-400",
  red:    "text-red-800 dark:text-red-400",
  black:  "text-white",
  orange: "text-orange-800 dark:text-orange-400",
  purple: "text-purple-800 dark:text-purple-400",
  cyan:   "text-cyan-800 dark:text-cyan-400",
  indigo: "text-indigo-800 dark:text-indigo-400",
  teal:   "text-teal-800 dark:text-teal-400",
};

export const STATUS_BORDER: Record<StatusColor, string> = {
  gray:   "border-border",
  blue:   "border-blue-200 dark:border-blue-800",
  yellow: "border-yellow-200 dark:border-yellow-800",
  green:  "border-green-200 dark:border-green-800",
  red:    "border-red-200 dark:border-red-800",
  black:  "border-zinc-700",
  orange: "border-orange-200 dark:border-orange-800",
  purple: "border-purple-200 dark:border-purple-800",
  cyan:   "border-cyan-200 dark:border-cyan-800",
  indigo: "border-indigo-200 dark:border-indigo-800",
  teal:   "border-teal-200 dark:border-teal-800",
};

export const STATUS_DOT: Record<StatusColor, string> = {
  gray:   "bg-gray-500",
  blue:   "bg-blue-500",
  yellow: "bg-yellow-500",
  green:  "bg-green-500",
  red:    "bg-red-500",
  black:  "bg-zinc-900 dark:bg-zinc-300",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
  cyan:   "bg-cyan-500",
  indigo: "bg-indigo-500",
  teal:   "bg-teal-500",
};
