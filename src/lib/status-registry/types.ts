// ── Universal ERP Status Registry Types ──

import type { LucideIcon } from "lucide-react";

/** Global color tokens for statuses */
export type StatusColor = "gray" | "blue" | "yellow" | "green" | "red" | "black" | "orange" | "purple" | "cyan" | "indigo" | "teal";

/** One status definition */
export interface StatusDef {
  key: string;
  label: string;
  color: StatusColor;
  icon: LucideIcon;
  /** Allowed next statuses */
  transitions: string[];
  /** Block structural edits */
  blockEdit?: boolean;
  /** Status is computed/derived (e.g. "vencido") */
  derived?: boolean;
}

/** Automation triggered on status entry */
export interface StatusAutomation {
  trigger: string;                // status key that triggers
  action: StatusAutomationAction;
  description: string;
}

export type StatusAutomationAction =
  | "gerar_financeiro"
  | "marcar_vencido"
  | "marcar_pago"
  | "marcar_recebido"
  | "marcar_concluido"
  | "reverter_provisoes"
  | "criar_ops"
  | "notificar"
  | "custom";

/** Full module config */
export interface ModuleStatusConfig {
  module: string;
  label: string;
  statuses: StatusDef[];
  automations?: StatusAutomation[];
  /** Steps to display in the stepper */
  stepperKeys?: string[];
}
