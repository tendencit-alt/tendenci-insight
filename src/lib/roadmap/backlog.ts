// ══════════════════════════════════════════════════════════════════════
// BACKLOG OFICIAL DE DESENVOLVIMENTO — MVP
// Sprints sequenciais baseados em dependência estrutural
// ══════════════════════════════════════════════════════════════════════

export type TaskStatus = "backlog" | "ready" | "in_progress" | "review" | "done";
export type TaskPriority = "critical" | "high" | "medium" | "low";

export interface DevTask {
  id: string;
  title: string;
  type: "migration" | "component" | "page" | "hook" | "automation" | "config" | "integration";
  priority: TaskPriority;
  description: string;
  acceptanceCriteria: string[];
  dependencies: string[];
  estimatedHours: number;
  screens?: string[];
  entities?: string[];
}

export interface Sprint {
  id: string;
  number: number;
  name: string;
  objective: string;
  prerequisite: string | null;
  totalEstimatedHours: number;
  tasks: DevTask[];
}

// ══════════════════════════════════════════════════════════════════════
// SPRINT 1 — FUNDAÇÃO
// ══════════════════════════════════════════════════════════════════════

const SPRINT_1: Sprint = {
  id: "sprint-1",
  number: 1,
  name: "Fundação do Sistema",
  objective: "Auth, multi-tenant, layout, componentes universais, auditoria",
  prerequisite: null,
  totalEstimatedHours: 0,
  tasks: [
    // ── Auth ──
    {
      id: "s1-01", title: "Criar tabela profiles + trigger auto-create", type: "migration", priority: "critical",
      description: "Tabela profiles (full_name, email, avatar_url, profile_type, tenant_id, is_owner) com trigger que cria profile automaticamente no signup",
      acceptanceCriteria: [
        "Tabela profiles existe com RLS",
        "Trigger on_auth_user_created cria profile",
        "profile_type tem enum (admin, financeiro, comercial, operacional)",
      ],
      dependencies: [], estimatedHours: 4,
    },
    {
      id: "s1-02", title: "Criar tabela tenants + funções auxiliares", type: "migration", priority: "critical",
      description: "Tabela tenants, função get_user_tenant_id(), trigger set_tenant_id, RLS RESTRICTIVE base",
      acceptanceCriteria: [
        "Tabela tenants existe",
        "get_user_tenant_id() retorna tenant do auth.uid()",
        "Trigger set_tenant_id funciona em insert",
        "Política RLS RESTRICTIVE ativa",
      ],
      dependencies: ["s1-01"], estimatedHours: 6,
    },
    {
      id: "s1-03", title: "Criar tabela user_roles + has_role()", type: "migration", priority: "critical",
      description: "user_roles com app_role enum, função has_role() SECURITY DEFINER",
      acceptanceCriteria: [
        "Tabela user_roles com RLS",
        "has_role(user_id, role) funciona sem recursão",
        "Roles separados da tabela profiles",
      ],
      dependencies: ["s1-01"], estimatedHours: 3,
    },
    {
      id: "s1-04", title: "Criar tabela audit_log + trigger genérico", type: "migration", priority: "high",
      description: "audit_log com table_name, record_id, event_type, event_source, old/new_value, user_id, tenant_id",
      acceptanceCriteria: [
        "Tabela audit_log existe com RLS",
        "Função genérica de auditoria reutilizável",
        "Registra INSERT, UPDATE, DELETE",
      ],
      dependencies: ["s1-02"], estimatedHours: 4,
    },
    {
      id: "s1-05", title: "Criar tabela company_settings", type: "migration", priority: "high",
      description: "company_settings com company_name, cnpj, logo_url, primary_color, accent_color, tax_regime, tenant_id",
      acceptanceCriteria: [
        "Tabela existe com RLS por tenant",
        "Suporta dados fiscais e branding",
      ],
      dependencies: ["s1-02"], estimatedHours: 2,
    },
    {
      id: "s1-06", title: "Implementar páginas de autenticação", type: "page", priority: "critical",
      description: "Login, signup, forgot password, reset password (/reset-password), email verification",
      acceptanceCriteria: [
        "Login com email/senha funcional",
        "Signup cria profile automaticamente",
        "Forgot password envia email",
        "Reset password em /reset-password funcional",
        "Redirect correto após login",
      ],
      dependencies: ["s1-01"], estimatedHours: 8,
    },
    {
      id: "s1-07", title: "Configurar Google OAuth", type: "config", priority: "high",
      description: "Habilitar provider Google na autenticação",
      acceptanceCriteria: [
        "Botão 'Entrar com Google' funcional",
        "Profile criado automaticamente via Google",
      ],
      dependencies: ["s1-06"], estimatedHours: 2,
    },
    {
      id: "s1-08", title: "Criar hook useAuth + AuthProvider", type: "hook", priority: "critical",
      description: "Context de auth com onAuthStateChange, session, user, profile, loading, signOut",
      acceptanceCriteria: [
        "onAuthStateChange configurado ANTES de getSession",
        "user e profile acessíveis via context",
        "signOut redireciona para login",
        "Loading state enquanto verifica sessão",
      ],
      dependencies: ["s1-06"], estimatedHours: 4,
    },
    {
      id: "s1-09", title: "Criar hook useTenant", type: "hook", priority: "critical",
      description: "Provê tenant_id do usuário logado, loading e error state",
      acceptanceCriteria: [
        "tenant_id disponível em toda a app",
        "Usado em queries para filtro por tenant",
      ],
      dependencies: ["s1-02", "s1-08"], estimatedHours: 2,
    },
    {
      id: "s1-10", title: "Criar hook usePermissions", type: "hook", priority: "high",
      description: "Verifica profile_type e roles do usuário logado, expõe hasPermission(key)",
      acceptanceCriteria: [
        "hasPermission('view_financial') funcional",
        "hasRole('admin') funcional",
        "Cache de permissões do usuário",
      ],
      dependencies: ["s1-03", "s1-08"], estimatedHours: 4,
    },
    {
      id: "s1-11", title: "Criar hook useCompanySettings", type: "hook", priority: "medium",
      description: "Busca e cache (10min) de company_settings do tenant, expõe logo, cores, nome",
      acceptanceCriteria: [
        "Dados de empresa acessíveis em toda a app",
        "Cache de 10 minutos",
        "Fallback para valores padrão",
      ],
      dependencies: ["s1-05", "s1-09"], estimatedHours: 2,
    },

    // ── Layout ──
    {
      id: "s1-12", title: "Criar layout shell (sidebar + header + content)", type: "component", priority: "critical",
      description: "AppSidebar responsiva com collapse, Header com avatar/notificações, Breadcrumb automático, Content area com scroll",
      acceptanceCriteria: [
        "Sidebar colapsa em mobile",
        "Header mostra avatar e nome do usuário",
        "Breadcrumb automático baseado na rota",
        "Content area com scroll independente",
        "Branding dinâmico via company_settings",
      ],
      dependencies: ["s1-08", "s1-11"], estimatedHours: 12,
    },
    {
      id: "s1-13", title: "Criar menu adaptativo por perfil", type: "component", priority: "high",
      description: "Sidebar items filtrados por profile_type e permissões do usuário",
      acceptanceCriteria: [
        "Admin vê todos os menus",
        "Comercial vê apenas menus comerciais",
        "Financeiro vê apenas menus financeiros",
        "Items sem permissão não aparecem",
      ],
      dependencies: ["s1-12", "s1-10"], estimatedHours: 4,
    },

    // ── Componentes universais ──
    {
      id: "s1-14", title: "Criar ListView universal", type: "component", priority: "critical",
      description: "Componente reutilizável: header (título, total, filtros ativos, ações), filtros rápidos, tabela ordenável, paginação, export CSV, badges, seleção em massa",
      acceptanceCriteria: [
        "Aceita config genérica de colunas",
        "Filtros rápidos com chips ativos",
        "Ordenação por qualquer coluna",
        "Paginação com 25/50/100 por página",
        "Export CSV funcional",
        "Seleção em massa com ações",
        "Badge configurável por coluna",
        "Responsivo em mobile (cards)",
      ],
      dependencies: [], estimatedHours: 16,
    },
    {
      id: "s1-15", title: "Criar FormView universal", type: "component", priority: "critical",
      description: "Componente reutilizável: header (nome, status, ações), seções colapsáveis, validação tempo real, campos obrigatórios visuais, barra lateral resumo, auditoria (criado por, editado por)",
      acceptanceCriteria: [
        "Header com StatusBadge e botões de ação",
        "Seções colapsáveis com ícone",
        "Validação inline com mensagem de erro",
        "Indicador visual de campo obrigatório",
        "Barra lateral com resumo do registro",
        "Footer com info de criação/edição",
        "Suporte a modo edição/visualização",
      ],
      dependencies: [], estimatedHours: 14,
    },
    {
      id: "s1-16", title: "Criar máquina universal de status", type: "component", priority: "high",
      description: "StatusBadge (cores padrão), StatusTransitionSelect (transições permitidas), StatusTimeline, engine com canTransition() e log",
      acceptanceCriteria: [
        "StatusBadge renderiza com cor correta por status",
        "Select mostra apenas transições permitidas",
        "Transição registra log no audit_log",
        "Bloqueio de transições inválidas",
        "Configurável por tipo de entidade",
      ],
      dependencies: [], estimatedHours: 8,
    },
    {
      id: "s1-17", title: "Criar Timeline universal", type: "component", priority: "high",
      description: "Lista cronológica, comentários com @mention, eventos automáticos, anexos inline",
      acceptanceCriteria: [
        "Mostra eventos em ordem cronológica",
        "Suporta comentários com @mention",
        "Diferencia eventos automáticos de manuais",
        "Suporta anexos inline",
        "Vinculável a qualquer entidade",
      ],
      dependencies: [], estimatedHours: 8,
    },
    {
      id: "s1-18", title: "Criar componente Upload de documentos", type: "component", priority: "high",
      description: "Drag-and-drop, preview PDF/imagem, download, excluir, vínculo com qualquer entidade via erp_documents",
      acceptanceCriteria: [
        "Drag-and-drop zone funcional",
        "Preview inline para PDF e imagens",
        "Download direto",
        "Excluir com confirmação",
        "Vincula a entity_id + entity_table",
        "Mostra ícone por tipo de arquivo",
      ],
      dependencies: [], estimatedHours: 8,
    },
    {
      id: "s1-19", title: "Criar sistema de tags", type: "component", priority: "low",
      description: "Input com autocomplete, chips coloridos, filtro por tag",
      acceptanceCriteria: [
        "Autocomplete de tags existentes",
        "Chips com cor configurável",
        "Criar nova tag inline",
      ],
      dependencies: [], estimatedHours: 4,
    },
    {
      id: "s1-20", title: "Criar filtros salvos", type: "component", priority: "low",
      description: "Persistência de combinações de filtros por usuário no localStorage ou DB",
      acceptanceCriteria: [
        "Salvar filtro atual com nome",
        "Dropdown para selecionar filtro salvo",
        "Renomear e excluir filtro",
      ],
      dependencies: ["s1-14"], estimatedHours: 4,
    },
    {
      id: "s1-21", title: "Criar wizard de onboarding", type: "page", priority: "medium",
      description: "Wizard passo-a-passo: dados empresa → logo → regime fiscal → contas bancárias → convite usuários",
      acceptanceCriteria: [
        "Steps com progresso visual",
        "Dados salvos em company_settings",
        "Seed do plano de contas padrão",
        "Marcação onboarding_completed",
        "Redirect para dashboard após conclusão",
      ],
      dependencies: ["s1-05", "s1-12"], estimatedHours: 10,
    },
  ],
};

// Calcular total horas
SPRINT_1.totalEstimatedHours = SPRINT_1.tasks.reduce((s, t) => s + t.estimatedHours, 0);

// ══════════════════════════════════════════════════════════════════════
// SPRINT 2 — CADASTROS MESTRES
// ══════════════════════════════════════════════════════════════════════

const SPRINT_2: Sprint = {
  id: "sprint-2",
  number: 2,
  name: "Cadastros Mestres",
  objective: "Dados de referência que alimentam todo o sistema",
  prerequisite: "Sprint 1 completo",
  totalEstimatedHours: 0,
  tasks: [
    {
      id: "s2-01", title: "Criar plano de contas hierárquico + seed DRE", type: "migration", priority: "critical",
      description: "fin_chart_accounts com code, name, type, parent_id, level (até 9), is_leaf, RLS. Seed das 6 raízes DRE no onboarding",
      acceptanceCriteria: [
        "Tabela com hierarquia até 9 níveis",
        "Seed automático com 6 raízes DRE",
        "RLS por tenant_id",
        "Função para validar hierarquia",
      ],
      dependencies: ["s1-02"], estimatedHours: 6,
    },
    {
      id: "s2-02", title: "Criar tela Plano de Contas (TreeView)", type: "page", priority: "critical",
      description: "Árvore hierárquica interativa com expand/collapse, filtros, drag-and-drop reordenação, badges tipo",
      acceptanceCriteria: [
        "TreeView com expand/collapse",
        "Filtro por tipo e nível",
        "Criar nova conta filha inline",
        "Editar conta inline",
        "Badge tipo (receita/despesa/resultado)",
        "Ativar/desativar conta",
      ],
      dependencies: ["s2-01", "s1-14"], screens: ["plano-contas"], estimatedHours: 10,
    },
    {
      id: "s2-03", title: "Criar CRUD Centros de Custo", type: "page", priority: "high",
      description: "List + form simples com nome, cor, status ativo/inativo",
      acceptanceCriteria: [
        "ListView com badge ativo/inativo",
        "Form com nome e cor",
        "Ativar/desativar",
      ],
      dependencies: ["s1-14", "s1-15"], screens: ["centros-custo-list"], estimatedHours: 3,
    },
    {
      id: "s2-04", title: "Criar CRUD Contas Bancárias", type: "page", priority: "high",
      description: "List + form com banco, agência, conta, tipo, saldo inicial",
      acceptanceCriteria: [
        "ListView com indicador saldo",
        "Form com dados bancários completos",
        "Saldo inicial configurável",
      ],
      dependencies: ["s1-14", "s1-15"], screens: ["contas-bancarias-list"], estimatedHours: 4,
    },
    {
      id: "s2-05", title: "Criar CRUD Clientes PF/PJ", type: "page", priority: "critical",
      description: "List com busca/filtros + Form com dados principais, endereço (CEP auto), dados fiscais, contato financeiro, timeline, documentos",
      acceptanceCriteria: [
        "ListView com filtro tipo pessoa, cidade, status",
        "Busca por nome, CPF/CNPJ",
        "Form com seções: dados, endereço, fiscal, contato",
        "Busca CEP automática (ViaCEP)",
        "Máscara CPF/CNPJ automática",
        "Timeline de interações",
        "Upload de documentos vinculado",
      ],
      dependencies: ["s1-14", "s1-15", "s1-17", "s1-18"], screens: ["clientes-list", "clientes-form"], estimatedHours: 14,
    },
    {
      id: "s2-06", title: "Criar CRUD Fornecedores", type: "page", priority: "high",
      description: "List + Form com dados principais, dados bancários, dados fiscais",
      acceptanceCriteria: [
        "ListView com filtros categoria e cidade",
        "Form com seção dados bancários",
        "Form com seção dados fiscais",
      ],
      dependencies: ["s1-14", "s1-15"], screens: ["fornecedores-list", "fornecedores-form"], estimatedHours: 8,
    },
    {
      id: "s2-07", title: "Criar CRUD Produtos / Serviços", type: "page", priority: "high",
      description: "List + Form com tipo (produto/serviço/insumo), custos, preços, categoria",
      acceptanceCriteria: [
        "ListView com filtro tipo e categoria",
        "Badge tipo (produto/serviço/insumo)",
        "Form com seção custos e preços",
        "Duplicar produto",
      ],
      dependencies: ["s1-14", "s1-15"], screens: ["produtos-list", "produtos-form"], estimatedHours: 8,
    },
    {
      id: "s2-08", title: "Criar CRUD Projetos Financeiros", type: "page", priority: "medium",
      description: "List + form com nome, orçamento, status, vínculo pedido",
      acceptanceCriteria: [
        "ListView com badge status",
        "Indicador orçamento consumido %",
        "Form simples",
      ],
      dependencies: ["s1-14", "s1-15"], screens: ["projetos-list"], estimatedHours: 4,
    },
    {
      id: "s2-09", title: "Criar configuração Condições de Pagamento", type: "page", priority: "medium",
      description: "Taxas cartão por parcela, taxas boleto por carência, configuração PIX",
      acceptanceCriteria: [
        "Edição inline de taxas por parcela",
        "Separação boleto × cartão × PIX",
        "Badge tipo pagamento",
      ],
      dependencies: ["s1-14"], screens: ["condicoes-pagamento"], estimatedHours: 6,
    },
    {
      id: "s2-10", title: "Criar Tabela de Preços", type: "page", priority: "low",
      description: "Preços por produto com edição inline, filtro por categoria",
      acceptanceCriteria: [
        "Edição inline de preço",
        "Filtro por categoria",
        "Import/export CSV",
      ],
      dependencies: ["s2-07"], screens: ["tabela-precos"], estimatedHours: 6,
    },
  ],
};

SPRINT_2.totalEstimatedHours = SPRINT_2.tasks.reduce((s, t) => s + t.estimatedHours, 0);

// ══════════════════════════════════════════════════════════════════════
// SPRINT 3 — COMERCIAL
// ══════════════════════════════════════════════════════════════════════

const SPRINT_3: Sprint = {
  id: "sprint-3",
  number: 3,
  name: "Comercial",
  objective: "Ciclo de venda: orçamento → pedido → contrato + automações",
  prerequisite: "Sprint 2 completo",
  totalEstimatedHours: 0,
  tasks: [
    {
      id: "s3-01", title: "Criar telas de Orçamento (list + form)", type: "page", priority: "high",
      description: "List com filtros e badges + Form com itens editáveis (tabela dinâmica), condição comercial, validade, preview PDF, conversão em pedido",
      acceptanceCriteria: [
        "ListView com filtro status, vendedor, período, cliente",
        "Badge status (rascunho, enviado, aprovado, convertido)",
        "Form com tabela editável de itens (add/remove/reorder)",
        "Cálculo automático de subtotal e total",
        "Seleção de condição de pagamento",
        "Campo validade",
        "Botão converter em pedido",
        "Indicador valor total no topo",
      ],
      dependencies: ["s2-05", "s2-07", "s2-09", "s1-16"], screens: ["orcamentos-list", "orcamentos-form"], estimatedHours: 16,
    },
    {
      id: "s3-02", title: "Criar telas de Pedido (list + form)", type: "page", priority: "critical",
      description: "List com filtros e indicadores + Form completo com itens, pagamento, centro custo, projeto, comissões, status workflow, timeline, documentos, vínculos",
      acceptanceCriteria: [
        "ListView com filtros: status, vendedor, período, cliente, centro custo",
        "Indicadores no topo: total, aprovados, em produção, faturados",
        "Badge status colorido por etapa",
        "Form com tabela editável de itens",
        "Seleção vendedor (obrigatório)",
        "Seleção centro custo (obrigatório)",
        "Seleção condição pagamento",
        "Cálculo automático valor líquido com taxas",
        "StatusTransitionSelect com workflow completo",
        "Timeline com histórico de alterações",
        "Upload de documentos",
        "Seção vínculos (produção, financeiro, contrato)",
        "Bloqueio de edição estrutural após aprovação",
      ],
      dependencies: ["s2-05", "s2-07", "s2-03", "s2-09", "s1-16", "s1-17", "s1-18"],
      screens: ["pedidos-list", "pedidos-form"], estimatedHours: 24,
    },
    {
      id: "s3-03", title: "Criar workflow de aprovação do pedido", type: "automation", priority: "high",
      description: "Aprovação simples: vendedor submete → admin/gestor aprova. Notificação ao aprovador. Bloqueio edição pós-aprovação",
      acceptanceCriteria: [
        "Transição rascunho → aguardando_aprovação apenas pelo vendedor",
        "Transição aguardando_aprovação → aprovado apenas por admin/gestor",
        "Notificação criada para o aprovador",
        "Campos estruturais bloqueados após aprovação",
        "Log de aprovação no audit_log",
      ],
      dependencies: ["s3-02"], estimatedHours: 8,
    },
    {
      id: "s3-04", title: "Criar automação: pedido aprovado → provisões financeiras", type: "automation", priority: "critical",
      description: "Trigger ao aprovar pedido: gera compromissos sobre vendas (CP provisionado) baseado no rateio dos itens",
      acceptanceCriteria: [
        "Ao aprovar, gera lançamentos CP provisionados",
        "Rateio por item do pedido",
        "Categoria vinculada a 'Despesas sobre Vendas'",
        "Centro custo herdado do pedido",
        "Comissões calculadas e provisionadas",
      ],
      dependencies: ["s3-02"], estimatedHours: 10,
    },
    {
      id: "s3-05", title: "Criar automação: pedido → projeto financeiro", type: "automation", priority: "high",
      description: "Ao aprovar pedido, cria projeto financeiro PED-{order_number} {nome_cliente} com orçamento = valor pedido",
      acceptanceCriteria: [
        "Projeto criado automaticamente ao aprovar",
        "Nome no formato PED-{numero} {cliente}",
        "Orçamento = valor do pedido",
        "Centro custo e vendedor herdados",
        "Vínculo bidirecional pedido ↔ projeto",
      ],
      dependencies: ["s3-02", "s2-08"], estimatedHours: 4,
    },
    {
      id: "s3-06", title: "Criar telas de Contrato simples (list + form)", type: "page", priority: "medium",
      description: "List com filtros + Form com vínculo a pedido e cliente, status, valor, documentos",
      acceptanceCriteria: [
        "ListView com filtro status, cliente, tipo",
        "Badge status",
        "Form com seleção de pedido e cliente",
        "Upload de documento do contrato",
        "Timeline",
      ],
      dependencies: ["s3-02", "s2-05"], screens: ["contratos-list", "contratos-form"], estimatedHours: 8,
    },
  ],
};

SPRINT_3.totalEstimatedHours = SPRINT_3.tasks.reduce((s, t) => s + t.estimatedHours, 0);

// ══════════════════════════════════════════════════════════════════════
// SPRINT 4 — OPERAÇÕES
// ══════════════════════════════════════════════════════════════════════

const SPRINT_4: Sprint = {
  id: "sprint-4",
  number: 4,
  name: "Operações",
  objective: "Produção → entrega → liberação faturamento integrado ao pedido",
  prerequisite: "Sprint 3 completo",
  totalEstimatedHours: 0,
  tasks: [
    {
      id: "s4-01", title: "Criar tabelas produção (OP + etapas + tipos)", type: "migration", priority: "critical",
      description: "production_orders (order_id, status, dates), production_phases (order_id, phase_type_id, status, sequence), production_types com RLS",
      acceptanceCriteria: [
        "Tabelas com RLS por tenant",
        "FK para orders",
        "Status machine configurada para OP",
        "Trigger auditoria",
      ],
      dependencies: ["s3-02"], estimatedHours: 6,
    },
    {
      id: "s4-02", title: "Criar telas Produção (list + detalhe)", type: "page", priority: "critical",
      description: "List de OPs com filtros e indicadores + Detalhe com etapas, status individual, timeline, pedido vinculado",
      acceptanceCriteria: [
        "ListView com filtros: status, pedido, responsável, período",
        "Indicadores: aguardando, em produção, concluídas",
        "Badge status colorido",
        "Detalhe: lista etapas com progress bar",
        "Cada etapa com status individual atualizável",
        "StatusTransitionSelect na OP",
        "Timeline com eventos de etapa",
        "Link direto para o pedido",
      ],
      dependencies: ["s4-01", "s1-14", "s1-16", "s1-17"],
      screens: ["producao-list", "producao-form"], estimatedHours: 16,
    },
    {
      id: "s4-03", title: "Criar integração pedido → produção", type: "automation", priority: "high",
      description: "Pedido aprovado permite criação de OP (manual ou automática). Status da OP reflete no pedido",
      acceptanceCriteria: [
        "Botão 'Criar OP' no pedido aprovado",
        "OP herda itens do pedido",
        "Status OP atualiza status pedido (em_producao, producao_concluida)",
        "Cross-module event registrado",
      ],
      dependencies: ["s4-02", "s3-02"], estimatedHours: 8,
    },
    {
      id: "s4-04", title: "Criar telas Entregas (list + form)", type: "page", priority: "medium",
      description: "List + form com data, responsável, status, vínculo com pedido/projeto",
      acceptanceCriteria: [
        "ListView com filtros status e período",
        "Badge status (programada, em trânsito, entregue)",
        "Form com data e responsável",
        "Confirmação de entrega",
      ],
      dependencies: ["s3-02", "s1-14"], screens: ["entregas-list"], estimatedHours: 6,
    },
    {
      id: "s4-05", title: "Criar telas Ocorrências (list + form)", type: "page", priority: "medium",
      description: "List + form com tipo, severidade, descrição, vínculo entrega",
      acceptanceCriteria: [
        "ListView com filtros severidade e tipo",
        "Badge severidade (baixa/média/alta/crítica)",
        "Form com descrição e tipo",
        "Vínculo com entrega e pedido",
      ],
      dependencies: ["s4-04", "s1-14"], screens: ["ocorrencias-list"], estimatedHours: 6,
    },
    {
      id: "s4-06", title: "Criar automação: produção concluída → liberação faturamento", type: "automation", priority: "critical",
      description: "Conclusão de todas as etapas da OP muda status pedido para producao_concluida, habilitando transição para faturado",
      acceptanceCriteria: [
        "Ao concluir última etapa, OP muda para concluida",
        "Pedido muda para producao_concluida automaticamente",
        "Transição 'faturar' habilitada no pedido",
        "Notificação ao comercial/financeiro",
        "Cross-module event registrado",
      ],
      dependencies: ["s4-02", "s3-02"], estimatedHours: 6,
    },
  ],
};

SPRINT_4.totalEstimatedHours = SPRINT_4.tasks.reduce((s, t) => s + t.estimatedHours, 0);

// ══════════════════════════════════════════════════════════════════════
// SPRINT 5 — FINANCEIRO TRANSACIONAL
// ══════════════════════════════════════════════════════════════════════

const SPRINT_5: Sprint = {
  id: "sprint-5",
  number: 5,
  name: "Financeiro Transacional",
  objective: "CP/CR → Tesouraria → Extrato → Conciliação + automações",
  prerequisite: "Sprint 3 completo (pedidos geram provisões)",
  totalEstimatedHours: 0,
  tasks: [
    {
      id: "s5-01", title: "Criar tabelas financeiras (payables, receivables, ledger, bank)", type: "migration", priority: "critical",
      description: "fin_payables, fin_receivables, fin_ledger_entries (competence_date + cash_date), fin_bank_transactions, fin_bank_accounts, fin_reconciliations com RLS",
      acceptanceCriteria: [
        "Todas as tabelas com RLS por tenant",
        "Ledger com competence_date E cash_date",
        "Sync bidirecional CP/CR ↔ Ledger via trigger",
        "Triggers de auditoria",
      ],
      dependencies: ["s1-02", "s2-01", "s2-03", "s2-04"], estimatedHours: 10,
    },
    {
      id: "s5-02", title: "Criar telas Contas a Pagar (list + form)", type: "page", priority: "critical",
      description: "List com filtros e indicadores + Form com classificação (categoria, centro custo, projeto), vencimento, baixa, documentos",
      acceptanceCriteria: [
        "ListView com filtros: status, vencimento, fornecedor, centro custo, projeto",
        "Indicadores: total a vencer, vencido, pago no mês",
        "Badge status (provisionado, confirmado, vencido, pago, conciliado)",
        "Form com seção classificação completa",
        "Ação 'Baixar' com data e conta bancária",
        "Baixa gera lançamento no razão automaticamente",
        "Upload comprovante",
      ],
      dependencies: ["s5-01", "s2-01", "s2-03", "s2-06", "s1-14", "s1-15"],
      screens: ["contas-pagar-list", "contas-pagar-form"], estimatedHours: 16,
    },
    {
      id: "s5-03", title: "Criar telas Contas a Receber (list + form)", type: "page", priority: "critical",
      description: "List com filtros e indicadores + Form com classificação, vencimento, baixa",
      acceptanceCriteria: [
        "ListView com filtros: status, vencimento, cliente, centro custo, projeto",
        "Indicadores: total a receber, vencido, recebido no mês",
        "Badge status",
        "Form com seção classificação completa",
        "Ação 'Baixar' com data e conta bancária",
        "Baixa gera lançamento no razão automaticamente",
      ],
      dependencies: ["s5-01", "s2-01", "s2-03", "s2-05", "s1-14", "s1-15"],
      screens: ["contas-receber-list", "contas-receber-form"], estimatedHours: 14,
    },
    {
      id: "s5-04", title: "Criar tela Tesouraria (Livro Razão)", type: "page", priority: "high",
      description: "List de lançamentos com data caixa/competência, tipo, categoria, saldo corrente",
      acceptanceCriteria: [
        "ListView com filtros: tipo, período, conta, categoria, centro custo",
        "Badge tipo (entrada/saída)",
        "Indicadores: saldo atual, entradas, saídas",
        "Novo lançamento manual",
        "Edição de classificação",
      ],
      dependencies: ["s5-01", "s1-14"], screens: ["tesouraria"], estimatedHours: 10,
    },
    {
      id: "s5-05", title: "Criar tela Extrato Bancário + importação OFX/CSV", type: "page", priority: "high",
      description: "Importação de arquivo OFX/CSV, parsing, listagem de transações bancárias com status conciliação",
      acceptanceCriteria: [
        "Upload e parsing de OFX funcional",
        "Upload e parsing de CSV funcional",
        "Detecção automática de duplicatas",
        "ListView com filtro conta e período",
        "Badge status (pendente/classificado/conciliado)",
        "Seleção de conta bancária destino",
      ],
      dependencies: ["s5-01", "s2-04", "s1-14"], screens: ["extrato-bancario"], estimatedHours: 14,
    },
    {
      id: "s5-06", title: "Criar tela Conciliação Bancária", type: "page", priority: "high",
      description: "Workspace split: extrato à esquerda × títulos à direita. Match automático por valor/data. Match manual drag-and-drop",
      acceptanceCriteria: [
        "Layout split-screen funcional",
        "Filtro por conta bancária e período",
        "Match automático por valor + data (±3 dias)",
        "Match manual via seleção",
        "Conciliar gera baixa no título",
        "Desconciliar reverte baixa",
        "Indicadores: conciliados, pendentes, divergentes",
        "Criar lançamento avulso a partir de extrato",
      ],
      dependencies: ["s5-05", "s5-02", "s5-03"], screens: ["conciliacao"], estimatedHours: 20,
    },
    {
      id: "s5-07", title: "Criar automação: pedido faturado → CR", type: "automation", priority: "critical",
      description: "Trigger ao faturar pedido: gera contas a receber com parcelas baseadas na condição de pagamento",
      acceptanceCriteria: [
        "Ao faturar, gera CR com parcelas",
        "Parcelas respeitam condição de pagamento",
        "Categoria = receita do plano de contas",
        "Centro custo e projeto herdados do pedido",
        "Lançamento razão por competência criado",
      ],
      dependencies: ["s3-02", "s5-03"], estimatedHours: 10,
    },
    {
      id: "s5-08", title: "Criar automação: sugestão de conciliação", type: "automation", priority: "medium",
      description: "Ao importar extrato, matching automático com títulos por valor/data/descrição",
      acceptanceCriteria: [
        "Match por valor exato + data ±3 dias",
        "Score de confiança para matches parciais",
        "Sugestões apresentadas na tela de conciliação",
        "Usuário confirma ou descarta",
      ],
      dependencies: ["s5-06"], estimatedHours: 8,
    },
  ],
};

SPRINT_5.totalEstimatedHours = SPRINT_5.tasks.reduce((s, t) => s + t.estimatedHours, 0);

// ══════════════════════════════════════════════════════════════════════
// SPRINT 6 — CONTROLADORIA, DASHBOARD E PLANEJAMENTO
// ══════════════════════════════════════════════════════════════════════

const SPRINT_6: Sprint = {
  id: "sprint-6",
  number: 6,
  name: "Controladoria, Dashboard e Planejamento",
  objective: "DRE, fluxo, dashboard executivo, central operacional, metas",
  prerequisite: "Sprint 5 completo (financeiro alimentado)",
  totalEstimatedHours: 0,
  tasks: [
    {
      id: "s6-01", title: "Criar tela DRE Gerencial", type: "page", priority: "critical",
      description: "Tabela hierárquica por competência com 6 raízes e 5 linhas calculadas (RL, MC, EBITDA, RAI, Resultado Líquido), comparativo mês anterior, drill-down, export",
      acceptanceCriteria: [
        "Tabela hierárquica seguindo plano de contas",
        "5 linhas calculadas injetadas automaticamente",
        "Filtros: período, centro custo, projeto",
        "Comparativo mês anterior com variação %",
        "Drill-down por categoria (mostra lançamentos)",
        "Raiz 7 (impostos) oculta para Simples Nacional",
        "Export PDF e Excel",
      ],
      dependencies: ["s5-04", "s2-01"], screens: ["dre-gerencial"], estimatedHours: 20,
    },
    {
      id: "s6-02", title: "Criar tela Fluxo de Caixa", type: "page", priority: "critical",
      description: "Gráfico barras + tabela por data caixa, saldo projetado com títulos futuros, alerta saldo mínimo segurança",
      acceptanceCriteria: [
        "Visão diária, semanal e mensal",
        "Gráfico de barras entradas/saídas + linha saldo",
        "Tabela com saldo acumulado",
        "Projeção com títulos a vencer (CP/CR)",
        "Filtros: conta, centro custo, período",
        "Alerta quando saldo < mínimo de segurança",
        "Export PDF e Excel",
      ],
      dependencies: ["s5-04", "s5-02", "s5-03"], screens: ["fluxo-caixa"], estimatedHours: 16,
    },
    {
      id: "s6-03", title: "Criar tela Projetos Financeiros — Controle", type: "page", priority: "medium",
      description: "Rentabilidade por projeto: receita, custo, margem %, badge de alerta margem baixa",
      acceptanceCriteria: [
        "ListView com receita, custo, margem % por projeto",
        "Badge margem (verde ≥30%, amarelo 15-30%, vermelho <15%)",
        "Filtros: status, período",
        "Drill-down mostra lançamentos do projeto",
      ],
      dependencies: ["s2-08", "s5-04"], screens: ["projetos-financeiros-ctrl"], estimatedHours: 8,
    },
    {
      id: "s6-04", title: "Criar Classificação Automática básica", type: "page", priority: "medium",
      description: "Regras por descrição → sugestão de categoria, aprendizado por feedback do usuário",
      acceptanceCriteria: [
        "Lista de regras de classificação",
        "Match por substring na descrição",
        "Sugestão aparece ao classificar lançamento/extrato",
        "Feedback do usuário melhora sugestões futuras",
      ],
      dependencies: ["s2-01", "s5-04"], screens: ["classificacao-auto"], estimatedHours: 8,
    },
    {
      id: "s6-05", title: "Criar tabelas notificações e tarefas", type: "migration", priority: "high",
      description: "erp_notifications (title, message, user_id, module, category, read, link) e erp_tasks (title, assignee_id, entity_id, entity_table, due_date, status, module) com RLS",
      acceptanceCriteria: [
        "Ambas tabelas com RLS por tenant + user",
        "Notificações filtráveis por lida/não lida",
        "Tarefas vinculáveis a qualquer entidade",
      ],
      dependencies: ["s1-02"], estimatedHours: 4,
    },
    {
      id: "s6-06", title: "Criar componente Notificações (badge + dropdown)", type: "component", priority: "high",
      description: "Badge com contador no header, dropdown com lista, marcar lida, link para registro",
      acceptanceCriteria: [
        "Badge vermelho com contador não lidas",
        "Dropdown com scroll e lista",
        "Marcar individual e todas como lidas",
        "Click navega para registro de origem",
        "Realtime update via subscription",
      ],
      dependencies: ["s6-05", "s1-12"], estimatedHours: 6,
    },
    {
      id: "s6-07", title: "Criar Central Operacional", type: "page", priority: "high",
      description: "Workspace diário: pendências críticas (vencidos, aprovações, atrasos), tarefas do dia, agenda semanal, alertas, atalhos rápidos por perfil",
      acceptanceCriteria: [
        "Bloco pendências críticas com contadores",
        "Lista tarefas filtrada por responsável",
        "Painel aprovações pendentes (se aprovador)",
        "Agenda semanal com vencimentos e entregas",
        "Alertas automáticos destacados",
        "Atalhos rápidos adaptados ao perfil",
        "Ação direta (aprovar, concluir) sem navegar",
      ],
      dependencies: ["s6-05", "s6-06", "s5-02", "s5-03", "s4-02"],
      screens: ["central-operacional"], estimatedHours: 16,
    },
    {
      id: "s6-08", title: "Criar Dashboard Executivo", type: "page", priority: "high",
      description: "KPIs: receita mês, despesa mês, EBITDA, fluxo projetado 30d, contas vencidas, pedidos aprovados, produção ativa, metas vs realizado",
      acceptanceCriteria: [
        "KPI cards: receita, despesa, resultado (EBITDA)",
        "Gráfico fluxo projetado 30 dias",
        "Lista top 5 contas vencidas",
        "Pedidos aprovados pendentes",
        "Resumo produção ativa (em produção/concluída)",
        "Gauge metas vs realizado",
        "Filtros: período, centro custo",
        "Dados adaptados ao perfil do usuário",
      ],
      dependencies: ["s6-01", "s6-02", "s3-02", "s4-02"],
      screens: ["dashboard-executivo"], estimatedHours: 16,
    },
    {
      id: "s6-09", title: "Criar tela Metas básicas", type: "page", priority: "medium",
      description: "CRUD de metas mensais com gauge % atingido e alertas visuais",
      acceptanceCriteria: [
        "ListView com gauge % atingido",
        "Alertas: vermelho <60%, amarelo <80%, verde ≥100%",
        "Form com tipo (receita/despesa/indicador), valor alvo, período",
        "Cálculo automático do realizado via DRE/Fluxo",
        "Filtros: tipo, período, centro custo",
      ],
      dependencies: ["s6-01", "s6-02"], screens: ["metas"], estimatedHours: 10,
    },
    {
      id: "s6-10", title: "Criar tela Orçamento (previsto × realizado)", type: "page", priority: "low",
      description: "Tabela categoria × mês com previsto, realizado e variação %",
      acceptanceCriteria: [
        "Tabela por categoria e mês",
        "Colunas: previsto, realizado, variação %",
        "Edição inline do previsto",
        "Filtros: período, centro custo",
        "Badge variação (verde, amarelo, vermelho)",
      ],
      dependencies: ["s2-01", "s6-01"], screens: ["orcamento-planejamento"], estimatedHours: 10,
    },
  ],
};

SPRINT_6.totalEstimatedHours = SPRINT_6.tasks.reduce((s, t) => s + t.estimatedHours, 0);

// ══════════════════════════════════════════════════════════════════════
// EXPORTAÇÕES
// ══════════════════════════════════════════════════════════════════════

export const BACKLOG: Sprint[] = [SPRINT_1, SPRINT_2, SPRINT_3, SPRINT_4, SPRINT_5, SPRINT_6];

export function getSprint(n: number): Sprint | undefined {
  return BACKLOG.find((s) => s.number === n);
}

export function getAllTasks(): DevTask[] {
  return BACKLOG.flatMap((s) => s.tasks);
}

export function getTaskById(id: string): DevTask | undefined {
  return getAllTasks().find((t) => t.id === id);
}

export function getTaskDependencies(taskId: string): DevTask[] {
  const task = getTaskById(taskId);
  if (!task) return [];
  return task.dependencies
    .map((depId) => getTaskById(depId))
    .filter((t): t is DevTask => t !== undefined);
}

export const BACKLOG_SUMMARY = {
  totalSprints: BACKLOG.length,
  totalTasks: getAllTasks().length,
  totalHours: BACKLOG.reduce((s, sp) => s + sp.totalEstimatedHours, 0),
  bySprint: BACKLOG.map((s) => ({
    sprint: s.number,
    name: s.name,
    tasks: s.tasks.length,
    hours: s.totalEstimatedHours,
    critical: s.tasks.filter((t) => t.priority === "critical").length,
    high: s.tasks.filter((t) => t.priority === "high").length,
  })),
};
