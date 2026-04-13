// ══════════════════════════════════════════════════════════════════════
// DECOMPOSIÇÃO TÉCNICA — SPRINT 4: PRODUÇÃO / PCP / EXECUÇÃO
// Detalhamento bloco-a-bloco com status, gaps e dependências
// ══════════════════════════════════════════════════════════════════════

import type { DecompositionBlock, DecompositionItem, SprintDecomposition } from "./sprint1-decomposition";

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — ORDEM DE PRODUÇÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_1: DecompositionBlock = {
  id: "s4-b1-op",
  number: 1,
  name: "Ordem de Produção (OP)",
  objective: "Geração automática por item de pedido com status, prioridade e rastreabilidade",
  status: "done",
  doneWhen: [
    "OP gerada automaticamente para cada item quando produção necessária",
    "Campos: pedido, cliente, projeto, centro custo, responsável, datas, prioridade",
    "Status: planejada → liberada → em produção → concluída → cancelada",
    "Roteamento automático por centro de custo → tipo de produção",
    "Vínculo order_item_id preservado",
  ],
  items: [
    {
      id: "s4-b1-01",
      name: "Tabela production_orders",
      status: "done",
      existing: [
        "production_orders com title, order_number, status, priority",
        "client_id, order_id, order_item_id, deal_id, supplier_id",
        "production_type_id, current_phase_id, responsible_id, group_id",
        "planned_start_date, planned_end_date, actual_start_date, actual_end_date",
        "prazo_customizado_dias, previsao_final_calculada, alerta_atraso",
        "specifications (JSON), notes, description, value",
        "tenant_id, created_by, RLS",
      ],
      gaps: [],
      files: [],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s4-b1-02",
      name: "Geração automática de OP por item",
      status: "done",
      existing: [
        "Trigger automático gera OP individual para cada order_item",
        "Roteamento por centro_custo → production_types (ILIKE matching)",
        "OP inicializada na primeira fase ativa do template",
        "started_at registrado para controle de SLA",
        "Automação: production_automations com prazo em dias úteis",
      ],
      gaps: [],
      files: [],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s4-b1-03",
      name: "CRUD de OP",
      status: "done",
      existing: [
        "CreateProductionOrderDialog com cliente, tipo, prioridade, datas",
        "EditProductionOrderDialog para edição",
        "ProductionOrderDetailSheet com detalhe lateral completo",
        "UnifiedOpsDetailSheet com visão unificada",
      ],
      gaps: [],
      files: [
        "src/components/production/CreateProductionOrderDialog.tsx",
        "src/components/production/EditProductionOrderDialog.tsx",
        "src/components/production/ProductionOrderDetailSheet.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — ETAPAS DE PRODUÇÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_2: DecompositionBlock = {
  id: "s4-b2-phases",
  number: 2,
  name: "Etapas de Produção",
  objective: "Fases configuráveis por tipo com responsável, prazo, SLA e status",
  status: "done",
  doneWhen: [
    "production_phase_templates com nome, cor, SLA, posição, flags inicial/final",
    "production_phases instanciadas automaticamente na criação da OP",
    "Campos: responsável, prazo, status, started_at, completed_at",
    "CRUD de tipos e fases via ManageProductionStagesDialog",
    "Reordenação via drag/botões",
  ],
  items: [
    {
      id: "s4-b2-01",
      name: "Templates de fases por tipo",
      status: "done",
      existing: [
        "production_phase_templates com name, color, sla_hours, position, is_initial, is_final",
        "production_types com name, slug, color, icon, position, active",
        "ManageProductionStagesDialog com CRUD completo de tipos e fases",
        "Seletor de cores visual (11 opções)",
        "Validação: impede exclusão de tipo/fase com OPs vinculadas",
        "Reordenação via botões ↑↓",
      ],
      gaps: [],
      files: ["src/components/production/ManageProductionStagesDialog.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s4-b2-02",
      name: "Instâncias de fases por OP",
      status: "done",
      existing: [
        "production_phases com phase_template_id, position, status",
        "responsible_id, started_at, completed_at, actual_hours, estimated_hours",
        "notes, sla_dias_uteis_custom, team_ids",
        "Trigger create_phases_on_op_insert auto-cria fases",
        "Frontend atualiza status para em_andamento e registra started_at",
      ],
      gaps: [],
      files: [],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s4-b2-03",
      name: "Edição de SLA por fase",
      status: "done",
      existing: [
        "EditPhasesSLADialog para ajustar SLA por fase",
        "EditPrazoDialog para ajustar prazo customizado da OP",
        "SLA em dias úteis (calculate_business_days exclui fins de semana)",
        "Badge de atraso: 'ATRASADO - X DIAS ÚTEIS'",
      ],
      gaps: [],
      files: [
        "src/components/production/EditPhasesSLADialog.tsx",
        "src/components/production/EditPrazoDialog.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — KANBAN PCP
// ══════════════════════════════════════════════════════════════════════

const BLOCK_3: DecompositionBlock = {
  id: "s4-b3-kanban",
  number: 3,
  name: "Kanban PCP",
  objective: "Visualização Kanban com drag-and-drop, alertas de atraso e filtros",
  status: "done",
  doneWhen: [
    "Kanban visual por tipo de produção com colunas = fases",
    "Drag-and-drop entre fases",
    "Alerta de atraso automático com badge visual",
    "Prioridade visual (cor/ícone)",
    "Filtros: cliente, responsável, status, tipo, prioridade",
    "KPIs de produção",
    "SLA chart e alertas",
  ],
  items: [
    {
      id: "s4-b3-01",
      name: "ProductionKanban",
      status: "done",
      existing: [
        "ProductionKanban.tsx com Kanban completo",
        "DraggableProductionCard com drag-and-drop",
        "DroppableColumn para colunas por fase",
        "OptimizedDroppableColumn para performance",
        "ProductionCard e ProductionCardSimple para visualização",
        "Realtime via Supabase subscription",
        "Cores por tipo de produção",
      ],
      gaps: [],
      files: [
        "src/components/production/ProductionKanban.tsx",
        "src/components/production/DraggableProductionCard.tsx",
        "src/components/production/DroppableColumn.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s4-b3-02",
      name: "Filtros e KPIs de produção",
      status: "done",
      existing: [
        "ProductionFilters com filtros por tipo, status, responsável, prioridade, cliente",
        "ProductionKPIs com cards: total OPs, em produção, atrasadas, concluídas",
        "ProductionSLAAlerts para alertas de SLA",
        "ProductionSLAChart para gráfico de SLA",
        "ProductionUpdates para atualizações em tempo real",
      ],
      gaps: [],
      files: [
        "src/components/production/ProductionFilters.tsx",
        "src/components/production/ProductionKPIs.tsx",
        "src/components/production/ProductionSLAAlerts.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — CHECKLIST POR ETAPA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_4: DecompositionBlock = {
  id: "s4-b4-checklist",
  number: 4,
  name: "Checklist por Etapa",
  objective: "Checklist obrigatório por fase com log de conferência",
  status: "pending",
  doneWhen: [
    "Tabela production_checklists com items por phase_template_id",
    "Tabela production_checklist_items com name, required, position",
    "Tabela production_checklist_results com phase_id, item_id, checked, checked_by, checked_at",
    "Impedir avanço de fase se itens obrigatórios não marcados",
    "Log de auditoria de cada check",
    "UI: lista de checks no detalhe da fase",
  ],
  items: [
    {
      id: "s4-b4-01",
      name: "Tabelas de checklist",
      status: "pending",
      existing: [
        "production_phase_templates existe como base para vincular checklists",
      ],
      gaps: [
        "Criar tabela 'production_checklist_templates' (phase_template_id, name, required, position)",
        "Criar tabela 'production_checklist_results' (phase_id, checklist_template_id, checked, checked_by, checked_at, notes)",
        "RLS por tenant_id",
        "Trigger de auditoria",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
    {
      id: "s4-b4-02",
      name: "UI de checklist na fase",
      status: "pending",
      existing: [
        "ProductionOrderDetailSheet como local para adicionar checklists",
      ],
      gaps: [
        "Criar componente PhaseChecklist dentro do detalhe da OP/fase",
        "Lista de itens com checkbox, nome, status, quem marcou, quando",
        "Validação: impedir transição de fase se itens obrigatórios pendentes",
        "CRUD de templates de checklist no ManageProductionStagesDialog",
      ],
      files: ["src/components/production/ProductionOrderDetailSheet.tsx"],
      estimatedHoursRemaining: 6,
      dependencies: ["s4-b4-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — CONTROLE DE MATERIAL
// ══════════════════════════════════════════════════════════════════════

const BLOCK_5: DecompositionBlock = {
  id: "s4-b5-materials",
  number: 5,
  name: "Controle de Material / Insumos",
  objective: "Apontamento de consumo de material por OP com controle de diferença",
  status: "partial",
  doneWhen: [
    "Tabela de materiais/insumos por OP",
    "Campos: produto, qtd prevista, qtd consumida, status",
    "Apontamento parcial e total",
    "Diferença consumo calculada (previsto vs real)",
    "UI de gestão de insumos na OP",
  ],
  items: [
    {
      id: "s4-b5-01",
      name: "Insumos e ficha técnica",
      status: "partial",
      existing: [
        "production_products com name, product_id, cmv_total, status, is_template",
        "AddInsumoDialog para adicionar insumos à OP",
        "ProductionFichaTecnica com ficha técnica de produção",
        "TemplateFichaSheet para templates de ficha técnica",
        "AddMaoObraDialog para mão de obra",
      ],
      gaps: [
        "Adicionar campos: qtd_prevista, qtd_consumida, qtd_diferenca em production_products",
        "UI de apontamento parcial (registrar consumo incrementalmente)",
        "Cálculo automático de diferença (previsto - consumido)",
        "Status por material: pendente, parcial, completo, excedente",
        "Resumo de materiais na OP com indicadores visuais",
      ],
      files: [
        "src/components/production/AddInsumoDialog.tsx",
        "src/components/production/ProductionFichaTecnica.tsx",
      ],
      estimatedHoursRemaining: 6,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — RESPONSÁVEIS POR ETAPA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_6: DecompositionBlock = {
  id: "s4-b6-responsible",
  number: 6,
  name: "Responsáveis por Etapa",
  objective: "Registro de responsável execução/validação com datas de início e fim",
  status: "partial",
  doneWhen: [
    "Responsável de execução por fase registrado",
    "Responsável de validação por fase (opcional)",
    "Data início e fim por fase registradas",
    "Tempo real de execução calculado (actual_hours)",
  ],
  items: [
    {
      id: "s4-b6-01",
      name: "Responsáveis e tempos por fase",
      status: "partial",
      existing: [
        "production_phases já possui: responsible_id, started_at, completed_at, actual_hours",
        "team_ids para múltiplos responsáveis",
        "estimated_hours para comparação",
      ],
      gaps: [
        "Adicionar campo validator_id (responsável pela validação/conferência)",
        "Adicionar campo validated_at",
        "UI para atribuir responsável e validador no detalhe da fase",
        "Cálculo automático de actual_hours (completed_at - started_at)",
        "Indicador visual de eficiência (real vs estimado)",
      ],
      files: ["src/components/production/ProductionOrderDetailSheet.tsx"],
      estimatedHoursRemaining: 4,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 7 — EXPEDIÇÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_7: DecompositionBlock = {
  id: "s4-b7-expedition",
  number: 7,
  name: "Expedição",
  objective: "Controle de saída com transportador, documentos e status de entrega",
  status: "pending",
  doneWhen: [
    "Tabela expeditions com OP, cliente, transportador, status",
    "Status: aguardando → em_separação → embarcado → entregue",
    "Documentos de expedição anexados",
    "Data envio e data entrega registradas",
    "Listagem de expedições com filtros",
  ],
  items: [
    {
      id: "s4-b7-01",
      name: "Tabela expeditions",
      status: "pending",
      existing: [
        "Conceito de 'expedição' existe como fase no Kanban de produção",
        "Fase 'expedido' configurável nos templates",
      ],
      gaps: [
        "Criar tabela 'expeditions' (id, tenant_id, production_order_id, order_id, client_id, transporter_name, transporter_phone, tracking_code, ship_date, delivery_date, status, notes, created_at, created_by)",
        "RLS por tenant_id",
        "Status: aguardando, em_separacao, embarcado, entregue",
        "Trigger de auditoria",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
    {
      id: "s4-b7-02",
      name: "UI de expedição",
      status: "pending",
      existing: [],
      gaps: [
        "Criar componente ExpeditionManager (listagem + create/edit)",
        "Vincular à OP no detalhe ou como aba separada",
        "Formulário: transportador, código rastreio, data envio, documentos",
        "Anexar documentos de expedição (NF, romaneio, etc.)",
        "Status timeline da expedição",
        "Notificação quando status mudar para 'entregue'",
      ],
      files: [],
      estimatedHoursRemaining: 6,
      dependencies: ["s4-b7-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 — MONTAGEM
// ══════════════════════════════════════════════════════════════════════

const BLOCK_8: DecompositionBlock = {
  id: "s4-b8-assembly",
  number: 8,
  name: "Montagem",
  objective: "Controle de montagem em campo com equipe, datas e checklist",
  status: "pending",
  doneWhen: [
    "Tabela assemblies com pedido, cliente, equipe, datas, status",
    "Status: planejada → em_execução → pendência → concluída",
    "Checklist de montagem configurável",
    "Registro de pendências durante montagem",
    "UI de gestão de montagem",
  ],
  items: [
    {
      id: "s4-b8-01",
      name: "Tabela assemblies",
      status: "pending",
      existing: [],
      gaps: [
        "Criar tabela 'assemblies' (id, tenant_id, order_id, production_order_id, client_id, team_lead_id, team_members text[], start_date, end_date, actual_start, actual_end, status, notes, address, created_at, created_by)",
        "RLS por tenant_id",
        "Status: planejada, em_execucao, pendencia, concluida",
        "Trigger de auditoria",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
    {
      id: "s4-b8-02",
      name: "UI de montagem",
      status: "pending",
      existing: [],
      gaps: [
        "Criar componente AssemblyManager (listagem + create/edit)",
        "Formulário: equipe, datas, endereço, checklist, observações",
        "Checklist de montagem reutilizando padrão do bloco 4",
        "Timeline de eventos da montagem",
        "Registro de pendências inline (link ao bloco 9)",
        "Notificação ao concluir montagem",
      ],
      files: [],
      estimatedHoursRemaining: 7,
      dependencies: ["s4-b8-01", "s4-b4-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 9 — PENDÊNCIAS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_9: DecompositionBlock = {
  id: "s4-b9-issues",
  number: 9,
  name: "Pendências de Execução",
  objective: "Registro e resolução de pendências por pedido/etapa/montagem",
  status: "pending",
  doneWhen: [
    "Tabela production_issues com pedido, etapa, descrição, responsável, prioridade",
    "Status: aberta → em_correção → resolvida",
    "Vínculo a OP, fase, montagem ou expedição",
    "Listagem com filtros por status, responsável, prioridade",
    "Impedir encerramento se pendências abertas",
  ],
  items: [
    {
      id: "s4-b9-01",
      name: "Tabela production_issues",
      status: "pending",
      existing: [
        "Conceito de 'ocorrências' mencionado na arquitetura",
      ],
      gaps: [
        "Criar tabela 'production_issues' (id, tenant_id, order_id, production_order_id, assembly_id, phase_id, title, description, responsible_id, priority, status, resolution, resolved_at, resolved_by, created_at, created_by)",
        "RLS por tenant_id",
        "Status: aberta, em_correcao, resolvida",
        "Prioridade: baixa, media, alta, critica",
        "Trigger de auditoria",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
    {
      id: "s4-b9-02",
      name: "UI de pendências",
      status: "pending",
      existing: [],
      gaps: [
        "Criar componente ProductionIssuesList (listagem com filtros)",
        "Formulário: título, descrição, responsável, prioridade, vínculo (OP/fase/montagem)",
        "Ação de resolver com campo de resolução obrigatório",
        "Badge de pendências abertas na OP e no pedido",
        "Notificação ao responsável quando pendência criada",
      ],
      files: [],
      estimatedHoursRemaining: 5,
      dependencies: ["s4-b9-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 10 — ENCERRAMENTO AUTOMÁTICO DO PEDIDO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_10: DecompositionBlock = {
  id: "s4-b10-auto-close",
  number: 10,
  name: "Encerramento Automático do Pedido",
  objective: "Pedido concluído automaticamente quando todas as etapas finalizadas",
  status: "partial",
  doneWhen: [
    "Pedido só encerra se: produção concluída + montagem concluída + pendências resolvidas",
    "Validação automática antes de permitir transição para 'encerrado'",
    "Feedback visual de requisitos pendentes para encerramento",
    "Trigger ou hook que verifica pré-requisitos",
  ],
  items: [
    {
      id: "s4-b10-01",
      name: "Validação de pré-requisitos para encerramento",
      status: "partial",
      existing: [
        "Status workflow do pedido com 11 estágios incluindo 'encerrado'",
        "StatusMachine com transições controladas",
        "Travas de edição em status faturado/encerrado",
        "Fluxo produção_concluida → faturado já existe",
      ],
      gaps: [
        "Adicionar validação: todas OPs do pedido devem estar concluídas",
        "Adicionar validação: montagem concluída (quando assembly existe)",
        "Adicionar validação: pendências resolvidas (production_issues)",
        "Criar função checkOrderCanClose(orderId) que verifica todos os pré-requisitos",
        "Mostrar checklist visual de requisitos no detalhe do pedido",
        "Botão 'Encerrar' habilitado apenas quando tudo OK",
      ],
      files: ["src/lib/status-machine/config.ts"],
      estimatedHoursRemaining: 5,
      dependencies: ["s4-b7-01", "s4-b8-01", "s4-b9-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// SPRINT 4 CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

export const SPRINT_4_DECOMPOSITION: SprintDecomposition = {
  sprint: 4,
  name: "Produção / PCP / Execução Operacional",
  objective: "Fluxo completo: Pedido → OP → Fases → Conferência → Expedição → Montagem → Encerramento",
  totalBlocks: 10,
  totalItems: 18,
  estimatedHoursRemaining: 61,
  blocks: [
    BLOCK_1,
    BLOCK_2,
    BLOCK_3,
    BLOCK_4,
    BLOCK_5,
    BLOCK_6,
    BLOCK_7,
    BLOCK_8,
    BLOCK_9,
    BLOCK_10,
  ],
  doneCriteria: [
    "Gerar OP automática para cada item de pedido com produção necessária",
    "Visualizar Kanban PCP com drag-and-drop entre fases",
    "Movimentar OPs entre fases com registro de data/hora/responsável",
    "Alertas de atraso automáticos com badge visual em dias úteis",
    "Registrar checklist técnico obrigatório por fase",
    "Impedir avanço de fase se checklist obrigatório pendente",
    "Registrar consumo de material (previsto vs real)",
    "Atribuir responsável de execução e validação por fase",
    "Criar expedição com transportador, rastreio e documentos",
    "Criar montagem com equipe, datas e checklist",
    "Registrar pendências com prioridade e resolução",
    "Encerrar pedido automaticamente quando todas etapas concluídas",
    "Auditoria automática em todas as transições e apontamentos",
  ],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

export function getSprint4PendingItems(): DecompositionItem[] {
  return SPRINT_4_DECOMPOSITION.blocks.flatMap(b =>
    b.items.filter(i => i.status !== "done" && i.status !== "not_needed")
  );
}

export function getSprint4ReadyItems(): DecompositionItem[] {
  const doneIds = new Set(
    SPRINT_4_DECOMPOSITION.blocks
      .flatMap(b => b.items)
      .filter(i => i.status === "done")
      .map(i => i.id)
  );
  return getSprint4PendingItems().filter(item =>
    item.dependencies.every(dep => doneIds.has(dep))
  );
}

export function getSprint4BlockSummary() {
  return SPRINT_4_DECOMPOSITION.blocks.map(b => ({
    block: b.number,
    name: b.name,
    status: b.status,
    total: b.items.length,
    done: b.items.filter(i => i.status === "done").length,
    partial: b.items.filter(i => i.status === "partial").length,
    pending: b.items.filter(i => i.status === "pending").length,
    hoursRemaining: b.items.reduce((sum, i) => sum + i.estimatedHoursRemaining, 0),
  }));
}
