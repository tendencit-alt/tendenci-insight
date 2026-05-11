// ══════════════════════════════════════════════════════════════════════
// DECOMPOSIÇÃO TÉCNICA — SPRINT 3: MÓDULO COMERCIAL
// Detalhamento bloco-a-bloco com status, gaps e dependências
// ══════════════════════════════════════════════════════════════════════

import type { DecompositionBlock, DecompositionItem, SprintDecomposition } from "./sprint1-decomposition";

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — PIPELINE COMERCIAL (CRM)
// ══════════════════════════════════════════════════════════════════════

const BLOCK_1: DecompositionBlock = {
  id: "s3-b1-pipeline",
  number: 1,
  name: "Pipeline Comercial (CRM)",
  objective: "Kanban de oportunidades com estágios, responsável, valor e probabilidade",
  status: "done",
  doneWhen: [
    "Kanban visual de oportunidades funcional",
    "Estágios configuráveis por pipeline",
    "Drag-and-drop entre estágios",
    "Campos: cliente, origem, responsável, valor, probabilidade, data prevista",
    "Tags e observações por oportunidade",
    "Filtros por responsável, estágio, período",
    "Timeline de atividades por deal",
    "SLA e alertas de tempo por estágio",
  ],
  items: [
    {
      id: "s3-b1-01",
      name: "CRM Board Kanban",
      status: "done",
      existing: [
        "CRMBoard.tsx com Kanban visual completo",
        "crm_deals com title, value, stage_id, pipeline_id, owner_id, lead_id, architect_id",
        "Campos: status, note, stage_position, stage_entered_at, product_type, categoria, centro_custo",
        "crm_stages com name, position, sla_hours, pipeline_id",
        "crm_pipelines com name, tenant_id",
        "Drag-and-drop via DroppableColumn",
        "DealCard com informações resumidas",
        "ManagePipelineDialog para gerenciar estágios",
      ],
      gaps: [
        "Adicionar campo probabilidade (%) no deal (ou usar stage como proxy)",
        "Adicionar campo data_prevista_fechamento no deal",
      ],
      files: [
        "src/components/crm/CRMBoard.tsx",
        "src/components/crm/DealCard.tsx",
        "src/components/crm/DroppableColumn.tsx",
        "src/components/crm/ManagePipelineDialog.tsx",
      ],
      estimatedHoursRemaining: 2,
      dependencies: [],
    },
    {
      id: "s3-b1-02",
      name: "Detail Sheet e atividades do deal",
      status: "done",
      existing: [
        "DealDetailSheet com abas: Detalhes, Timeline, Notas, Tarefas, Arquivos",
        "DealTimeline com histórico completo",
        "DealNotes para observações",
        "DealTasks para tarefas vinculadas",
        "DealFileUpload para anexos",
        "DealHistory com log de movimentações",
        "DealArchitectIndication para vínculo com profissional parceiro",
        "CRMKPIs e CRMKPIsDashboard com métricas",
        "CRMSLAAlerts para alertas de SLA",
        "CRMFilters com filtros por responsável, pipeline, período",
      ],
      gaps: [],
      files: [
        "src/components/crm/DealDetailSheet.tsx",
        "src/components/crm/DealTimeline.tsx",
        "src/components/crm/DealNotes.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s3-b1-03",
      name: "Criação e edição de deals",
      status: "done",
      existing: [
        "CreateDealDialog com título, cliente/lead, pipeline, stage, valor, produto, centro custo",
        "EditDealDialog com edição completa",
        "CreateClientDialog inline no CRM",
        "EditClientDialog",
        "CRMStatePersistence para persistir filtros",
      ],
      gaps: [],
      files: [
        "src/components/crm/CreateDealDialog.tsx",
        "src/components/crm/EditDealDialog.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — PROPOSTAS COMERCIAIS (ORÇAMENTOS)
// ══════════════════════════════════════════════════════════════════════

const BLOCK_2: DecompositionBlock = {
  id: "s3-b2-quotes",
  number: 2,
  name: "Propostas Comerciais (Orçamentos)",
  objective: "CRUD de propostas com itens, validade, status e vínculo a cliente/deal",
  status: "partial",
  doneWhen: [
    "Listagem de propostas com busca e filtros",
    "Formulário com cliente, itens, tabela de preço, condição pagamento",
    "Status: rascunho, enviada, aprovada, rejeitada, expirada",
    "Itens com produto/serviço, quantidade, valor, desconto",
    "Cálculo automático de totais",
    "Vínculo com oportunidade CRM",
    "Validade com alerta de expiração",
  ],
  items: [
    {
      id: "s3-b2-01",
      name: "Tabela quotes e quote_items",
      status: "done",
      existing: [
        "quotes com client_id, quote_number, title, status, total_value, discount_percent/value, final_value",
        "seller_id, payment_condition, validity_date, order_id, notes, tenant_id",
        "quote_items com product_name, quantity, unit_price, total_price, cost_center, position",
        "Status: rascunho, enviado, aprovado, rejeitado (no banco)",
      ],
      gaps: [
        "Adicionar campo deal_id (FK crm_deals) para vincular à oportunidade CRM",
        "Adicionar campo price_table_id (FK price_tables) na proposta",
        "Adicionar campo discount_percent e discount_value em quote_items (item-level)",
        "Adicionar campo service_id em quote_items para diferenciar produto/serviço",
        "Adicionar status 'expirada' e trigger/cron para expirar automaticamente",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
    {
      id: "s3-b2-02",
      name: "Página de listagem de propostas",
      status: "pending",
      existing: [
        "Não existe página dedicada /propostas ou /orcamentos",
        "Orçamentos de projeto (BudgetEditor) existem para uso interno/produção",
      ],
      gaps: [
        "Criar página /propostas com listagem",
        "Colunas: número, título, cliente, valor, status, validade, vendedor",
        "Filtros por status, cliente, vendedor, período",
        "Busca por número, título, cliente",
        "StatusBadge com cores por status",
        "Ações: visualizar, editar, duplicar, converter em pedido",
      ],
      files: [],
      estimatedHoursRemaining: 6,
      dependencies: ["s3-b2-01"],
    },
    {
      id: "s3-b2-03",
      name: "Formulário de proposta (create/edit)",
      status: "pending",
      existing: [
        "BudgetEditor como referência de editor de itens (uso diferente)",
      ],
      gaps: [
        "Criar CreateQuoteDialog ou página /propostas/nova",
        "Header: título, cliente (select), vendedor, deal vinculado, validade",
        "Seção de itens: adicionar produto/serviço, quantidade, valor, desconto, total",
        "Seção de condições: condição pagamento, tabela preço, desconto global",
        "Cálculo automático: subtotal, descontos, valor final",
        "Salvar como rascunho ou enviar",
        "Criar EditQuoteDialog com mesma estrutura",
      ],
      files: [],
      estimatedHoursRemaining: 10,
      dependencies: ["s3-b2-01"],
    },
    {
      id: "s3-b2-04",
      name: "Workflow de status da proposta",
      status: "pending",
      existing: [
        "StatusMachine engine genérica disponível",
        "Config para orcamento em status-machine/config.ts",
      ],
      gaps: [
        "Validar/ajustar config de status para quotes: rascunho → enviada → aprovada/rejeitada",
        "Adicionar transição para 'expirada' (automática por validade)",
        "Botões de ação contextual no formulário (Enviar, Aprovar, Rejeitar)",
        "Registro de transições no audit_log via useStatusMachine",
      ],
      files: ["src/lib/status-machine/config.ts"],
      estimatedHoursRemaining: 3,
      dependencies: ["s3-b2-03"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — CONVERSÃO PROPOSTA → PEDIDO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_3: DecompositionBlock = {
  id: "s3-b3-conversion",
  number: 3,
  name: "Conversão Proposta → Pedido",
  objective: "Converter proposta aprovada em pedido automaticamente",
  status: "pending",
  doneWhen: [
    "Botão 'Converter em Pedido' na proposta aprovada",
    "Cópia automática de cliente, itens, condição, tabela, valores",
    "Proposta marcada como convertida com link ao pedido",
    "Pedido criado em status rascunho para revisão",
  ],
  items: [
    {
      id: "s3-b3-01",
      name: "Função de conversão proposta → pedido",
      status: "pending",
      existing: [
        "CreateWonDealDialog converte deal CRM em pedido (referência parcial)",
        "Já existe lógica de copiar client_id e valores do CRM para orders",
      ],
      gaps: [
        "Criar função convertQuoteToOrder(quoteId) que:",
        "  - Lê a proposta e seus itens",
        "  - Cria pedido em orders com client_id, condição, tabela, valores",
        "  - Copia quote_items → order_items com descrição, qty, valor, centro custo",
        "  - Marca quote como status 'convertida' com order_id preenchido",
        "  - Retorna o ID do pedido criado",
        "Criar botão na proposta aprovada que executa a conversão",
        "Redirect para o pedido criado após conversão",
        "Impedir conversão de proposta já convertida (validação)",
      ],
      files: ["src/components/orders/CreateWonDealDialog.tsx"],
      estimatedHoursRemaining: 6,
      dependencies: ["s3-b2-01", "s3-b4-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — PEDIDO DE VENDA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_4: DecompositionBlock = {
  id: "s3-b4-orders",
  number: 4,
  name: "Pedido de Venda",
  objective: "CRUD completo com itens, comissões, status e automações",
  status: "done",
  doneWhen: [
    "Listagem com busca, filtros, KPIs",
    "Formulário com cliente, itens, condição pagamento, comissões",
    "Status workflow completo (rascunho → aprovado → ... → encerrado)",
    "Centro de custo e projeto por item",
    "Endereço de entrega",
    "Datas: emissão, entrega prevista, aprovação",
    "Exportação e ações em lote",
  ],
  items: [
    {
      id: "s3-b4-01",
      name: "Página de pedidos",
      status: "done",
      existing: [
        "Página /pedidos (Orders.tsx) completa",
        "OrdersTable com listagem, busca, paginação",
        "OrdersKPIs com cards de receita, ticket médio, status",
        "OrdersFilters com filtros por status, vendedor, centro custo, período",
        "OrderDetailSheet com detalhe lateral",
        "OrderExportDialog para exportação",
        "BulkEditOrdersDialog para edição em lote",
      ],
      gaps: [],
      files: ["src/pages/Orders.tsx", "src/components/orders/OrdersTable.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s3-b4-02",
      name: "Formulário de pedido (create/edit)",
      status: "done",
      existing: [
        "CreateOrderDialog com 6 abas: Identificação, Itens, Recursos Estratégicos, Pagamento, Entregas, Observações",
        "EditOrderDialog com edição completa",
        "OrderItemsTable com CRUD inline de itens",
        "OrderCompromissosCard com comissões (vendedor, orçamentista, projetista, montador, produção)",
        "AddressForm para endereço de entrega",
        "Validações obrigatórias (cliente, centro custo, projeto por item)",
        "Múltiplas formas de pagamento (cartão, boleto, link, PIX, financiamento, etc.)",
        "Cálculo de taxas automático (cartão, boleto, link)",
        "Integração com useStrategicResourceDefaults para comissões",
      ],
      gaps: [
        "Adicionar campo quote_id (FK quotes) para rastrear origem da proposta",
      ],
      files: [
        "src/components/orders/CreateOrderDialog.tsx",
        "src/components/orders/EditOrderDialog.tsx",
        "src/components/orders/OrderItemsTable.tsx",
        "src/components/orders/OrderCompromissosCard.tsx",
      ],
      estimatedHoursRemaining: 1,
      dependencies: [],
    },
    {
      id: "s3-b4-03",
      name: "Status workflow do pedido",
      status: "done",
      existing: [
        "11 estágios: rascunho, negociacao, aprovado, liberado_producao, em_producao, producao_concluida, faturado, entregue, encerrado, cancelado",
        "StatusMachine config completa para pedido",
        "Transição automática rascunho → ativo após campos obrigatórios",
        "CancelOrderDialog com motivo",
        "Travas técnicas por status (bloqueio de edição em faturado/encerrado)",
      ],
      gaps: [],
      files: ["src/lib/status-machine/config.ts"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — GERAÇÃO AUTOMÁTICA CONTAS A RECEBER
// ══════════════════════════════════════════════════════════════════════

const BLOCK_5: DecompositionBlock = {
  id: "s3-b5-receivables",
  number: 5,
  name: "Geração Automática de Contas a Receber",
  objective: "Ao confirmar pedido, gerar parcelas de contas a receber automaticamente",
  status: "done",
  doneWhen: [
    "Aprovação de pedido gera lançamentos no Livro Razão",
    "Receita categorizada por plano de contas",
    "Parcelas geradas conforme condição de pagamento e forma",
    "Vínculo pedido → fin_receivables preservado",
    "Centro de custo e projeto financeiro propagados",
    "Descrição inclui número do pedido e nome do projeto",
  ],
  items: [
    {
      id: "s3-b5-01",
      name: "Trigger de geração financeira na aprovação",
      status: "done",
      existing: [
        "Trigger PostgreSQL que ao aprovar/editar pedido:",
        "  - Remove lançamentos anteriores e recria (evita duplicidade)",
        "  - Gera receita no Livro Razão (fin_ledger_entries)",
        "  - Gera fin_receivables com client_id, valor, parcelas",
        "  - Propaga chart_account_id, cost_center_id, project_id",
        "  - Descrição: 'Pedido #[Nº] - Receita' com 'Projeto: [Nome]'",
        "  - cash_date NULL (regra: só preenche na liquidação)",
        "  - Fallback de centro de custo via order_items",
      ],
      gaps: [],
      files: [],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — COMPROMISSOS SOBRE VENDAS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_6: DecompositionBlock = {
  id: "s3-b6-commitments",
  number: 6,
  name: "Compromissos Sobre Vendas (Contas a Pagar Automáticas)",
  objective: "Gerar CP automático para comissões, taxas, frete e impostos ao confirmar pedido",
  status: "done",
  doneWhen: [
    "Aprovação de pedido gera contas a pagar para:",
    "  - Comissão vendedor, orçamentista, projetista, montador, produção",
    "  - Taxa cartão, taxa boleto, taxa link de pagamento",
    "  - RT (Recurso Tendenci)",
    "Todas classificadas em Compromissos Sobre Vendas (raiz 2.x)",
    "Todos os 10 tipos sincronizados no Livro Razão e Contas a Pagar",
    "Vínculo ledger_entry_id preservado",
    "Centro de custo 'Planejados' para comissões",
  ],
  items: [
    {
      id: "s3-b6-01",
      name: "Trigger de compromissos sobre vendas",
      status: "done",
      existing: [
        "Trigger PostgreSQL gera automaticamente 10 tipos de lançamentos:",
        "  - 5 Comissões: vendedor, orçamentista, projetista, montador, produção",
        "  - 4 Taxas: cartão, boleto, link, RT",
        "  - Classificação via chart_account_id da raiz 2.x (Compromissos)",
        "  - Centro custo 'Planejados' para 100% das comissões",
        "  - fin_payables gerados com ledger_entry_id vinculado",
        "order_strategic_commitments para persistência dinâmica",
        "useStrategicResourceDefaults para sincronizar defaults do Plano de Contas",
        "Hook useCompromissosVendaCategories para categorias dinâmicas",
      ],
      gaps: [],
      files: [
        "src/components/orders/OrderCompromissosCard.tsx",
        "src/hooks/useCompromissosVendaCategories.ts",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 7 — CRIAÇÃO AUTOMÁTICA DE PROJETO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_7: DecompositionBlock = {
  id: "s3-b7-auto-project",
  number: 7,
  name: "Criação Automática de Projeto Financeiro",
  objective: "Ao confirmar pedido, gerar projeto financeiro automaticamente",
  status: "done",
  doneWhen: [
    "Aprovação de pedido gera projeto em fin_projects",
    "Projeto herda: cliente, vendedor, centro de custo do pedido",
    "Código do projeto: PED-{numero} {nome_cliente}",
    "Vínculo order_id preservado no projeto",
    "Budget do projeto = valor do pedido",
  ],
  items: [
    {
      id: "s3-b7-01",
      name: "Trigger de criação automática de projeto",
      status: "done",
      existing: [
        "Trigger PostgreSQL ao aprovar pedido cria fin_projects automaticamente",
        "Código: 'PED-{order_number} {client_name}'",
        "Herda: client_id, vendedor_id, cost_center_id, chart_account_id",
        "budget = valor total do pedido",
        "order_id vinculado para rastreabilidade",
        "project_type = 'pedido'",
      ],
      gaps: [],
      files: ["src/components/financeiro/masters/FinProjectsManager.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 — FLAGS DE PRODUÇÃO FUTURA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_8: DecompositionBlock = {
  id: "s3-b8-prod-flags",
  number: 8,
  name: "Flags de Produção no Pedido",
  objective: "Preparar pedido para integração com módulo de produção",
  status: "partial",
  doneWhen: [
    "Campos no pedido: produção necessária, montagem necessária, entrega necessária",
    "Formulário mostra toggles para cada flag",
    "Flags influenciam fluxo de status futuro (Sprint 4)",
  ],
  items: [
    {
      id: "s3-b8-01",
      name: "Campos de flag de produção no pedido",
      status: "partial",
      existing: [
        "Pedido já transiciona para 'liberado_producao' e 'em_producao'",
        "Integração pedido → produção via production_order_id em order_items",
        "Produção já vinculada a pedido (CreateProductionOrderDialog usa client_id e supplier_id do pedido)",
      ],
      gaps: [
        "Adicionar campos booleanos explícitos: requires_production, requires_assembly, requires_delivery",
        "Mostrar toggles no formulário de pedido (aba Observações ou nova seção)",
        "Usar flags para condicionar liberação de status (ex: pular produção se não necessário)",
      ],
      files: ["src/components/orders/CreateOrderDialog.tsx"],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 9 — INTEGRAÇÃO CRM → PROPOSTA → PEDIDO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_9: DecompositionBlock = {
  id: "s3-b9-integration",
  number: 9,
  name: "Integração CRM → Proposta → Pedido",
  objective: "Fluxo completo: deal ganho → proposta → pedido com rastreabilidade",
  status: "partial",
  doneWhen: [
    "Deal 'fechado ganho' pode gerar proposta vinculada",
    "Proposta pode gerar pedido (bloco 3)",
    "Deal ganho pode gerar pedido diretamente (já existe)",
    "Rastreabilidade: deal_id → quote_id → order_id",
    "Timeline mostra conversões",
  ],
  items: [
    {
      id: "s3-b9-01",
      name: "Fluxo deal → pedido direto",
      status: "done",
      existing: [
        "CreateWonDealDialog converte deal ganho diretamente em pedido",
        "Copia client_id, valor, centro custo do deal para o pedido",
        "Marca deal como 'fechado ganho' com deal_id vinculado no order",
      ],
      gaps: [],
      files: ["src/components/orders/CreateWonDealDialog.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s3-b9-02",
      name: "Fluxo deal → proposta → pedido",
      status: "pending",
      existing: [],
      gaps: [
        "Criar botão 'Gerar Proposta' no deal ganho (ou em qualquer estágio avançado)",
        "Pré-preencher proposta com dados do deal (cliente, valor, produto)",
        "Após proposta aprovada, converter em pedido (bloco 3)",
        "Vincular deal_id na proposta e proposta_id no pedido",
        "Atualizar DealTimeline para mostrar conversões",
      ],
      files: [],
      estimatedHoursRemaining: 5,
      dependencies: ["s3-b2-03", "s3-b3-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 10 — ROTAS E NAVEGAÇÃO COMERCIAL
// ══════════════════════════════════════════════════════════════════════

const BLOCK_10: DecompositionBlock = {
  id: "s3-b10-routes",
  number: 10,
  name: "Rotas e Navegação do Módulo Comercial",
  objective: "Registrar todas as rotas comerciais com permissões",
  status: "partial",
  doneWhen: [
    "Rotas: /crm, /propostas, /pedidos registradas",
    "PermissionGuard em cada rota",
    "Menu 'Comercial' com subitens no menu lateral",
    "Navegação fluida entre CRM → Proposta → Pedido",
  ],
  items: [
    {
      id: "s3-b10-01",
      name: "Rotas e menu comercial",
      status: "partial",
      existing: [
        "Rota /crm existe (CRM.tsx)",
        "Rota /pedidos existe (Orders.tsx)",
        "Menu 'Comercial' com CRM e Pedidos no menu lateral",
        "PermissionGuard com módulo 'comercial'",
      ],
      gaps: [
        "Criar rota /propostas (nova página)",
        "Adicionar 'Propostas' no menu lateral sob 'Comercial'",
        "Adicionar link rápido CRM → Proposta no deal",
        "Adicionar link rápido Proposta → Pedido no formulário",
      ],
      files: ["src/App.tsx"],
      estimatedHoursRemaining: 2,
      dependencies: ["s3-b2-02"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// SPRINT 3 CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

export const SPRINT_3_DECOMPOSITION: SprintDecomposition = {
  sprint: 3,
  name: "Módulo Comercial",
  objective: "Fluxo completo: Pipeline → Proposta → Pedido → Geração Financeira Automática",
  totalBlocks: 10,
  totalItems: 16,
  estimatedHoursRemaining: 41,
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
    "Criar oportunidade no CRM e mover no Kanban",
    "Gerar proposta com itens, preços e descontos",
    "Editar proposta e alterar status (enviar, aprovar, rejeitar)",
    "Converter proposta aprovada em pedido automaticamente",
    "Criar pedido de venda com itens, comissões e condição de pagamento",
    "Confirmar pedido e gerar contas a receber automaticamente",
    "Gerar compromissos sobre vendas (comissões + taxas) automaticamente",
    "Gerar projeto financeiro automaticamente na aprovação",
    "Definir flags de produção/montagem/entrega no pedido",
    "Navegar fluentemente entre CRM → Proposta → Pedido",
    "Rastreabilidade completa: deal_id → quote_id → order_id",
    "Auditoria automática em todas as transições",
  ],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

export function getSprint3PendingItems(): DecompositionItem[] {
  return SPRINT_3_DECOMPOSITION.blocks.flatMap(b =>
    b.items.filter(i => i.status !== "done" && i.status !== "not_needed")
  );
}

export function getSprint3ReadyItems(): DecompositionItem[] {
  const doneIds = new Set(
    SPRINT_3_DECOMPOSITION.blocks
      .flatMap(b => b.items)
      .filter(i => i.status === "done")
      .map(i => i.id)
  );
  return getSprint3PendingItems().filter(item =>
    item.dependencies.every(dep => doneIds.has(dep))
  );
}

export function getSprint3BlockSummary() {
  return SPRINT_3_DECOMPOSITION.blocks.map(b => ({
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
