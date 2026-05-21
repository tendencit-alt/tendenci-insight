// ══════════════════════════════════════════════════════════════════════
// DECOMPOSIÇÃO TÉCNICA — SPRINT 7: COMPRAS, ESTOQUE E SUPRIMENTOS
// Detalhamento bloco-a-bloco com status, gaps e dependências
// ══════════════════════════════════════════════════════════════════════

import type { DecompositionBlock, DecompositionItem, SprintDecomposition } from "./sprint1-decomposition";

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — SOLICITAÇÃO DE COMPRA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_1: DecompositionBlock = {
  id: "s7-b1-purchase-requests",
  number: 1,
  name: "Solicitação de Compra",
  objective: "Solicitação interna de material com aprovação e conversão em pedido de compra",
  status: "done",
  doneWhen: [
    "Tabela material_requests com produto, quantidade, motivo, status",
    "Status: pendente → aprovada → em_cotação → convertida → cancelada",
    "Aprovação com registro de quem aprovou e quando",
    "Listagem com filtros e ações",
    "Geração automática por estoque mínimo",
  ],
  items: [
    {
      id: "s7-b1-01",
      name: "Tabela material_requests e CRUD",
      status: "done",
      existing: [
        "material_requests com product_id, quantity, reason, status, request_number",
        "requested_by, approved_by, approved_at, notes",
        "CreateMaterialRequestDialog para criação",
        "MaterialRequestsTable com listagem e ações",
        "PurchaseSuggestions para sugestões baseadas em estoque mínimo",
        "Integração: estoque baixo → sugestão automática de compra",
      ],
      gaps: [
        "Adicionar campos: project_id, cost_center_id, urgency (baixa/media/alta/critica), needed_by_date",
        "Permitir converter solicitação aprovada em pedido de compra diretamente",
      ],
      files: [
        "src/components/inventory/CreateMaterialRequestDialog.tsx",
        "src/components/inventory/MaterialRequestsTable.tsx",
        "src/components/inventory/PurchaseSuggestions.tsx",
      ],
      estimatedHoursRemaining: 4,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — COTAÇÃO FORNECEDORES
// ══════════════════════════════════════════════════════════════════════

const BLOCK_2: DecompositionBlock = {
  id: "s7-b2-quotations",
  number: 2,
  name: "Cotação de Fornecedores",
  objective: "Solicitar cotações a múltiplos fornecedores e comparar propostas",
  status: "pending",
  doneWhen: [
    "Tabela purchase_quotations com produto, fornecedor, valor, prazo, condição",
    "Status: solicitada → recebida → selecionada → expirada",
    "Comparação lado-a-lado de cotações por produto",
    "Seleção de melhor fornecedor com justificativa",
    "Conversão em pedido de compra",
  ],
  items: [
    {
      id: "s7-b2-01",
      name: "Tabela e UI de cotações",
      status: "pending",
      existing: [
        "purchase_orders já existe com supplier_id e items",
        "Fornecedores cadastrados na tabela suppliers",
      ],
      gaps: [
        "Criar tabela 'purchase_quotations' (id, tenant_id, material_request_id, product_id, supplier_id, unit_price, total, delivery_days, payment_terms, validity_date, status, notes, selected, selected_reason, created_at, created_by)",
        "RLS por tenant_id",
        "UI: CreateQuotationDialog para solicitar cotação a fornecedor",
        "UI: QuotationComparisonPanel para comparar cotações lado-a-lado",
        "Ação: selecionar fornecedor e converter em pedido de compra",
        "Status: solicitada, recebida, selecionada, expirada, cancelada",
      ],
      files: [],
      estimatedHoursRemaining: 12,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — PEDIDO DE COMPRA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_3: DecompositionBlock = {
  id: "s7-b3-purchase-orders",
  number: 3,
  name: "Pedido de Compra",
  objective: "CRUD completo com itens, aprovação, rastreabilidade e integração financeira",
  status: "done",
  doneWhen: [
    "purchase_orders com fornecedor, itens, condição pagamento, datas, status",
    "purchase_order_items com produto, quantidade, preço, desconto",
    "Status: rascunho → aprovado → enviado → recebido_parcial → recebido_total → cancelado",
    "KPIs de compras",
    "Alertas de atraso",
    "Detalhamento lateral completo",
  ],
  items: [
    {
      id: "s7-b3-01",
      name: "CRUD de Pedido de Compra",
      status: "done",
      existing: [
        "purchase_orders com supplier_id, order_number, status, issue_date, expected_date",
        "subtotal, discount_value, shipping_cost, total, payment_terms, notes",
        "approved_by, received_date, tenant_id, created_by",
        "purchase_order_items com product_id, quantity, unit_price, discount_percent, total, received_quantity",
        "CreatePurchaseOrderDialog com formulário completo + itens dinâmicos",
        "EditPurchaseOrderDialog para edição",
        "PurchaseOrderDetailSheet com detalhe lateral",
        "PurchaseOrdersTable com listagem e ações",
        "PurchasesFilters com filtros por status, fornecedor, período",
        "PurchasesKPIs com indicadores",
        "OverduePurchaseAlerts para alertas de atraso",
        "ReceivePurchaseDialog para registrar recebimento",
      ],
      gaps: [],
      files: [
        "src/components/purchases/CreatePurchaseOrderDialog.tsx",
        "src/components/purchases/PurchaseOrderDetailSheet.tsx",
        "src/components/purchases/PurchaseOrdersTable.tsx",
        "src/components/purchases/ReceivePurchaseDialog.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — INTEGRAÇÃO FINANCEIRO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_4: DecompositionBlock = {
  id: "s7-b4-finance-integration",
  number: 4,
  name: "Integração Financeiro (Compras → Contas a Pagar)",
  objective: "Ao aprovar pedido de compra, gerar contas a pagar automaticamente",
  status: "partial",
  doneWhen: [
    "Trigger: aprovação de PC → gerar fin_payables com fornecedor, categoria, CC, projeto",
    "Parcelamento automático baseado em condição de pagamento",
    "Lançamento no Livro Razão sincronizado",
    "Rastreabilidade: fin_payables.order_id → purchase_orders.id",
  ],
  items: [
    {
      id: "s7-b4-01",
      name: "Automação compra → financeiro",
      status: "partial",
      existing: [
        "PurchasesTab integrada no módulo Financeiro",
        "Conceito de geração de fin_payables a partir de compras mencionado na arquitetura",
        "process-business-event Edge Function com suporte a eventos de compra",
        "fin_payables possui campo supplier_id e order_id",
      ],
      gaps: [
        "Implementar trigger/função: ao mudar status PC para 'aprovado', gerar fin_payables",
        "Mapear: fornecedor, categoria (custo de mercadoria), centro custo, projeto do PC",
        "Parcelamento baseado em payment_terms do PC",
        "Lançamento no Livro Razão com origem='PEDIDO_COMPRA'",
        "Evitar duplicidade: limpar e recriar em caso de edição (idempotência)",
      ],
      files: ["src/components/financeiro/PurchasesTab.tsx"],
      estimatedHoursRemaining: 6,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — RECEBIMENTO DE MATERIAL
// ══════════════════════════════════════════════════════════════════════

const BLOCK_5: DecompositionBlock = {
  id: "s7-b5-receiving",
  number: 5,
  name: "Recebimento de Material",
  objective: "Recebimento parcial/total com atualização de estoque e status do PC",
  status: "done",
  doneWhen: [
    "Dialog de recebimento com quantidade por item",
    "Recebimento parcial e total",
    "Atualização de received_quantity em purchase_order_items",
    "Status do PC atualizado automaticamente (parcial/total)",
    "Movimentação de estoque gerada na entrada",
  ],
  items: [
    {
      id: "s7-b5-01",
      name: "Recebimento de material",
      status: "done",
      existing: [
        "ReceivePurchaseDialog com formulário por item",
        "Campos: quantidade recebida, notas, data recebimento",
        "Recebimento parcial: atualiza received_quantity mantendo status 'parcial'",
        "Recebimento total: marca status 'recebido'",
        "Geração de stock_movements tipo 'entrada' no recebimento",
        "Atualização de saldo do produto",
      ],
      gaps: [],
      files: ["src/components/purchases/ReceivePurchaseDialog.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — MOVIMENTAÇÃO DE ESTOQUE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_6: DecompositionBlock = {
  id: "s7-b6-stock-movements",
  number: 6,
  name: "Movimentação de Estoque",
  objective: "Registro de entradas, saídas, transferências e ajustes com rastreabilidade",
  status: "done",
  doneWhen: [
    "stock_movements com produto, quantidade, tipo, local, referência",
    "Tipos: entrada, saída, transferência, ajuste, consumo_producao",
    "previous_stock e new_stock registrados",
    "Referência: reference_type + reference_id (PC, OP, inventário)",
    "UI: CreateMovementDialog e StockMovementsTable",
  ],
  items: [
    {
      id: "s7-b6-01",
      name: "CRUD de movimentações",
      status: "done",
      existing: [
        "stock_movements com product_id, quantity, movement_type, location_id",
        "previous_stock, new_stock, unit_cost, notes",
        "reference_type, reference_id para rastreabilidade",
        "supplier_id, tenant_id, created_by",
        "CreateMovementDialog para movimentações manuais",
        "StockMovementsTable com listagem e filtros",
        "ProductMovements com histórico por produto",
      ],
      gaps: [],
      files: [
        "src/components/inventory/CreateMovementDialog.tsx",
        "src/components/inventory/StockMovementsTable.tsx",
        "src/components/inventory/ProductMovements.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 7 — ESTRUTURA DE ESTOQUE (SALDO)
// ══════════════════════════════════════════════════════════════════════

const BLOCK_7: DecompositionBlock = {
  id: "s7-b7-stock-balance",
  number: 7,
  name: "Estrutura de Estoque / Saldo",
  objective: "Saldo atual, reservado e disponível por produto/local com KPIs avançados",
  status: "done",
  doneWhen: [
    "Saldo calculado a partir de stock_movements (sum por produto/local)",
    "KPIs: valor total estoque, itens abaixo mínimo, giro médio",
    "Análise ABC implementada",
    "Ficha técnica por produto",
    "Gestão de fornecedores por produto",
    "Gráfico de preços",
  ],
  items: [
    {
      id: "s7-b7-01",
      name: "Saldo e KPIs de estoque",
      status: "done",
      existing: [
        "Saldo calculado via stock_movements (entrada - saída por produto)",
        "InventoryKPIs com cards resumo",
        "InventoryAdvancedKPIs com métricas avançadas",
        "ABCAnalysis para classificação ABC",
        "ProductDetailSheet com detalhe completo do produto",
        "ProductFichaTecnica com ficha técnica",
        "ProductSuppliers com fornecedores por produto",
        "ProductPriceChart com evolução de preços",
        "ProductBOMManager para BOM (Bill of Materials)",
        "ProductMediaUploader para mídia do produto",
        "inventory_metrics() e inventory_metrics_advanced() RPCs",
        "stock_abc_analysis() RPC para análise ABC",
      ],
      gaps: [],
      files: [
        "src/components/inventory/InventoryKPIs.tsx",
        "src/components/inventory/InventoryAdvancedKPIs.tsx",
        "src/components/inventory/ABCAnalysis.tsx",
        "src/components/inventory/ProductDetailSheet.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 — LOCAIS DE ESTOQUE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_8: DecompositionBlock = {
  id: "s7-b8-locations",
  number: 8,
  name: "Locais de Estoque",
  objective: "Multi-localização com almoxarifado, produção, expedição, obra",
  status: "done",
  doneWhen: [
    "stock_locations com nome, endereço, ativo, padrão",
    "Movimentações vinculadas a location_id",
    "UI de gestão de locais",
    "Saldo por local calculado",
  ],
  items: [
    {
      id: "s7-b8-01",
      name: "Gestão de locais",
      status: "done",
      existing: [
        "stock_locations com name, address, active, is_default, tenant_id",
        "LocationsManager com CRUD de locais",
        "Movimentações vinculadas a location_id",
        "Filtro por local nas listagens",
      ],
      gaps: [],
      files: ["src/components/inventory/LocationsManager.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 9 — RESERVA DE MATERIAL (PRODUÇÃO)
// ══════════════════════════════════════════════════════════════════════

const BLOCK_9: DecompositionBlock = {
  id: "s7-b9-stock-reservation",
  number: 9,
  name: "Reserva de Material para Produção",
  objective: "OP reserva material automaticamente, atualizando saldo disponível",
  status: "pending",
  doneWhen: [
    "Ao criar OP, reservar materiais da ficha técnica/BOM",
    "Saldo reservado visível por produto",
    "Saldo disponível = saldo atual - reservado",
    "Liberação de reserva ao cancelar OP",
    "UI: indicador de disponibilidade na ficha da OP",
  ],
  items: [
    {
      id: "s7-b9-01",
      name: "Reserva automática de material",
      status: "pending",
      existing: [
        "production_products com product_id vinculado à OP",
        "ProductBOMManager com Bill of Materials por produto",
        "stock_movements com movement_type para registrar reservas",
        "AddInsumoDialog para adicionar insumos à OP",
      ],
      gaps: [
        "Adicionar movement_type 'reserva' e 'liberacao_reserva' ao stock_movements",
        "Trigger: ao criar OP com BOM, gerar movimentos de reserva para cada item",
        "Calcular saldo_reservado por produto (sum de reservas pendentes)",
        "Exibir saldo_disponivel = saldo_atual - saldo_reservado nas telas de estoque",
        "Ao cancelar OP, gerar movimentos de liberação de reserva",
        "Badge de disponibilidade (verde/amarelo/vermelho) na ficha da OP",
        "Alerta quando material insuficiente para reserva completa",
      ],
      files: [
        "src/components/production/AddInsumoDialog.tsx",
        "src/components/inventory/ProductDetailSheet.tsx",
      ],
      estimatedHoursRemaining: 8,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 10 — CONSUMO DE PRODUÇÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_10: DecompositionBlock = {
  id: "s7-b10-production-consumption",
  number: 10,
  name: "Consumo de Material na Produção",
  objective: "Apontamento de consumo real nas etapas de corte/usinagem com baixa automática",
  status: "partial",
  doneWhen: [
    "Registrar consumo real por insumo na OP",
    "Comparar previsto (BOM) vs real (consumido)",
    "Baixa automática do estoque ao registrar consumo",
    "Diferença (previsto - consumido) visível",
    "Movimentação tipo 'consumo_producao' no stock_movements",
  ],
  items: [
    {
      id: "s7-b10-01",
      name: "Apontamento de consumo",
      status: "partial",
      existing: [
        "production_products com cmv_total e fields de custo",
        "ProductionFichaTecnica para visualizar insumos da OP",
        "AddInsumoDialog e AddMaoObraDialog",
        "stock_movements aceita reference_type para vincular à OP",
      ],
      gaps: [
        "Adicionar campos qtd_prevista, qtd_consumida em production_products",
        "UI de apontamento de consumo por insumo (parcial e total)",
        "Ao registrar consumo, gerar stock_movement tipo 'consumo_producao' com reference_id=OP",
        "Cálculo de diferença (previsto - consumido) com indicador visual",
        "Status por material: pendente, parcial, completo, excedente",
        "Resumo de consumo vs previsto na ficha da OP",
      ],
      files: [
        "src/components/production/ProductionFichaTecnica.tsx",
        "src/components/production/AddInsumoDialog.tsx",
      ],
      estimatedHoursRemaining: 6,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 11 — ESTOQUE MÍNIMO E ALERTAS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_11: DecompositionBlock = {
  id: "s7-b11-min-stock",
  number: 11,
  name: "Estoque Mínimo e Alertas Automáticos",
  objective: "Configuração de estoque mínimo com geração automática de solicitação de compra",
  status: "done",
  doneWhen: [
    "stock_alerts_config com product_id, thresholds, alertas",
    "Alertas visuais para estoque baixo, zero e alto",
    "Sugestão automática de compra ao atingir mínimo",
    "QuickMinStockDialog para configuração rápida",
    "LowStockAlerts para painel de alertas",
  ],
  items: [
    {
      id: "s7-b11-01",
      name: "Alertas e estoque mínimo",
      status: "done",
      existing: [
        "stock_alerts_config com product_id, alert_low_stock, alert_zero_stock, alert_high_stock",
        "high_stock_threshold, notify_user_ids",
        "LowStockAlerts com painel de produtos abaixo do mínimo",
        "QuickMinStockDialog para configuração rápida de mínimo",
        "PurchaseSuggestions gera sugestões de compra baseadas em estoque baixo",
        "Badges visuais de status de estoque nos cards de produto",
      ],
      gaps: [],
      files: [
        "src/components/inventory/LowStockAlerts.tsx",
        "src/components/inventory/QuickMinStockDialog.tsx",
        "src/components/inventory/PurchaseSuggestions.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 12 — INVENTÁRIO FÍSICO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_12: DecompositionBlock = {
  id: "s7-b12-physical-inventory",
  number: 12,
  name: "Inventário Físico",
  objective: "Contagem física com comparação sistema vs real e ajustes automáticos",
  status: "pending",
  doneWhen: [
    "Tabela inventory_counts com produto, qtd_sistema, qtd_fisica, diferença",
    "Agrupamento por sessão de inventário (batch)",
    "Geração automática de ajustes de estoque para diferenças",
    "KPI de divergências",
    "Bloqueio de movimentações durante inventário (opcional)",
  ],
  items: [
    {
      id: "s7-b12-01",
      name: "Tabela e UI de inventário físico",
      status: "pending",
      existing: [
        "stock_movements com movement_type 'ajuste' já existe",
        "Produtos cadastrados com saldo calculado",
      ],
      gaps: [
        "Criar tabela 'inventory_sessions' (id, tenant_id, location_id, status, started_at, completed_at, notes, created_by)",
        "Criar tabela 'inventory_counts' (id, session_id, product_id, system_qty, counted_qty, difference, counted_by, counted_at, notes)",
        "RLS por tenant_id",
        "Status da sessão: aberta, em_contagem, concluida, cancelada",
        "UI: criar sessão → listar produtos → registrar contagem → gerar ajustes",
        "Ao concluir: gerar stock_movements tipo 'ajuste_inventario' para diferenças",
        "KPI de divergências com filtro por sessão",
      ],
      files: [],
      estimatedHoursRemaining: 10,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 13 — TRANSFERÊNCIA ENTRE LOCAIS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_13: DecompositionBlock = {
  id: "s7-b13-stock-transfer",
  number: 13,
  name: "Transferência entre Locais de Estoque",
  objective: "Movimentação de material entre locais com rastreabilidade",
  status: "partial",
  doneWhen: [
    "Transferência gera 2 movimentos: saída da origem + entrada no destino",
    "UI: selecionar produto, origem, destino, quantidade",
    "Validação: saldo suficiente na origem",
    "Listagem de transferências com status",
  ],
  items: [
    {
      id: "s7-b13-01",
      name: "Transferência entre locais",
      status: "partial",
      existing: [
        "stock_movements com movement_type 'transferencia' existe",
        "stock_locations com múltiplos locais",
        "CreateMovementDialog permite tipo transferência",
      ],
      gaps: [
        "Garantir que transferência gera 2 registros atomicamente (saída + entrada)",
        "Validação de saldo na origem antes de transferir",
        "Visão dedicada de transferências com status (solicitada, em_transito, recebida)",
        "Confirmação de recebimento no destino",
      ],
      files: ["src/components/inventory/CreateMovementDialog.tsx"],
      estimatedHoursRemaining: 4,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 14 — INTEGRAÇÃO PCP (MRP LEVE)
// ══════════════════════════════════════════════════════════════════════

const BLOCK_14: DecompositionBlock = {
  id: "s7-b14-pcp-integration",
  number: 14,
  name: "Integração PCP / MRP Leve",
  objective: "OP reserva, consome e solicita compra de material automaticamente",
  status: "pending",
  doneWhen: [
    "OP criada → reservar material (BOM) automaticamente",
    "Etapa executada → consumir material automaticamente",
    "Material insuficiente → gerar solicitação de compra automática",
    "Dashboard de necessidade de material por período",
    "Visão: OPs planejadas × materiais disponíveis",
  ],
  items: [
    {
      id: "s7-b14-01",
      name: "MRP leve integrado ao PCP",
      status: "pending",
      existing: [
        "production_orders com vínculo a order_items",
        "production_products com insumos por OP",
        "ProductBOMManager com BOM por produto",
        "PurchaseSuggestions com sugestões de compra",
        "material_requests para solicitações",
      ],
      gaps: [
        "Criar função: ao criar OP, explodir BOM e verificar disponibilidade",
        "Se disponível → reservar; Se insuficiente → gerar material_request automático",
        "Dashboard 'Necessidade de Materiais': lista produtos × OPs planejadas × saldo",
        "Visão temporal: necessidade por semana/mês vs estoque projetado",
        "Integração: conclusão de compra → libera material para OP pendente",
        "Alerta: 'X OPs aguardando material'",
      ],
      files: [],
      estimatedHoursRemaining: 12,
      dependencies: ["s7-b9-01", "s7-b10-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// SPRINT 7 CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

export const SPRINT_7_DECOMPOSITION: SprintDecomposition = {
  sprint: 7,
  name: "Compras, Estoque e Suprimentos com MRP Leve",
  objective: "Solicitação → Cotação → Pedido Compra → Recebimento → Estoque → Reserva/Consumo Produção → MRP Leve",
  totalBlocks: 14,
  totalItems: 14,
  estimatedHoursRemaining: 62,
  blocks: [
    BLOCK_1, BLOCK_2, BLOCK_3, BLOCK_4, BLOCK_5, BLOCK_6, BLOCK_7,
    BLOCK_8, BLOCK_9, BLOCK_10, BLOCK_11, BLOCK_12, BLOCK_13, BLOCK_14,
  ],
  doneCriteria: [
    "Criar solicitação de compra com urgência e projeto",
    "Gerar cotação a múltiplos fornecedores e comparar",
    "Gerar pedido de compra com itens e condição de pagamento",
    "Gerar contas a pagar automático ao aprovar pedido de compra",
    "Receber material parcial e total com atualização de estoque",
    "Movimentar estoque manual (entrada, saída, ajuste)",
    "Movimentar estoque automático (recebimento, consumo produção)",
    "Reservar material para produção (BOM → reserva)",
    "Consumir material na produção com comparação previsto vs real",
    "Controlar estoque mínimo com alertas e sugestão de compra automática",
    "Realizar inventário físico com ajustes automáticos",
    "Transferir material entre locais com confirmação",
    "Dashboard de necessidade de materiais (MRP leve)",
    "Auditoria completa de todas as movimentações",
  ],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

export function getSprint7PendingItems(): DecompositionItem[] {
  return SPRINT_7_DECOMPOSITION.blocks.flatMap(b =>
    b.items.filter(i => i.status !== "done" && i.status !== "not_needed")
  );
}

export function getSprint7ReadyItems(): DecompositionItem[] {
  const doneIds = new Set(
    SPRINT_7_DECOMPOSITION.blocks
      .flatMap(b => b.items)
      .filter(i => i.status === "done")
      .map(i => i.id)
  );
  return getSprint7PendingItems().filter(item =>
    item.dependencies.every(dep => doneIds.has(dep))
  );
}

export function getSprint7BlockSummary() {
  return SPRINT_7_DECOMPOSITION.blocks.map(b => ({
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
