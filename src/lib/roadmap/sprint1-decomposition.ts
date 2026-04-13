// ══════════════════════════════════════════════════════════════════════
// DECOMPOSIÇÃO TÉCNICA — SPRINT 1: FUNDAÇÃO DO SISTEMA
// Detalhamento bloco-a-bloco com status, gaps e dependências
// ══════════════════════════════════════════════════════════════════════

export type BlockStatus = "done" | "partial" | "pending";
export type ItemStatus = "done" | "partial" | "pending" | "not_needed";

export interface DecompositionItem {
  id: string;
  name: string;
  status: ItemStatus;
  /** O que já existe no projeto */
  existing: string[];
  /** O que falta implementar */
  gaps: string[];
  /** Arquivos existentes relevantes */
  files?: string[];
  /** Horas estimadas para completar gaps */
  estimatedHoursRemaining: number;
  /** Itens que precisam estar prontos antes */
  dependencies: string[];
}

export interface DecompositionBlock {
  id: string;
  number: number;
  name: string;
  objective: string;
  status: BlockStatus;
  items: DecompositionItem[];
  /** Critério de pronto do bloco */
  doneWhen: string[];
}

export interface SprintDecomposition {
  sprint: number;
  name: string;
  objective: string;
  totalBlocks: number;
  totalItems: number;
  estimatedHoursRemaining: number;
  blocks: DecompositionBlock[];
  doneCriteria: string[];
}

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — BANCO DE DADOS BASE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_1: DecompositionBlock = {
  id: "b1-db",
  number: 1,
  name: "Banco de Dados Base",
  objective: "Estrutura relacional com multi-tenancy, auditoria e campos padrão",
  status: "partial",
  doneWhen: [
    "Todas as tabelas core existem com RLS",
    "tenant_id obrigatório e auto-preenchido via trigger",
    "Campos padrão (created_at, updated_at, created_by) presentes",
    "Indexes de performance nas FKs principais",
  ],
  items: [
    {
      id: "b1-01",
      name: "Tabela tenants",
      status: "done",
      existing: [
        "Tabela tenants existe com campos: id, name, slug, active, plan, settings",
        "RLS habilitada com políticas de isolamento",
        "Trigger set_tenant_id para auto-preenchimento",
      ],
      gaps: [],
      files: ["supabase/migrations/"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "b1-02",
      name: "Tabela profiles (usuarios)",
      status: "done",
      existing: [
        "Tabela profiles com full_name, email, role, tenant_id, is_owner",
        "Trigger on_auth_user_created auto-cria profile no signup",
        "RLS com visibilidade por tenant + owner bypass",
      ],
      gaps: [],
      files: ["supabase/migrations/"],
      estimatedHoursRemaining: 0,
      dependencies: ["b1-01"],
    },
    {
      id: "b1-03",
      name: "Tabela user_permissions",
      status: "done",
      existing: [
        "Tabela user_permissions com module, can_view, can_create, can_edit, can_delete",
        "RLS habilitada",
        "PermissionsContext lê e aplica permissões",
      ],
      gaps: [
        "Adicionar campos can_approve, can_export, can_conciliate para granularidade extra",
        "Adicionar campo max_value para limites por módulo",
      ],
      files: ["src/contexts/PermissionsContext.tsx"],
      estimatedHoursRemaining: 2,
      dependencies: ["b1-02"],
    },
    {
      id: "b1-04",
      name: "Tabela audit_log",
      status: "done",
      existing: [
        "Tabela audit_log com event_type, table_name, record_id, field_name, old_value, new_value",
        "Triggers em 14+ tabelas críticas",
        "Tela AuditCenter existente",
      ],
      gaps: [],
      files: ["src/components/auditoria/AuditCenter.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: ["b1-01"],
    },
    {
      id: "b1-05",
      name: "Tabela company_settings",
      status: "done",
      existing: [
        "Tabela company_settings com company_name, cnpj, logo_url, primary_color, accent_color",
        "Hook useCompanySettings para leitura",
        "Formulário de edição no Painel Owner",
      ],
      gaps: [],
      files: ["src/hooks/useCompanySettings.ts"],
      estimatedHoursRemaining: 0,
      dependencies: ["b1-01"],
    },
    {
      id: "b1-06",
      name: "Campos padrão unificados",
      status: "partial",
      existing: [
        "id UUID + created_at + tenant_id presentes na maioria das tabelas",
        "updated_at presente em tabelas principais",
      ],
      gaps: [
        "Padronizar created_by e updated_by em tabelas que não possuem",
        "Criar trigger genérico set_updated_by para auto-preencher updated_by",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: ["b1-01"],
    },
    {
      id: "b1-07",
      name: "Tabela documentos (attachments universal)",
      status: "partial",
      existing: [
        "Upload funcional via useFileUpload hook",
        "Tabelas específicas: crm_deal_files, architect_files",
        "Bucket storage configurado",
      ],
      gaps: [
        "Criar tabela genérica 'documents' vinculável a qualquer entidade (entity_type + entity_id)",
        "Adicionar soft-delete (deleted_at) e histórico de substituição",
        "Migrar uploads existentes para tabela genérica ou manter dual",
      ],
      files: ["src/hooks/useFileUpload.ts"],
      estimatedHoursRemaining: 6,
      dependencies: ["b1-01"],
    },
    {
      id: "b1-08",
      name: "Tabela tags universal",
      status: "partial",
      existing: [
        "cost_center_tags existente",
        "ArchitectTags com lógica específica",
      ],
      gaps: [
        "Criar tabela genérica 'tags' (id, name, color, entity_type, tenant_id)",
        "Criar tabela 'entity_tags' (tag_id, entity_type, entity_id) para vínculo N:N",
        "Hook useTags genérico",
      ],
      files: ["src/components/architects/ArchitectTags.tsx"],
      estimatedHoursRemaining: 4,
      dependencies: ["b1-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — AUTENTICAÇÃO E ACESSO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_2: DecompositionBlock = {
  id: "b2-auth",
  number: 2,
  name: "Autenticação e Acesso",
  objective: "Login, logout, recuperação de senha, seleção de empresa, middleware",
  status: "partial",
  doneWhen: [
    "Login por e-mail/senha funcional",
    "Logout limpa sessão e redireciona",
    "Recuperação de senha via e-mail funcional",
    "Seletor de empresa visível para users multi-tenant",
    "Middleware bloqueia rotas não autenticadas",
    "Middleware injeta tenant_id no escopo da sessão",
  ],
  items: [
    {
      id: "b2-01",
      name: "Login e Logout",
      status: "done",
      existing: [
        "AuthContext com signIn, signOut, onAuthStateChange",
        "Página /auth com formulário de login",
        "Logout com window.location.href = '/auth'",
      ],
      gaps: [],
      files: ["src/contexts/AuthContext.tsx", "src/pages/Auth.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "b2-02",
      name: "Recuperação de senha",
      status: "done",
      existing: [
        "ForgotPasswordDialog com resetPasswordForEmail",
        "Rota /reset-password existente",
      ],
      gaps: [],
      files: ["src/components/auth/ForgotPasswordDialog.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: ["b2-01"],
    },
    {
      id: "b2-03",
      name: "ProtectedRoute middleware",
      status: "done",
      existing: [
        "ProtectedRoute verifica sessão ativa",
        "Redireciona para /auth se não autenticado",
        "Loading state enquanto verifica sessão",
      ],
      gaps: [],
      files: ["src/components/auth/ProtectedRoute.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: ["b2-01"],
    },
    {
      id: "b2-04",
      name: "Seletor de empresa/unidade",
      status: "pending",
      existing: [
        "tenant_id no profile do usuário (single tenant)",
        "Owner pode ver todos os tenants",
      ],
      gaps: [
        "Criar UI de seleção de empresa para users vinculados a múltiplos tenants",
        "Persistir empresa selecionada no localStorage + contexto",
        "Propagar empresa selecionada para todas as queries",
        "Conceito de 'unidade' não existe ainda — avaliar se necessário no MVP",
      ],
      files: [],
      estimatedHoursRemaining: 8,
      dependencies: ["b2-01", "b1-01"],
    },
    {
      id: "b2-05",
      name: "Middleware de escopo tenant",
      status: "partial",
      existing: [
        "RLS com tenant_id em ~60 tabelas",
        "Trigger set_tenant_id auto-preenche na inserção",
        "get_user_tenant_id() function no banco",
      ],
      gaps: [
        "Garantir que todas as queries client-side filtrem por tenant selecionado (não apenas RLS)",
        "Criar hook useTenantScope() que retorna tenant ativo",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: ["b2-04"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — RBAC BASE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_3: DecompositionBlock = {
  id: "b3-rbac",
  number: 3,
  name: "RBAC Base",
  objective: "Leitura de perfil, permissões, menu por perfil, bloqueio de rota",
  status: "partial",
  doneWhen: [
    "PermissionsContext carrega permissões do usuário logado",
    "hasModuleAccess verifica acesso granular por módulo e ação",
    "Menu lateral mostra apenas módulos permitidos",
    "PermissionGuard bloqueia rotas sem permissão e redireciona",
    "Acesso sensível registrado em audit_log",
  ],
  items: [
    {
      id: "b3-01",
      name: "PermissionsContext",
      status: "done",
      existing: [
        "PermissionsContext com hasModuleAccess, hasCriticalPermission",
        "Detecta isMaster, isOwner, isTenantOwner, isTenantAdmin",
        "checkValueLimit e checkStatusRule via RPC",
      ],
      gaps: [
        "Refatorar arquivo (254 linhas) em módulos menores",
      ],
      files: ["src/contexts/PermissionsContext.tsx"],
      estimatedHoursRemaining: 2,
      dependencies: ["b2-01"],
    },
    {
      id: "b3-02",
      name: "PermissionGuard em rotas",
      status: "done",
      existing: [
        "PermissionGuard com redirect para primeira rota permitida",
        "Toast de acesso negado",
        "routeMap e getFirstAllowedRoute helpers",
      ],
      gaps: [],
      files: ["src/components/auth/PermissionGuard.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: ["b3-01"],
    },
    {
      id: "b3-03",
      name: "Menu lateral adaptativo",
      status: "done",
      existing: [
        "AppNavbar filtra itens por hasModuleAccess",
        "Menu dinâmico por tenant (tenant_menu_items)",
        "Filtragem explícita por tenant_id para owners",
      ],
      gaps: [],
      files: ["src/components/layout/AppNavbar.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: ["b3-01"],
    },
    {
      id: "b3-04",
      name: "Tela de gestão de permissões",
      status: "partial",
      existing: [
        "Gestão de usuários existente",
        "CRUD de user_permissions funcional",
      ],
      gaps: [
        "UI de matriz visual de permissões (módulo x ação)",
        "Gestão de perfis-template reutilizáveis",
        "Duplicação de perfil de permissões",
      ],
      files: [],
      estimatedHoursRemaining: 6,
      dependencies: ["b3-01"],
    },
    {
      id: "b3-05",
      name: "Auditoria de acesso sensível",
      status: "partial",
      existing: [
        "audit_log registra STATUS_CHANGE via status machine",
        "Triggers de auditoria em tabelas críticas",
      ],
      gaps: [
        "Registrar eventos de LOGIN/LOGOUT no audit_log",
        "Registrar tentativas de acesso negado (PermissionGuard)",
        "Registrar exportações de dados",
      ],
      files: ["src/components/auditoria/AuditCenter.tsx"],
      estimatedHoursRemaining: 3,
      dependencies: ["b1-04"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — LAYOUT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

const BLOCK_4: DecompositionBlock = {
  id: "b4-layout",
  number: 4,
  name: "Layout Principal",
  objective: "Shell do sistema com topo, menu, conteúdo, breadcrumbs e notificações",
  status: "partial",
  doneWhen: [
    "Shell responsivo com navbar e área de conteúdo",
    "Menu lateral colapsável com ícones",
    "Breadcrumbs automáticos por rota",
    "Avatar/menu do usuário com logout",
    "Seletor de empresa visível no topo",
    "Badge de notificações preparado",
  ],
  items: [
    {
      id: "b4-01",
      name: "Shell e DashboardLayout",
      status: "done",
      existing: [
        "DashboardLayout com AppNavbar + main content area",
        "useGlobalRealtime para eventos em tempo real",
        "Max-width 1800px responsivo",
      ],
      gaps: [],
      files: ["src/components/layout/DashboardLayout.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "b4-02",
      name: "AppNavbar com menu adaptativo",
      status: "done",
      existing: [
        "Navbar horizontal com menu dinâmico por tenant",
        "Avatar do usuário com dropdown",
        "Responsivo mobile com hamburger",
      ],
      gaps: [
        "Adicionar breadcrumbs automáticos baseados em rota",
        "Adicionar badge de notificações (contagem)",
        "Adicionar seletor de empresa quando user tem múltiplos tenants",
      ],
      files: ["src/components/layout/AppNavbar.tsx"],
      estimatedHoursRemaining: 4,
      dependencies: ["b2-04"],
    },
    {
      id: "b4-03",
      name: "Sistema de notificações (estrutura)",
      status: "pending",
      existing: [
        "useGlobalRealtime captura eventos",
        "Toast system via useToast",
      ],
      gaps: [
        "Criar tabela notifications (user_id, type, title, message, read, entity_type, entity_id)",
        "Criar hook useNotifications com mark-as-read",
        "Criar dropdown de notificações na navbar",
        "Integrar com automações para criar notificações automáticas",
      ],
      files: [],
      estimatedHoursRemaining: 8,
      dependencies: ["b1-01", "b4-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — LIST VIEW UNIVERSAL
// ══════════════════════════════════════════════════════════════════════

const BLOCK_5: DecompositionBlock = {
  id: "b5-listview",
  number: 5,
  name: "List View Universal",
  objective: "Componente reutilizável de listagem com busca, filtros, paginação e ações",
  status: "pending",
  doneWhen: [
    "Componente UniversalListView aceita config e renderiza tabela completa",
    "Busca por texto funcional",
    "Filtros dinâmicos por coluna",
    "Paginação server-side",
    "Ações por linha (ver, editar, excluir, status)",
    "Exportação preparada (botão + handler)",
    "Slot para painel lateral de detalhe",
  ],
  items: [
    {
      id: "b5-01",
      name: "Componente UniversalListView",
      status: "pending",
      existing: [
        "Tabelas existentes usam shadcn Table manualmente",
        "Padrões repetidos em ArchitectsTable, LeadsTable, etc.",
      ],
      gaps: [
        "Criar componente genérico com config declarativa (columns, actions, filters)",
        "Interface UniversalListConfig com tipagem forte",
        "Suporte a seleção múltipla de linhas",
        "Suporte a ações em lote (batch actions)",
      ],
      files: [],
      estimatedHoursRemaining: 12,
      dependencies: [],
    },
    {
      id: "b5-02",
      name: "Busca e filtros dinâmicos",
      status: "pending",
      existing: [
        "Buscas implementadas individualmente em cada tabela",
        "Filtros manuais em componentes como CRMFilters",
      ],
      gaps: [
        "Criar sistema de filtros declarativos (type: text | select | date | range | boolean)",
        "Filtros salvos por usuário (saved_filters tabela ou localStorage)",
        "Debounce na busca com loading state",
      ],
      files: [],
      estimatedHoursRemaining: 6,
      dependencies: ["b5-01"],
    },
    {
      id: "b5-03",
      name: "Paginação e ordenação",
      status: "pending",
      existing: [
        "Algumas tabelas usam .range() do Supabase",
      ],
      gaps: [
        "Paginação server-side padronizada com hook usePaginatedQuery",
        "Ordenação por clique no header da coluna",
        "Indicador visual de direção (asc/desc)",
        "Persistência de página/ordenação na URL (searchParams)",
      ],
      files: [],
      estimatedHoursRemaining: 4,
      dependencies: ["b5-01"],
    },
    {
      id: "b5-04",
      name: "Ações por linha e exportação",
      status: "pending",
      existing: [
        "Dropdown de ações em algumas tabelas existentes",
      ],
      gaps: [
        "Sistema de ações declarativas por linha (view, edit, delete, custom)",
        "PermissionGuard inline para ações (ex: delete só se can_delete)",
        "Botão de exportação CSV/Excel preparado",
        "Hook useExportData genérico",
      ],
      files: [],
      estimatedHoursRemaining: 4,
      dependencies: ["b5-01", "b3-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — FORM VIEW UNIVERSAL
// ══════════════════════════════════════════════════════════════════════

const BLOCK_6: DecompositionBlock = {
  id: "b6-formview",
  number: 6,
  name: "Form View Universal",
  objective: "Componente reutilizável de formulário com status, abas, autosave e timeline",
  status: "partial",
  doneWhen: [
    "Componente UniversalFormView aceita schema e renderiza formulário completo",
    "Header com badge de status e ações contextuais",
    "Seções e abas configuráveis",
    "Autosave de rascunho funcional",
    "Validações com feedback visual",
    "Timeline lateral de histórico",
    "Área de anexos integrada",
  ],
  items: [
    {
      id: "b6-01",
      name: "Componente UniversalFormView",
      status: "pending",
      existing: [
        "Formulários existentes usam react-hook-form + shadcn individualmente",
        "useFormPersistence para rascunhos existe",
      ],
      gaps: [
        "Criar componente genérico com schema declarativo (fields, sections, tabs)",
        "Interface UniversalFormConfig com tipagem",
        "Renderização automática de campos por tipo (text, number, select, date, currency, textarea)",
        "Integração com useFormPersistence para autosave",
      ],
      files: ["src/hooks/useFormPersistence.ts"],
      estimatedHoursRemaining: 12,
      dependencies: [],
    },
    {
      id: "b6-02",
      name: "Header com status e ações",
      status: "pending",
      existing: [
        "StatusBadge existe em vários componentes (padrão repetido)",
        "StatusMachine funcional com transições",
      ],
      gaps: [
        "Criar FormHeader genérico com StatusBadge + botões de transição",
        "Integrar com useStatusMachine para mostrar transições disponíveis",
        "Ações contextuais por status (ex: 'Aprovar' só aparece em 'aguardando_aprovacao')",
      ],
      files: ["src/hooks/useStatusMachine.ts"],
      estimatedHoursRemaining: 4,
      dependencies: ["b7-01"],
    },
    {
      id: "b6-03",
      name: "Timeline lateral e anexos",
      status: "partial",
      existing: [
        "DealTimeline no CRM funcional",
        "architect_timeline com anexos",
        "useFileUpload hook genérico",
      ],
      gaps: [
        "Criar componente UniversalTimeline genérico (entity_type + entity_id)",
        "Criar componente UniversalAttachments genérico",
        "Integrar com tabela 'documents' universal (b1-07)",
      ],
      files: ["src/components/crm/DealTimeline.tsx", "src/hooks/useFileUpload.ts"],
      estimatedHoursRemaining: 6,
      dependencies: ["b1-07"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 7 — STATUS ENGINE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_7: DecompositionBlock = {
  id: "b7-status",
  number: 7,
  name: "Status Engine",
  objective: "Máquina universal de status com transições controladas e auditoria",
  status: "done",
  doneWhen: [
    "StatusMachine engine com config declarativa",
    "Transições controladas com from/to/conditions",
    "Hook useStatusMachine com persist e audit",
    "Configs para entidades principais (pedido, produção, financeiro)",
    "Transições registradas em audit_log",
  ],
  items: [
    {
      id: "b7-01",
      name: "StatusMachine engine",
      status: "done",
      existing: [
        "StatusMachine class em src/lib/status-machine/engine.ts",
        "Config declarativa com statuses, transitions, events",
        "getAvailableTransitions, isEditable, createTransition",
        "Configs para pedido, producao, financeiro, orcamento, contrato",
      ],
      gaps: [],
      files: [
        "src/lib/status-machine/engine.ts",
        "src/lib/status-machine/config.ts",
        "src/lib/status-machine/types.ts",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "b7-02",
      name: "Hook useStatusMachine",
      status: "done",
      existing: [
        "useStatusMachine com transition, transitioning, transitionLog",
        "Persiste status no banco + audit_log",
        "Toast de feedback ao usuário",
      ],
      gaps: [],
      files: ["src/hooks/useStatusMachine.ts"],
      estimatedHoursRemaining: 0,
      dependencies: ["b7-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 — AUDITORIA BASE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_8: DecompositionBlock = {
  id: "b8-audit",
  number: 8,
  name: "Auditoria Base",
  objective: "Registro automático de create, update, delete lógico, login, logout",
  status: "partial",
  doneWhen: [
    "Triggers de auditoria em todas as tabelas críticas",
    "Login e logout registrados",
    "Delete lógico registrado",
    "Tela AuditCenter com filtros por tabela, usuário e período",
    "Exportação de logs preparada",
  ],
  items: [
    {
      id: "b8-01",
      name: "Triggers de auditoria em tabelas",
      status: "done",
      existing: [
        "audit_log com triggers em 14+ tabelas",
        "Diff campo a campo (old_value vs new_value)",
        "event_type: CREATE, UPDATE, DELETE_LOGICO, STATUS_CHANGE",
      ],
      gaps: [],
      files: [],
      estimatedHoursRemaining: 0,
      dependencies: ["b1-04"],
    },
    {
      id: "b8-02",
      name: "Auditoria de login/logout",
      status: "pending",
      existing: [
        "onAuthStateChange captura eventos de auth",
      ],
      gaps: [
        "Inserir registro em audit_log no login (event_type: LOGIN)",
        "Inserir registro em audit_log no logout (event_type: LOGOUT)",
        "Capturar IP e user-agent quando possível",
      ],
      files: ["src/contexts/AuthContext.tsx"],
      estimatedHoursRemaining: 2,
      dependencies: ["b1-04", "b2-01"],
    },
    {
      id: "b8-03",
      name: "Tela AuditCenter",
      status: "done",
      existing: [
        "AuditCenter com listagem e filtros",
        "Filtros por tabela, tipo de evento, período",
      ],
      gaps: [
        "Adicionar filtro por usuário específico",
        "Adicionar botão de exportação CSV",
      ],
      files: ["src/components/auditoria/AuditCenter.tsx"],
      estimatedHoursRemaining: 2,
      dependencies: ["b8-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 9 — DOCUMENTOS BASE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_9: DecompositionBlock = {
  id: "b9-docs",
  number: 9,
  name: "Documentos Base",
  objective: "Upload universal, vínculo por entidade, tipo de documento, exclusão lógica",
  status: "partial",
  doneWhen: [
    "Upload de arquivos funcional para qualquer entidade",
    "Tabela documents com entity_type + entity_id",
    "Tipos de documento configuráveis",
    "Soft-delete com histórico de substituição",
    "Componente UniversalAttachments reutilizável",
  ],
  items: [
    {
      id: "b9-01",
      name: "Tabela documents universal",
      status: "pending",
      existing: [
        "Tabelas específicas por entidade (crm_deal_files, architect_files)",
        "Bucket de storage configurado",
      ],
      gaps: [
        "Criar tabela 'documents' genérica com entity_type, entity_id, file_name, file_path, file_size, file_type, document_type, deleted_at, replaced_by",
        "RLS por tenant_id",
        "Política de storage para uploads",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: ["b1-01"],
    },
    {
      id: "b9-02",
      name: "Hook useDocuments",
      status: "pending",
      existing: [
        "useFileUpload existe mas é específico",
      ],
      gaps: [
        "Criar hook useDocuments(entityType, entityId) com upload, list, delete, replace",
        "Integrar com tabela documents universal",
        "Soft-delete (marcar deleted_at em vez de deletar)",
        "Histórico de substituição (replaced_by)",
      ],
      files: ["src/hooks/useFileUpload.ts"],
      estimatedHoursRemaining: 4,
      dependencies: ["b9-01"],
    },
    {
      id: "b9-03",
      name: "Componente UniversalAttachments",
      status: "pending",
      existing: [
        "DealFileUpload como referência de UI",
      ],
      gaps: [
        "Criar componente genérico de listagem e upload de documentos",
        "Drag-and-drop de arquivos",
        "Preview de imagens e PDFs",
        "Indicador de tipo de documento",
      ],
      files: ["src/components/crm/DealFileUpload.tsx"],
      estimatedHoursRemaining: 5,
      dependencies: ["b9-02"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 10 — API BASE (Padrões de Query)
// ══════════════════════════════════════════════════════════════════════

const BLOCK_10: DecompositionBlock = {
  id: "b10-api",
  number: 10,
  name: "API Base (Padrões de Query)",
  objective: "Hooks padronizados para CRUD, paginação, filtros, ordenação e erro",
  status: "partial",
  doneWhen: [
    "Hook useEntityQuery genérico com paginação, filtros, ordenação",
    "Hook useEntityMutation genérico com create, update, delete",
    "Tratamento de erro padronizado com toast",
    "Retorno padronizado { data, error, loading, pagination }",
    "Suporte a invalidação de cache via React Query",
  ],
  items: [
    {
      id: "b10-01",
      name: "Hook useEntityQuery",
      status: "pending",
      existing: [
        "Queries Supabase individuais em cada componente",
        "React Query usado em vários hooks",
      ],
      gaps: [
        "Criar hook genérico useEntityQuery<T>(table, { filters, sort, page, pageSize })",
        "Retorno padronizado com { data, total, page, pageSize, loading, error }",
        "Integração com React Query para cache e invalidação",
        "Suporte a relações (joins) declarativas",
      ],
      files: [],
      estimatedHoursRemaining: 6,
      dependencies: [],
    },
    {
      id: "b10-02",
      name: "Hook useEntityMutation",
      status: "pending",
      existing: [
        "Mutations individuais em componentes",
        "useDeleteWithTracking para soft-delete",
      ],
      gaps: [
        "Criar hook genérico useEntityMutation<T>(table) com { create, update, remove }",
        "Invalidação automática do cache useEntityQuery",
        "Toast de sucesso/erro padronizado",
        "Integração com auditoria (audit_log via triggers)",
      ],
      files: ["src/hooks/useDeleteWithTracking.ts"],
      estimatedHoursRemaining: 4,
      dependencies: ["b10-01"],
    },
    {
      id: "b10-03",
      name: "Tratamento de erro padronizado",
      status: "partial",
      existing: [
        "ErrorBoundary global existente",
        "Toast de erro em componentes individuais",
      ],
      gaps: [
        "Criar handler centralizado de erros Supabase (parseSupabaseError)",
        "Mapear códigos de erro para mensagens amigáveis em PT-BR",
        "Retry automático para erros de rede",
      ],
      files: ["src/components/ErrorBoundary.tsx"],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// SPRINT 1 CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

export const SPRINT_1_DECOMPOSITION: SprintDecomposition = {
  sprint: 1,
  name: "Fundação do Sistema",
  objective: "Entregar base operacional do ERP pronta para receber módulos de negócio",
  totalBlocks: 10,
  totalItems: 37,
  estimatedHoursRemaining: 126,
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
    "Usuário consegue entrar no sistema com e-mail/senha",
    "Usuário vê menu correto para seu perfil de permissão",
    "Rota bloqueada redireciona com toast de acesso negado",
    "Listagem universal renderiza dados com busca, filtros e paginação",
    "Formulário universal renderiza campos com abas e autosave",
    "Transição de status registra no audit_log",
    "Upload de documento vincula à entidade corretamente",
    "Auditoria registra create/update/delete automaticamente",
    "Layout responsivo com navbar, breadcrumbs e notificações",
    "Seletor de empresa funcional para users multi-tenant",
  ],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

/** Retorna apenas itens com gaps pendentes */
export function getPendingItems(): DecompositionItem[] {
  return SPRINT_1_DECOMPOSITION.blocks.flatMap(b =>
    b.items.filter(i => i.status !== "done" && i.status !== "not_needed")
  );
}

/** Retorna itens prontos para iniciar (todas deps done) */
export function getReadyItems(): DecompositionItem[] {
  const doneIds = new Set(
    SPRINT_1_DECOMPOSITION.blocks
      .flatMap(b => b.items)
      .filter(i => i.status === "done")
      .map(i => i.id)
  );

  return getPendingItems().filter(item =>
    item.dependencies.every(dep => doneIds.has(dep))
  );
}

/** Resumo por bloco */
export function getBlockSummary() {
  return SPRINT_1_DECOMPOSITION.blocks.map(b => ({
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
