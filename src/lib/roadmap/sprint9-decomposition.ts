// ══════════════════════════════════════════════════════════════════════
// DECOMPOSIÇÃO TÉCNICA — SPRINT 9: AUTOMAÇÃO, NOTIFICAÇÕES E APROVAÇÕES
// ══════════════════════════════════════════════════════════════════════

import type { DecompositionBlock, DecompositionItem, SprintDecomposition } from "./sprint1-decomposition";

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — WORKFLOW ENGINE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_1: DecompositionBlock = {
  id: "s9-b1-workflow-engine",
  number: 1,
  name: "Workflow Engine",
  objective: "Motor de eventos e ações configurável: criação, alteração status, aprovação, atraso, vencimento, conclusão",
  status: "partial",
  doneWhen: [
    "Engine processa eventos: criação, alteração_status, aprovação, reprovação, atraso, vencimento, conclusão",
    "Ações: notificação, aprovação, criação_tarefa, mudança_status",
    "Tabela automation_rules com event_type, conditions, actions",
    "Execução registrada em automation_execution_logs",
    "UI de gestão de regras",
  ],
  items: [
    {
      id: "s9-b1-01",
      name: "Motor de eventos e ações",
      status: "partial",
      existing: [
        "automation_rules com event_type, event_module, conditions (JSONB), actions (JSONB), active, priority",
        "automation_execution_logs com event_type, status, actions_executed, execution_time_ms, error_message",
        "EventAutomationRulesPanel (financeiro) para gestão de regras",
        "ManageProductionAutomationsDialog para automações de produção",
        "cross_module_events para eventos entre módulos",
        "process-business-event Edge Function para processamento de eventos",
      ],
      gaps: [
        "Unificar engines: produção, financeiro e cross_module em um único WorkflowEngine",
        "Adicionar event_types faltantes: 'atraso', 'vencimento', 'conclusao' (além dos existentes)",
        "Ação 'criacao_tarefa': ao disparar, criar registro em crm_tasks ou tabela genérica de tarefas",
        "Ação 'mudanca_status': ao disparar, alterar status do registro de origem automaticamente",
        "UI unificada: WorkflowRulesManager em Configurações (não espalhado por módulos)",
        "Testes de regra: botão 'Simular' para testar condição antes de ativar",
      ],
      files: [
        "src/components/financeiro/masters/EventAutomationRulesPanel.tsx",
        "src/components/production/ManageProductionAutomationsDialog.tsx",
      ],
      estimatedHoursRemaining: 10,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — FLUXO DE APROVAÇÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_2: DecompositionBlock = {
  id: "s9-b2-approval-flow",
  number: 2,
  name: "Fluxo de Aprovação",
  objective: "Aprovação configurável por tipo de documento com responsáveis e condições",
  status: "done",
  doneWhen: [
    "approval_rules com module, trigger_type, conditions",
    "approval_instances com source_table, source_id, status, requested_by, current_approver_id",
    "Documentos suportados: pedido venda, pedido compra, solicitação compra, pagamento, despesa",
    "UI: ApprovalQueue para fila de aprovações",
    "UI: ApprovalRulesPanel para gestão de regras",
  ],
  items: [
    {
      id: "s9-b2-01",
      name: "CRUD de fluxos de aprovação",
      status: "done",
      existing: [
        "approval_rules com module, trigger_type, source_table, condition_field, condition_operator, condition_value, active, priority",
        "approval_instances com source_table, source_id, status (pendente/aprovado/rejeitado/cancelado/em_revisao/executado), amount, urgency, description, metadata",
        "requested_by, current_approver_id, approved_at, cancelled_at, rejection_reason, reopen_reason",
        "ApprovalQueue com fila de pendências, ações de aprovar/rejeitar/reabrir",
        "ApprovalRulesPanel com CRUD de regras de aprovação",
        "ApprovalsBlock na Central Operacional com resumo",
      ],
      gaps: [],
      files: [
        "src/components/aprovacoes/ApprovalQueue.tsx",
        "src/components/aprovacoes/ApprovalRulesPanel.tsx",
        "src/components/central-operacional/ApprovalsBlock.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — NÍVEIS DE APROVAÇÃO (MULTINÍVEL)
// ══════════════════════════════════════════════════════════════════════

const BLOCK_3: DecompositionBlock = {
  id: "s9-b3-approval-levels",
  number: 3,
  name: "Aprovação Multinível",
  objective: "Múltiplos níveis de aprovação com ordem, responsáveis e faixas de valor",
  status: "partial",
  doneWhen: [
    "approval_thresholds com faixas de valor (min/max) e aprovadores por faixa",
    "Suporte a segundo aprovador (requires_second_approval)",
    "Aprovação sequencial: nível 1 → nível 2 → ... → aprovado",
    "approval_steps registra cada ação com from_status, to_status, comment",
    "UI: configuração de níveis por regra",
  ],
  items: [
    {
      id: "s9-b3-01",
      name: "Configuração e execução multinível",
      status: "partial",
      existing: [
        "approval_thresholds com rule_id, min_value, max_value, approver_user_id, approver_profile_type",
        "requires_second_approval, second_approver_profile_type",
        "approval_steps com instance_id, actor_id, step_type, from_status, to_status, comment",
      ],
      gaps: [
        "Lógica sequencial: ao aprovar nível N, avançar para nível N+1 automaticamente se requires_second_approval",
        "UI: visualização de pipeline de aprovação (nível atual, próximos, concluídos) no detalhe da instância",
        "Notificação automática ao próximo aprovador quando nível anterior é aprovado",
        "Timeout: alerta se aprovação pendente > X horas por nível",
      ],
      files: [
        "src/components/aprovacoes/ApprovalQueue.tsx",
      ],
      estimatedHoursRemaining: 6,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — APROVAÇÃO CONDICIONAL
// ══════════════════════════════════════════════════════════════════════

const BLOCK_4: DecompositionBlock = {
  id: "s9-b4-conditional-approval",
  number: 4,
  name: "Aprovação Condicional",
  objective: "Regras condicionais por centro de custo, projeto, categoria, valor e tipo de documento",
  status: "partial",
  doneWhen: [
    "Condições configuráveis: centro_custo, projeto, categoria_financeira, valor, tipo_documento",
    "Múltiplas condições por regra (AND lógico)",
    "Avaliação automática de condições ao criar instância de aprovação",
    "UI: builder visual de condições",
  ],
  items: [
    {
      id: "s9-b4-01",
      name: "Builder de condições e avaliação",
      status: "partial",
      existing: [
        "approval_rules com condition_field, condition_operator, condition_value (condição única)",
        "AutoApprovalRule no status-machine com field, operator, value, targetStatus",
      ],
      gaps: [
        "Expandir para múltiplas condições por regra: criar campo 'conditions' JSONB array em approval_rules",
        "Suportar campos: centro_custo, projeto, categoria_financeira, valor, tipo_documento, empresa",
        "UI: ConditionBuilder com add/remove de condições, operadores (=, !=, >, <, in, not_in)",
        "Avaliação: função evaluate_approval_conditions(record, conditions) que resolve todas as condições",
      ],
      files: [],
      estimatedHoursRemaining: 6,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — AUTOAPROVAÇÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_5: DecompositionBlock = {
  id: "s9-b5-auto-approval",
  number: 5,
  name: "Autoaprovação",
  objective: "Aprovação automática por valor baixo, categoria autorizada ou centro de custo autorizado",
  status: "partial",
  doneWhen: [
    "Regra de autoaprovação por faixa de valor (ex: < R$ 500 = auto)",
    "Regra por categoria autorizada (lista de categorias que não precisam aprovação)",
    "Regra por centro de custo autorizado",
    "Registro de autoaprovação no approval_steps com step_type='auto_approved'",
    "Configuração via UI",
  ],
  items: [
    {
      id: "s9-b5-01",
      name: "Engine de autoaprovação",
      status: "partial",
      existing: [
        "AutoApprovalRule no status-machine/types.ts com field, operator, value, targetStatus",
        "StatusMachine.evaluateAutoApproval() que avalia regras",
        "approval_thresholds com min_value/max_value para faixas",
      ],
      gaps: [
        "Integrar evaluateAutoApproval com o fluxo de criação de approval_instances",
        "Ao criar instância: se regra de auto-aprovação match → status='aprovado' + step tipo 'auto_approved'",
        "UI: checkbox 'Permitir autoaprovação' nas regras com configuração de critérios",
        "Lista de categorias/CCs autorizados para auto-aprovação por regra",
        "Registro em audit_log com event_type='AUTO_APPROVE'",
      ],
      files: [
        "src/lib/status-machine/engine.ts",
        "src/lib/status-machine/types.ts",
      ],
      estimatedHoursRemaining: 4,
      dependencies: ["s9-b4-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — NOTIFICAÇÕES INTERNAS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_6: DecompositionBlock = {
  id: "s9-b6-notifications",
  number: 6,
  name: "Notificações Internas",
  objective: "Sistema de notificações in-app com bell icon, leitura e links diretos",
  status: "done",
  doneWhen: [
    "Tabela notifications com user_id, title, message, type, link, read, metadata",
    "NotificationBell com badge de contagem e dropdown de notificações",
    "Eventos: nova_tarefa, pendencia_aprovacao, atraso_atividade, prazo_vencendo, status_alterado",
    "Marcar como lida individual e em lote",
    "Link direto para o registro de origem",
  ],
  items: [
    {
      id: "s9-b6-01",
      name: "CRUD e UI de notificações",
      status: "done",
      existing: [
        "notifications com user_id, title, message, type, link, read, metadata, tenant_id",
        "NotificationBell com bell icon, badge de contagem, dropdown de notificações recentes",
        "Marcar como lida individual",
        "Link direto para registro",
        "RLS por user_id",
      ],
      gaps: [],
      files: [
        "src/components/notifications/NotificationBell.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 7 — ALERTAS OPERACIONAIS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_7: DecompositionBlock = {
  id: "s9-b7-operational-alerts",
  number: 7,
  name: "Alertas Operacionais",
  objective: "Alertas automáticos: pedido atrasado, produção parada, estoque mínimo, conta vencendo, obra parada",
  status: "partial",
  doneWhen: [
    "Alertas gerados automaticamente por condições do sistema",
    "Tipos: pedido_atrasado, producao_parada, estoque_minimo, conta_vencendo, obra_parada",
    "Campos: tipo, origem, prioridade, responsável, status (ativo/resolvido/ignorado)",
    "Painel centralizado de alertas ativos",
    "Resolução automática quando condição é corrigida",
  ],
  items: [
    {
      id: "s9-b7-01",
      name: "Engine de alertas operacionais",
      status: "partial",
      existing: [
        "FinanceiroAlerts com alertas de contas vencidas, pendências conciliação, extratos desatualizados",
        "LowStockAlerts para estoque mínimo",
        "OverduePurchaseAlerts para compras atrasadas",
        "ProductionSLAAlerts para SLA de produção",
        "CRMSLAAlerts para SLA do CRM",
        "Cada módulo tem seus próprios alertas isolados",
      ],
      gaps: [
        "Criar tabela 'operational_alerts' (id, tenant_id, alert_type, source_module, source_table, source_id, title, message, priority [baixa/media/alta/critica], responsible_id, status [ativo/resolvido/ignorado], resolved_at, resolved_by, created_at)",
        "RLS por tenant_id",
        "Scheduled function (pg_cron) que avalia condições periodicamente e gera/resolve alertas",
        "Condições: pedidos com prazo > data_atual, OPs paradas > X dias, estoque < mínimo, contas vencidas",
        "Resolução automática: quando condição não é mais verdadeira, status → resolvido",
        "UI: OperationalAlertsPanel centralizado com filtros por tipo/prioridade/módulo",
        "Notificação (tabela notifications) ao criar alerta crítico",
      ],
      files: [
        "src/components/financeiro/FinanceiroAlerts.tsx",
        "src/components/inventory/LowStockAlerts.tsx",
        "src/components/production/ProductionSLAAlerts.tsx",
      ],
      estimatedHoursRemaining: 10,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 — REGRAS DE AUTOMAÇÃO (CONFIGURÁVEIS)
// ══════════════════════════════════════════════════════════════════════

const BLOCK_8: DecompositionBlock = {
  id: "s9-b8-automation-rules",
  number: 8,
  name: "Regras de Automação Configuráveis",
  objective: "CRUD de regras evento → condição → ação com prioridade e logs de execução",
  status: "done",
  doneWhen: [
    "automation_rules com name, event_type, event_module, conditions, actions, priority, active",
    "automation_execution_logs com status, actions_executed, error_message",
    "UI de gestão de regras",
    "Logs de execução consultáveis",
  ],
  items: [
    {
      id: "s9-b8-01",
      name: "CRUD de regras de automação",
      status: "done",
      existing: [
        "automation_rules com name, event_type, event_module, conditions (JSONB), actions (JSONB), priority, active, is_system",
        "execution_count, error_count, last_executed_at para métricas",
        "automation_execution_logs com event_type, event_payload, status, actions_executed, execution_time_ms, error_message",
        "EventAutomationRulesPanel com CRUD completo de regras",
        "ManageProductionAutomationsDialog para produção",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/masters/EventAutomationRulesPanel.tsx",
        "src/components/production/ManageProductionAutomationsDialog.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 9 — HISTÓRICO DE DECISÕES
// ══════════════════════════════════════════════════════════════════════

const BLOCK_9: DecompositionBlock = {
  id: "s9-b9-decision-history",
  number: 9,
  name: "Histórico de Decisões",
  objective: "Registro completo de cada ação de aprovação/rejeição com usuário, data e comentário",
  status: "done",
  doneWhen: [
    "approval_steps com instance_id, actor_id, step_type, from_status, to_status, comment, created_at",
    "Tipos: aprovacao, rejeicao, reenvio, cancelamento, auto_aprovacao",
    "Visualização de timeline de decisões por documento",
    "Auditoria completa",
  ],
  items: [
    {
      id: "s9-b9-01",
      name: "Timeline de decisões",
      status: "done",
      existing: [
        "approval_steps com instance_id, actor_id, step_type, from_status, to_status, comment, created_at, tenant_id",
        "ApprovalQueue exibe steps na fila de aprovações",
        "audit_log registra eventos de aprovação com event_type='APPROVE'",
      ],
      gaps: [],
      files: [
        "src/components/aprovacoes/ApprovalQueue.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 10 — SLA OPERACIONAL
// ══════════════════════════════════════════════════════════════════════

const BLOCK_10: DecompositionBlock = {
  id: "s9-b10-operational-sla",
  number: 10,
  name: "SLA Operacional",
  objective: "Tempo máximo de execução por tipo de documento/etapa com alertas automáticos",
  status: "partial",
  doneWhen: [
    "Configuração de SLA por tipo de documento/etapa",
    "Monitoramento automático de tempo transcorrido vs SLA",
    "Alertas ao atingir % do SLA (ex: 80%) e ao estourar",
    "Dashboard de SLA com compliance rate",
  ],
  items: [
    {
      id: "s9-b10-01",
      name: "Configuração e monitoramento de SLA",
      status: "partial",
      existing: [
        "crm_stages.sla_hours para SLA por etapa do CRM",
        "CRMSLAAlerts para alertas de SLA do CRM",
        "ProductionSLAAlerts com alertas de SLA de produção",
        "ProductionSLAChart com gráfico de compliance",
        "EditPhasesSLADialog para configurar SLA das fases de produção",
        "production_automations com tipo 'sla' para alertas automáticos",
      ],
      gaps: [
        "Criar tabela genérica 'sla_configs' (id, tenant_id, entity_type [pedido/compra/aprovacao/producao-operacoes], stage nullable, max_hours, warning_percent default 80, responsible_id, active)",
        "RLS por tenant_id",
        "Unificar SLAs: CRM, produção, aprovações, financeiro em uma única configuração",
        "Dashboard centralizado: SLA compliance rate por módulo, tendência ao longo do tempo",
        "Integração com operational_alerts: SLA estourado → alerta automático",
      ],
      files: [
        "src/components/production/ProductionSLAAlerts.tsx",
        "src/components/production/ProductionSLAChart.tsx",
        "src/components/crm/CRMSLAAlerts.tsx",
      ],
      estimatedHoursRemaining: 8,
      dependencies: ["s9-b7-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 11 — PAINEL DE PENDÊNCIAS EXECUTIVAS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_11: DecompositionBlock = {
  id: "s9-b11-executive-pending",
  number: 11,
  name: "Painel de Pendências Executivas",
  objective: "Visão consolidada: aprovações pendentes, tarefas atrasadas, documentos críticos, alertas ativos",
  status: "partial",
  doneWhen: [
    "Painel unificado com 4 seções: aprovações, tarefas, documentos, alertas",
    "Contagem por categoria no header",
    "Filtros: módulo, prioridade, responsável, período",
    "Ações rápidas: aprovar, rejeitar, resolver alerta",
    "Acessível como tab no Dashboard ou página dedicada",
  ],
  items: [
    {
      id: "s9-b11-01",
      name: "Dashboard executivo de pendências",
      status: "partial",
      existing: [
        "ApprovalsBlock na Central Operacional com resumo de aprovações",
        "FinanceiroAlerts com pendências financeiras",
        "NotificationBell com notificações não lidas",
        "Cada módulo tem seu painel de pendências isolado",
      ],
      gaps: [
        "UI: ExecutivePendingPanel com 4 cards expandíveis: (1) Aprovações pendentes (fonte: approval_instances status=pendente), (2) Tarefas atrasadas (fonte: crm_tasks due_at < now() e status != concluida), (3) Documentos críticos (pedidos/compras com SLA estourado), (4) Alertas ativos (fonte: operational_alerts status=ativo)",
        "Header com badge total de pendências",
        "Filtros globais: módulo, prioridade, responsável",
        "Ações inline: aprovar/rejeitar aprovação, resolver alerta, remarcar tarefa",
        "RPC 'executive_pending_summary()' que retorna contagens por categoria",
        "Acessível via tab 'Pendências' no Dashboard Executivo",
      ],
      files: [
        "src/components/central-operacional/ApprovalsBlock.tsx",
      ],
      estimatedHoursRemaining: 8,
      dependencies: ["s9-b7-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// SPRINT 9 CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

export const SPRINT_9_DECOMPOSITION: SprintDecomposition = {
  sprint: 9,
  name: "Automação, Notificações Inteligentes e Workflow de Aprovações",
  objective: "Workflow Engine → Aprovações Multinível → Notificações → Alertas → SLA → Painel Executivo",
  totalBlocks: 11,
  totalItems: 11,
  estimatedHoursRemaining: 52,
  blocks: [
    BLOCK_1, BLOCK_2, BLOCK_3, BLOCK_4, BLOCK_5, BLOCK_6,
    BLOCK_7, BLOCK_8, BLOCK_9, BLOCK_10, BLOCK_11,
  ],
  doneCriteria: [
    "Configurar workflow com eventos e ações",
    "Configurar aprovação multinível por faixa de valor",
    "Configurar aprovação condicional por CC/projeto/categoria",
    "Autoaprovação por valor baixo ou categoria autorizada",
    "Notificações internas com bell icon e badge",
    "Alertas operacionais automáticos (pedido atrasado, produção parada, estoque mínimo)",
    "Regras de automação configuráveis (evento → condição → ação)",
    "Histórico de decisões com timeline completa",
    "SLA operacional com monitoramento e compliance rate",
    "Painel de pendências executivas consolidado",
  ],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

export function getSprint9PendingItems(): DecompositionItem[] {
  return SPRINT_9_DECOMPOSITION.blocks.flatMap(b =>
    b.items.filter(i => i.status !== "done" && i.status !== "not_needed")
  );
}

export function getSprint9ReadyItems(): DecompositionItem[] {
  const doneIds = new Set(
    SPRINT_9_DECOMPOSITION.blocks
      .flatMap(b => b.items)
      .filter(i => i.status === "done")
      .map(i => i.id)
  );
  return getSprint9PendingItems().filter(item =>
    item.dependencies.every(dep => doneIds.has(dep))
  );
}

export function getSprint9BlockSummary() {
  return SPRINT_9_DECOMPOSITION.blocks.map(b => ({
    block: b.number,
    name: b.name,
    status: b.status,
    hoursRemaining: b.items.reduce((sum, i) => sum + i.estimatedHoursRemaining, 0),
  }));
}
