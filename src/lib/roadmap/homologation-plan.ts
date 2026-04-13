// ══════════════════════════════════════════════════════════════════════
// PLANO DE HOMOLOGAÇÃO FUNCIONAL E INTEGRADA DO ERP
// Testes ponta a ponta entre módulos
// ══════════════════════════════════════════════════════════════════════

export type TestPriority = "P0" | "P1" | "P2" | "P3";
export type TestStatus = "pendente" | "passou" | "falhou" | "bloqueado";

export interface TestCase {
  id: string;
  step: string;
  expected: string;
  result?: TestStatus;
  errorFound?: string;
  errorPriority?: TestPriority;
}

export interface TestBlock {
  id: string;
  number: number;
  name: string;
  objective: string;
  cases: TestCase[];
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  steps: TestCase[];
}

export interface HomologationPlan {
  name: string;
  objective: string;
  blocks: TestBlock[];
  scenarios: TestScenario[];
  priorityLegend: Record<TestPriority, string>;
}

// ══════════════════════════════════════════════════════════════════════
// LEGENDA DE PRIORIDADE
// ══════════════════════════════════════════════════════════════════════

const PRIORITY_LEGEND: Record<TestPriority, string> = {
  P0: "Quebra fluxo principal — bloqueante, impede uso do sistema",
  P1: "Lógica errada com workaround — funcionalidade comprometida mas contornável",
  P2: "Problema visual/usabilidade — não impede uso mas degrada experiência",
  P3: "Ajuste fino — melhoria incremental, baixa urgência",
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — TESTES DE BASE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_1: TestBlock = {
  id: "hom-b1",
  number: 1,
  name: "Testes de Base",
  objective: "Validar infraestrutura de autenticação, permissões, auditoria e operações CRUD fundamentais",
  cases: [
    { id: "b1-01", step: "Login com email/senha válidos", expected: "Usuário autenticado, redirecionado ao dashboard, sessão ativa" },
    { id: "b1-02", step: "Login com credenciais inválidas", expected: "Mensagem de erro clara, sem redirecionamento, sem sessão" },
    { id: "b1-03", step: "Logout", expected: "Sessão encerrada, redirecionado ao login, dados limpos do contexto" },
    { id: "b1-04", step: "Troca de empresa (tenant) pelo Owner", expected: "Contexto muda, menu atualiza, dados filtrados pelo novo tenant_id" },
    { id: "b1-05", step: "Menu visível para perfil Admin", expected: "Todos os módulos visíveis exceto Painel Owner" },
    { id: "b1-06", step: "Menu visível para perfil Comercial", expected: "Apenas módulos: Dashboard, Comercial, Cadastros permitidos" },
    { id: "b1-07", step: "Menu visível para perfil Financeiro", expected: "Apenas módulos: Dashboard, Financeiro, Cadastros Financeiros, BI" },
    { id: "b1-08", step: "Menu visível para perfil Operacional", expected: "Apenas módulos: Dashboard, Operacional, Cadastros" },
    { id: "b1-09", step: "Menu visível para perfil Auditor", expected: "Todos os módulos visíveis em modo somente leitura" },
    { id: "b1-10", step: "Criação de registro genérico", expected: "Registro salvo, ID gerado, tenant_id preenchido automaticamente, created_at registrado" },
    { id: "b1-11", step: "Edição de registro existente", expected: "Campos atualizados, updated_at alterado, audit_log registra diff (old_value/new_value)" },
    { id: "b1-12", step: "Inativação de registro", expected: "Status muda para inativo, registro não aparece em listagens padrão, audit_log registra" },
    { id: "b1-13", step: "Upload de anexo", expected: "Arquivo salvo no storage, vinculado ao registro, preview disponível" },
    { id: "b1-14", step: "Download de anexo", expected: "Arquivo baixa corretamente com nome original e tipo correto" },
    { id: "b1-15", step: "Auditoria de criação", expected: "audit_log contém evento CREATE com user_id, table_name, record_id, timestamp" },
    { id: "b1-16", step: "Auditoria de alteração", expected: "audit_log contém evento UPDATE com field_name, old_value, new_value" },
    { id: "b1-17", step: "Sessão expirada", expected: "Redirecionamento ao login, mensagem de sessão expirada, sem perda de dados não salvos" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — TESTES DE CADASTROS
// ══════════════════════════════════════════════════════════════════════

const CADASTRO_ENTITIES = [
  { name: "Cliente", table: "clients", uniqueField: "cpf_cnpj" },
  { name: "Fornecedor", table: "suppliers", uniqueField: "cnpj" },
  { name: "Produto", table: "products", uniqueField: "code" },
  { name: "Centro de Custo", table: "fin_cost_centers", uniqueField: "name" },
  { name: "Projeto Financeiro", table: "fin_projects", uniqueField: "name" },
  { name: "Categoria Financeira (Plano de Contas)", table: "fin_chart_accounts", uniqueField: "code" },
  { name: "Conta Bancária", table: "fin_bank_accounts", uniqueField: "account_number" },
];

const BLOCK_2: TestBlock = {
  id: "hom-b2",
  number: 2,
  name: "Testes de Cadastros",
  objective: "Validar CRUD, unicidade, busca, filtros e relacionamentos de todas as entidades mestres",
  cases: CADASTRO_ENTITIES.flatMap((entity, idx) => [
    { id: `b2-${idx}a`, step: `Criar ${entity.name} com dados válidos`, expected: `Registro salvo em ${entity.table}, tenant_id preenchido, listagem atualizada` },
    { id: `b2-${idx}b`, step: `Editar ${entity.name} existente`, expected: "Campos atualizados, audit_log registra alteração com diff" },
    { id: `b2-${idx}c`, step: `Inativar ${entity.name}`, expected: "Status inativo, não aparece em selects/dropdowns, aparece em listagem com filtro 'inativos'" },
    { id: `b2-${idx}d`, step: `Criar ${entity.name} com ${entity.uniqueField} duplicado`, expected: "Erro de validação: registro duplicado bloqueado, mensagem clara ao usuário" },
    { id: `b2-${idx}e`, step: `Buscar ${entity.name} por texto`, expected: "Resultados filtrados corretamente por nome/código, case-insensitive" },
    { id: `b2-${idx}f`, step: `Filtrar ${entity.name} por status`, expected: "Apenas registros com o status selecionado são exibidos" },
    { id: `b2-${idx}g`, step: `Verificar relacionamentos de ${entity.name}`, expected: "Entidade vinculada corretamente a registros dependentes (pedidos, lançamentos, etc.)" },
  ]),
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — TESTE PONTA A PONTA COMERCIAL
// ══════════════════════════════════════════════════════════════════════

const BLOCK_3: TestBlock = {
  id: "hom-b3",
  number: 3,
  name: "Teste Ponta a Ponta — Comercial",
  objective: "Validar fluxo completo: Cliente → Proposta → Pedido → Aprovação → Geração financeira automática",
  cases: [
    { id: "b3-01", step: "Criar proposta/orçamento para cliente existente", expected: "Proposta salva com status 'rascunho', itens e valores corretos, vinculada ao cliente" },
    { id: "b3-02", step: "Adicionar itens à proposta com quantidades e preços", expected: "Subtotais calculados, total geral atualizado em tempo real" },
    { id: "b3-03", step: "Converter proposta em pedido", expected: "Pedido criado com dados herdados: cliente, itens, valores, vendedor, centro de custo, categoria" },
    { id: "b3-04", step: "Verificar herança de dados na conversão", expected: "Todos os campos do pedido coincidem com a proposta: cliente_id, itens, quantidades, preços, vendedor_id" },
    { id: "b3-05", step: "Preencher campos obrigatórios do pedido", expected: "Forma de pagamento, condição, vendedor, centro de custo preenchidos" },
    { id: "b3-06", step: "Aprovar pedido", expected: "Status muda para 'aprovado', timestamp de aprovação registrado" },
    { id: "b3-07", step: "Verificar geração automática de contas a receber", expected: "fin_receivables criados com: valor correto, parcelas conforme condição, vencimentos calculados, categoria de receita correta" },
    { id: "b3-08", step: "Verificar geração automática de compromissos sobre vendas", expected: "fin_payables criados para: comissão vendedor, RT produção, taxas link pagamento (se aplicável)" },
    { id: "b3-09", step: "Verificar criação de projeto financeiro", expected: "fin_projects criado com nome 'PED-{numero} {cliente}', orçamento = 50% do pedido, centro de custo herdado" },
    { id: "b3-10", step: "Verificar lançamentos no Livro Razão", expected: "fin_ledger_entries criados com: description contendo 'Pedido #N', competence_date preenchida, cash_date NULO (status ABERTO)" },
    { id: "b3-11", step: "Verificar transição de status do pedido", expected: "Histórico de status registrado: rascunho → aprovado, com user_id e timestamp" },
    { id: "b3-12", step: "Verificar audit_log do fluxo completo", expected: "Eventos registrados: criação proposta, conversão, criação pedido, aprovação, geração financeira" },
    { id: "b3-13", step: "Editar pedido aprovado (campos estruturais)", expected: "Edição bloqueada para campos estruturais (itens, valores) após aprovação" },
    { id: "b3-14", step: "Verificar centro de custo no financeiro", expected: "Centro de custo do pedido propagado para todos os lançamentos financeiros (fallback automático via order_items)" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — TESTE PONTA A PONTA FINANCEIRO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_4: TestBlock = {
  id: "hom-b4",
  number: 4,
  name: "Teste Ponta a Ponta — Financeiro",
  objective: "Validar fluxo: Pedido aprovado → Contas → Pagamento/Recebimento → Conciliação → Fluxo atualizado",
  cases: [
    { id: "b4-01", step: "Verificar contas a receber geradas pelo pedido", expected: "Parcelas com valores corretos, vencimentos sequenciais, categoria e centro de custo herdados" },
    { id: "b4-02", step: "Verificar contas a pagar geradas (compromissos)", expected: "Comissões, RT produção, taxas calculadas com percentuais corretos sobre o valor do pedido" },
    { id: "b4-03", step: "Registrar recebimento de parcela", expected: "Status muda para 'PAGO_RECEBIDO', cash_date preenchida, saldo bancário atualizado, reconciled=true automaticamente" },
    { id: "b4-04", step: "Registrar pagamento de conta a pagar", expected: "Status muda para 'PAGO_RECEBIDO', cash_date preenchida, saldo bancário reduzido" },
    { id: "b4-05", step: "Verificar que pagamento não duplica no Livro Razão", expected: "Lançamento existente atualizado (não criado novo), cash_date preenchida no registro original" },
    { id: "b4-06", step: "Conciliar transação bancária (OFX)", expected: "Transação vinculada ao título correto, score de match exibido, reconciled=true" },
    { id: "b4-07", step: "Verificar que conciliação não duplica movimento", expected: "Nenhum lançamento duplicado no razão, saldo bancário correto após conciliação" },
    { id: "b4-08", step: "Estornar pagamento (reabrir título)", expected: "Status volta para 'ABERTO', cash_date limpa (NULL), saldo bancário restaurado, reconciled=false" },
    { id: "b4-09", step: "Verificar fluxo previsto (antes da baixa)", expected: "Títulos em aberto aparecem no fluxo projetado com valores e vencimentos corretos" },
    { id: "b4-10", step: "Verificar fluxo realizado (após baixa)", expected: "Títulos pagos/recebidos aparecem no realizado com cash_date correta" },
    { id: "b4-11", step: "Verificar saldo final do fluxo de caixa", expected: "Saldo = saldo anterior + recebimentos - pagamentos, sem distorções por transferências internas" },
    { id: "b4-12", step: "Criar lançamento manual no financeiro", expected: "Lançamento salvo com categoria, centro de custo, projeto, competence_date; cash_date NULO se status ABERTO" },
    { id: "b4-13", step: "Verificar parcelamento automático (3x)", expected: "3 parcelas com valores iguais (ou última com centavos de ajuste), vencimentos mensais sequenciais" },
    { id: "b4-14", step: "Verificar categoria contábil do lançamento", expected: "Categoria corresponde ao chart_account_id do pedido ou mapeamento de compromissos" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — TESTE PONTA A PONTA DRE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_5: TestBlock = {
  id: "hom-b5",
  number: 5,
  name: "Teste Ponta a Ponta — DRE",
  objective: "Validar classificação contábil, linhas calculadas e integridade da DRE gerencial",
  cases: [
    { id: "b5-01", step: "Verificar receita do pedido na DRE", expected: "Valor aparece na linha '1. Receitas' sob a subcategoria correta, filtrado por competence_date" },
    { id: "b5-02", step: "Verificar despesas sobre vendas na DRE", expected: "Comissões e taxas aparecem na linha '2. Despesas sobre Vendas' com subcategorias corretas" },
    { id: "b5-03", step: "Verificar cálculo de Receita Líquida", expected: "Receita Líquida = Receitas - Despesas sobre Vendas (linha virtual calculada automaticamente)" },
    { id: "b5-04", step: "Verificar cálculo de Margem de Contribuição", expected: "MC = Receita Líquida - Custos Diretos - Comissões (conforme estrutura do plano de contas)" },
    { id: "b5-05", step: "Verificar cálculo de EBITDA", expected: "EBITDA = Margem de Contribuição - Despesas Operacionais (linha virtual calculada)" },
    { id: "b5-06", step: "Verificar cálculo de RAI", expected: "RAI = EBITDA - Depreciação + Resultado Financeiro" },
    { id: "b5-07", step: "Verificar cálculo de Resultado Líquido", expected: "RL = RAI - Impostos sobre resultado (raiz 7, condicional ao regime tributário)" },
    { id: "b5-08", step: "Verificar regime tributário Simples Nacional", expected: "Raiz 7 (Impostos sobre Resultado) oculta automaticamente para empresas no Simples" },
    { id: "b5-09", step: "Verificar que pagamento NÃO altera DRE", expected: "DRE usa competence_date; pagar/receber não muda o valor registrado na DRE" },
    { id: "b5-10", step: "Verificar percentuais de composição vertical", expected: "Cada linha mostra % de participação no grupo pai; total do grupo = 100%" },
    { id: "b5-11", step: "Filtrar DRE por período", expected: "Valores recalculados apenas para o período selecionado (mês/trimestre/ano)" },
    { id: "b5-12", step: "Filtrar DRE por centro de custo", expected: "Apenas lançamentos do centro de custo selecionado são computados" },
    { id: "b5-13", step: "Expandir subcategorias na DRE", expected: "Lançamentos individuais visíveis com descrição, % e valor (sem data, visual clean)" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — TESTE PONTA A PONTA FLUXO DE CAIXA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_6: TestBlock = {
  id: "hom-b6",
  number: 6,
  name: "Teste Ponta a Ponta — Fluxo de Caixa",
  objective: "Validar projeção, realização, saldos e integridade do fluxo de caixa",
  cases: [
    { id: "b6-01", step: "Verificar títulos previstos no fluxo", expected: "Contas a receber/pagar em aberto aparecem como 'previsto' na data de vencimento" },
    { id: "b6-02", step: "Registrar pagamento e verificar fluxo", expected: "Título sai do previsto, entra no realizado na cash_date, saldo atualiza" },
    { id: "b6-03", step: "Verificar saldo progressivo diário", expected: "Saldo = saldo anterior + entradas - saídas de cada dia, acumulando corretamente" },
    { id: "b6-04", step: "Verificar transferência entre contas bancárias", expected: "Saída em conta A, entrada em conta B, saldo consolidado não muda, sem distorção no resultado" },
    { id: "b6-05", step: "Verificar fluxo projetado futuro", expected: "Títulos com vencimento futuro aparecem no projetado com valores e categorias corretos" },
    { id: "b6-06", step: "Verificar alerta de saldo mínimo", expected: "Se saldo projetado < min_safety_balance de company_settings, alerta visual é exibido" },
    { id: "b6-07", step: "Filtrar fluxo por conta bancária", expected: "Apenas movimentações da conta selecionada são exibidas" },
    { id: "b6-08", step: "Filtrar fluxo por período", expected: "Saldo inicial do período calculado corretamente, movimentações dentro do range" },
    { id: "b6-09", step: "Comparar previsto vs realizado no período", expected: "Colunas de previsto e realizado lado a lado, variação calculada automaticamente" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 7 — TESTE POR PERFIL
// ══════════════════════════════════════════════════════════════════════

const PROFILES_TO_TEST = [
  { profile: "Owner", menu: "Todos + Painel Owner", canApprove: true, canEdit: true, restriction: "Nenhuma" },
  { profile: "Admin (Tenant)", menu: "Todos exceto Painel Owner", canApprove: true, canEdit: true, restriction: "Apenas seu tenant" },
  { profile: "Financeiro", menu: "Dashboard, Financeiro, Cadastros Financeiros, BI", canApprove: false, canEdit: true, restriction: "Apenas financeiro operacional" },
  { profile: "Comercial", menu: "Dashboard, Comercial, Cadastros", canApprove: false, canEdit: true, restriction: "Apenas pedidos/clientes" },
  { profile: "Operacional", menu: "Dashboard, Operacional", canApprove: false, canEdit: true, restriction: "Apenas produção/projetos" },
  { profile: "Auditor", menu: "Todos os módulos", canApprove: false, canEdit: false, restriction: "Somente leitura em tudo" },
];

const BLOCK_7: TestBlock = {
  id: "hom-b7",
  number: 7,
  name: "Teste por Perfil de Acesso",
  objective: "Validar visibilidade de menu, acesso a telas, permissões de edição e aprovação por perfil",
  cases: PROFILES_TO_TEST.flatMap((p, idx) => [
    { id: `b7-${idx}a`, step: `Login como ${p.profile}: verificar menu`, expected: `Menu exibe: ${p.menu}` },
    { id: `b7-${idx}b`, step: `${p.profile}: acessar tela permitida`, expected: "Tela carrega corretamente com dados filtrados" },
    { id: `b7-${idx}c`, step: `${p.profile}: acessar tela NÃO permitida via URL direta`, expected: "Redirecionamento ou mensagem de permissão negada" },
    { id: `b7-${idx}d`, step: `${p.profile}: tentar editar registro`, expected: p.canEdit ? "Edição permitida, registro salvo" : "Botão de edição oculto ou desabilitado" },
    { id: `b7-${idx}e`, step: `${p.profile}: tentar aprovar pedido`, expected: p.canApprove ? "Aprovação executada com sucesso" : "Botão de aprovação oculto ou ação bloqueada" },
    { id: `b7-${idx}f`, step: `${p.profile}: restrição específica`, expected: `Restrição: ${p.restriction}` },
  ]),
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 — CENÁRIOS OBRIGATÓRIOS
// ══════════════════════════════════════════════════════════════════════

const SCENARIO_1: TestScenario = {
  id: "cen-01",
  name: "Venda Simples",
  description: "Pedido à vista, sem comissão, sem parcelamento",
  steps: [
    { id: "c1-01", step: "Criar pedido à vista para cliente PF", expected: "Pedido criado com forma_pagamento='pix' ou 'dinheiro', 1 parcela" },
    { id: "c1-02", step: "Aprovar pedido", expected: "1 conta a receber gerada, valor total, vencimento = data do pedido" },
    { id: "c1-03", step: "Registrar recebimento", expected: "Título pago, cash_date preenchida, saldo bancário atualizado" },
    { id: "c1-04", step: "Verificar DRE", expected: "Receita aparece na competência correta, sem despesas sobre vendas" },
    { id: "c1-05", step: "Verificar Fluxo de Caixa", expected: "Realizado = valor do pedido na cash_date" },
  ],
};

const SCENARIO_2: TestScenario = {
  id: "cen-02",
  name: "Venda Parcelada",
  description: "Pedido parcelado em 3x cartão de crédito",
  steps: [
    { id: "c2-01", step: "Criar pedido com forma_pagamento='cartao_credito', 3 parcelas", expected: "Pedido salvo com condição 3x" },
    { id: "c2-02", step: "Aprovar pedido", expected: "3 contas a receber geradas com valores iguais e vencimentos mensais" },
    { id: "c2-03", step: "Verificar taxa de cartão aplicada", expected: "Despesa de taxa de cartão gerada em fin_payables com percentual da tabela credit_card_rates" },
    { id: "c2-04", step: "Receber 1ª parcela", expected: "1 título pago, 2 em aberto; fluxo previsto mostra 2 parcelas futuras" },
    { id: "c2-05", step: "Verificar DRE", expected: "Receita total na competência da aprovação; taxa de cartão em 'Despesas sobre Vendas'" },
  ],
};

const SCENARIO_3: TestScenario = {
  id: "cen-03",
  name: "Venda com Comissão",
  description: "Pedido com comissão de vendedor e RT produção",
  steps: [
    { id: "c3-01", step: "Criar pedido com vendedor que tem comissão configurada", expected: "Pedido vinculado ao vendedor com % de comissão" },
    { id: "c3-02", step: "Aprovar pedido", expected: "Conta a pagar de comissão gerada automaticamente com valor = % × total do pedido" },
    { id: "c3-03", step: "Verificar RT Produção", expected: "Conta a pagar de RT gerada se configurada, com percentual e centro de custo corretos" },
    { id: "c3-04", step: "Verificar DRE", expected: "Comissão em '2.4 Comissões sobre venda'; RT em '2.2 Custos Variáveis'" },
    { id: "c3-05", step: "Pagar comissão", expected: "Título baixado, cash_date preenchida, DRE inalterada (competência já reconhecida)" },
  ],
};

const SCENARIO_4: TestScenario = {
  id: "cen-04",
  name: "Compra Simples",
  description: "Pedido de compra com geração de conta a pagar",
  steps: [
    { id: "c4-01", step: "Criar pedido de compra para fornecedor", expected: "Pedido de compra salvo com itens, valores e fornecedor" },
    { id: "c4-02", step: "Aprovar pedido de compra", expected: "Conta a pagar gerada automaticamente com valor, vencimento e categoria corretos" },
    { id: "c4-03", step: "Registrar pagamento", expected: "Título baixado, fluxo de caixa atualizado, DRE registra despesa na competência" },
  ],
};

const SCENARIO_5: TestScenario = {
  id: "cen-05",
  name: "Perfil Restrito — Acesso Indevido",
  description: "Usuário Comercial tenta acessar módulo Financeiro",
  steps: [
    { id: "c5-01", step: "Login como perfil Comercial", expected: "Menu não mostra módulo Financeiro" },
    { id: "c5-02", step: "Navegar diretamente para /financeiro via URL", expected: "Acesso bloqueado: redirecionamento ou mensagem de permissão negada" },
    { id: "c5-03", step: "Tentar chamar API diretamente (RLS)", expected: "RLS bloqueia: query retorna vazio ou erro de permissão" },
    { id: "c5-04", step: "Tentar aprovar pedido sem permissão", expected: "Ação bloqueada no frontend e no backend (RLS + verificação de perfil)" },
  ],
};

const SCENARIO_6: TestScenario = {
  id: "cen-06",
  name: "Cancelamento de Pedido",
  description: "Cancelar pedido aprovado e validar reversão financeira",
  steps: [
    { id: "c6-01", step: "Cancelar pedido com status 'aprovado'", expected: "Status muda para 'cancelado', motivo de cancelamento obrigatório" },
    { id: "c6-02", step: "Verificar reversão de contas a receber", expected: "Títulos em aberto cancelados/removidos; títulos já pagos mantidos com flag" },
    { id: "c6-03", step: "Verificar reversão de compromissos (a pagar)", expected: "Comissões e taxas em aberto canceladas automaticamente" },
    { id: "c6-04", step: "Verificar reversão no Livro Razão", expected: "Lançamentos de provisão removidos ou estornados" },
    { id: "c6-05", step: "Verificar DRE após cancelamento", expected: "Receita e despesas do pedido cancelado não aparecem mais na DRE" },
    { id: "c6-06", step: "Verificar audit_log", expected: "Evento de cancelamento registrado com user_id, motivo e timestamp" },
  ],
};

const SCENARIO_7: TestScenario = {
  id: "cen-07",
  name: "Documento Obrigatório Ausente",
  description: "Aprovação bloqueada por falta de documento obrigatório (erp_document_rules)",
  steps: [
    { id: "c7-01", step: "Configurar regra: pedido requer documento 'contrato_assinado' para aprovação", expected: "Regra salva em erp_document_rules com is_mandatory=true" },
    { id: "c7-02", step: "Tentar aprovar pedido SEM o documento", expected: "Aprovação bloqueada com mensagem: 'Documento obrigatório ausente: Contrato Assinado'" },
    { id: "c7-03", step: "Fazer upload do documento obrigatório", expected: "Documento vinculado ao pedido, tipo corresponde à regra" },
    { id: "c7-04", step: "Aprovar pedido COM o documento", expected: "Aprovação executada com sucesso, fluxo financeiro disparado" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 (como TestBlock para manter consistência)
// ══════════════════════════════════════════════════════════════════════

const BLOCK_8: TestBlock = {
  id: "hom-b8",
  number: 8,
  name: "Cenários Obrigatórios",
  objective: "Executar 7 cenários end-to-end que cobrem os fluxos críticos do ERP",
  cases: [
    { id: "b8-01", step: "Executar Cenário 1: Venda Simples", expected: "Todos os 5 passos passam sem erro" },
    { id: "b8-02", step: "Executar Cenário 2: Venda Parcelada", expected: "Todos os 5 passos passam sem erro" },
    { id: "b8-03", step: "Executar Cenário 3: Venda com Comissão", expected: "Todos os 5 passos passam sem erro" },
    { id: "b8-04", step: "Executar Cenário 4: Compra Simples", expected: "Todos os 3 passos passam sem erro" },
    { id: "b8-05", step: "Executar Cenário 5: Acesso Indevido", expected: "Todos os 4 passos passam sem erro" },
    { id: "b8-06", step: "Executar Cenário 6: Cancelamento Pedido", expected: "Todos os 6 passos passam sem erro" },
    { id: "b8-07", step: "Executar Cenário 7: Documento Obrigatório", expected: "Todos os 4 passos passam sem erro" },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// PLANO CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

export const HOMOLOGATION_PLAN: HomologationPlan = {
  name: "Plano de Homologação Funcional e Integrada do ERP",
  objective: "Validar funcionamento integrado ponta a ponta: cadastros, comercial, financeiro, fluxo de caixa, DRE, permissões e auditoria",
  priorityLegend: PRIORITY_LEGEND,
  blocks: [BLOCK_1, BLOCK_2, BLOCK_3, BLOCK_4, BLOCK_5, BLOCK_6, BLOCK_7, BLOCK_8],
  scenarios: [SCENARIO_1, SCENARIO_2, SCENARIO_3, SCENARIO_4, SCENARIO_5, SCENARIO_6, SCENARIO_7],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

export function getTotalTestCases(): number {
  const blockCases = HOMOLOGATION_PLAN.blocks.reduce((sum, b) => sum + b.cases.length, 0);
  const scenarioSteps = HOMOLOGATION_PLAN.scenarios.reduce((sum, s) => sum + s.steps.length, 0);
  return blockCases + scenarioSteps;
}

export function getTestSummary() {
  return {
    totalBlocks: HOMOLOGATION_PLAN.blocks.length,
    totalScenarios: HOMOLOGATION_PLAN.scenarios.length,
    totalCases: getTotalTestCases(),
    byBlock: HOMOLOGATION_PLAN.blocks.map(b => ({
      block: b.number,
      name: b.name,
      cases: b.cases.length,
    })),
    byScenario: HOMOLOGATION_PLAN.scenarios.map(s => ({
      name: s.name,
      steps: s.steps.length,
    })),
  };
}

export function getPendingTests(): TestCase[] {
  const allCases = [
    ...HOMOLOGATION_PLAN.blocks.flatMap(b => b.cases),
    ...HOMOLOGATION_PLAN.scenarios.flatMap(s => s.steps),
  ];
  return allCases.filter(c => !c.result || c.result === "pendente");
}

export function getFailedTests(): TestCase[] {
  const allCases = [
    ...HOMOLOGATION_PLAN.blocks.flatMap(b => b.cases),
    ...HOMOLOGATION_PLAN.scenarios.flatMap(s => s.steps),
  ];
  return allCases.filter(c => c.result === "falhou");
}
