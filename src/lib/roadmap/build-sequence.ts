// ══════════════════════════════════════════════════════════════════════
// SEQUÊNCIA OFICIAL DE CONSTRUÇÃO DO ERP
// Ordem técnica baseada em dependência estrutural
// ══════════════════════════════════════════════════════════════════════

export interface BuildItem {
  id: string;
  name: string;
  type: "component" | "page" | "hook" | "migration" | "automation" | "integration" | "config";
  description: string;
  dependencies: string[];
  screens?: string[];        // IDs do screen-inventory
  entities?: string[];       // IDs do entity-catalog
  estimatedComplexity: "low" | "medium" | "high";
}

export interface BuildPhase {
  phase: number;
  name: string;
  objective: string;
  prerequisite: string | null;
  deliverables: string[];
  items: BuildItem[];
}

// ══════════════════════════════════════════════════════════════════════
// FASE 1 — FUNDAÇÃO DO SISTEMA
// Sem esta fase NADA mais funciona
// ══════════════════════════════════════════════════════════════════════

const FASE_1: BuildPhase = {
  phase: 1,
  name: "Fundação do Sistema",
  objective: "Base técnica: auth, multi-tenant, layout, componentes universais",
  prerequisite: null,
  deliverables: [
    "Login/signup funcional com email + Google",
    "Isolamento multi-tenant via RLS",
    "Layout base com sidebar, header, breadcrumb",
    "ListView e FormView reutilizáveis",
    "Máquina de status operacional",
    "Auditoria automática em todas as tabelas críticas",
  ],
  items: [
    // 1.1 — Auth
    { id: "f1-auth-pages", name: "Páginas de autenticação", type: "page",
      description: "Login, signup, forgot password, reset password, email verification",
      dependencies: [], screens: [], estimatedComplexity: "medium" },
    { id: "f1-auth-hook", name: "Hook useAuth + AuthProvider", type: "hook",
      description: "Context de autenticação, onAuthStateChange, session management",
      dependencies: ["f1-auth-pages"], estimatedComplexity: "medium" },
    { id: "f1-profiles-migration", name: "Tabela profiles + trigger auto-create", type: "migration",
      description: "profiles com full_name, email, profile_type, tenant_id, is_owner + trigger on signup",
      dependencies: ["f1-auth-pages"], estimatedComplexity: "medium" },
    { id: "f1-google-auth", name: "Google OAuth", type: "config",
      description: "Configurar provider Google no auth",
      dependencies: ["f1-auth-pages"], estimatedComplexity: "low" },

    // 1.2 — Multi-tenant
    { id: "f1-tenants-migration", name: "Tabela tenants + RLS base", type: "migration",
      description: "tenants, get_user_tenant_id(), set_tenant_id trigger, RLS RESTRICTIVE em todas as tabelas",
      dependencies: ["f1-profiles-migration"], estimatedComplexity: "high" },
    { id: "f1-tenant-hook", name: "Hook useTenant", type: "hook",
      description: "Provê tenant_id do usuário logado para queries",
      dependencies: ["f1-tenants-migration", "f1-auth-hook"], estimatedComplexity: "low" },

    // 1.3 — Perfis e permissões
    { id: "f1-roles-migration", name: "Tabela user_roles + has_role()", type: "migration",
      description: "user_roles com enum app_role, função has_role() SECURITY DEFINER",
      dependencies: ["f1-profiles-migration"], estimatedComplexity: "medium" },
    { id: "f1-permissions-hook", name: "Hook usePermissions", type: "hook",
      description: "Verifica perfil e permissões do usuário logado",
      dependencies: ["f1-roles-migration"], estimatedComplexity: "medium" },

    // 1.4 — Layout base
    { id: "f1-layout-shell", name: "Layout shell (sidebar + header + content)", type: "component",
      description: "AppSidebar responsiva, Header com avatar/notificações, Breadcrumb, Content area",
      dependencies: ["f1-auth-hook", "f1-permissions-hook"], screens: [], estimatedComplexity: "high" },
    { id: "f1-menu-adaptativo", name: "Menu adaptativo por perfil", type: "component",
      description: "Sidebar items filtrados por profile_type e permissões",
      dependencies: ["f1-layout-shell", "f1-permissions-hook"], estimatedComplexity: "medium" },
    { id: "f1-onboarding", name: "Wizard de onboarding", type: "page",
      description: "Configuração inicial: empresa, logo, regime fiscal, contas bancárias, convite usuários",
      dependencies: ["f1-layout-shell", "f1-tenants-migration"], estimatedComplexity: "high" },

    // 1.5 — Componentes universais
    { id: "f1-list-view", name: "ListView universal", type: "component",
      description: "Header, filtros rápidos, tabela ordenável, paginação, export, badges, seleção em massa",
      dependencies: [], screens: ["comp-list-view"], estimatedComplexity: "high" },
    { id: "f1-form-view", name: "FormView universal", type: "component",
      description: "Header com status e ações, seções colapsáveis, validação, barra lateral, auditoria",
      dependencies: [], screens: ["comp-form-view"], estimatedComplexity: "high" },
    { id: "f1-status-machine", name: "Máquina universal de status", type: "component",
      description: "StatusBadge, StatusTransitionSelect, StatusTimeline, engine de transições",
      dependencies: [], estimatedComplexity: "medium" },
    { id: "f1-timeline", name: "Timeline universal", type: "component",
      description: "Cronologia, comentários @mention, eventos automáticos, anexos",
      dependencies: [], screens: ["comp-timeline"], estimatedComplexity: "medium" },
    { id: "f1-upload-docs", name: "Upload de documentos", type: "component",
      description: "Drag-and-drop, preview, download, vínculo com qualquer entidade",
      dependencies: [], screens: ["comp-upload-docs"], estimatedComplexity: "medium" },
    { id: "f1-tags", name: "Sistema de tags", type: "component",
      description: "Autocomplete, chips coloridos, filtro",
      dependencies: [], screens: ["comp-tags"], estimatedComplexity: "low" },
    { id: "f1-filtros-salvos", name: "Filtros salvos", type: "component",
      description: "Persistência de filtros por usuário",
      dependencies: ["f1-list-view"], screens: ["comp-filtros-salvos"], estimatedComplexity: "low" },

    // 1.6 — Auditoria base
    { id: "f1-audit-migration", name: "Tabela audit_log + triggers", type: "migration",
      description: "audit_log com table_name, record_id, event_type, old/new value, user_id",
      dependencies: ["f1-tenants-migration"], estimatedComplexity: "medium" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// FASE 2 — CADASTROS MESTRES
// Dados de referência que alimentam todo o sistema
// ══════════════════════════════════════════════════════════════════════

const FASE_2: BuildPhase = {
  phase: 2,
  name: "Cadastros Mestres",
  objective: "Dados de referência: clientes, fornecedores, produtos, plano de contas",
  prerequisite: "Fase 1 completa",
  deliverables: [
    "CRUD completo de todas as entidades de cadastro",
    "Plano de contas hierárquico com seed padrão",
    "Contas bancárias com saldo inicial",
    "Tabela de preços e condições de pagamento",
  ],
  items: [
    { id: "f2-plano-contas", name: "Plano de contas + seed", type: "migration",
      description: "fin_chart_accounts hierárquico, seed das 6 raízes DRE, tela tree view",
      dependencies: ["f1-tenants-migration"], screens: ["plano-contas"],
      entities: ["plano_contas", "categoria"], estimatedComplexity: "high" },
    { id: "f2-centros-custo", name: "Centros de custo", type: "page",
      description: "CRUD com ListView + FormView universal",
      dependencies: ["f1-list-view", "f1-form-view"], screens: ["centros-custo-list"],
      entities: ["centro_custo"], estimatedComplexity: "low" },
    { id: "f2-contas-bancarias", name: "Contas bancárias", type: "page",
      description: "CRUD com saldo inicial e dados bancários",
      dependencies: ["f1-list-view", "f1-form-view"], screens: ["contas-bancarias-list"],
      entities: ["conta_bancaria"], estimatedComplexity: "medium" },
    { id: "f2-clientes", name: "Clientes PF/PJ", type: "page",
      description: "List + Form com dados fiscais, endereço (CEP auto), contato financeiro",
      dependencies: ["f1-list-view", "f1-form-view", "f1-upload-docs"], screens: ["clientes-list", "clientes-form"],
      entities: ["cliente"], estimatedComplexity: "high" },
    { id: "f2-fornecedores", name: "Fornecedores", type: "page",
      description: "List + Form com dados bancários e fiscais",
      dependencies: ["f1-list-view", "f1-form-view"], screens: ["fornecedores-list", "fornecedores-form"],
      entities: ["fornecedor"], estimatedComplexity: "medium" },
    { id: "f2-produtos", name: "Produtos / Matéria-prima / Serviços", type: "page",
      description: "List + Form com custos, preços, tipo (produto/serviço/insumo)",
      dependencies: ["f1-list-view", "f1-form-view"], screens: ["produtos-list", "produtos-form"],
      entities: ["produto"], estimatedComplexity: "medium" },
    { id: "f2-projetos-fin", name: "Projetos financeiros", type: "page",
      description: "CRUD de projetos financeiros com orçamento",
      dependencies: ["f1-list-view", "f1-form-view"], screens: ["projetos-list"],
      entities: ["projeto_financeiro"], estimatedComplexity: "low" },
    { id: "f2-condicoes-pagamento", name: "Condições de pagamento", type: "page",
      description: "Taxas cartão, boleto, prazos de carência",
      dependencies: ["f1-list-view"], screens: ["condicoes-pagamento"], estimatedComplexity: "medium" },
    { id: "f2-tabela-precos", name: "Tabela de preços", type: "page",
      description: "Preços por produto com edição inline",
      dependencies: ["f2-produtos"], screens: ["tabela-precos"], estimatedComplexity: "medium" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// FASE 3 — COMERCIAL
// Fluxo: Orçamento → Pedido → Contrato
// ══════════════════════════════════════════════════════════════════════

const FASE_3: BuildPhase = {
  phase: 3,
  name: "Comercial",
  objective: "Ciclo de venda: orçamento → pedido → contrato com automações",
  prerequisite: "Fase 2 completa (clientes, produtos, condições)",
  deliverables: [
    "Orçamento com itens e conversão em pedido",
    "Pedido completo com workflow de aprovação",
    "Contrato simples vinculado a pedido",
    "Automação: pedido aprovado → provisões + projeto financeiro",
  ],
  items: [
    { id: "f3-orcamentos", name: "Orçamentos", type: "page",
      description: "List + Form com itens editáveis, condição comercial, conversão em pedido",
      dependencies: ["f2-clientes", "f2-produtos", "f2-condicoes-pagamento"],
      screens: ["orcamentos-list", "orcamentos-form"], entities: ["orcamento"], estimatedComplexity: "high" },
    { id: "f3-pedidos", name: "Pedidos de venda", type: "page",
      description: "List + Form completo com itens, pagamento, centro custo, comissões, status workflow",
      dependencies: ["f2-clientes", "f2-produtos", "f2-centros-custo", "f2-condicoes-pagamento", "f1-status-machine"],
      screens: ["pedidos-list", "pedidos-form"], entities: ["pedido"], estimatedComplexity: "high" },
    { id: "f3-pedido-aprovacao", name: "Workflow aprovação pedido", type: "automation",
      description: "Aprovação simples com notificação, bloqueio de edição pós-aprovação",
      dependencies: ["f3-pedidos"], estimatedComplexity: "medium" },
    { id: "f3-contratos", name: "Contratos simples", type: "page",
      description: "List + Form vinculado a pedido e cliente",
      dependencies: ["f3-pedidos", "f2-clientes"],
      screens: ["contratos-list", "contratos-form"], entities: ["contrato"], estimatedComplexity: "medium" },
    { id: "f3-auto-provisoes", name: "Automação: pedido aprovado → provisões", type: "automation",
      description: "Trigger: gera compromissos sobre vendas (CP previsto) ao aprovar",
      dependencies: ["f3-pedidos"], estimatedComplexity: "high" },
    { id: "f3-auto-projeto", name: "Automação: pedido → projeto financeiro", type: "automation",
      description: "Cria PED-{numero} {cliente} automaticamente ao aprovar pedido",
      dependencies: ["f3-pedidos", "f2-projetos-fin"], estimatedComplexity: "medium" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// FASE 4 — OPERAÇÕES
// Fluxo: Pedido → Produção → Entrega → Liberação faturamento
// ══════════════════════════════════════════════════════════════════════

const FASE_4: BuildPhase = {
  phase: 4,
  name: "Operações",
  objective: "Execução operacional do pedido: produção → entrega → liberação",
  prerequisite: "Fase 3 completa (pedidos)",
  deliverables: [
    "Produção simplificada com etapas e status",
    "Entregas com registro e confirmação",
    "Ocorrências operacionais",
    "Integração pedido → produção → liberação faturamento",
  ],
  items: [
    { id: "f4-producao-migration", name: "Tabelas produção (OP + etapas)", type: "migration",
      description: "production_orders, production_phases com RLS e vínculo ao pedido",
      dependencies: ["f3-pedidos"], estimatedComplexity: "medium" },
    { id: "f4-producao-pages", name: "Produção — telas", type: "page",
      description: "List de OPs + Detalhe com etapas, status, timeline, checklist",
      dependencies: ["f4-producao-migration", "f1-status-machine"],
      screens: ["producao-list", "producao-form"], entities: ["ordem_producao", "etapa_producao"], estimatedComplexity: "high" },
    { id: "f4-entregas", name: "Entregas", type: "page",
      description: "List + registro com data, responsável, status",
      dependencies: ["f3-pedidos"], screens: ["entregas-list"],
      entities: ["entrega"], estimatedComplexity: "medium" },
    { id: "f4-ocorrencias", name: "Ocorrências", type: "page",
      description: "List + Form com tipo, severidade, vínculo entrega",
      dependencies: ["f4-entregas"], screens: ["ocorrencias-list"],
      entities: ["ocorrencia"], estimatedComplexity: "medium" },
    { id: "f4-integracao-pedido-op", name: "Integração pedido → produção", type: "automation",
      description: "Pedido aprovado cria OP automática ou manual. Status OP reflete no pedido",
      dependencies: ["f4-producao-pages", "f3-pedidos"], estimatedComplexity: "high" },
    { id: "f4-liberacao-faturamento", name: "Produção concluída → libera faturamento", type: "automation",
      description: "Conclusão da OP atualiza status do pedido para 'producao_concluida', habilitando faturamento",
      dependencies: ["f4-producao-pages", "f3-pedidos"], estimatedComplexity: "medium" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// FASE 5 — FINANCEIRO TRANSACIONAL
// Fluxo: CP/CR → Tesouraria → Extrato → Conciliação
// ══════════════════════════════════════════════════════════════════════

const FASE_5: BuildPhase = {
  phase: 5,
  name: "Financeiro Transacional",
  objective: "Controle financeiro completo com conciliação bancária",
  prerequisite: "Fase 3 completa (pedidos geram CR/CP)",
  deliverables: [
    "Contas a pagar e receber com classificação",
    "Tesouraria (Livro Razão) com sincronização bidirecional",
    "Importação de extrato OFX/CSV",
    "Conciliação bancária com match automático",
    "Automações: faturamento → CR, compromissos → CP",
  ],
  items: [
    { id: "f5-cp", name: "Contas a Pagar", type: "page",
      description: "List + Form com categoria, centro custo, projeto, vencimento, baixa",
      dependencies: ["f2-plano-contas", "f2-centros-custo", "f2-contas-bancarias", "f2-fornecedores"],
      screens: ["contas-pagar-list", "contas-pagar-form"], entities: ["conta_pagar"], estimatedComplexity: "high" },
    { id: "f5-cr", name: "Contas a Receber", type: "page",
      description: "List + Form com categoria, centro custo, projeto, vencimento, baixa",
      dependencies: ["f2-plano-contas", "f2-centros-custo", "f2-contas-bancarias", "f2-clientes"],
      screens: ["contas-receber-list", "contas-receber-form"], entities: ["conta_receber"], estimatedComplexity: "high" },
    { id: "f5-tesouraria", name: "Tesouraria (Livro Razão)", type: "page",
      description: "Lançamentos com data caixa/competência, sync bidirecional CP/CR",
      dependencies: ["f5-cp", "f5-cr"],
      screens: ["tesouraria"], entities: ["movimento_tesouraria"], estimatedComplexity: "high" },
    { id: "f5-extrato", name: "Extrato bancário + importação", type: "page",
      description: "Importação OFX/CSV, listagem de transações bancárias",
      dependencies: ["f2-contas-bancarias"],
      screens: ["extrato-bancario"], entities: ["lancamento_bancario"], estimatedComplexity: "high" },
    { id: "f5-conciliacao", name: "Conciliação bancária", type: "page",
      description: "Workspace split: extrato × títulos, match automático/manual",
      dependencies: ["f5-extrato", "f5-cp", "f5-cr"],
      screens: ["conciliacao"], entities: ["conciliacao"], estimatedComplexity: "high" },
    { id: "f5-auto-faturamento-cr", name: "Automação: faturamento → CR", type: "automation",
      description: "Pedido faturado gera contas a receber com parcelas",
      dependencies: ["f3-pedidos", "f5-cr"], estimatedComplexity: "high" },
    { id: "f5-auto-compra-cp", name: "Automação: compra → CP", type: "automation",
      description: "Pedido de compra aprovado gera contas a pagar",
      dependencies: ["f5-cp"], estimatedComplexity: "medium" },
    { id: "f5-auto-conciliacao-sugestao", name: "Automação: sugestão de conciliação", type: "automation",
      description: "Match automático por valor/data/descrição ao importar extrato",
      dependencies: ["f5-conciliacao"], estimatedComplexity: "high" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// FASE 6 — COMPRAS
// Fluxo: Solicitação → Pedido Compra → Recebimento → CP
// ══════════════════════════════════════════════════════════════════════

const FASE_6: BuildPhase = {
  phase: 6,
  name: "Compras",
  objective: "Ciclo de compras: solicitação → pedido → recebimento",
  prerequisite: "Fase 5 completa (CP funcional)",
  deliverables: [
    "Solicitação de compra com aprovação",
    "Pedido de compra com vínculo fornecedor",
    "Recebimento com conferência",
    "Integração compra → CP",
  ],
  items: [
    { id: "f6-solicitacao", name: "Solicitação de compra", type: "page",
      description: "List + Form com itens, justificativa, aprovação",
      dependencies: ["f2-produtos", "f1-status-machine"],
      screens: ["solicitacoes-compra-list", "solicitacoes-compra-form"], entities: ["solicitacao_compra"], estimatedComplexity: "medium" },
    { id: "f6-pedido-compra", name: "Pedido de compra", type: "page",
      description: "List + Form com fornecedor, itens, condição, aprovação → gera CP",
      dependencies: ["f2-fornecedores", "f2-produtos", "f5-cp"],
      screens: ["pedidos-compra-list", "pedidos-compra-form"], entities: ["pedido_compra"], estimatedComplexity: "high" },
    { id: "f6-recebimento", name: "Recebimento de compra", type: "page",
      description: "Conferência de itens recebidos, aceite, vínculo NF",
      dependencies: ["f6-pedido-compra"],
      screens: ["recebimentos-list"], entities: ["recebimento_compra"], estimatedComplexity: "medium" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// FASE 7 — CONTROLADORIA
// Dependente do financeiro transacional estar completo
// ══════════════════════════════════════════════════════════════════════

const FASE_7: BuildPhase = {
  phase: 7,
  name: "Controladoria",
  objective: "Visões gerenciais: DRE, fluxo de caixa, rentabilidade por projeto",
  prerequisite: "Fase 5 completa (tesouraria alimentada)",
  deliverables: [
    "DRE gerencial com 6 raízes e 5 linhas calculadas",
    "Fluxo de caixa com saldo projetado",
    "Rentabilidade por projeto financeiro",
    "Classificação automática básica",
  ],
  items: [
    { id: "f7-dre", name: "DRE gerencial", type: "page",
      description: "Tabela hierárquica por competência, linhas calculadas, comparativo, drill-down",
      dependencies: ["f5-tesouraria", "f2-plano-contas"],
      screens: ["dre-gerencial"], estimatedComplexity: "high" },
    { id: "f7-fluxo-caixa", name: "Fluxo de caixa", type: "page",
      description: "Gráfico + tabela por data caixa, saldo projetado, alerta saldo mínimo",
      dependencies: ["f5-tesouraria", "f5-cp", "f5-cr"],
      screens: ["fluxo-caixa"], estimatedComplexity: "high" },
    { id: "f7-projetos-ctrl", name: "Projetos financeiros — controle", type: "page",
      description: "Rentabilidade por projeto: receita, custo, margem %",
      dependencies: ["f2-projetos-fin", "f5-tesouraria"],
      screens: ["projetos-financeiros-ctrl"], estimatedComplexity: "medium" },
    { id: "f7-classificacao-auto", name: "Classificação automática básica", type: "page",
      description: "Regras por descrição → sugestão de categoria, aprendizado por feedback",
      dependencies: ["f2-plano-contas", "f5-tesouraria"],
      screens: ["classificacao-auto"], estimatedComplexity: "medium" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// FASE 8 — CENTRAL OPERACIONAL E DASHBOARD
// Precisa de dados de todos os módulos anteriores
// ══════════════════════════════════════════════════════════════════════

const FASE_8: BuildPhase = {
  phase: 8,
  name: "Central Operacional e Dashboard",
  objective: "Cockpit de execução diária e visão executiva consolidada",
  prerequisite: "Fases 3–7 completas (dados de todos os módulos)",
  deliverables: [
    "Central Operacional com tarefas, aprovações, agenda, alertas",
    "Dashboard Executivo com KPIs",
    "Sistema de notificações",
    "Tarefas vinculadas a entidades",
  ],
  items: [
    { id: "f8-notificacoes-migration", name: "Tabela notificações + sistema", type: "migration",
      description: "erp_notifications com badge, dropdown, marcar lida, link registro",
      dependencies: ["f1-tenants-migration"],
      screens: ["comp-notificacoes"], entities: ["notificacao"], estimatedComplexity: "medium" },
    { id: "f8-tarefas-migration", name: "Tabela tarefas + CRUD", type: "migration",
      description: "erp_tasks com vínculo a qualquer entidade, responsável, prazo, status",
      dependencies: ["f1-tenants-migration"],
      entities: ["tarefa"], estimatedComplexity: "medium" },
    { id: "f8-central", name: "Central Operacional", type: "page",
      description: "Pendências críticas, tarefas do dia, aprovações, agenda, alertas, atalhos",
      dependencies: ["f8-notificacoes-migration", "f8-tarefas-migration", "f5-cp", "f5-cr", "f4-producao-pages"],
      screens: ["central-operacional"], estimatedComplexity: "high" },
    { id: "f8-dashboard", name: "Dashboard Executivo", type: "page",
      description: "KPIs: receita, despesa, EBITDA, fluxo, vencidos, pedidos, produção, metas",
      dependencies: ["f5-tesouraria", "f3-pedidos", "f4-producao-pages", "f7-dre", "f7-fluxo-caixa"],
      screens: ["dashboard-executivo"], estimatedComplexity: "high" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// FASE 9 — PLANEJAMENTO
// ══════════════════════════════════════════════════════════════════════

const FASE_9: BuildPhase = {
  phase: 9,
  name: "Planejamento",
  objective: "Metas, orçamento e comparativo realizado × meta",
  prerequisite: "Fase 7 completa (DRE e fluxo de caixa)",
  deliverables: [
    "Metas mensais com % atingido e alertas visuais",
    "Orçamento por categoria × mês",
    "Comparativo previsto × realizado",
  ],
  items: [
    { id: "f9-metas", name: "Metas", type: "page",
      description: "CRUD metas mensais, gauge % atingido, alertas vermelho/amarelo/verde",
      dependencies: ["f7-dre", "f7-fluxo-caixa"],
      screens: ["metas"], entities: ["meta"], estimatedComplexity: "medium" },
    { id: "f9-orcamento", name: "Orçamento", type: "page",
      description: "Tabela categoria × mês, previsto × realizado, variação %",
      dependencies: ["f2-plano-contas", "f7-dre"],
      screens: ["orcamento-planejamento"], entities: ["orcamento_ctrl"], estimatedComplexity: "medium" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// FASE 10 — SISTEMA E GOVERNANÇA
// ══════════════════════════════════════════════════════════════════════

const FASE_10: BuildPhase = {
  phase: 10,
  name: "Sistema e Governança",
  objective: "Administração avançada, automações, auditoria, integrações",
  prerequisite: "Fases 1–9 completas",
  deliverables: [
    "Gestão de usuários e perfis",
    "Regras automáticas avançadas com gestão visual",
    "Workflow de aprovação configurável",
    "Logs de auditoria consultáveis",
    "Integrações básicas",
  ],
  items: [
    { id: "f10-usuarios", name: "Gestão de usuários", type: "page",
      description: "List com perfil, status, convite, desativação",
      dependencies: ["f1-roles-migration"],
      screens: ["usuarios-list"], entities: ["usuario"], estimatedComplexity: "medium" },
    { id: "f10-perfis-config", name: "Configuração de perfis e permissões", type: "page",
      description: "Matriz de permissões por perfil",
      dependencies: ["f1-roles-migration", "f1-permissions-hook"],
      screens: ["perfis"], entities: ["perfil"], estimatedComplexity: "medium" },
    { id: "f10-regras-auto", name: "Gestão de regras automáticas", type: "page",
      description: "CRUD de regras evento-condição-ação, log de execuções, teste/simulação",
      dependencies: ["f1-tenants-migration"],
      screens: ["regras-automacao"], entities: ["regra_automatica"], estimatedComplexity: "high" },
    { id: "f10-logs-auditoria", name: "Logs de auditoria consultáveis", type: "page",
      description: "List com filtros por tabela, usuário, período, diff de/para",
      dependencies: ["f1-audit-migration"],
      screens: ["logs-auditoria"], entities: ["auditoria"], estimatedComplexity: "medium" },
    { id: "f10-integracoes", name: "Integrações básicas", type: "page",
      description: "Config de integrações (banco, email), status conexão",
      dependencies: ["f1-tenants-migration"],
      screens: ["integracoes"], estimatedComplexity: "medium" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// EXPORTAÇÕES
// ══════════════════════════════════════════════════════════════════════

export const BUILD_SEQUENCE: BuildPhase[] = [
  FASE_1, FASE_2, FASE_3, FASE_4, FASE_5, FASE_6, FASE_7, FASE_8, FASE_9, FASE_10,
];

export function getPhase(n: number): BuildPhase | undefined {
  return BUILD_SEQUENCE.find((p) => p.phase === n);
}

export function getAllItems(): BuildItem[] {
  return BUILD_SEQUENCE.flatMap((p) => p.items);
}

export function getItemDependencyChain(itemId: string): BuildItem[] {
  const all = getAllItems();
  const item = all.find((i) => i.id === itemId);
  if (!item) return [];
  const deps: BuildItem[] = [];
  for (const depId of item.dependencies) {
    const dep = all.find((i) => i.id === depId);
    if (dep) {
      deps.push(...getItemDependencyChain(dep.id), dep);
    }
  }
  return Array.from(new Map(deps.map((d) => [d.id, d] as [string, BuildItem])).values());
}

export const BUILD_SUMMARY = {
  totalPhases: BUILD_SEQUENCE.length,
  totalItems: getAllItems().length,
  byPhase: BUILD_SEQUENCE.map((p) => ({
    phase: p.phase,
    name: p.name,
    items: p.items.length,
    highComplexity: p.items.filter((i) => i.estimatedComplexity === "high").length,
  })),
};
