// ── Module Status Configurations ──

import {
  FileEdit, Clock, CheckCircle2, Banknote, PackageCheck, XCircle,
  Send, ShoppingCart, Package, Truck, Factory, CalendarClock,
  AlertTriangle, PlayCircle, PauseCircle, Receipt,
} from "lucide-react";
import type { ModuleStatusConfig } from "./types";

// ═══════════════════════════════════════════
// PEDIDOS (Orders)
// ═══════════════════════════════════════════
export const ORDERS_STATUS: ModuleStatusConfig = {
  module: "orders",
  label: "Pedidos",
  stepperKeys: ["rascunho", "aprovado", "em_producao", "faturado", "entregue", "encerrado"],
  statuses: [
    { key: "rascunho",              label: "Rascunho",              color: "gray",   icon: FileEdit,     transitions: ["em_negociacao", "aprovado", "cancelado", "ativo"] },
    { key: "em_negociacao",         label: "Em Negociação",         color: "yellow", icon: Clock,        transitions: ["aprovado", "rascunho", "cancelado", "ativo"] },
    { key: "aprovado",              label: "Aprovado",              color: "green",  icon: CheckCircle2, transitions: ["liberado_producao", "em_producao", "cancelado"] },
    { key: "ativo",                 label: "Ativo",                 color: "green",  icon: CheckCircle2, transitions: ["liberado_producao", "em_producao", "cancelado"] },
    { key: "liberado_producao",     label: "Lib. Produção",         color: "cyan",   icon: Factory,      transitions: ["em_producao", "cancelado"] },
    { key: "em_producao",           label: "Em Produção",           color: "blue",   icon: Factory,      transitions: ["producao_concluida"] },
    { key: "producao_concluida",    label: "Prod. Concluída",       color: "indigo", icon: CheckCircle2, transitions: ["liberado_faturamento", "faturado"] },
    { key: "liberado_faturamento",  label: "Lib. Faturamento",      color: "purple", icon: Receipt,      transitions: ["faturado"] },
    { key: "faturado",              label: "Faturado",              color: "purple", icon: Receipt,      transitions: ["entregue"] },
    { key: "entregue",              label: "Entregue",              color: "teal",   icon: Truck,        transitions: ["encerrado"] },
    { key: "encerrado",             label: "Encerrado",             color: "gray",   icon: PackageCheck, transitions: [], blockEdit: true },
    { key: "cancelado",             label: "Cancelado",             color: "black",  icon: XCircle,      transitions: ["rascunho"], blockEdit: true },
  ],
  automations: [
    { trigger: "aprovado",   action: "gerar_financeiro",  description: "Gera contas a receber e compromissos" },
    { trigger: "aprovado",   action: "criar_ops",         description: "Cria ordens de produção" },
    { trigger: "cancelado",  action: "reverter_provisoes", description: "Reverte provisões financeiras" },
    { trigger: "encerrado",  action: "marcar_concluido",  description: "Marca pedido como concluído" },
  ],
};

// ═══════════════════════════════════════════
// CONTAS A PAGAR (Payables)
// ═══════════════════════════════════════════
export const PAYABLES_STATUS: ModuleStatusConfig = {
  module: "fin_payables",
  label: "Contas a Pagar",
  stepperKeys: ["previsto", "lancado", "pago"],
  statuses: [
    { key: "previsto",   label: "Previsto",   color: "gray",   icon: CalendarClock,  transitions: ["lancado", "cancelado"] },
    { key: "lancado",    label: "Lançado",    color: "blue",   icon: Send,           transitions: ["pago", "cancelado"] },
    { key: "vencido",    label: "Vencido",    color: "red",    icon: AlertTriangle,  transitions: ["pago", "cancelado"], derived: true },
    { key: "pago",       label: "Pago",       color: "green",  icon: CheckCircle2,   transitions: [], blockEdit: true },
    { key: "cancelado",  label: "Cancelado",  color: "black",  icon: XCircle,        transitions: [], blockEdit: true },
  ],
  automations: [
    { trigger: "vencido", action: "marcar_vencido",  description: "Marca automaticamente como vencido após a data" },
    { trigger: "pago",    action: "marcar_pago",     description: "Registra baixa no caixa" },
  ],
};

// ═══════════════════════════════════════════
// CONTAS A RECEBER (Receivables)
// ═══════════════════════════════════════════
export const RECEIVABLES_STATUS: ModuleStatusConfig = {
  module: "fin_receivables",
  label: "Contas a Receber",
  stepperKeys: ["previsto", "lancado", "recebido"],
  statuses: [
    { key: "previsto",   label: "Previsto",   color: "gray",   icon: CalendarClock,  transitions: ["lancado", "cancelado"] },
    { key: "lancado",    label: "Lançado",    color: "blue",   icon: Send,           transitions: ["recebido", "cancelado"] },
    { key: "vencido",    label: "Vencido",    color: "red",    icon: AlertTriangle,  transitions: ["recebido", "cancelado"], derived: true },
    { key: "recebido",   label: "Recebido",   color: "green",  icon: CheckCircle2,   transitions: [], blockEdit: true },
    { key: "cancelado",  label: "Cancelado",  color: "black",  icon: XCircle,        transitions: [], blockEdit: true },
  ],
  automations: [
    { trigger: "vencido",   action: "marcar_vencido",   description: "Marca automaticamente como vencido após a data" },
    { trigger: "recebido",  action: "marcar_recebido",  description: "Registra entrada no caixa" },
  ],
};

// ═══════════════════════════════════════════
// COMPRAS (Purchases)
// ═══════════════════════════════════════════
export const PURCHASES_STATUS: ModuleStatusConfig = {
  module: "purchases",
  label: "Compras",
  stepperKeys: ["rascunho", "solicitado", "aprovado", "comprado", "recebido"],
  statuses: [
    { key: "rascunho",   label: "Rascunho",   color: "gray",   icon: FileEdit,     transitions: ["solicitado", "cancelado"] },
    { key: "solicitado", label: "Solicitado",  color: "blue",   icon: Send,         transitions: ["aprovado", "rascunho", "cancelado"] },
    { key: "aprovado",   label: "Aprovado",    color: "green",  icon: CheckCircle2, transitions: ["comprado", "cancelado"] },
    { key: "comprado",   label: "Comprado",    color: "purple", icon: ShoppingCart,  transitions: ["recebido", "cancelado"] },
    { key: "recebido",   label: "Recebido",    color: "teal",   icon: Package,      transitions: [], blockEdit: true },
    { key: "cancelado",  label: "Cancelado",   color: "black",  icon: XCircle,      transitions: [], blockEdit: true },
  ],
};

// ═══════════════════════════════════════════
// PROJETOS (Projects)
// ═══════════════════════════════════════════
export const PROJECTS_STATUS: ModuleStatusConfig = {
  module: "projects",
  label: "Projetos",
  stepperKeys: ["planejado", "em_execucao", "concluido"],
  statuses: [
    { key: "planejado",    label: "Planejado",     color: "gray",   icon: CalendarClock, transitions: ["em_execucao", "cancelado"] },
    { key: "em_execucao",  label: "Em Execução",   color: "blue",   icon: PlayCircle,    transitions: ["aguardando", "concluido", "cancelado"] },
    { key: "aguardando",   label: "Aguardando",    color: "yellow", icon: PauseCircle,   transitions: ["em_execucao", "cancelado"] },
    { key: "concluido",    label: "Concluído",     color: "green",  icon: CheckCircle2,  transitions: [], blockEdit: true },
    { key: "cancelado",    label: "Cancelado",     color: "black",  icon: XCircle,       transitions: [], blockEdit: true },
  ],
};

// ═══════════════════════════════════════════
// PRODUÇÃO (Production)
// ═══════════════════════════════════════════
export const PRODUCTION_STATUS: ModuleStatusConfig = {
  module: "production",
  label: "Produção",
  stepperKeys: ["aguardando", "em_producao", "concluida"],
  statuses: [
    { key: "aguardando",   label: "Aguardando",     color: "yellow", icon: Clock,        transitions: ["em_producao", "cancelado"] },
    { key: "em_producao",  label: "Em Produção",    color: "blue",   icon: Factory,      transitions: ["concluida", "pausada"] },
    { key: "pausada",      label: "Pausada",        color: "orange", icon: PauseCircle,  transitions: ["em_producao", "cancelado"] },
    { key: "concluida",    label: "Concluída",      color: "green",  icon: CheckCircle2, transitions: [], blockEdit: true },
    { key: "cancelado",    label: "Cancelado",      color: "black",  icon: XCircle,      transitions: [], blockEdit: true },
  ],
};

// ═══════════════════════════════════════════
// CONCILIAÇÃO BANCÁRIA (Bank Reconciliation)
// ═══════════════════════════════════════════
import { Link2, Eye, EyeOff, Sparkles } from "lucide-react";

export const RECONCILIATION_STATUS: ModuleStatusConfig = {
  module: "reconciliation",
  label: "Conciliação Bancária",
  statuses: [
    { key: "PENDENTE",     label: "Não Conciliado",          color: "yellow", icon: Clock,        transitions: ["CONCILIADA", "IGNORADA"] },
    { key: "SUGERIDA",     label: "Sugestão Automática",     color: "blue",   icon: Sparkles,     transitions: ["CONCILIADA", "IGNORADA", "PENDENTE"] },
    { key: "CONCILIADA",   label: "Conciliado",              color: "green",  icon: CheckCircle2, transitions: ["PENDENTE"], blockEdit: true },
    { key: "IGNORADA",     label: "Ignorado",                color: "gray",   icon: EyeOff,       transitions: ["PENDENTE"] },
    { key: "DUPLICADA",    label: "Duplicada",               color: "orange", icon: AlertTriangle, transitions: [], blockEdit: true },
    { key: "DIVERGENTE",   label: "Divergente",              color: "red",    icon: AlertTriangle, transitions: ["CONCILIADA", "IGNORADA"] },
  ],
};

// ═══════════════════════════════════════════
// CONTRATOS RECORRENTES (Recurring Contracts)
// ═══════════════════════════════════════════
export const RECURRING_CONTRACTS_STATUS: ModuleStatusConfig = {
  module: "recurring_contracts",
  label: "Contratos Recorrentes",
  statuses: [
    { key: "active",  label: "Ativo",      color: "green",  icon: PlayCircle,   transitions: ["paused", "ended"] },
    { key: "paused",  label: "Pausado",    color: "yellow", icon: PauseCircle,  transitions: ["active", "ended"] },
    { key: "ended",   label: "Encerrado",  color: "gray",   icon: XCircle,      transitions: [], blockEdit: true },
  ],
};

// ═══════════════════════════════════════════
// REGISTRY MAP
// ═══════════════════════════════════════════
const ALL_MODULES: ModuleStatusConfig[] = [
  ORDERS_STATUS,
  PAYABLES_STATUS,
  RECEIVABLES_STATUS,
  PURCHASES_STATUS,
  PROJECTS_STATUS,
  PRODUCTION_STATUS,
  RECONCILIATION_STATUS,
  RECURRING_CONTRACTS_STATUS,
];

const MODULE_MAP = new Map(ALL_MODULES.map((m) => [m.module, m]));

export function getModuleStatusConfig(module: string): ModuleStatusConfig | undefined {
  return MODULE_MAP.get(module);
}

export function getStatusDef(module: string, statusKey: string) {
  const config = MODULE_MAP.get(module);
  return config?.statuses.find((s) => s.key === statusKey);
}

export function getStatusLabel(module: string, statusKey: string): string {
  return getStatusDef(module, statusKey)?.label || statusKey;
}

export function getAvailableTransitions(module: string, statusKey: string) {
  const config = MODULE_MAP.get(module);
  const status = config?.statuses.find((s) => s.key === statusKey);
  if (!status) return [];
  return status.transitions
    .map((t) => config!.statuses.find((s) => s.key === t))
    .filter(Boolean);
}

export function canTransition(module: string, from: string, to: string): boolean {
  const status = getStatusDef(module, from);
  return status?.transitions.includes(to) ?? false;
}

export function isEditable(module: string, statusKey: string): boolean {
  const status = getStatusDef(module, statusKey);
  return status ? !status.blockEdit : true;
}
