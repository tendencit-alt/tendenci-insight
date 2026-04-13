// ══════════════════════════════════════════════════════════════════════
// CATÁLOGO OFICIAL DE ENTIDADES DO ERP
// Consolidação mestre da arquitetura — base conceitual única
// ══════════════════════════════════════════════════════════════════════

export type EntityModule =
  | "comercial"
  | "operacional"
  | "compras"
  | "financeiro"
  | "controladoria"
  | "sistema";

export interface EntityRelation {
  entity: string;
  type: "pertence_a" | "gera" | "pode_gerar" | "vincula" | "classifica" | "monitora" | "contem";
  label: string;
}

export interface EntityDefinition {
  id: string;
  name: string;
  module: EntityModule;
  table: string;
  purpose: string;
  createdBy: string;
  editedBy: string;
  approvedBy: string | null;
  requiredFields: string[];
  statuses: string[];
  events: string[];
  relations: EntityRelation[];
  impactsDRE: boolean;
  impactsCashFlow: boolean;
  requiresApproval: boolean;
  requiresDocument: boolean;
  generatesTask: boolean;
  generatesNotification: boolean;
  generatesAudit: boolean;
}

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — ENTIDADES COMERCIAIS
// ══════════════════════════════════════════════════════════════════════

const LEAD: EntityDefinition = {
  id: "lead",
  name: "Lead",
  module: "comercial",
  table: "leads",
  purpose: "Registro de potencial cliente capturado por marketing ou prospecção",
  createdBy: "Comercial, Marketing, IA",
  editedBy: "Comercial",
  approvedBy: null,
  requiredFields: ["name", "phone", "source"],
  statuses: ["novo", "qualificado", "descartado", "convertido"],
  events: ["registro_criado", "registro_atualizado", "mudou_qualificado"],
  relations: [
    { entity: "cliente", type: "pode_gerar", label: "Qualifica em Cliente" },
    { entity: "orcamento", type: "pode_gerar", label: "Gera Orçamento" },
    { entity: "crm_deal", type: "gera", label: "Cria Deal no CRM" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const CLIENTE: EntityDefinition = {
  id: "cliente",
  name: "Cliente",
  module: "comercial",
  table: "clients",
  purpose: "Cadastro mestre de pessoa física ou jurídica compradora",
  createdBy: "Comercial, Financeiro",
  editedBy: "Comercial, Financeiro",
  approvedBy: null,
  requiredFields: ["name", "cpf_cnpj", "tipo_pessoa", "email", "phone"],
  statuses: ["ativo", "inativo"],
  events: ["registro_criado", "registro_atualizado"],
  relations: [
    { entity: "pedido", type: "gera", label: "Vincula a Pedidos" },
    { entity: "contrato", type: "gera", label: "Vincula a Contratos" },
    { entity: "conta_receber", type: "vincula", label: "Possui Contas a Receber" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: true,
  generatesTask: false,
  generatesNotification: false,
  generatesAudit: true,
};

const ORCAMENTO: EntityDefinition = {
  id: "orcamento",
  name: "Orçamento",
  module: "comercial",
  table: "quotes",
  purpose: "Proposta comercial enviada ao cliente antes do pedido",
  createdBy: "Comercial",
  editedBy: "Comercial",
  approvedBy: "Gestor Comercial",
  requiredFields: ["client_id", "items", "value", "validity_date"],
  statuses: ["rascunho", "enviado", "aprovado_cliente", "reprovado", "convertido"],
  events: ["orcamento_criado", "registro_atualizado", "mudou_aprovado"],
  relations: [
    { entity: "cliente", type: "pertence_a", label: "Pertence ao Cliente" },
    { entity: "pedido", type: "pode_gerar", label: "Converte em Pedido" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: true,
  requiresDocument: true,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const PEDIDO: EntityDefinition = {
  id: "pedido",
  name: "Pedido de Venda",
  module: "comercial",
  table: "orders",
  purpose: "Registro oficial de venda confirmada com itens, valores e condições",
  createdBy: "Comercial",
  editedBy: "Comercial (até aprovação)",
  approvedBy: "Gestor / Admin",
  requiredFields: [
    "client_id", "vendedor_id", "items", "forma_pagamento",
    "centro_custo", "projeto", "value",
  ],
  statuses: [
    "rascunho", "negociacao", "aprovado", "liberado_producao",
    "em_producao", "producao_concluida", "faturado",
    "entregue", "encerrado", "cancelado",
  ],
  events: [
    "pedido_criado", "pedido_aprovado", "pedido_faturado",
    "pedido_entregue", "registro_cancelado",
  ],
  relations: [
    { entity: "cliente", type: "pertence_a", label: "Pertence ao Cliente" },
    { entity: "projeto_financeiro", type: "gera", label: "Gera Projeto Financeiro" },
    { entity: "projeto_operacional", type: "gera", label: "Gera Projeto Operacional" },
    { entity: "conta_receber", type: "gera", label: "Gera Contas a Receber" },
    { entity: "conta_pagar", type: "gera", label: "Gera Compromissos sobre Vendas" },
    { entity: "ordem_producao", type: "gera", label: "Gera Ordens de Produção" },
    { entity: "contrato", type: "pode_gerar", label: "Pode gerar Contrato" },
  ],
  impactsDRE: true,
  impactsCashFlow: true,
  requiresApproval: true,
  requiresDocument: true,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const CONTRATO: EntityDefinition = {
  id: "contrato",
  name: "Contrato",
  module: "comercial",
  table: "contracts",
  purpose: "Formalização jurídica do pedido ou relação comercial",
  createdBy: "Comercial, Jurídico",
  editedBy: "Comercial (até assinatura)",
  approvedBy: "Admin",
  requiredFields: ["title", "client_id", "contract_type", "total_value"],
  statuses: ["rascunho", "aguardando_aprovacao", "aprovado", "vigente", "encerrado", "cancelado"],
  events: ["registro_criado", "mudou_aprovado", "mudou_concluido"],
  relations: [
    { entity: "cliente", type: "pertence_a", label: "Pertence ao Cliente" },
    { entity: "pedido", type: "vincula", label: "Vinculado ao Pedido" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: true,
  requiresDocument: true,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — ENTIDADES OPERACIONAIS
// ══════════════════════════════════════════════════════════════════════

const PROJETO_OPERACIONAL: EntityDefinition = {
  id: "projeto_operacional",
  name: "Projeto Operacional",
  module: "operacional",
  table: "operational_projects",
  purpose: "Gerenciar execução operacional de um pedido aprovado",
  createdBy: "Sistema (automação ao aprovar pedido)",
  editedBy: "Operacional",
  approvedBy: null,
  requiredFields: ["order_id", "client_id", "responsavel_id"],
  statuses: ["aguardando", "em_execucao", "concluido", "cancelado"],
  events: ["registro_criado", "mudou_em_execucao", "mudou_concluido"],
  relations: [
    { entity: "pedido", type: "pertence_a", label: "Originado do Pedido" },
    { entity: "entrega", type: "gera", label: "Gera Entregas" },
    { entity: "ordem_producao", type: "vincula", label: "Vincula OPs" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const ORDEM_PRODUCAO: EntityDefinition = {
  id: "ordem_producao",
  name: "Ordem de Produção",
  module: "operacional",
  table: "production_orders",
  purpose: "Controlar fabricação ou montagem de itens do pedido",
  createdBy: "Sistema (automação) ou Operacional",
  editedBy: "Operacional, Produção",
  approvedBy: null,
  requiredFields: ["order_item_id", "production_type_id"],
  statuses: ["aguardando", "em_producao", "concluida", "cancelada"],
  events: ["producao_iniciada", "producao_concluida", "retrabalho_registrado"],
  relations: [
    { entity: "pedido", type: "pertence_a", label: "Originada do Pedido" },
    { entity: "etapa_producao", type: "contem", label: "Contém Etapas" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const ETAPA_PRODUCAO: EntityDefinition = {
  id: "etapa_producao",
  name: "Etapa de Produção",
  module: "operacional",
  table: "production_phases",
  purpose: "Fase individual dentro de uma ordem de produção",
  createdBy: "Sistema (trigger ao criar OP)",
  editedBy: "Produção",
  approvedBy: null,
  requiredFields: ["production_order_id", "phase_type_id", "status"],
  statuses: ["pendente", "em_andamento", "concluida", "cancelada"],
  events: ["mudou_em_execucao", "mudou_concluido"],
  relations: [
    { entity: "ordem_producao", type: "pertence_a", label: "Pertence à OP" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: true,
  generatesAudit: true,
};

const ENTREGA_ENT: EntityDefinition = {
  id: "entrega",
  name: "Entrega",
  module: "operacional",
  table: "deliveries",
  purpose: "Registro logístico de entrega ao cliente final",
  createdBy: "Operacional",
  editedBy: "Operacional",
  approvedBy: null,
  requiredFields: ["project_id", "delivery_date", "responsavel_id"],
  statuses: ["programada", "em_transito", "entregue", "cancelada"],
  events: ["entrega_iniciada", "entrega_concluida"],
  relations: [
    { entity: "projeto_operacional", type: "pertence_a", label: "Do Projeto Operacional" },
    { entity: "ocorrencia", type: "pode_gerar", label: "Pode gerar Ocorrência" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: true,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const OCORRENCIA: EntityDefinition = {
  id: "ocorrencia",
  name: "Ocorrência",
  module: "operacional",
  table: "occurrences",
  purpose: "Registro de problema, avaria ou desvio operacional",
  createdBy: "Operacional, Produção",
  editedBy: "Operacional",
  approvedBy: null,
  requiredFields: ["description", "type", "severity"],
  statuses: ["aberta", "em_analise", "resolvida", "encerrada"],
  events: ["registro_criado", "mudou_concluido"],
  relations: [
    { entity: "entrega", type: "pertence_a", label: "Vinculada à Entrega" },
    { entity: "assistencia", type: "pode_gerar", label: "Pode gerar Assistência" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: true,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const ASSISTENCIA: EntityDefinition = {
  id: "assistencia",
  name: "Assistência Técnica",
  module: "operacional",
  table: "technical_assistance",
  purpose: "Atendimento pós-venda para correção ou manutenção",
  createdBy: "Operacional, Comercial",
  editedBy: "Operacional",
  approvedBy: null,
  requiredFields: ["client_id", "description", "type"],
  statuses: ["aberta", "em_execucao", "concluida", "cancelada"],
  events: ["registro_criado", "mudou_concluido"],
  relations: [
    { entity: "ocorrencia", type: "pertence_a", label: "Originada de Ocorrência" },
    { entity: "cliente", type: "vincula", label: "Do Cliente" },
  ],
  impactsDRE: true,
  impactsCashFlow: true,
  requiresApproval: false,
  requiresDocument: true,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — ENTIDADES DE COMPRAS
// ══════════════════════════════════════════════════════════════════════

const SOLICITACAO_COMPRA: EntityDefinition = {
  id: "solicitacao_compra",
  name: "Solicitação de Compra",
  module: "compras",
  table: "purchase_requests",
  purpose: "Requisição interna de material ou serviço para cotação",
  createdBy: "Operacional, Produção, Admin",
  editedBy: "Compras",
  approvedBy: "Gestor / Admin",
  requiredFields: ["description", "items", "requested_by"],
  statuses: ["rascunho", "aguardando_aprovacao", "aprovada", "cotada", "cancelada"],
  events: ["registro_criado", "mudou_aprovado"],
  relations: [
    { entity: "pedido_compra", type: "gera", label: "Gera Pedido de Compra" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: true,
  requiresDocument: false,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const PEDIDO_COMPRA: EntityDefinition = {
  id: "pedido_compra",
  name: "Pedido de Compra",
  module: "compras",
  table: "purchase_orders",
  purpose: "Ordem de compra formal emitida ao fornecedor",
  createdBy: "Compras",
  editedBy: "Compras (até aprovação)",
  approvedBy: "Gestor / Admin",
  requiredFields: ["supplier_id", "items", "value", "payment_condition"],
  statuses: ["rascunho", "aguardando_aprovacao", "aprovado", "recebido", "cancelado"],
  events: ["registro_criado", "mudou_aprovado", "recebimento_realizado"],
  relations: [
    { entity: "fornecedor", type: "pertence_a", label: "Do Fornecedor" },
    { entity: "conta_pagar", type: "gera", label: "Gera Contas a Pagar" },
    { entity: "recebimento_compra", type: "gera", label: "Gera Recebimento" },
  ],
  impactsDRE: true,
  impactsCashFlow: true,
  requiresApproval: true,
  requiresDocument: true,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const RECEBIMENTO_COMPRA: EntityDefinition = {
  id: "recebimento_compra",
  name: "Recebimento de Compra",
  module: "compras",
  table: "purchase_receipts",
  purpose: "Conferência e entrada de materiais adquiridos",
  createdBy: "Operacional, Estoque",
  editedBy: "Operacional",
  approvedBy: null,
  requiredFields: ["purchase_order_id", "items_received", "received_by"],
  statuses: ["pendente", "conferido", "aprovado", "devolvido"],
  events: ["registro_criado", "mudou_aprovado"],
  relations: [
    { entity: "pedido_compra", type: "pertence_a", label: "Do Pedido de Compra" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: true,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — ENTIDADES FINANCEIRAS
// ══════════════════════════════════════════════════════════════════════

const CONTA_PAGAR: EntityDefinition = {
  id: "conta_pagar",
  name: "Conta a Pagar",
  module: "financeiro",
  table: "fin_payables",
  purpose: "Obrigação financeira de saída de caixa",
  createdBy: "Sistema (pedido/compra), Financeiro",
  editedBy: "Financeiro (até conciliação)",
  approvedBy: "Gestor Financeiro",
  requiredFields: ["description", "value", "due_date", "category_id", "cost_center_id"],
  statuses: ["provisionado", "confirmado", "a_vencer", "vencido", "pago", "conciliado", "cancelado"],
  events: ["conta_criada", "conta_vencida", "pagamento_realizado", "conciliacao_concluida"],
  relations: [
    { entity: "pedido", type: "vincula", label: "Originada de Pedido" },
    { entity: "pedido_compra", type: "vincula", label: "Originada de Compra" },
    { entity: "categoria", type: "pertence_a", label: "Classificada pela Categoria" },
    { entity: "centro_custo", type: "vincula", label: "Alocada no Centro de Custo" },
    { entity: "projeto_financeiro", type: "vincula", label: "Vinculada ao Projeto" },
    { entity: "conciliacao", type: "vincula", label: "Conciliada" },
  ],
  impactsDRE: true,
  impactsCashFlow: true,
  requiresApproval: true,
  requiresDocument: true,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const CONTA_RECEBER: EntityDefinition = {
  id: "conta_receber",
  name: "Conta a Receber",
  module: "financeiro",
  table: "fin_receivables",
  purpose: "Direito financeiro de entrada de caixa",
  createdBy: "Sistema (pedido faturado), Financeiro",
  editedBy: "Financeiro (até conciliação)",
  approvedBy: "Gestor Financeiro",
  requiredFields: ["description", "value", "due_date", "category_id", "cost_center_id"],
  statuses: ["provisionado", "confirmado", "a_receber", "vencido", "recebido", "conciliado", "cancelado"],
  events: ["conta_criada", "conta_vencida", "recebimento_realizado", "conciliacao_concluida"],
  relations: [
    { entity: "pedido", type: "vincula", label: "Originada de Pedido" },
    { entity: "cliente", type: "pertence_a", label: "Do Cliente" },
    { entity: "categoria", type: "pertence_a", label: "Classificada pela Categoria" },
    { entity: "centro_custo", type: "vincula", label: "Alocada no Centro de Custo" },
    { entity: "projeto_financeiro", type: "vincula", label: "Vinculada ao Projeto" },
    { entity: "conciliacao", type: "vincula", label: "Conciliada" },
  ],
  impactsDRE: true,
  impactsCashFlow: true,
  requiresApproval: true,
  requiresDocument: true,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const MOVIMENTO_TESOURARIA: EntityDefinition = {
  id: "movimento_tesouraria",
  name: "Movimento de Tesouraria",
  module: "financeiro",
  table: "fin_ledger_entries",
  purpose: "Lançamento no Livro Razão — fonte única de verdade financeira",
  createdBy: "Sistema (automação), Financeiro",
  editedBy: "Financeiro (até conciliação)",
  approvedBy: null,
  requiredFields: ["description", "amount", "type", "category_id", "cash_date", "competence_date"],
  statuses: ["pendente", "confirmado", "conciliado"],
  events: ["registro_criado", "conciliacao_concluida"],
  relations: [
    { entity: "categoria", type: "pertence_a", label: "Classificado pela Categoria" },
    { entity: "centro_custo", type: "vincula", label: "Alocado no Centro de Custo" },
    { entity: "conciliacao", type: "vincula", label: "Conciliado" },
  ],
  impactsDRE: true,
  impactsCashFlow: true,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: false,
  generatesAudit: true,
};

const LANCAMENTO_BANCARIO: EntityDefinition = {
  id: "lancamento_bancario",
  name: "Lançamento Bancário",
  module: "financeiro",
  table: "fin_bank_transactions",
  purpose: "Transação importada de extrato bancário (OFX/CSV)",
  createdBy: "Sistema (importação)",
  editedBy: "Financeiro",
  approvedBy: null,
  requiredFields: ["amount", "date", "description", "bank_account_id"],
  statuses: ["pendente", "classificado", "conciliado"],
  events: ["extrato_importado", "conciliacao_concluida"],
  relations: [
    { entity: "conciliacao", type: "vincula", label: "Conciliado" },
    { entity: "conta_pagar", type: "vincula", label: "Baixa Conta a Pagar" },
    { entity: "conta_receber", type: "vincula", label: "Baixa Conta a Receber" },
  ],
  impactsDRE: false,
  impactsCashFlow: true,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: true,
  generatesNotification: false,
  generatesAudit: true,
};

const CONCILIACAO: EntityDefinition = {
  id: "conciliacao",
  name: "Conciliação Bancária",
  module: "financeiro",
  table: "fin_reconciliations",
  purpose: "Matching entre lançamentos bancários e obrigações financeiras",
  createdBy: "Financeiro",
  editedBy: "Financeiro",
  approvedBy: null,
  requiredFields: ["bank_transaction_id", "matched_entity_id"],
  statuses: ["pendente", "conciliado", "divergente"],
  events: ["conciliacao_concluida"],
  relations: [
    { entity: "lancamento_bancario", type: "vincula", label: "Do Extrato" },
    { entity: "conta_pagar", type: "vincula", label: "Baixa CP" },
    { entity: "conta_receber", type: "vincula", label: "Baixa CR" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: true,
  generatesAudit: true,
};

const FINANCIAMENTO: EntityDefinition = {
  id: "financiamento",
  name: "Financiamento",
  module: "financeiro",
  table: "fin_financings",
  purpose: "Empréstimo ou financiamento bancário com parcelas",
  createdBy: "Financeiro",
  editedBy: "Financeiro",
  approvedBy: "Admin",
  requiredFields: ["description", "total_value", "installments", "interest_rate", "start_date"],
  statuses: ["ativo", "quitado", "cancelado"],
  events: ["registro_criado", "pagamento_realizado", "mudou_concluido"],
  relations: [
    { entity: "parcela_financiamento", type: "contem", label: "Contém Parcelas" },
    { entity: "conta_pagar", type: "gera", label: "Gera Contas a Pagar" },
  ],
  impactsDRE: true,
  impactsCashFlow: true,
  requiresApproval: true,
  requiresDocument: true,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const PARCELA_FINANCIAMENTO: EntityDefinition = {
  id: "parcela_financiamento",
  name: "Parcela de Financiamento",
  module: "financeiro",
  table: "fin_financing_installments",
  purpose: "Parcela individual de um financiamento com separação Principal/Juros",
  createdBy: "Sistema (ao criar financiamento)",
  editedBy: "Financeiro",
  approvedBy: null,
  requiredFields: ["financing_id", "installment_number", "due_date", "principal", "interest"],
  statuses: ["a_vencer", "vencida", "paga", "conciliada"],
  events: ["conta_vencida", "pagamento_realizado"],
  relations: [
    { entity: "financiamento", type: "pertence_a", label: "Do Financiamento" },
    { entity: "conta_pagar", type: "gera", label: "Gera CP (Principal + Juros)" },
  ],
  impactsDRE: true,
  impactsCashFlow: true,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — ENTIDADES DE CONTROLADORIA
// ══════════════════════════════════════════════════════════════════════

const PLANO_CONTAS: EntityDefinition = {
  id: "plano_contas",
  name: "Plano de Contas",
  module: "controladoria",
  table: "fin_chart_accounts",
  purpose: "Estrutura hierárquica de classificação contábil (até 9 níveis)",
  createdBy: "Controladoria, Admin",
  editedBy: "Controladoria",
  approvedBy: "Admin",
  requiredFields: ["code", "name", "type", "parent_id"],
  statuses: ["ativo", "inativo"],
  events: ["registro_criado", "registro_atualizado"],
  relations: [
    { entity: "categoria", type: "contem", label: "Contém Categorias" },
    { entity: "meta", type: "vincula", label: "Monitorada por Metas" },
  ],
  impactsDRE: true,
  impactsCashFlow: false,
  requiresApproval: true,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: false,
  generatesAudit: true,
};

const CATEGORIA: EntityDefinition = {
  id: "categoria",
  name: "Categoria Financeira",
  module: "controladoria",
  table: "fin_chart_accounts",
  purpose: "Conta folha do plano de contas usada para classificar lançamentos",
  createdBy: "Controladoria",
  editedBy: "Controladoria",
  approvedBy: null,
  requiredFields: ["code", "name", "type", "parent_id"],
  statuses: ["ativo", "inativo"],
  events: ["registro_criado", "registro_atualizado"],
  relations: [
    { entity: "plano_contas", type: "pertence_a", label: "Pertence ao Plano" },
    { entity: "conta_pagar", type: "classifica", label: "Classifica CP" },
    { entity: "conta_receber", type: "classifica", label: "Classifica CR" },
    { entity: "movimento_tesouraria", type: "classifica", label: "Classifica Razão" },
  ],
  impactsDRE: true,
  impactsCashFlow: true,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: false,
  generatesAudit: true,
};

const CENTRO_CUSTO: EntityDefinition = {
  id: "centro_custo",
  name: "Centro de Custo",
  module: "controladoria",
  table: "cost_center_tags",
  purpose: "Unidade de alocação de custos e receitas para controle gerencial",
  createdBy: "Controladoria, Admin",
  editedBy: "Controladoria",
  approvedBy: null,
  requiredFields: ["name"],
  statuses: ["ativo", "inativo"],
  events: ["registro_criado"],
  relations: [
    { entity: "conta_pagar", type: "vincula", label: "Aloca CP" },
    { entity: "conta_receber", type: "vincula", label: "Aloca CR" },
    { entity: "pedido", type: "vincula", label: "Aloca Pedido" },
    { entity: "meta", type: "vincula", label: "Monitorado por Meta" },
  ],
  impactsDRE: true,
  impactsCashFlow: true,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: false,
  generatesAudit: true,
};

const PROJETO_FINANCEIRO: EntityDefinition = {
  id: "projeto_financeiro",
  name: "Projeto Financeiro",
  module: "controladoria",
  table: "fin_projects",
  purpose: "Agrupador financeiro para controle de rentabilidade por projeto",
  createdBy: "Sistema (ao aprovar pedido), Financeiro",
  editedBy: "Financeiro",
  approvedBy: null,
  requiredFields: ["name", "budget"],
  statuses: ["ativo", "concluido"],
  events: ["registro_criado", "orcamento_excedido"],
  relations: [
    { entity: "pedido", type: "vincula", label: "Vinculado a Pedidos" },
    { entity: "conta_pagar", type: "vincula", label: "Agrupa CP" },
    { entity: "conta_receber", type: "vincula", label: "Agrupa CR" },
    { entity: "meta", type: "vincula", label: "Monitorado por Meta" },
  ],
  impactsDRE: true,
  impactsCashFlow: true,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: true,
  generatesAudit: true,
};

const META_ENT: EntityDefinition = {
  id: "meta",
  name: "Meta",
  module: "controladoria",
  table: "tendenci_goals",
  purpose: "Objetivo financeiro ou operacional mensurável por período",
  createdBy: "Gestor, Admin",
  editedBy: "Gestor",
  approvedBy: null,
  requiredFields: ["name", "target_value", "period_start", "period_end"],
  statuses: ["ativo", "atingido", "nao_atingido"],
  events: ["meta_em_risco", "mudou_concluido"],
  relations: [
    { entity: "plano_contas", type: "monitora", label: "Monitora Contas" },
    { entity: "centro_custo", type: "monitora", label: "Monitora Centro de Custo" },
    { entity: "projeto_financeiro", type: "monitora", label: "Monitora Projeto" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const ORCAMENTO_CTRL: EntityDefinition = {
  id: "orcamento_ctrl",
  name: "Orçamento (Controladoria)",
  module: "controladoria",
  table: "tendenci_budgets",
  purpose: "Planejamento financeiro por período comparando previsto vs realizado",
  createdBy: "Gestor, Admin",
  editedBy: "Gestor",
  approvedBy: "Admin",
  requiredFields: ["period", "category_id", "planned_value"],
  statuses: ["rascunho", "aprovado", "vigente", "encerrado"],
  events: ["orcamento_excedido"],
  relations: [
    { entity: "meta", type: "vincula", label: "Compara com Meta" },
    { entity: "forecast", type: "vincula", label: "Alimenta Forecast" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: true,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: true,
  generatesAudit: true,
};

const FORECAST_ENT: EntityDefinition = {
  id: "forecast",
  name: "Forecast",
  module: "controladoria",
  table: "tendenci_forecasts",
  purpose: "Projeção financeira baseada em tendências e orçamento",
  createdBy: "Sistema (cálculo automático), Gestor",
  editedBy: "Gestor",
  approvedBy: null,
  requiredFields: ["period", "projected_value"],
  statuses: ["ativo"],
  events: ["fluxo_projetado_negativo"],
  relations: [
    { entity: "orcamento_ctrl", type: "vincula", label: "Baseado no Orçamento" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: true,
  generatesAudit: false,
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — ENTIDADES DE SISTEMA
// ══════════════════════════════════════════════════════════════════════

const USUARIO: EntityDefinition = {
  id: "usuario",
  name: "Usuário",
  module: "sistema",
  table: "profiles",
  purpose: "Conta de acesso ao sistema com perfil e permissões",
  createdBy: "Admin, Owner",
  editedBy: "Admin",
  approvedBy: null,
  requiredFields: ["full_name", "email", "profile_type"],
  statuses: ["ativo", "inativo", "bloqueado"],
  events: ["registro_criado", "registro_atualizado"],
  relations: [
    { entity: "perfil", type: "vincula", label: "Possui Perfil" },
    { entity: "permissao", type: "vincula", label: "Possui Permissões" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: true,
  generatesAudit: true,
};

const PERFIL: EntityDefinition = {
  id: "perfil",
  name: "Perfil de Acesso",
  module: "sistema",
  table: "user_roles",
  purpose: "Tipo de acesso do usuário (Admin, Financeiro, Comercial, etc.)",
  createdBy: "Admin",
  editedBy: "Admin",
  approvedBy: null,
  requiredFields: ["user_id", "role"],
  statuses: ["ativo"],
  events: ["registro_criado"],
  relations: [
    { entity: "usuario", type: "pertence_a", label: "Do Usuário" },
    { entity: "permissao", type: "gera", label: "Define Permissões" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: false,
  generatesAudit: true,
};

const DOCUMENTO_ENT: EntityDefinition = {
  id: "documento",
  name: "Documento",
  module: "sistema",
  table: "erp_documents",
  purpose: "Arquivo vinculado a qualquer entidade (PDF, imagem, NF, contrato)",
  createdBy: "Qualquer usuário autorizado",
  editedBy: "Autor, Admin",
  approvedBy: null,
  requiredFields: ["file_name", "file_path", "entity_id", "entity_table", "module", "document_type"],
  statuses: ["ativo", "substituido", "excluido"],
  events: ["registro_criado"],
  relations: [
    { entity: "pedido", type: "vincula", label: "Vinculável a qualquer entidade" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: false,
  generatesAudit: true,
};

const TAREFA_ENT: EntityDefinition = {
  id: "tarefa",
  name: "Tarefa",
  module: "sistema",
  table: "erp_tasks",
  purpose: "Ação operacional vinculada a entidade ou gerada por automação",
  createdBy: "Sistema (automação), Qualquer usuário",
  editedBy: "Responsável",
  approvedBy: null,
  requiredFields: ["title", "assignee_id", "category", "module"],
  statuses: ["pendente", "em_andamento", "concluida", "cancelada"],
  events: ["registro_criado", "mudou_concluido"],
  relations: [
    { entity: "regra_automatica", type: "vincula", label: "Gerada por Automação" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: true,
  generatesAudit: true,
};

const NOTIFICACAO_ENT: EntityDefinition = {
  id: "notificacao",
  name: "Notificação",
  module: "sistema",
  table: "erp_notifications",
  purpose: "Alerta interno para o usuário sobre evento ou pendência",
  createdBy: "Sistema (automação)",
  editedBy: "Sistema",
  approvedBy: null,
  requiredFields: ["title", "user_id", "module", "category"],
  statuses: ["nao_lida", "lida"],
  events: [],
  relations: [],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: false,
  generatesAudit: false,
};

const REGRA_AUTOMATICA: EntityDefinition = {
  id: "regra_automatica",
  name: "Regra Automática",
  module: "sistema",
  table: "automation_rules",
  purpose: "Definição de automação evento-condição-ação",
  createdBy: "Admin, Sistema",
  editedBy: "Admin",
  approvedBy: null,
  requiredFields: ["name", "event_type", "event_module", "actions"],
  statuses: ["ativo", "inativo"],
  events: [],
  relations: [
    { entity: "tarefa", type: "pode_gerar", label: "Pode gerar Tarefas" },
    { entity: "notificacao", type: "pode_gerar", label: "Pode gerar Notificações" },
    { entity: "auditoria", type: "gera", label: "Registra Auditoria" },
  ],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: true,
  generatesNotification: true,
  generatesAudit: true,
};

const AUDITORIA_ENT: EntityDefinition = {
  id: "auditoria",
  name: "Registro de Auditoria",
  module: "sistema",
  table: "audit_log",
  purpose: "Log imutável de todas as alterações críticas do sistema",
  createdBy: "Sistema (automático)",
  editedBy: "Imutável",
  approvedBy: null,
  requiredFields: ["table_name", "record_id", "event_type", "event_source"],
  statuses: ["registrado"],
  events: [],
  relations: [],
  impactsDRE: false,
  impactsCashFlow: false,
  requiresApproval: false,
  requiresDocument: false,
  generatesTask: false,
  generatesNotification: false,
  generatesAudit: false,
};

// ══════════════════════════════════════════════════════════════════════
// CATÁLOGO COMPLETO
// ══════════════════════════════════════════════════════════════════════

export const ENTITY_CATALOG: EntityDefinition[] = [
  // Comercial
  LEAD, CLIENTE, ORCAMENTO, PEDIDO, CONTRATO,
  // Operacional
  PROJETO_OPERACIONAL, ORDEM_PRODUCAO, ETAPA_PRODUCAO, ENTREGA_ENT, OCORRENCIA, ASSISTENCIA,
  // Compras
  SOLICITACAO_COMPRA, PEDIDO_COMPRA, RECEBIMENTO_COMPRA,
  // Financeiro
  CONTA_PAGAR, CONTA_RECEBER, MOVIMENTO_TESOURARIA, LANCAMENTO_BANCARIO, CONCILIACAO, FINANCIAMENTO, PARCELA_FINANCIAMENTO,
  // Controladoria
  PLANO_CONTAS, CATEGORIA, CENTRO_CUSTO, PROJETO_FINANCEIRO, META_ENT, ORCAMENTO_CTRL, FORECAST_ENT,
  // Sistema
  USUARIO, PERFIL, DOCUMENTO_ENT, TAREFA_ENT, NOTIFICACAO_ENT, REGRA_AUTOMATICA, AUDITORIA_ENT,
];

export function getEntityById(id: string): EntityDefinition | undefined {
  return ENTITY_CATALOG.find((e) => e.id === id);
}

export function getEntitiesByModule(module: EntityModule): EntityDefinition[] {
  return ENTITY_CATALOG.filter((e) => e.module === module);
}

export const MODULE_ENTITY_LABELS: Record<EntityModule, string> = {
  comercial: "Comercial",
  operacional: "Operacional",
  compras: "Compras",
  financeiro: "Financeiro",
  controladoria: "Controladoria",
  sistema: "Sistema",
};
