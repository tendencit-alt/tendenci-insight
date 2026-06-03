// ══════════════════════════════════════════════════════════════════════
// INVENTÁRIO OFICIAL DE TELAS — MVP
// Estrutura executável para construção do front-end
// ══════════════════════════════════════════════════════════════════════

export type ScreenType = "dashboard" | "list" | "form" | "detail" | "kanban" | "workspace" | "config" | "report" | "component";

export interface ScreenDefinition {
  id: string;
  name: string;
  route: string;
  type: ScreenType;
  module: string;
  description: string;
  mainEntity?: string;
  components: string[];
  dataSource: string[];
  actions: string[];
  permissions: string[];
}

// ══════════════════════════════════════════════════════════════════════
// GRUPO 1 — DASHBOARD
// ══════════════════════════════════════════════════════════════════════

const DASHBOARD_SCREENS: ScreenDefinition[] = [
  {
    id: "dashboard-executivo",
    name: "Dashboard Executivo",
    route: "/dashboard",
    type: "dashboard",
    module: "Dashboard",
    description: "Visão consolidada de KPIs financeiros, comerciais e operacionais",
    components: [
      "KPI receita mês",
      "KPI despesa mês",
      "KPI resultado econômico (EBITDA)",
      "Gráfico fluxo projetado 30 dias",
      "Lista contas vencidas (top 5)",
      "Lista pedidos aprovados pendentes",
      "Resumo produção ativa",
      "Metas vs realizado (gauge charts)",
      "Filtro período",
      "Filtro centro de custo",
    ],
    dataSource: ["fin_ledger_entries", "orders", "production_orders", "tendenci_goals", "fin_payables", "fin_receivables"],
    actions: ["filtrar_periodo", "filtrar_centro_custo", "exportar_pdf"],
    permissions: ["view_dashboard"],
  },
];

// ══════════════════════════════════════════════════════════════════════
// GRUPO 2 — CENTRAL OPERACIONAL
// ══════════════════════════════════════════════════════════════════════

const CENTRAL_SCREENS: ScreenDefinition[] = [
  {
    id: "central-operacional",
    name: "Central Operacional",
    route: "/central",
    type: "workspace",
    module: "Central",
    description: "Workspace diário orientado por execução: tarefas, aprovações, agenda e alertas",
    components: [
      "Bloco pendências críticas (contas vencidas, aprovações urgentes, produção atrasada)",
      "Lista tarefas do dia (por responsável)",
      "Painel aprovações pendentes",
      "Agenda semanal (reuniões, entregas, vencimentos)",
      "Alertas automáticos (vencimentos, atrasos, metas em risco)",
      "Atalhos rápidos por perfil",
    ],
    dataSource: ["erp_tasks", "approval_instances", "fin_payables", "fin_receivables", "production_orders", "erp_notifications"],
    actions: ["aprovar", "rejeitar", "concluir_tarefa", "adiar_tarefa", "navegar_registro"],
    permissions: ["view_central"],
  },
];

// ══════════════════════════════════════════════════════════════════════
// GRUPO 3 — CADASTROS
// ══════════════════════════════════════════════════════════════════════

const CADASTRO_SCREENS: ScreenDefinition[] = [
  {
    id: "clientes-list", name: "Clientes", route: "/cadastros/clientes", type: "list",
    module: "Cadastros", description: "Listagem de clientes PF/PJ com filtros e busca", mainEntity: "cliente",
    components: ["ListView universal", "Filtros rápidos (tipo pessoa, cidade, status)", "Badge status", "Busca por nome/CPF/CNPJ"],
    dataSource: ["clients"], actions: ["novo", "editar", "exportar", "importar"], permissions: ["view_clients"],
  },
  {
    id: "clientes-form", name: "Cliente — Cadastro", route: "/cadastros/clientes/:id", type: "form",
    module: "Cadastros", description: "Formulário completo de cliente com dados fiscais e endereço", mainEntity: "cliente",
    components: ["FormView universal", "Seção dados principais", "Seção endereço (CEP automático)", "Seção dados fiscais", "Seção contato financeiro", "Timeline", "Documentos", "Pedidos vinculados"],
    dataSource: ["clients", "orders", "erp_documents"], actions: ["salvar", "salvar_fechar", "excluir_logico"], permissions: ["edit_clients"],
  },
  {
    id: "fornecedores-list", name: "Fornecedores", route: "/cadastros/fornecedores", type: "list",
    module: "Cadastros", description: "Listagem de fornecedores com dados bancários", mainEntity: "fornecedor",
    components: ["ListView universal", "Filtros rápidos (categoria, cidade, status)", "Badge status"],
    dataSource: ["suppliers"], actions: ["novo", "editar", "exportar"], permissions: ["view_suppliers"],
  },
  {
    id: "fornecedores-form", name: "Fornecedor — Cadastro", route: "/cadastros/fornecedores/:id", type: "form",
    module: "Cadastros", description: "Formulário de fornecedor com dados bancários e fiscais", mainEntity: "fornecedor",
    components: ["FormView universal", "Seção dados principais", "Seção dados bancários", "Seção dados fiscais", "Compras vinculadas"],
    dataSource: ["suppliers", "purchase_orders"], actions: ["salvar", "salvar_fechar", "excluir_logico"], permissions: ["edit_suppliers"],
  },
  {
    id: "produtos-list", name: "Produtos", route: "/cadastros/produtos", type: "list",
    module: "Cadastros", description: "Catálogo de produtos e matéria-prima", mainEntity: "produto",
    components: ["ListView universal", "Filtros (categoria, tipo, status)", "Badge tipo (produto/serviço/insumo)"],
    dataSource: ["products"], actions: ["novo", "editar", "exportar", "importar"], permissions: ["view_products"],
  },
  {
    id: "produtos-form", name: "Produto — Cadastro", route: "/cadastros/produtos/:id", type: "form",
    module: "Cadastros", description: "Formulário de produto com custos e preços", mainEntity: "produto",
    components: ["FormView universal", "Seção dados principais", "Seção custos", "Seção preços", "Seção composição (insumos)"],
    dataSource: ["products"], actions: ["salvar", "salvar_fechar", "duplicar", "excluir_logico"], permissions: ["edit_products"],
  },
  {
    id: "centros-custo-list", name: "Centros de Custo", route: "/cadastros/centros-custo", type: "list",
    module: "Cadastros", description: "Centros de custo para alocação de despesas e receitas", mainEntity: "centro_custo",
    components: ["ListView universal", "Badge ativo/inativo"],
    dataSource: ["cost_center_tags"], actions: ["novo", "editar"], permissions: ["view_cost_centers"],
  },
  {
    id: "projetos-list", name: "Projetos Financeiros", route: "/cadastros/projetos", type: "list",
    module: "Cadastros", description: "Projetos financeiros para controle de rentabilidade", mainEntity: "projeto_financeiro",
    components: ["ListView universal", "Badge status", "Indicador orçamento consumido"],
    dataSource: ["fin_projects"], actions: ["novo", "editar"], permissions: ["view_projects"],
  },
  {
    id: "contas-bancarias-list", name: "Contas Bancárias", route: "/cadastros/contas-bancarias", type: "list",
    module: "Cadastros", description: "Contas bancárias da empresa", mainEntity: "conta_bancaria",
    components: ["ListView universal", "Indicador saldo atual"],
    dataSource: ["fin_bank_accounts"], actions: ["novo", "editar"], permissions: ["view_bank_accounts"],
  },
  {
    id: "plano-contas", name: "Plano de Contas", route: "/cadastros/plano-contas", type: "list",
    module: "Cadastros", description: "Árvore hierárquica de contas contábeis (até 9 níveis)", mainEntity: "plano_contas",
    components: ["TreeView hierárquica", "Filtros (tipo, nível, ativo)", "Drag-and-drop reordenação", "Badge tipo (receita/despesa/resultado)"],
    dataSource: ["fin_chart_accounts"], actions: ["nova_conta", "editar", "ativar_desativar"], permissions: ["view_chart_accounts"],
  },
];

// ══════════════════════════════════════════════════════════════════════
// GRUPO 4 — COMERCIAL
// ══════════════════════════════════════════════════════════════════════

const COMERCIAL_SCREENS: ScreenDefinition[] = [
  {
    id: "orcamentos-list", name: "Orçamentos", route: "/comercial/orcamentos", type: "list",
    module: "Comercial", description: "Listagem de orçamentos com status e valor", mainEntity: "orcamento",
    components: ["ListView universal", "Filtros (status, vendedor, período, cliente)", "Badge status", "Indicador valor total"],
    dataSource: ["quotes"], actions: ["novo", "editar", "duplicar", "converter_pedido", "exportar"], permissions: ["view_quotes"],
  },
  {
    id: "orcamentos-form", name: "Orçamento — Edição", route: "/comercial/orcamentos/:id", type: "form",
    module: "Comercial", description: "Formulário de orçamento com itens, condição e validade", mainEntity: "orcamento",
    components: ["FormView universal", "Seção cliente", "Seção itens (tabela editável)", "Seção condição comercial", "Seção validade e observações", "Preview PDF", "Timeline"],
    dataSource: ["quotes", "quote_items", "clients", "products"], actions: ["salvar", "enviar_cliente", "converter_pedido", "duplicar"], permissions: ["edit_quotes"],
  },
  {
    id: "pedidos-list", name: "Pedidos", route: "/comercial/pedidos", type: "list",
    module: "Comercial", description: "Listagem de pedidos de venda com pipeline de status", mainEntity: "pedido",
    components: ["ListView universal", "Filtros (status, vendedor, período, cliente, centro custo)", "Badge status colorido", "Indicadores: total, aprovados, faturados"],
    dataSource: ["orders"], actions: ["novo", "editar", "aprovar", "exportar"], permissions: ["view_orders"],
  },
  {
    id: "pedidos-form", name: "Pedido — Edição", route: "/comercial/pedidos/:id", type: "form",
    module: "Comercial", description: "Formulário completo de pedido com itens, pagamento e aprovação", mainEntity: "pedido",
    components: ["FormView universal", "Seção cliente", "Seção itens (tabela editável)", "Seção condição pagamento", "Seção centro custo / projeto", "Seção comissões", "StatusTransitionSelect", "Timeline", "Documentos", "Vínculos (produção, financeiro, contrato)"],
    dataSource: ["orders", "order_items", "clients", "products"], actions: ["salvar", "aprovar", "faturar", "cancelar", "duplicar"], permissions: ["edit_orders"],
  },
  {
    id: "contratos-list", name: "Contratos", route: "/comercial/contratos", type: "list",
    module: "Comercial", description: "Contratos vinculados a pedidos", mainEntity: "contrato",
    components: ["ListView universal", "Filtros (status, cliente, tipo)", "Badge status"],
    dataSource: ["contracts"], actions: ["novo", "editar", "exportar"], permissions: ["view_contracts"],
  },
  {
    id: "contratos-form", name: "Contrato — Edição", route: "/comercial/contratos/:id", type: "form",
    module: "Comercial", description: "Formulário de contrato com vínculo a pedido e cliente", mainEntity: "contrato",
    components: ["FormView universal", "Seção dados principais", "Seção pedido vinculado", "Seção valores e condições", "Documentos", "Timeline"],
    dataSource: ["contracts", "orders", "clients"], actions: ["salvar", "assinar", "cancelar"], permissions: ["edit_contracts"],
  },
  {
    id: "tabela-precos", name: "Tabela de Preços", route: "/comercial/tabela-precos", type: "list",
    module: "Comercial", description: "Gerenciamento de preços por produto", mainEntity: "tabela_preco",
    components: ["ListView universal", "Edição inline de preços", "Filtros por categoria"],
    dataSource: ["products", "price_tables"], actions: ["editar", "importar", "exportar"], permissions: ["edit_prices"],
  },
  {
    id: "condicoes-pagamento", name: "Condições de Pagamento", route: "/comercial/condicoes-pagamento", type: "list",
    module: "Comercial", description: "Configuração de formas e condições de pagamento", mainEntity: "condicao_pagamento",
    components: ["ListView universal", "Edição inline", "Badge tipo (boleto/cartão/pix)"],
    dataSource: ["credit_card_rates", "boleto_rates"], actions: ["novo", "editar"], permissions: ["edit_payment_conditions"],
  },
];

// ══════════════════════════════════════════════════════════════════════
// GRUPO 5 — COMPRAS
// ══════════════════════════════════════════════════════════════════════

const COMPRAS_SCREENS: ScreenDefinition[] = [
  {
    id: "solicitacoes-compra-list", name: "Solicitações de Compra", route: "/compras/solicitacoes", type: "list",
    module: "Compras", description: "Requisições internas de material ou serviço", mainEntity: "solicitacao_compra",
    components: ["ListView universal", "Filtros (status, solicitante, período)", "Badge status"],
    dataSource: ["purchase_requests"], actions: ["nova", "editar", "aprovar"], permissions: ["view_purchase_requests"],
  },
  {
    id: "solicitacoes-compra-form", name: "Solicitação — Edição", route: "/compras/solicitacoes/:id", type: "form",
    module: "Compras", description: "Formulário de solicitação com itens e justificativa", mainEntity: "solicitacao_compra",
    components: ["FormView universal", "Seção itens", "Seção justificativa", "StatusTransitionSelect", "Timeline"],
    dataSource: ["purchase_requests"], actions: ["salvar", "enviar_aprovacao", "converter_pedido_compra"], permissions: ["edit_purchase_requests"],
  },
  {
    id: "pedidos-compra-list", name: "Pedidos de Compra", route: "/compras/pedidos", type: "list",
    module: "Compras", description: "Ordens de compra emitidas a fornecedores", mainEntity: "pedido_compra",
    components: ["ListView universal", "Filtros (status, fornecedor, período)", "Badge status", "Indicador valor total"],
    dataSource: ["purchase_orders"], actions: ["novo", "editar", "aprovar", "exportar"], permissions: ["view_purchase_orders"],
  },
  {
    id: "pedidos-compra-form", name: "Pedido de Compra — Edição", route: "/compras/pedidos/:id", type: "form",
    module: "Compras", description: "Formulário de pedido de compra com itens e condições", mainEntity: "pedido_compra",
    components: ["FormView universal", "Seção fornecedor", "Seção itens", "Seção condição pagamento", "Seção centro custo", "StatusTransitionSelect", "Timeline", "Documentos"],
    dataSource: ["purchase_orders", "suppliers", "products"], actions: ["salvar", "aprovar", "cancelar"], permissions: ["edit_purchase_orders"],
  },
  {
    id: "recebimentos-list", name: "Recebimentos de Compra", route: "/compras/recebimentos", type: "list",
    module: "Compras", description: "Conferência e entrada de materiais", mainEntity: "recebimento_compra",
    components: ["ListView universal", "Filtros (status, fornecedor)", "Badge status"],
    dataSource: ["purchase_receipts"], actions: ["novo", "editar", "confirmar"], permissions: ["view_purchase_receipts"],
  },
];

// ══════════════════════════════════════════════════════════════════════
// GRUPO 6 — OPERAÇÕES
// ══════════════════════════════════════════════════════════════════════

const OPERACOES_SCREENS: ScreenDefinition[] = [
  {
    id: "producao-list", name: "Produção", route: "/operacoes/producao-operacoes", type: "list",
    module: "Operações", description: "Ordens de produção com etapas e status", mainEntity: "ordem_producao",
    components: ["ListView universal", "Filtros (status, pedido, responsável, período)", "Badge status", "Indicadores: aguardando, em produção, concluídas"],
    dataSource: ["production_orders", "production_phases"], actions: ["nova", "editar", "iniciar", "concluir"], permissions: ["view_production"],
  },
  {
    id: "producao-form", name: "Ordem de Produção — Detalhe", route: "/operacoes/producao-operacoes/:id", type: "detail",
    module: "Operações", description: "Detalhe da OP com etapas, timeline e vínculos", mainEntity: "ordem_producao",
    components: ["FormView universal", "Seção pedido vinculado", "Lista etapas com status individual", "StatusTransitionSelect", "Timeline", "Checklist de conclusão"],
    dataSource: ["production_orders", "production_phases", "orders"], actions: ["iniciar", "concluir_etapa", "concluir_op", "registrar_ocorrencia"], permissions: ["edit_production"],
  },
  {
    id: "entregas-list", name: "Entregas", route: "/operacoes/entregas", type: "list",
    module: "Operações", description: "Registro e acompanhamento de entregas", mainEntity: "entrega",
    components: ["ListView universal", "Filtros (status, período, responsável)", "Badge status"],
    dataSource: ["deliveries"], actions: ["nova", "editar", "confirmar_entrega"], permissions: ["view_deliveries"],
  },
  {
    id: "ocorrencias-list", name: "Ocorrências", route: "/operacoes/ocorrencias", type: "list",
    module: "Operações", description: "Problemas, avarias e desvios operacionais", mainEntity: "ocorrencia",
    components: ["ListView universal", "Filtros (severidade, tipo, status)", "Badge severidade"],
    dataSource: ["occurrences"], actions: ["nova", "editar", "resolver"], permissions: ["view_occurrences"],
  },
];

// ══════════════════════════════════════════════════════════════════════
// GRUPO 7 — FINANCEIRO
// ══════════════════════════════════════════════════════════════════════

const FINANCEIRO_SCREENS: ScreenDefinition[] = [
  {
    id: "contas-pagar-list", name: "Contas a Pagar", route: "/financeiro/contas-pagar", type: "list",
    module: "Financeiro", description: "Títulos de saída com vencimento e status", mainEntity: "conta_pagar",
    components: ["ListView universal", "Filtros (status, vencimento, fornecedor, centro custo, projeto)", "Badge status", "Indicadores: total a vencer, vencido, pago no mês"],
    dataSource: ["fin_payables"], actions: ["novo", "editar", "baixar", "exportar"], permissions: ["view_payables"],
  },
  {
    id: "contas-pagar-form", name: "Conta a Pagar — Edição", route: "/financeiro/contas-pagar/:id", type: "form",
    module: "Financeiro", description: "Formulário de título a pagar com classificação", mainEntity: "conta_pagar",
    components: ["FormView universal", "Seção dados principais", "Seção classificação (categoria, centro custo, projeto)", "Seção pagamento (data, conta, valor)", "Seção vínculo (pedido, compra)", "Documentos", "Timeline"],
    dataSource: ["fin_payables", "fin_chart_accounts", "cost_center_tags", "fin_projects"], actions: ["salvar", "baixar", "cancelar"], permissions: ["edit_payables"],
  },
  {
    id: "contas-receber-list", name: "Contas a Receber", route: "/financeiro/contas-receber", type: "list",
    module: "Financeiro", description: "Títulos de entrada com vencimento e status", mainEntity: "conta_receber",
    components: ["ListView universal", "Filtros (status, vencimento, cliente, centro custo, projeto)", "Badge status", "Indicadores: total a receber, vencido, recebido no mês"],
    dataSource: ["fin_receivables"], actions: ["novo", "editar", "baixar", "exportar"], permissions: ["view_receivables"],
  },
  {
    id: "contas-receber-form", name: "Conta a Receber — Edição", route: "/financeiro/contas-receber/:id", type: "form",
    module: "Financeiro", description: "Formulário de título a receber com classificação", mainEntity: "conta_receber",
    components: ["FormView universal", "Seção dados principais", "Seção classificação", "Seção recebimento", "Seção vínculo (pedido)", "Documentos", "Timeline"],
    dataSource: ["fin_receivables", "fin_chart_accounts", "cost_center_tags", "fin_projects"], actions: ["salvar", "baixar", "cancelar"], permissions: ["edit_receivables"],
  },
  {
    id: "tesouraria", name: "Tesouraria", route: "/financeiro/tesouraria", type: "list",
    module: "Financeiro", description: "Livro Razão — lançamentos com data caixa e competência", mainEntity: "movimento_tesouraria",
    components: ["ListView universal", "Filtros (tipo, período, conta, categoria, centro custo)", "Badge tipo (entrada/saída)", "Indicadores: saldo atual, entradas, saídas"],
    dataSource: ["fin_ledger_entries"], actions: ["novo", "editar", "exportar"], permissions: ["view_ledger"],
  },
  {
    id: "conciliacao", name: "Conciliação Bancária", route: "/financeiro/conciliacao", type: "workspace",
    module: "Financeiro", description: "Matching de extrato bancário com títulos financeiros", mainEntity: "conciliacao",
    components: ["Painel split: extrato à esquerda, títulos à direita", "Match automático por valor/data", "Match manual drag-and-drop", "Filtros por conta bancária e período", "Indicadores: conciliados, pendentes, divergentes"],
    dataSource: ["fin_bank_transactions", "fin_payables", "fin_receivables", "fin_reconciliations"], actions: ["importar_extrato", "conciliar", "desconciliar", "criar_lancamento"], permissions: ["manage_reconciliation"],
  },
  {
    id: "extrato-bancario", name: "Extrato Bancário", route: "/financeiro/extrato", type: "list",
    module: "Financeiro", description: "Transações importadas de extrato OFX/CSV", mainEntity: "lancamento_bancario",
    components: ["ListView universal", "Filtros (conta, período, status conciliação)", "Badge status (pendente/conciliado)", "Botão importar OFX/CSV"],
    dataSource: ["fin_bank_transactions"], actions: ["importar", "classificar", "exportar"], permissions: ["view_bank_statements"],
  },
];

// ══════════════════════════════════════════════════════════════════════
// GRUPO 8 — CONTROLADORIA
// ══════════════════════════════════════════════════════════════════════

const CONTROLADORIA_SCREENS: ScreenDefinition[] = [
  {
    id: "dre-gerencial", name: "DRE Gerencial", route: "/controladoria/dre", type: "report",
    module: "Controladoria", description: "Demonstrativo de Resultado por competência com 6 raízes e 5 linhas calculadas",
    components: ["Tabela hierárquica (plano de contas)", "5 linhas calculadas (RL, MC, EBITDA, RAI, RL)", "Filtros (período, centro custo, projeto)", "Comparativo mês anterior", "Drill-down por categoria", "Exportar PDF/Excel"],
    dataSource: ["fin_ledger_entries", "fin_chart_accounts"], actions: ["filtrar", "drill_down", "exportar"], permissions: ["view_dre"],
  },
  {
    id: "fluxo-caixa", name: "Fluxo de Caixa", route: "/controladoria/fluxo-caixa", type: "report",
    module: "Controladoria", description: "Fluxo de caixa realizado e projetado por data de caixa",
    components: ["Gráfico barras diário/semanal/mensal", "Tabela saldo por período", "Linha saldo projetado", "Filtros (conta, centro custo, período)", "Alerta saldo mínimo segurança", "Exportar PDF/Excel"],
    dataSource: ["fin_ledger_entries", "fin_payables", "fin_receivables", "company_settings"], actions: ["filtrar", "exportar"], permissions: ["view_cash_flow"],
  },
  {
    id: "projetos-financeiros-ctrl", name: "Projetos Financeiros — Controle", route: "/controladoria/projetos", type: "list",
    module: "Controladoria", description: "Rentabilidade por projeto com receita, custo e margem",
    components: ["ListView universal", "Indicadores: receita, custo, margem %", "Filtros (status, período)", "Badge margem (verde/amarelo/vermelho)"],
    dataSource: ["fin_projects", "fin_ledger_entries"], actions: ["ver_detalhes", "exportar"], permissions: ["view_project_profitability"],
  },
  {
    id: "classificacao-auto", name: "Classificação Automática", route: "/controladoria/classificacao", type: "config",
    module: "Controladoria", description: "Regras de sugestão automática de categoria por descrição",
    components: ["Lista regras de classificação", "Histórico de acertos", "Treino por feedback"],
    dataSource: ["fin_auto_classification_rules"], actions: ["criar_regra", "editar", "testar"], permissions: ["manage_classification"],
  },
];

// ══════════════════════════════════════════════════════════════════════
// GRUPO 9 — PLANEJAMENTO
// ══════════════════════════════════════════════════════════════════════

const PLANEJAMENTO_SCREENS: ScreenDefinition[] = [
  {
    id: "metas", name: "Metas", route: "/planejamento/metas", type: "list",
    module: "Planejamento", description: "Metas mensais de receita/despesa com % atingido",
    components: ["ListView universal", "Gauge chart % atingido", "Alertas visuais (vermelho <60%, amarelo <80%, verde ≥100%)", "Filtros (tipo, período, centro custo)"],
    dataSource: ["tendenci_goals"], actions: ["nova", "editar", "exportar"], permissions: ["view_goals"],
  },
  {
    id: "orcamento-planejamento", name: "Orçamento", route: "/planejamento/orcamento", type: "report",
    module: "Planejamento", description: "Planejamento orçamentário por categoria × mês",
    components: ["Tabela categoria × mês (previsto vs realizado)", "Indicador variação %", "Filtros (período, centro custo)"],
    dataSource: ["tendenci_budgets", "fin_ledger_entries"], actions: ["editar_previsto", "exportar"], permissions: ["view_budget"],
  },
];

// ══════════════════════════════════════════════════════════════════════
// GRUPO 10 — SISTEMA
// ══════════════════════════════════════════════════════════════════════

const SISTEMA_SCREENS: ScreenDefinition[] = [
  {
    id: "usuarios-list", name: "Usuários", route: "/sistema/usuarios", type: "list",
    module: "Sistema", description: "Gestão de usuários com perfil e status",
    components: ["ListView universal", "Badge perfil", "Badge status (ativo/inativo)"],
    dataSource: ["profiles"], actions: ["convidar", "editar", "desativar"], permissions: ["manage_users"],
  },
  {
    id: "perfis", name: "Perfis e Permissões", route: "/sistema/perfis", type: "config",
    module: "Sistema", description: "Configuração de perfis de acesso e permissões",
    components: ["Lista perfis", "Matriz de permissões por perfil (checkboxes)"],
    dataSource: ["user_roles", "fin_profile_permissions"], actions: ["editar", "criar_perfil"], permissions: ["manage_roles"],
  },
  {
    id: "regras-automacao", name: "Regras Automáticas", route: "/sistema/automacoes", type: "list",
    module: "Sistema", description: "Gestão de regras de automação evento-condição-ação",
    components: ["ListView universal", "Filtros (módulo, evento, status)", "Badge ativo/inativo", "Log últimas execuções"],
    dataSource: ["automation_rules", "automation_execution_logs"], actions: ["nova", "editar", "ativar", "desativar", "testar"], permissions: ["manage_automations"],
  },
  {
    id: "logs-auditoria", name: "Logs de Auditoria", route: "/sistema/auditoria", type: "list",
    module: "Sistema", description: "Registro imutável de alterações críticas",
    components: ["ListView universal", "Filtros (tabela, usuário, período, tipo evento)", "Detalhe diff (de/para)"],
    dataSource: ["audit_log"], actions: ["filtrar", "exportar"], permissions: ["view_audit"],
  },
  {
    id: "integracoes", name: "Integrações", route: "/sistema/integracoes", type: "config",
    module: "Sistema", description: "Configuração de integrações básicas (banco, email)",
    components: ["Lista integrações disponíveis", "Status conexão", "Configuração API keys"],
    dataSource: ["integrations"], actions: ["configurar", "testar", "desconectar"], permissions: ["manage_integrations"],
  },
];

// ══════════════════════════════════════════════════════════════════════
// GRUPO 11 — COMPONENTES TRANSVERSAIS (reutilizáveis)
// ══════════════════════════════════════════════════════════════════════

const TRANSVERSAL_SCREENS: ScreenDefinition[] = [
  {
    id: "comp-list-view", name: "ListView Universal", route: "-", type: "component",
    module: "Transversal", description: "Componente reutilizável de listagem com header, filtros, tabela, paginação, export e badges",
    components: ["Header (título, total, filtros ativos, ações)", "Filtros rápidos globais", "Tabela responsiva com ordenação", "Paginação / scroll virtual", "Seleção em massa", "Export CSV/Excel", "Badges contextuais"],
    dataSource: [], actions: [], permissions: [],
  },
  {
    id: "comp-form-view", name: "FormView Universal", route: "-", type: "component",
    module: "Transversal", description: "Componente reutilizável de formulário com seções, validação e auditoria",
    components: ["Header (nome, status, ações)", "Seções colapsáveis", "Validação em tempo real", "Campos obrigatórios visuais", "Barra lateral de resumo", "Auditoria (criado por, editado por)"],
    dataSource: [], actions: [], permissions: [],
  },
  {
    id: "comp-timeline", name: "Timeline Universal", route: "-", type: "component",
    module: "Transversal", description: "Histórico de eventos e comentários vinculado a qualquer entidade",
    components: ["Lista cronológica", "Comentários com menção @", "Eventos automáticos (status, criação)", "Anexos inline"],
    dataSource: [], actions: [], permissions: [],
  },
  {
    id: "comp-notificacoes", name: "Notificações", route: "-", type: "component",
    module: "Transversal", description: "Centro de notificações com badge e dropdown",
    components: ["Badge contador no header", "Dropdown com lista", "Marcar lida/todas lidas", "Link para registro origem"],
    dataSource: ["erp_notifications"], actions: [], permissions: [],
  },
  {
    id: "comp-upload-docs", name: "Upload de Documentos", route: "-", type: "component",
    module: "Transversal", description: "Componente de upload vinculado a qualquer entidade",
    components: ["Drag-and-drop zone", "Lista documentos com ícone tipo", "Preview inline (PDF/imagem)", "Download", "Excluir com confirmação"],
    dataSource: ["erp_documents"], actions: [], permissions: [],
  },
  {
    id: "comp-tags", name: "Tags", route: "-", type: "component",
    module: "Transversal", description: "Sistema de tags coloridas para qualquer entidade",
    components: ["Input com autocomplete", "Chips coloridos", "Filtro por tag"],
    dataSource: [], actions: [], permissions: [],
  },
  {
    id: "comp-filtros-salvos", name: "Filtros Salvos", route: "-", type: "component",
    module: "Transversal", description: "Persistência de combinações de filtros por usuário",
    components: ["Dropdown filtros salvos", "Salvar filtro atual", "Renomear/excluir filtro"],
    dataSource: ["user_saved_filters"], actions: [], permissions: [],
  },
];

// ══════════════════════════════════════════════════════════════════════
// CATÁLOGO COMPLETO
// ══════════════════════════════════════════════════════════════════════

export const SCREEN_CATALOG: ScreenDefinition[] = [
  ...DASHBOARD_SCREENS,
  ...CENTRAL_SCREENS,
  ...CADASTRO_SCREENS,
  ...COMERCIAL_SCREENS,
  ...COMPRAS_SCREENS,
  ...OPERACOES_SCREENS,
  ...FINANCEIRO_SCREENS,
  ...CONTROLADORIA_SCREENS,
  ...PLANEJAMENTO_SCREENS,
  ...SISTEMA_SCREENS,
  ...TRANSVERSAL_SCREENS,
];

export function getScreensByModule(module: string): ScreenDefinition[] {
  return SCREEN_CATALOG.filter((s) => s.module === module);
}

export function getScreensByType(type: ScreenType): ScreenDefinition[] {
  return SCREEN_CATALOG.filter((s) => s.type === type);
}

export function getScreenById(id: string): ScreenDefinition | undefined {
  return SCREEN_CATALOG.find((s) => s.id === id);
}

export const SCREEN_SUMMARY = {
  total: SCREEN_CATALOG.length,
  byModule: SCREEN_CATALOG.reduce<Record<string, number>>((acc, s) => {
    acc[s.module] = (acc[s.module] || 0) + 1;
    return acc;
  }, {}),
  byType: SCREEN_CATALOG.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {}),
};
