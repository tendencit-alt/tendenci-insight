import type { StatusConfig, StatusMachineConfig, StatusEvent } from "./types";

// ── Default Status Definitions ──
export const DEFAULT_STATUSES: StatusConfig[] = [
  {
    key: "rascunho",
    label: "Rascunho",
    color: "gray",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    transitions: ["aguardando_aprovacao", "cancelado"],
  },
  {
    key: "aguardando_aprovacao",
    label: "Aguardando Aprovação",
    color: "yellow",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-800 dark:text-yellow-400",
    transitions: ["aprovado", "rascunho", "cancelado"],
  },
  {
    key: "aprovado",
    label: "Aprovado",
    color: "blue",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-800 dark:text-blue-400",
    transitions: ["em_execucao", "cancelado"],
  },
  {
    key: "em_execucao",
    label: "Em Execução",
    color: "purple",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-800 dark:text-purple-400",
    transitions: ["concluido", "cancelado"],
  },
  {
    key: "concluido",
    label: "Concluído",
    color: "green",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-800 dark:text-green-400",
    transitions: ["arquivado"],
    blockEdit: true,
  },
  {
    key: "cancelado",
    label: "Cancelado",
    color: "red",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    transitions: [],
    blockEdit: true,
  },
  {
    key: "arquivado",
    label: "Arquivado",
    color: "gray",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    transitions: [],
    blockEdit: true,
  },
];

// ── Default Events ──
export const DEFAULT_EVENTS: StatusEvent[] = [
  {
    status: "aprovado",
    actions: ["gerar_financeiro", "gerar_producao", "gerar_contrato", "notificar_responsaveis"],
  },
  {
    status: "concluido",
    actions: ["registrar_auditoria", "atualizar_indicadores", "finalizar_tarefas"],
  },
];

// ── Pre-built configs per entity ──
export const ORDER_STATUS_CONFIG: StatusMachineConfig = {
  entityType: "orders",
  statuses: DEFAULT_STATUSES,
  events: DEFAULT_EVENTS,
};

export const PAYABLE_STATUS_CONFIG: StatusMachineConfig = {
  entityType: "fin_payables",
  statuses: [
    { key: "rascunho", label: "Provisionado", color: "gray", bgColor: "bg-muted", textColor: "text-muted-foreground", transitions: ["aguardando_aprovacao", "cancelado"] },
    { key: "aguardando_aprovacao", label: "Aguardando Aprovação", color: "yellow", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", textColor: "text-yellow-800 dark:text-yellow-400", transitions: ["aprovado", "rascunho", "cancelado"] },
    { key: "aprovado", label: "Confirmado", color: "blue", bgColor: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-800 dark:text-blue-400", transitions: ["em_execucao", "cancelado"] },
    { key: "em_execucao", label: "A Vencer", color: "purple", bgColor: "bg-purple-100 dark:bg-purple-900/30", textColor: "text-purple-800 dark:text-purple-400", transitions: ["concluido", "cancelado"] },
    { key: "concluido", label: "Pago", color: "green", bgColor: "bg-green-100 dark:bg-green-900/30", textColor: "text-green-800 dark:text-green-400", transitions: ["arquivado"], blockEdit: true },
    { key: "cancelado", label: "Cancelado", color: "red", bgColor: "bg-destructive/10", textColor: "text-destructive", transitions: [], blockEdit: true },
    { key: "arquivado", label: "Conciliado", color: "gray", bgColor: "bg-muted", textColor: "text-muted-foreground", transitions: [], blockEdit: true },
  ],
};

export const RECEIVABLE_STATUS_CONFIG: StatusMachineConfig = {
  entityType: "fin_receivables",
  statuses: [
    { key: "rascunho", label: "Provisionado", color: "gray", bgColor: "bg-muted", textColor: "text-muted-foreground", transitions: ["aguardando_aprovacao", "cancelado"] },
    { key: "aguardando_aprovacao", label: "Aguardando Confirmação", color: "yellow", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", textColor: "text-yellow-800 dark:text-yellow-400", transitions: ["aprovado", "rascunho", "cancelado"] },
    { key: "aprovado", label: "Confirmado", color: "blue", bgColor: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-800 dark:text-blue-400", transitions: ["em_execucao", "cancelado"] },
    { key: "em_execucao", label: "A Receber", color: "purple", bgColor: "bg-purple-100 dark:bg-purple-900/30", textColor: "text-purple-800 dark:text-purple-400", transitions: ["concluido", "cancelado"] },
    { key: "concluido", label: "Recebido", color: "green", bgColor: "bg-green-100 dark:bg-green-900/30", textColor: "text-green-800 dark:text-green-400", transitions: ["arquivado"], blockEdit: true },
    { key: "cancelado", label: "Cancelado", color: "red", bgColor: "bg-destructive/10", textColor: "text-destructive", transitions: [], blockEdit: true },
    { key: "arquivado", label: "Conciliado", color: "gray", bgColor: "bg-muted", textColor: "text-muted-foreground", transitions: [], blockEdit: true },
  ],
};

export const PRODUCTION_STATUS_CONFIG: StatusMachineConfig = {
  entityType: "production_orders",
  statuses: DEFAULT_STATUSES.map((s) =>
    s.key === "em_execucao" ? { ...s, label: "Em Produção" } :
    s.key === "concluido" ? { ...s, label: "Produção Concluída" } : s
  ),
  events: DEFAULT_EVENTS,
};

export const CONTRACT_STATUS_CONFIG: StatusMachineConfig = {
  entityType: "contracts",
  statuses: DEFAULT_STATUSES.map((s) =>
    s.key === "em_execucao" ? { ...s, label: "Vigente" } :
    s.key === "concluido" ? { ...s, label: "Encerrado" } : s
  ),
};

export const TASK_STATUS_CONFIG: StatusMachineConfig = {
  entityType: "erp_tasks",
  statuses: DEFAULT_STATUSES.map((s) =>
    s.key === "aguardando_aprovacao" ? { ...s, label: "Pendente" } :
    s.key === "em_execucao" ? { ...s, label: "Em Andamento" } : s
  ),
};

// ── Lookup helper ──
export function getConfigForEntity(entityType: string): StatusMachineConfig {
  const MAP: Record<string, StatusMachineConfig> = {
    orders: ORDER_STATUS_CONFIG,
    fin_payables: PAYABLE_STATUS_CONFIG,
    fin_receivables: RECEIVABLE_STATUS_CONFIG,
    production_orders: PRODUCTION_STATUS_CONFIG,
    contracts: CONTRACT_STATUS_CONFIG,
    erp_tasks: TASK_STATUS_CONFIG,
  };
  return MAP[entityType] || { entityType, statuses: DEFAULT_STATUSES, events: DEFAULT_EVENTS };
}
