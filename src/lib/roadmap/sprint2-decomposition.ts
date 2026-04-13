// ══════════════════════════════════════════════════════════════════════
// DECOMPOSIÇÃO TÉCNICA — SPRINT 2: CADASTROS MESTRES
// Detalhamento bloco-a-bloco com status, gaps e dependências
// ══════════════════════════════════════════════════════════════════════

import type { DecompositionBlock, DecompositionItem, SprintDecomposition } from "./sprint1-decomposition";

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — BANCO DE DADOS DOS CADASTROS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_1: DecompositionBlock = {
  id: "s2-b1-db",
  number: 1,
  name: "Banco de Dados dos Cadastros",
  objective: "Garantir que todas as tabelas mestres existam com campos padronizados",
  status: "partial",
  doneWhen: [
    "Todas as 12 tabelas mestres existem com RLS",
    "Campos padrão (id, tenant_id, created_at, updated_at, status) presentes",
    "Triggers de auditoria em todas as tabelas",
    "Indexes nas FKs e campos de busca",
  ],
  items: [
    {
      id: "s2-b1-01",
      name: "Tabela clients",
      status: "done",
      existing: [
        "Tabela clients com name, cpf_cnpj, email, phone, city, state, endereço completo",
        "Campos fiscais: razao_social, nome_fantasia, inscricao_estadual, inscricao_municipal",
        "Campos financeiros: contato_financeiro, email_financeiro, boleto_status",
        "Tipo pessoa (PF/PJ), attachment, tenant_id, RLS",
      ],
      gaps: [
        "Adicionar campo default_payment_condition_id (FK para payment_conditions)",
        "Adicionar campo default_price_table_id (FK para price_tables — quando criada)",
        "Adicionar campo created_by e updated_by",
        "Adicionar constraint unique(tenant_id, cpf_cnpj) para impedir duplicidade",
      ],
      files: [],
      estimatedHoursRemaining: 2,
      dependencies: [],
    },
    {
      id: "s2-b1-02",
      name: "Tabela suppliers",
      status: "done",
      existing: [
        "Tabela suppliers com name, cpf_cnpj, email, phone, endereço completo",
        "trade_name, inscricao_estadual, payment_terms, website",
        "active, tenant_id, RLS",
      ],
      gaps: [
        "Adicionar campo default_category_id (FK para fin_chart_accounts)",
        "Adicionar campo default_bank_account_id (FK para fin_bank_accounts)",
        "Adicionar campo created_by e updated_by",
        "Adicionar constraint unique(tenant_id, cpf_cnpj) para impedir duplicidade",
        "Adicionar campo tipo_pessoa (PF/PJ)",
        "Adicionar campo contato_principal",
      ],
      files: [],
      estimatedHoursRemaining: 2,
      dependencies: [],
    },
    {
      id: "s2-b1-03",
      name: "Tabela products",
      status: "done",
      existing: [
        "Tabela products com name, code, sale_price, cost_price, unit, description",
        "Campos de estoque: current_stock, min_stock, max_stock, reorder_point",
        "Campos fiscais: ncm, cfop_entrada, cfop_saida, barcode",
        "Campos visuais: image_url, galeria, videos, cor, medida",
        "category_id, active, tenant_id, RLS",
      ],
      gaps: [
        "Adicionar campo product_type enum ('produto', 'materia_prima', 'revenda', 'producao')",
        "Adicionar campo created_by",
      ],
      files: [],
      estimatedHoursRemaining: 1,
      dependencies: [],
    },
    {
      id: "s2-b1-04",
      name: "Tabela services (NÃO EXISTE)",
      status: "pending",
      existing: [],
      gaps: [
        "Criar tabela 'services' com: id, tenant_id, name, code, description, sale_price, cost_price, default_responsible_id, active, created_at, updated_at, created_by",
        "Habilitar RLS com política por tenant",
        "Adicionar trigger de auditoria",
        "Separar serviço de produto no banco de dados",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
    {
      id: "s2-b1-05",
      name: "Tabela fin_bank_accounts",
      status: "done",
      existing: [
        "Tabela fin_bank_accounts com nickname, bank_name, agency, account_number",
        "opening_balance, opening_balance_date, active, tenant_id, RLS",
      ],
      gaps: [
        "Adicionar campo account_type ('corrente', 'poupanca', 'investimento')",
        "Adicionar campo titular",
        "Adicionar constraint unique(tenant_id, bank_name, agency, account_number)",
      ],
      files: [],
      estimatedHoursRemaining: 1,
      dependencies: [],
    },
    {
      id: "s2-b1-06",
      name: "Tabela fin_chart_accounts (Plano de Contas)",
      status: "done",
      existing: [
        "Tabela fin_chart_accounts com code, name, nature, parent_id, in_dre, in_cashflow",
        "Hierarquia via parent_id, dre_order, auto_generate_payable",
        "active, tenant_id, RLS",
        "Estrutura padrão gerencial com 6 raízes",
      ],
      gaps: [],
      files: ["src/components/financeiro/masters/ChartAccountsManager.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s2-b1-07",
      name: "Tabela fin_cost_centers",
      status: "done",
      existing: [
        "Tabela fin_cost_centers com name, code, owner_id, active, tenant_id, RLS",
        "Hook useCostCenters com Realtime",
        "Reserva de nomes ('Planejados') para automações",
      ],
      gaps: [
        "Adicionar campo parent_id para hierarquia simples futura",
        "Adicionar campo responsavel_id (FK profiles)",
      ],
      files: ["src/hooks/useCostCenters.ts", "src/components/financeiro/masters/CostCentersManager.tsx"],
      estimatedHoursRemaining: 1,
      dependencies: [],
    },
    {
      id: "s2-b1-08",
      name: "Tabela fin_projects",
      status: "done",
      existing: [
        "Tabela fin_projects com name, code, project_type, client_id, order_id",
        "cost_center_id, chart_account_id, vendedor_id, owner_id",
        "budget, budget_percent, start_date, end_date, status, tenant_id, RLS",
        "Geração automática via trigger ao aprovar pedido",
      ],
      gaps: [],
      files: ["src/components/financeiro/masters/FinProjectsManager.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s2-b1-09",
      name: "Tabela payment_conditions",
      status: "done",
      existing: [
        "Tabela payment_conditions com nome, parcelas, intervalo_parcelas, dias_primeiro_vencimento",
        "descricao, ativo, tenant_id",
      ],
      gaps: [
        "Adicionar campo entrada_obrigatoria (boolean)",
        "Adicionar campo percentual_entrada (numeric)",
        "Adicionar campo created_by",
      ],
      files: [],
      estimatedHoursRemaining: 1,
      dependencies: [],
    },
    {
      id: "s2-b1-10",
      name: "Tabela price_tables + price_table_items (NÃO EXISTE)",
      status: "pending",
      existing: [],
      gaps: [
        "Criar tabela 'price_tables' com: id, tenant_id, name, active, valid_from, valid_to, created_at, updated_at, created_by",
        "Criar tabela 'price_table_items' com: id, price_table_id, product_id, service_id, price, max_discount_percent, active",
        "Habilitar RLS em ambas",
        "Adicionar triggers de auditoria",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — CADASTRO DE CLIENTES
// ══════════════════════════════════════════════════════════════════════

const BLOCK_2: DecompositionBlock = {
  id: "s2-b2-clients",
  number: 2,
  name: "Cadastro de Clientes",
  objective: "CRUD completo com duplicidade, PF/PJ, anexos e inativação",
  status: "partial",
  doneWhen: [
    "Listagem com busca, filtros e paginação",
    "Formulário com todos os campos obrigatórios",
    "Validação de CPF/CNPJ único por tenant",
    "Suporte PF e PJ",
    "Upload de anexos",
    "Inativação sem exclusão",
    "Auditoria automática",
  ],
  items: [
    {
      id: "s2-b2-01",
      name: "Página de listagem de clientes",
      status: "pending",
      existing: [
        "Clientes são selecionados em CreateOrderDialog e CRM como dropdown",
        "Não existe página dedicada /clientes com listagem",
      ],
      gaps: [
        "Criar página /clientes com UniversalListView (ou tabela dedicada)",
        "Colunas: nome, CPF/CNPJ, cidade, telefone, status, tipo pessoa",
        "Filtros: status, cidade, tipo_pessoa",
        "Busca por nome, razão social, CPF/CNPJ",
        "Ação de inativação (toggle active)",
      ],
      files: [],
      estimatedHoursRemaining: 6,
      dependencies: ["s2-b1-01"],
    },
    {
      id: "s2-b2-02",
      name: "Formulário de cliente (create/edit)",
      status: "partial",
      existing: [
        "CreateClientDialog no CRM com campos básicos",
        "EditClientDialog com edição parcial",
      ],
      gaps: [
        "Criar formulário completo em dialog ou página dedicada",
        "Seções: dados gerais, endereço, dados fiscais, configurações comerciais",
        "Campo condição de pagamento padrão (select de payment_conditions)",
        "Campo tabela de preço padrão (select de price_tables — quando existir)",
        "Validação de CPF/CNPJ único com feedback em tempo real",
        "Máscara de CPF/CNPJ dinâmica por tipo_pessoa",
      ],
      files: ["src/components/crm/CreateClientDialog.tsx", "src/components/crm/EditClientDialog.tsx"],
      estimatedHoursRemaining: 5,
      dependencies: ["s2-b1-01", "s2-b1-09"],
    },
    {
      id: "s2-b2-03",
      name: "Anexos e timeline do cliente",
      status: "pending",
      existing: [
        "attachment_name/path/type na tabela clients (campo único)",
      ],
      gaps: [
        "Integrar com sistema de documentos universal (Sprint 1 b9)",
        "Suporte a múltiplos anexos por cliente",
        "Timeline de atividades do cliente (pedidos, interações)",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — CADASTRO DE FORNECEDORES
// ══════════════════════════════════════════════════════════════════════

const BLOCK_3: DecompositionBlock = {
  id: "s2-b3-suppliers",
  number: 3,
  name: "Cadastro de Fornecedores",
  objective: "CRUD completo com duplicidade, anexos e inativação",
  status: "partial",
  doneWhen: [
    "Listagem com busca e filtros",
    "Formulário com todos os campos",
    "Validação de CPF/CNPJ único",
    "Upload de anexos",
    "Inativação funcional",
    "Auditoria automática",
  ],
  items: [
    {
      id: "s2-b3-01",
      name: "Página de listagem de fornecedores",
      status: "done",
      existing: [
        "Página /fornecedores (Suppliers.tsx) existente",
        "SuppliersTable com listagem, busca e filtros",
        "SuppliersKPIs com cards de resumo",
        "SuppliersFilters com filtros por status, cidade",
        "SupplierDetailSheet com detalhe lateral",
      ],
      gaps: [
        "Adicionar coluna de contato principal",
        "Adicionar filtro por categoria padrão (quando campo existir)",
      ],
      files: ["src/pages/Suppliers.tsx", "src/components/suppliers/SuppliersTable.tsx"],
      estimatedHoursRemaining: 1,
      dependencies: ["s2-b1-02"],
    },
    {
      id: "s2-b3-02",
      name: "Formulário de fornecedor (create/edit)",
      status: "done",
      existing: [
        "CreateSupplierDialog com campos principais",
        "EditSupplierDialog com edição completa",
        "Endereço, dados fiscais, contato",
      ],
      gaps: [
        "Adicionar campo categoria padrão (select fin_chart_accounts)",
        "Adicionar campo conta bancária padrão (select fin_bank_accounts)",
        "Validação de CPF/CNPJ único com feedback",
      ],
      files: ["src/components/suppliers/CreateSupplierDialog.tsx", "src/components/suppliers/EditSupplierDialog.tsx"],
      estimatedHoursRemaining: 2,
      dependencies: ["s2-b1-02"],
    },
    {
      id: "s2-b3-03",
      name: "Produtos do fornecedor",
      status: "done",
      existing: [
        "Tabela product_suppliers com cost_price, lead_time_days, min_order_quantity",
        "SupplierProducts componente existente",
        "AddProductSupplierDialog e EditProductSupplierDialog",
      ],
      gaps: [],
      files: ["src/components/suppliers/SupplierProducts.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — CADASTRO DE PRODUTOS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_4: DecompositionBlock = {
  id: "s2-b4-products",
  number: 4,
  name: "Cadastro de Produtos",
  objective: "CRUD completo com tipos, galeria, estoque preparado e inativação",
  status: "partial",
  doneWhen: [
    "Listagem com busca e filtros por categoria, tipo, status",
    "Formulário com dados gerais, preços, estoque, fiscal",
    "Galeria de imagens funcional",
    "Tipo de produto (produto, matéria-prima, revenda, produção)",
    "Inativação sem exclusão",
    "Auditoria automática",
  ],
  items: [
    {
      id: "s2-b4-01",
      name: "Página de listagem de produtos",
      status: "partial",
      existing: [
        "Página /estoque (Inventory.tsx) com gestão de estoque",
        "Catálogo (/catalogo) com visualização de produtos",
        "ProductCard, ProductDetailModal, ProductGallery existentes",
        "OrderItemsTable usa products em pedidos",
      ],
      gaps: [
        "Criar página dedicada /produtos (ou reaproveitar /estoque) com foco em cadastro",
        "Adicionar colunas: código, tipo produto, custo, preço venda, unidade",
        "Filtros por categoria, tipo_produto, status ativo/inativo",
        "Separar visualização de estoque de cadastro do produto",
      ],
      files: ["src/pages/Inventory.tsx", "src/pages/Catalogo.tsx"],
      estimatedHoursRemaining: 5,
      dependencies: ["s2-b1-03"],
    },
    {
      id: "s2-b4-02",
      name: "Formulário de produto (create/edit)",
      status: "partial",
      existing: [
        "CRUD básico de produtos existe no Inventory",
        "Campos de imagem e galeria existentes",
      ],
      gaps: [
        "Formulário completo com seções: dados gerais, preços, estoque, fiscal, galeria",
        "Campo product_type com select (produto, matéria-prima, revenda, produção)",
        "Abas para organizar informações",
      ],
      files: [],
      estimatedHoursRemaining: 4,
      dependencies: ["s2-b1-03"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — CADASTRO DE SERVIÇOS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_5: DecompositionBlock = {
  id: "s2-b5-services",
  number: 5,
  name: "Cadastro de Serviços",
  objective: "Tabela e UI separados de produtos para serviços prestados",
  status: "pending",
  doneWhen: [
    "Tabela services existe no banco com RLS",
    "Listagem com busca e filtros",
    "Formulário de create/edit",
    "Inativação funcional",
    "Separação clara de produto vs serviço na interface",
  ],
  items: [
    {
      id: "s2-b5-01",
      name: "Página /servicos",
      status: "pending",
      existing: [],
      gaps: [
        "Criar página /servicos com listagem",
        "Colunas: nome, código, preço venda, custo, responsável, status",
        "Busca por nome e código",
        "Filtro por status",
      ],
      files: [],
      estimatedHoursRemaining: 4,
      dependencies: ["s2-b1-04"],
    },
    {
      id: "s2-b5-02",
      name: "Formulário de serviço (create/edit)",
      status: "pending",
      existing: [],
      gaps: [
        "Criar CreateServiceDialog com campos: nome, código, descrição, sale_price, cost_price",
        "Campo default_responsible_id (select de profiles)",
        "Criar EditServiceDialog",
        "Toggle ativo/inativo",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: ["s2-b1-04"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — CADASTRO DE CONTAS BANCÁRIAS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_6: DecompositionBlock = {
  id: "s2-b6-bank",
  number: 6,
  name: "Cadastro de Contas Bancárias",
  objective: "CRUD completo preparado para conciliação e tesouraria",
  status: "done",
  doneWhen: [
    "Listagem com status e saldo",
    "Formulário com banco, agência, conta, tipo, saldo inicial",
    "Múltiplas contas por empresa",
    "Inativação funcional",
  ],
  items: [
    {
      id: "s2-b6-01",
      name: "Gestão de contas bancárias",
      status: "done",
      existing: [
        "BankAccountsManager em /cadastros-financeiros",
        "CRUD completo com nickname, bank_name, agency, account_number",
        "Saldo inicial e data de abertura",
        "Toggle ativo/inativo",
        "Integrado com conciliação e extrato bancário",
      ],
      gaps: [
        "Adicionar campo tipo conta (corrente/poupança/investimento) na UI",
        "Adicionar campo titular na UI",
      ],
      files: ["src/components/financeiro/masters/BankAccountsManager.tsx"],
      estimatedHoursRemaining: 1,
      dependencies: ["s2-b1-05"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 7 — CATEGORIAS FINANCEIRAS (PLANO DE CONTAS)
// ══════════════════════════════════════════════════════════════════════

const BLOCK_7: DecompositionBlock = {
  id: "s2-b7-chart",
  number: 7,
  name: "Categorias Financeiras / Plano de Contas",
  objective: "Gestão hierárquica do plano de contas com DRE e fluxo de caixa",
  status: "done",
  doneWhen: [
    "Visualização em árvore do plano de contas",
    "CRUD com código, nome, natureza, parent_id",
    "Flags in_dre e in_cashflow configuráveis",
    "Estrutura padrão carregável",
    "Impedir exclusão de conta em uso",
    "Inativação funcional",
  ],
  items: [
    {
      id: "s2-b7-01",
      name: "ChartAccountsManager",
      status: "done",
      existing: [
        "ChartAccountsManager completo em /cadastros-financeiros",
        "TreeView com drag-and-drop (DraggableAccountRow)",
        "CreateChartAccountDialog com hierarquia",
        "Estrutura padrão gerencial com 6 raízes + subcategorias",
        "Flags in_dre, in_cashflow, auto_generate_payable",
        "Validação de código único, proteção contra exclusão em uso",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/masters/ChartAccountsManager.tsx",
        "src/components/financeiro/masters/CreateChartAccountDialog.tsx",
        "src/components/financeiro/masters/DraggableAccountRow.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 — CENTROS DE CUSTO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_8: DecompositionBlock = {
  id: "s2-b8-cost-centers",
  number: 8,
  name: "Centros de Custo",
  objective: "CRUD com código, responsável e hierarquia futura",
  status: "done",
  doneWhen: [
    "Listagem com nome, código, responsável, status",
    "CRUD completo",
    "Unificação com todos os módulos via Realtime",
    "Inativação funcional",
  ],
  items: [
    {
      id: "s2-b8-01",
      name: "CostCentersManager",
      status: "done",
      existing: [
        "CostCentersManager em /cadastros-financeiros",
        "Hook useCostCenters com Realtime subscription",
        "Usado em Pedidos, CRM e BI unificadamente",
        "Reserva de nomes para automações (ex: 'Planejados')",
      ],
      gaps: [
        "Adicionar campo responsável na UI (quando campo existir no banco)",
        "Preparar hierarquia simples (parent_id) para futuro",
      ],
      files: ["src/components/financeiro/masters/CostCentersManager.tsx", "src/hooks/useCostCenters.ts"],
      estimatedHoursRemaining: 1,
      dependencies: ["s2-b1-07"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 9 — PROJETOS FINANCEIROS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_9: DecompositionBlock = {
  id: "s2-b9-projects",
  number: 9,
  name: "Projetos Financeiros",
  objective: "CRUD de projetos com vínculo a cliente, pedido e centro de custo",
  status: "done",
  doneWhen: [
    "Listagem com nome, código, cliente, status, budget",
    "Formulário com tipo, datas, centro de custo, responsável",
    "Projeto manual e automático (via pedido) funcionais",
    "KPIs por projeto",
  ],
  items: [
    {
      id: "s2-b9-01",
      name: "FinProjectsManager",
      status: "done",
      existing: [
        "FinProjectsManager em /cadastros-financeiros",
        "CRUD com name, code, project_type, client_id, order_id",
        "Vínculo com centro de custo, vendedor, plano de contas",
        "budget e budget_percent para controle orçamentário",
        "ProjectKPIsDialog para indicadores",
        "Geração automática via trigger de pedido aprovado",
      ],
      gaps: [],
      files: ["src/components/financeiro/masters/FinProjectsManager.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 10 — CONDIÇÕES DE PAGAMENTO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_10: DecompositionBlock = {
  id: "s2-b10-payment",
  number: 10,
  name: "Condições de Pagamento",
  objective: "CRUD de condições com parcelas e intervalos",
  status: "partial",
  doneWhen: [
    "Listagem com nome, parcelas, intervalo, status",
    "Formulário de create/edit",
    "Vinculável a clientes e futuramente a pedidos",
    "Inativação funcional",
  ],
  items: [
    {
      id: "s2-b10-01",
      name: "Página/componente de condições de pagamento",
      status: "partial",
      existing: [
        "Tabela payment_conditions existe no banco",
        "Usada em alguns selects de pedidos",
      ],
      gaps: [
        "Criar UI dedicada em /cadastros-financeiros ou /cadastros",
        "Listagem com nome, parcelas, intervalo, status",
        "CreatePaymentConditionDialog com campos: nome, parcelas, intervalo, entrada, percentual",
        "EditPaymentConditionDialog",
        "Toggle ativo/inativo",
      ],
      files: [],
      estimatedHoursRemaining: 4,
      dependencies: ["s2-b1-09"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 11 — TABELAS DE PREÇO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_11: DecompositionBlock = {
  id: "s2-b11-price",
  number: 11,
  name: "Tabelas de Preço",
  objective: "CRUD de tabelas com itens, vigência e vínculo a clientes",
  status: "pending",
  doneWhen: [
    "Tabelas price_tables e price_table_items no banco",
    "Listagem de tabelas com nome, vigência, status",
    "Formulário com itens (produto/serviço + preço + desconto máx)",
    "Vinculável a clientes como tabela padrão",
  ],
  items: [
    {
      id: "s2-b11-01",
      name: "Página/componente de tabelas de preço",
      status: "pending",
      existing: [],
      gaps: [
        "Criar UI em /cadastros ou /cadastros-financeiros",
        "Listagem de tabelas com nome, vigência, qtd itens, status",
        "Formulário com nome, valid_from, valid_to, ativo",
        "Sub-tabela de itens com produto/serviço, preço, desconto máximo",
        "Adicionar/remover itens inline",
      ],
      files: [],
      estimatedHoursRemaining: 8,
      dependencies: ["s2-b1-10"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 12 — COMPONENTES DE UI UNIVERSAIS PARA CADASTROS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_12: DecompositionBlock = {
  id: "s2-b12-ui",
  number: 12,
  name: "Componentes de UI para Cadastros",
  objective: "Padronizar UI de listagem, formulário, filtros e ações em todos os cadastros",
  status: "partial",
  doneWhen: [
    "Todos os cadastros usam padrão visual consistente",
    "Busca, filtros, status badge e ações por linha em todas as listagens",
    "Tags editáveis em entidades que suportam",
    "Anexos acessíveis em clientes e fornecedores",
    "Timeline de histórico acessível",
  ],
  items: [
    {
      id: "s2-b12-01",
      name: "Padrão visual de listagem de cadastro",
      status: "partial",
      existing: [
        "SuppliersTable como referência de padrão visual",
        "Padrão de KPIs + Filtros + Tabela + DetailSheet usado em fornecedores",
      ],
      gaps: [
        "Replicar padrão visual para clientes, produtos e serviços",
        "Componente reutilizável CadastroPageLayout (header + KPIs + filters + table)",
        "StatusBadge unificado para ativo/inativo",
      ],
      files: ["src/components/suppliers/SuppliersTable.tsx"],
      estimatedHoursRemaining: 4,
      dependencies: [],
    },
    {
      id: "s2-b12-02",
      name: "Tags universais para cadastros",
      status: "pending",
      existing: [
        "ArchitectTags como referência",
        "cost_center_tags existente",
      ],
      gaps: [
        "Aplicar sistema de tags a clientes, fornecedores e produtos",
        "Criar hook useTags(entityType, entityId) se sistema universal existir (Sprint 1)",
        "Ou criar tags inline simples por entidade",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 13 — VÍNCULOS INTERNOS OBRIGATÓRIOS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_13: DecompositionBlock = {
  id: "s2-b13-links",
  number: 13,
  name: "Vínculos Internos entre Cadastros",
  objective: "Garantir que cadastros se referenciem corretamente",
  status: "partial",
  doneWhen: [
    "Cliente vinculado a condição de pagamento e tabela de preço padrão",
    "Fornecedor vinculado a categoria padrão e conta bancária",
    "Categoria vinculada a centro de custo sugerido",
    "Projeto vinculado a empresa/cliente/centro de custo",
    "Conta bancária vinculada à empresa (tenant)",
  ],
  items: [
    {
      id: "s2-b13-01",
      name: "FKs e selects entre cadastros",
      status: "partial",
      existing: [
        "fin_projects já vincula client_id, cost_center_id, order_id",
        "product_suppliers vincula produtos a fornecedores",
        "Contas bancárias vinculadas a tenant",
      ],
      gaps: [
        "Adicionar FK client → payment_conditions (default)",
        "Adicionar FK client → price_tables (default)",
        "Adicionar FK supplier → fin_chart_accounts (default category)",
        "Adicionar FK supplier → fin_bank_accounts (default bank)",
        "Selects de referência em formulários de create/edit",
      ],
      files: [],
      estimatedHoursRemaining: 3,
      dependencies: ["s2-b1-01", "s2-b1-02", "s2-b1-09", "s2-b1-10"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 14 — ROTAS E NAVEGAÇÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_14: DecompositionBlock = {
  id: "s2-b14-routes",
  number: 14,
  name: "Rotas e Navegação dos Cadastros",
  objective: "Registrar rotas, permissões e menu para todos os cadastros",
  status: "partial",
  doneWhen: [
    "Todas as páginas de cadastro registradas no router",
    "PermissionGuard em cada rota",
    "Menu lateral mostra cadastros para perfis autorizados",
    "Breadcrumbs corretos em cada página",
  ],
  items: [
    {
      id: "s2-b14-01",
      name: "Rotas e menu de cadastros",
      status: "partial",
      existing: [
        "Rota /fornecedores existe",
        "Rota /cadastros-financeiros existe (plano de contas, centros, etc.)",
        "Rota /estoque existe (produtos)",
        "Menu 'Cadastros' agrupado no menu lateral",
      ],
      gaps: [
        "Criar rota /clientes",
        "Criar rota /produtos (separada de /estoque, ou unificar)",
        "Criar rota /servicos",
        "Criar rota para condições de pagamento (ou tab em cadastros-financeiros)",
        "Criar rota para tabelas de preço",
        "Registrar permissão 'cadastros' no PermissionGuard",
        "Adicionar entradas no menu lateral sob 'Cadastros'",
      ],
      files: ["src/App.tsx"],
      estimatedHoursRemaining: 3,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// SPRINT 2 CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

export const SPRINT_2_DECOMPOSITION: SprintDecomposition = {
  sprint: 2,
  name: "Cadastros Mestres",
  objective: "Entregar base de dados mestre pronta para Comercial, Financeiro, Compras e Controladoria",
  totalBlocks: 14,
  totalItems: 25,
  estimatedHoursRemaining: 73,
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
    BLOCK_11,
    BLOCK_12,
    BLOCK_13,
    BLOCK_14,
  ],
  doneCriteria: [
    "Cadastrar cliente PF/PJ sem duplicidade de CPF/CNPJ",
    "Cadastrar fornecedor sem duplicidade de CPF/CNPJ",
    "Cadastrar produto com tipo, preço, custo e categoria",
    "Cadastrar serviço separado de produto",
    "Cadastrar conta bancária com tipo e saldo inicial",
    "Visualizar plano de contas hierárquico com CRUD completo",
    "Cadastrar centro de custo com código e responsável",
    "Cadastrar projeto financeiro manual e automático",
    "Cadastrar condição de pagamento com parcelas e entrada",
    "Cadastrar tabela de preço com itens e vigência",
    "Pesquisar, filtrar, editar e inativar todos os cadastros",
    "Auditoria automática de create/update/delete em todos",
    "Vínculos entre cadastros funcionais (cliente↔condição, fornecedor↔categoria)",
  ],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

export function getSprint2PendingItems(): DecompositionItem[] {
  return SPRINT_2_DECOMPOSITION.blocks.flatMap(b =>
    b.items.filter(i => i.status !== "done" && i.status !== "not_needed")
  );
}

export function getSprint2ReadyItems(): DecompositionItem[] {
  const doneIds = new Set(
    SPRINT_2_DECOMPOSITION.blocks
      .flatMap(b => b.items)
      .filter(i => i.status === "done")
      .map(i => i.id)
  );
  return getSprint2PendingItems().filter(item =>
    item.dependencies.every(dep => doneIds.has(dep))
  );
}

export function getSprint2BlockSummary() {
  return SPRINT_2_DECOMPOSITION.blocks.map(b => ({
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
