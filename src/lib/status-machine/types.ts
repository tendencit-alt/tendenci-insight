// ── Universal Status Machine Types ──

export type StatusKey =
  | "rascunho"
  | "aguardando_aprovacao"
  | "aprovado"
  | "em_execucao"
  | "concluido"
  | "cancelado"
  | "arquivado";

export interface StatusConfig {
  key: StatusKey;
  label: string;
  color: string;        // tailwind semantic class
  bgColor: string;      // badge bg
  textColor: string;    // badge text
  icon?: string;
  /** Allowed next statuses */
  transitions: StatusKey[];
  /** Block structural edits when in this status */
  blockEdit?: boolean;
}

export interface StatusTransition {
  from: StatusKey;
  to: StatusKey;
  userId: string;
  userName?: string;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AutoApprovalRule {
  field: "value" | "category" | "company" | "record_type";
  operator: "lt" | "lte" | "eq" | "gte" | "gt" | "in";
  value: string | number | string[];
  /** Auto-transition to this status when matched */
  targetStatus: StatusKey;
}

export interface StatusEvent {
  status: StatusKey;
  actions: StatusEventAction[];
}

export type StatusEventAction =
  | "gerar_financeiro"
  | "gerar_producao"
  | "gerar_contrato"
  | "notificar_responsaveis"
  | "registrar_auditoria"
  | "atualizar_indicadores"
  | "finalizar_tarefas"
  | "custom";

export interface StatusMachineConfig {
  /** Entity type identifier */
  entityType: string;
  statuses: StatusConfig[];
  events?: StatusEvent[];
  autoApprovalRules?: AutoApprovalRule[];
}
