/**
 * Universal Core Template — ERP Tendenci
 *
 * Estrutura padrão única aplicada a todas as empresas criadas.
 * Define centros de custo, KPIs, workflows e automações base.
 * Customizações por tenant são tratadas no Customization Layer
 * (tenant_customizations) sem alterar esta base.
 */

// ── Centros de Custo padrão do sistema ──
export const SYSTEM_DEFAULT_COST_CENTERS = [
  { name: "Comercial", code: "CC-COM", is_system_default: true },
  { name: "Produção", code: "CC-PRD", is_system_default: true },
  { name: "Administrativo", code: "CC-ADM", is_system_default: true },
  { name: "Financeiro", code: "CC-FIN", is_system_default: true },
  { name: "Marketing", code: "CC-MKT", is_system_default: true },
  { name: "Estrutura", code: "CC-EST", is_system_default: true },
  { name: "Projetos", code: "CC-PRJ", is_system_default: true },
  { name: "Planejados", code: "CC-PLA", is_system_default: true },
] as const;

// ── KPIs universais padrão ──
export const UNIVERSAL_KPIS = [
  { key: "margem_contribuicao", label: "Margem de Contribuição", category: "dre", default_priority: 1 },
  { key: "ebitda", label: "EBITDA", category: "dre", default_priority: 2 },
  { key: "resultado_economico", label: "Resultado Econômico", category: "dre", default_priority: 3 },
  { key: "fluxo_caixa_futuro", label: "Fluxo de Caixa Futuro", category: "caixa", default_priority: 4 },
  { key: "meta_vs_realizado", label: "Meta vs Realizado", category: "metas", default_priority: 5 },
  { key: "receita_liquida", label: "Receita Líquida", category: "dre", default_priority: 6 },
  { key: "ticket_medio", label: "Ticket Médio", category: "comercial", default_priority: 7 },
  { key: "burn_rate", label: "Burn Rate", category: "caixa", default_priority: 8 },
  { key: "runway", label: "Runway", category: "caixa", default_priority: 9 },
] as const;

// ── Workflows padrão do sistema ──
export interface WorkflowStepTemplate {
  key: string;
  label: string;
  required: boolean;  // etapa obrigatória (não pode ser desativada)
  position: number;
}

export interface WorkflowTemplate {
  key: string;
  label: string;
  module: string;
  steps: WorkflowStepTemplate[];
}

export const UNIVERSAL_WORKFLOWS: WorkflowTemplate[] = [
  {
    key: "pedidos",
    label: "Fluxo de Pedidos",
    module: "pedidos",
    steps: [
      { key: "rascunho", label: "Rascunho", required: true, position: 1 },
      { key: "negociacao", label: "Negociação", required: false, position: 2 },
      { key: "aprovado", label: "Aprovado", required: true, position: 3 },
      { key: "liberado_producao", label: "Liberado Produção", required: false, position: 4 },
      { key: "em_producao", label: "Em Produção", required: true, position: 5 },
      { key: "producao_concluida", label: "Produção Concluída", required: true, position: 6 },
      { key: "faturado", label: "Faturado", required: true, position: 7 },
      { key: "entregue", label: "Entregue", required: false, position: 8 },
      { key: "encerrado", label: "Encerrado", required: true, position: 9 },
    ],
  },
  {
    key: "financeiro",
    label: "Fluxo Financeiro",
    module: "financeiro",
    steps: [
      { key: "provisionado", label: "Provisionado", required: true, position: 1 },
      { key: "confirmado", label: "Confirmado", required: true, position: 2 },
      { key: "a_vencer", label: "A Vencer", required: true, position: 3 },
      { key: "pago_recebido", label: "Pago/Recebido", required: true, position: 4 },
      { key: "conciliado", label: "Conciliado", required: true, position: 5 },
    ],
  },
  {
    key: "conciliacao",
    label: "Fluxo de Conciliação",
    module: "conciliacao",
    steps: [
      { key: "importar_ofx", label: "Importar OFX", required: true, position: 1 },
      { key: "classificar", label: "Classificar", required: true, position: 2 },
      { key: "vincular", label: "Vincular a Títulos", required: true, position: 3 },
      { key: "confirmar", label: "Confirmar Conciliação", required: true, position: 4 },
    ],
  },
  {
    key: "fechamento_mensal",
    label: "Fechamento Mensal",
    module: "controladoria",
    steps: [
      { key: "revisar_lancamentos", label: "Revisar Lançamentos", required: true, position: 1 },
      { key: "conciliar_contas", label: "Conciliar Contas", required: true, position: 2 },
      { key: "validar_dre", label: "Validar DRE", required: true, position: 3 },
      { key: "validar_fluxo", label: "Validar Fluxo de Caixa", required: true, position: 4 },
      { key: "fechar_periodo", label: "Fechar Período", required: true, position: 5 },
    ],
  },
];

// ── Automações base do sistema ──
export interface AutomationTemplate {
  key: string;
  label: string;
  trigger: string;
  module: string;
  actions: string[];
  is_system: boolean;
}

export const UNIVERSAL_AUTOMATIONS: AutomationTemplate[] = [
  {
    key: "pedido_aprovado_financeiro",
    label: "Pedido aprovado → Gerar Contas a Receber",
    trigger: "pedido.aprovado",
    module: "financeiro",
    actions: ["gerar_contas_receber", "gerar_projeto_financeiro"],
    is_system: true,
  },
  {
    key: "pedido_aprovado_comissao",
    label: "Pedido aprovado → Gerar Comissão Vendedor",
    trigger: "pedido.aprovado",
    module: "financeiro",
    actions: ["gerar_comissao_vendedor"],
    is_system: true,
  },
  {
    key: "pedido_aprovado_centro_custo",
    label: "Pedido aprovado → Vincular Centro de Custo",
    trigger: "pedido.aprovado",
    module: "pedidos",
    actions: ["vincular_centro_custo"],
    is_system: true,
  },
  {
    key: "pedido_aprovado_projeto",
    label: "Pedido aprovado → Vincular Projeto",
    trigger: "pedido.aprovado",
    module: "pedidos",
    actions: ["vincular_projeto"],
    is_system: true,
  },
  {
    key: "pagamento_recebido_caixa",
    label: "Pagamento recebido → Atualizar Fluxo de Caixa",
    trigger: "financeiro.pago_recebido",
    module: "financeiro",
    actions: ["atualizar_fluxo_caixa"],
    is_system: true,
  },
  {
    key: "producao_concluida_faturamento",
    label: "Produção concluída → Liberar Faturamento",
    trigger: "producao.concluida",
    module: "pedidos",
    actions: ["liberar_faturamento"],
    is_system: true,
  },
];

// ── Estrutura DRE Universal (raízes do plano de contas — somente referência) ──
export const CORE_DRE_STRUCTURE = [
  { code: "1", name: "Receitas", is_core: true },
  { code: "2", name: "Despesas sobre Vendas", is_core: true },
  { code: "3", name: "Despesas Operacionais", is_core: true },
  { code: "4", name: "Depreciação e Amortização", is_core: true },
  { code: "5", name: "Resultado Financeiro", is_core: true },
  { code: "6", name: "Capital e Financiamentos", is_core: true },
  { code: "7", name: "Impostos sobre o Resultado", is_core: true },
] as const;

// ── Linhas calculadas universais do DRE ──
export const CORE_DRE_COMPUTED_LINES = [
  { key: "receita_liquida", label: "Receita Líquida", formula: "1 - 2" },
  { key: "margem_contribuicao", label: "Margem de Contribuição", formula: "RL - Custos Diretos - Comissões" },
  { key: "ebitda", label: "EBITDA", formula: "MC - 3" },
  { key: "rai", label: "Resultado antes dos Impostos", formula: "EBITDA - 4 + 5" },
  { key: "resultado_liquido", label: "Resultado Líquido", formula: "RAI - 7" },
] as const;

// ── Formas de pagamento padrão ──
export const UNIVERSAL_PAYMENT_METHODS = [
  { key: "pix", label: "PIX" },
  { key: "boleto", label: "Boleto" },
  { key: "cartao", label: "Cartão de Crédito" },
  { key: "cartao_antecipado", label: "Cartão Antecipado" },
  { key: "transferencia", label: "Transferência Bancária" },
  { key: "financiamento", label: "Financiamento" },
  { key: "leasing", label: "Leasing" },
] as const;

// ── Categorias de conta bancária padrão ──
export const UNIVERSAL_BANK_ACCOUNT_TYPES = [
  { key: "operacional", label: "Conta Operacional" },
  { key: "reserva", label: "Conta Reserva" },
  { key: "impostos", label: "Conta Impostos" },
  { key: "investimento", label: "Conta Investimento" },
] as const;
