// ── Universal Automation Engine Types ──

export interface AutomationCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in" | "contains" | "is_null" | "is_not_null";
  value: any;
}

export type AutomationActionType =
  // Creation
  | "criar_conta_pagar"
  | "criar_conta_receber"
  | "criar_projeto_financeiro"
  | "criar_tarefa"
  | "criar_notificacao"
  | "criar_aprovacao"
  // Update
  | "alterar_status"
  | "alterar_responsavel"
  | "alterar_prioridade"
  | "preencher_centro_custo"
  | "preencher_projeto"
  | "preencher_categoria"
  // Block
  | "bloquear_avanco"
  | "exigir_documento"
  | "exigir_aprovacao"
  | "impedir_edicao"
  // Communication
  | "notificar_usuario"
  | "enviar_alerta"
  | "adicionar_central_operacional"
  // Analytics
  | "impactar_meta"
  | "impactar_dre"
  | "impactar_fluxo"
  | "recalcular_forecast"
  | "registrar_auditoria"
  // Custom
  | "custom";

export interface AutomationAction {
  type: AutomationActionType;
  params?: Record<string, any>;
}

export type EventType =
  // Cadastro
  | "registro_criado" | "registro_atualizado" | "registro_cancelado" | "registro_arquivado"
  // Status
  | "mudou_rascunho" | "mudou_aguardando_aprovacao" | "mudou_aprovado"
  | "mudou_em_execucao" | "mudou_concluido" | "mudou_cancelado"
  // Financeiro
  | "conta_criada" | "conta_vencida" | "pagamento_realizado"
  | "recebimento_realizado" | "conciliacao_concluida" | "extrato_importado"
  // Comercial
  | "orcamento_criado" | "pedido_criado" | "pedido_aprovado"
  | "pedido_faturado" | "pedido_entregue"
  // Operacional
  | "producao_iniciada" | "producao_concluida"
  | "entrega_iniciada" | "entrega_concluida" | "retrabalho_registrado"
  // Gerencial
  | "meta_em_risco" | "orcamento_excedido"
  | "fluxo_projetado_negativo" | "margem_abaixo_minimo";

export type EventModule =
  | "cadastro" | "status" | "financeiro" | "comercial" | "operacional" | "gerencial";

export interface AutomationRule {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  event_type: EventType;
  event_module: EventModule;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  priority: number;
  is_system: boolean;
  active: boolean;
  last_executed_at: string | null;
  execution_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationExecutionLog {
  id: string;
  rule_id: string | null;
  rule_name: string | null;
  event_type: string;
  event_payload: any;
  source_table: string | null;
  source_id: string | null;
  actions_executed: AutomationAction[];
  status: "pendente" | "sucesso" | "falha" | "simulacao";
  error_message: string | null;
  execution_time_ms: number | null;
  triggered_by: string | null;
  created_at: string;
}

export interface AutomationEvent {
  type: EventType;
  module: EventModule;
  sourceTable: string;
  sourceId: string;
  payload: Record<string, any>;
  triggeredBy: string;
  simulate?: boolean;
}

// ── Event Catalog ──
export interface EventCatalogEntry {
  type: EventType;
  module: EventModule;
  label: string;
}

export const EVENT_CATALOG: EventCatalogEntry[] = [
  // Cadastro
  { type: "registro_criado", module: "cadastro", label: "Registro criado" },
  { type: "registro_atualizado", module: "cadastro", label: "Registro atualizado" },
  { type: "registro_cancelado", module: "cadastro", label: "Registro cancelado" },
  { type: "registro_arquivado", module: "cadastro", label: "Registro arquivado" },
  // Status
  { type: "mudou_rascunho", module: "status", label: "Mudou para Rascunho" },
  { type: "mudou_aguardando_aprovacao", module: "status", label: "Mudou para Aguardando Aprovação" },
  { type: "mudou_aprovado", module: "status", label: "Mudou para Aprovado" },
  { type: "mudou_em_execucao", module: "status", label: "Mudou para Em Execução" },
  { type: "mudou_concluido", module: "status", label: "Mudou para Concluído" },
  { type: "mudou_cancelado", module: "status", label: "Mudou para Cancelado" },
  // Financeiro
  { type: "conta_criada", module: "financeiro", label: "Conta criada" },
  { type: "conta_vencida", module: "financeiro", label: "Conta vencida" },
  { type: "pagamento_realizado", module: "financeiro", label: "Pagamento realizado" },
  { type: "recebimento_realizado", module: "financeiro", label: "Recebimento realizado" },
  { type: "conciliacao_concluida", module: "financeiro", label: "Conciliação concluída" },
  { type: "extrato_importado", module: "financeiro", label: "Extrato importado" },
  // Comercial
  { type: "orcamento_criado", module: "comercial", label: "Orçamento criado" },
  { type: "pedido_criado", module: "comercial", label: "Pedido criado" },
  { type: "pedido_aprovado", module: "comercial", label: "Pedido aprovado" },
  { type: "pedido_faturado", module: "comercial", label: "Pedido faturado" },
  { type: "pedido_entregue", module: "comercial", label: "Pedido entregue" },
  // Operacional
  { type: "producao_iniciada", module: "operacional", label: "Produção iniciada" },
  { type: "producao_concluida", module: "operacional", label: "Produção concluída" },
  { type: "entrega_iniciada", module: "operacional", label: "Entrega iniciada" },
  { type: "entrega_concluida", module: "operacional", label: "Entrega concluída" },
  { type: "retrabalho_registrado", module: "operacional", label: "Retrabalho registrado" },
  // Gerencial
  { type: "meta_em_risco", module: "gerencial", label: "Meta em risco" },
  { type: "orcamento_excedido", module: "gerencial", label: "Orçamento excedido" },
  { type: "fluxo_projetado_negativo", module: "gerencial", label: "Fluxo projetado negativo" },
  { type: "margem_abaixo_minimo", module: "gerencial", label: "Margem abaixo do mínimo" },
];

export const ACTION_CATALOG: { type: AutomationActionType; label: string; group: string }[] = [
  // Criação
  { type: "criar_conta_pagar", label: "Criar conta a pagar", group: "Criação" },
  { type: "criar_conta_receber", label: "Criar conta a receber", group: "Criação" },
  { type: "criar_projeto_financeiro", label: "Criar projeto financeiro", group: "Criação" },
  { type: "criar_tarefa", label: "Criar tarefa", group: "Criação" },
  { type: "criar_notificacao", label: "Criar notificação", group: "Criação" },
  { type: "criar_aprovacao", label: "Criar aprovação", group: "Criação" },
  // Atualização
  { type: "alterar_status", label: "Alterar status", group: "Atualização" },
  { type: "alterar_responsavel", label: "Alterar responsável", group: "Atualização" },
  { type: "alterar_prioridade", label: "Alterar prioridade", group: "Atualização" },
  { type: "preencher_centro_custo", label: "Preencher centro de custo", group: "Atualização" },
  { type: "preencher_projeto", label: "Preencher projeto", group: "Atualização" },
  { type: "preencher_categoria", label: "Preencher categoria", group: "Atualização" },
  // Bloqueio
  { type: "bloquear_avanco", label: "Bloquear avanço", group: "Bloqueio" },
  { type: "exigir_documento", label: "Exigir documento", group: "Bloqueio" },
  { type: "exigir_aprovacao", label: "Exigir aprovação", group: "Bloqueio" },
  { type: "impedir_edicao", label: "Impedir edição", group: "Bloqueio" },
  // Comunicação
  { type: "notificar_usuario", label: "Notificar usuário", group: "Comunicação" },
  { type: "enviar_alerta", label: "Enviar alerta", group: "Comunicação" },
  { type: "adicionar_central_operacional", label: "Adicionar à Central Operacional", group: "Comunicação" },
  // Analítico
  { type: "impactar_meta", label: "Impactar meta", group: "Analítico" },
  { type: "impactar_dre", label: "Impactar DRE", group: "Analítico" },
  { type: "impactar_fluxo", label: "Impactar fluxo", group: "Analítico" },
  { type: "recalcular_forecast", label: "Recalcular forecast", group: "Analítico" },
  { type: "registrar_auditoria", label: "Registrar auditoria", group: "Analítico" },
];

export const MODULE_LABELS: Record<EventModule, string> = {
  cadastro: "Cadastro",
  status: "Status",
  financeiro: "Financeiro",
  comercial: "Comercial",
  operacional: "Operacional",
  gerencial: "Gerencial",
};
