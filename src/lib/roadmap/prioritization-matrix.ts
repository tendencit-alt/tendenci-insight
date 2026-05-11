// ══════════════════════════════════════════════════════════════════════
// MATRIZ OFICIAL DE PRIORIZAÇÃO DO ERP
// MVP → Fase 2 → Fase 3
// ══════════════════════════════════════════════════════════════════════

export type Phase = "mvp" | "fase_2" | "fase_3";

export interface RoadmapItem {
  id: string;
  name: string;
  module: string;
  phase: Phase;
  category: "entidade" | "tela" | "automacao" | "regra" | "infra";
  // 4 critérios de priorização
  fechaFluxoPrincipal: boolean;
  geraValorImediato: boolean;
  dependeDeOutraBase: boolean;
  obrigacaoOuDiferencial: "obrigacao" | "diferencial";
  description: string;
  dependencies?: string[];
}

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — MVP
// Ciclo completo: Cliente → Orçamento → Pedido → Produção →
// Faturamento → CR → CP → Conciliação → DRE → Fluxo → Dashboard
// ══════════════════════════════════════════════════════════════════════

const MVP_ITEMS: RoadmapItem[] = [
  // ── INFRAESTRUTURA BASE ──
  { id: "mvp-multi-tenant", name: "Multi-tenant básico", module: "Sistema", phase: "mvp", category: "infra",
    fechaFluxoPrincipal: true, geraValorImediato: false, dependeDeOutraBase: false, obrigacaoOuDiferencial: "obrigacao",
    description: "Isolamento por tenant_id, RLS em todas as tabelas, trigger set_tenant_id" },
  { id: "mvp-auth", name: "Autenticação e perfis essenciais", module: "Sistema", phase: "mvp", category: "infra",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: false, obrigacaoOuDiferencial: "obrigacao",
    description: "Login, signup, perfis (Admin, Financeiro, Comercial, Operacional), permissões básicas" },
  { id: "mvp-onboarding", name: "Onboarding inicial", module: "Sistema", phase: "mvp", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Wizard de configuração: empresa, plano de contas, contas bancárias, usuários",
    dependencies: ["mvp-auth", "mvp-multi-tenant"] },
  { id: "mvp-company-settings", name: "Configurações da empresa", module: "Sistema", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Razão social, CNPJ, regime tributário, logo, cores",
    dependencies: ["mvp-multi-tenant"] },

  // ── CADASTROS PRINCIPAIS ──
  { id: "mvp-plano-contas", name: "Plano de Contas padrão", module: "Controladoria", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: false, dependeDeOutraBase: false, obrigacaoOuDiferencial: "obrigacao",
    description: "Hierarquia até 9 níveis, 6 raízes DRE, seed padrão no onboarding" },
  { id: "mvp-centro-custo", name: "Centros de Custo", module: "Controladoria", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: false, obrigacaoOuDiferencial: "obrigacao",
    description: "CRUD de centros de custo com alocação em lançamentos" },
  { id: "mvp-contas-bancarias", name: "Contas bancárias", module: "Financeiro", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: false, obrigacaoOuDiferencial: "obrigacao",
    description: "Cadastro de contas, saldo inicial, banco/agência/conta" },
  { id: "mvp-clientes", name: "Clientes", module: "Comercial", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: false, obrigacaoOuDiferencial: "obrigacao",
    description: "PF/PJ, CPF/CNPJ, endereço, contato, dados fiscais" },
  { id: "mvp-fornecedores", name: "Fornecedores", module: "Cadastros", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: false, obrigacaoOuDiferencial: "obrigacao",
    description: "Cadastro com dados fiscais e bancários para CP" },
  { id: "mvp-produtos", name: "Produtos / Matéria-prima", module: "Cadastros", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: false, obrigacaoOuDiferencial: "obrigacao",
    description: "Itens vendáveis e insumos com custo e preço" },

  // ── COMERCIAL ──
  { id: "mvp-orcamentos", name: "Orçamentos", module: "Comercial", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Proposta com itens, valores, validade. Conversão em pedido",
    dependencies: ["mvp-clientes", "mvp-produtos"] },
  { id: "mvp-pedidos", name: "Pedidos de Venda", module: "Comercial", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Pedido completo com itens, condição pagamento, centro custo, aprovação",
    dependencies: ["mvp-clientes", "mvp-produtos", "mvp-centro-custo"] },
  { id: "mvp-condicao-pagamento", name: "Condição de pagamento", module: "Comercial", phase: "mvp", category: "regra",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "À vista, parcelado boleto, cartão — taxas e prazos",
    dependencies: ["mvp-pedidos"] },
  { id: "mvp-contratos-simples", name: "Contratos simples", module: "Comercial", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Vinculação contrato ↔ pedido, status básico, valor",
    dependencies: ["mvp-pedidos", "mvp-clientes"] },

  // ── OPERACIONAL ──
  { id: "mvp-producao-simples", name: "Produção simplificada", module: "Operacional", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "OP com etapas, status, vínculo com pedido. Sem complexidade de BOM",
    dependencies: ["mvp-pedidos"] },
  { id: "mvp-status-pedido-op", name: "Status do pedido no operacional", module: "Operacional", phase: "mvp", category: "regra",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Visão operacional do pipeline: aguardando → em produção → concluído → liberado",
    dependencies: ["mvp-pedidos", "mvp-producao-simples"] },
  { id: "mvp-liberacao-faturamento", name: "Liberação para faturamento", module: "Operacional", phase: "mvp", category: "regra",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Produção concluída → libera faturamento → gera CR",
    dependencies: ["mvp-producao-simples"] },
  { id: "mvp-entregas-basicas", name: "Entregas básicas", module: "Operacional", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Registro de entrega com data, responsável, status",
    dependencies: ["mvp-pedidos"] },

  // ── COMPRAS ──
  { id: "mvp-solicitacao-compra", name: "Solicitação de compra simples", module: "Compras", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Requisição interna básica com itens e justificativa",
    dependencies: ["mvp-produtos"] },
  { id: "mvp-pedido-compra", name: "Pedido de compra simples", module: "Compras", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Ordem de compra com vínculo fornecedor → gera CP",
    dependencies: ["mvp-fornecedores", "mvp-produtos"] },

  // ── FINANCEIRO ──
  { id: "mvp-contas-pagar", name: "Contas a Pagar", module: "Financeiro", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Títulos de saída com vencimento, categoria, centro custo, projeto",
    dependencies: ["mvp-plano-contas", "mvp-centro-custo", "mvp-contas-bancarias"] },
  { id: "mvp-contas-receber", name: "Contas a Receber", module: "Financeiro", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Títulos de entrada com vencimento, categoria, centro custo, projeto",
    dependencies: ["mvp-plano-contas", "mvp-centro-custo", "mvp-contas-bancarias"] },
  { id: "mvp-tesouraria", name: "Tesouraria (Livro Razão)", module: "Financeiro", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Lançamentos com data caixa, data competência, sincronização bidirecional CP/CR",
    dependencies: ["mvp-contas-pagar", "mvp-contas-receber"] },
  { id: "mvp-conciliacao", name: "Conciliação bancária", module: "Financeiro", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Importação OFX/CSV, matching automático, baixa de títulos",
    dependencies: ["mvp-tesouraria", "mvp-contas-bancarias"] },
  { id: "mvp-projetos-financeiros", name: "Projetos financeiros automáticos", module: "Controladoria", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Auto-gerado PED-{numero} {cliente} ao aprovar pedido",
    dependencies: ["mvp-pedidos"] },
  { id: "mvp-fluxo-caixa", name: "Fluxo de Caixa clean", module: "Financeiro", phase: "mvp", category: "tela",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Visão diária/semanal/mensal com saldo projetado, filtros por conta/centro custo",
    dependencies: ["mvp-tesouraria"] },
  { id: "mvp-dre", name: "DRE gerencial clean", module: "Financeiro", phase: "mvp", category: "tela",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "6 raízes, 5 linhas calculadas, competência, comparativo mês anterior",
    dependencies: ["mvp-plano-contas", "mvp-tesouraria"] },

  // ── CONTROLADORIA MVP ──
  { id: "mvp-classificacao-auto", name: "Classificação automática básica", module: "Controladoria", phase: "mvp", category: "automacao",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Sugestão de categoria baseada em histórico de descrição",
    dependencies: ["mvp-plano-contas", "mvp-tesouraria"] },

  // ── GESTÃO E UX ──
  { id: "mvp-dashboard", name: "Dashboard por perfil", module: "Gestão", phase: "mvp", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "KPIs principais por perfil (financeiro, comercial, operacional, admin)",
    dependencies: ["mvp-auth"] },
  { id: "mvp-central-operacional", name: "Central Operacional", module: "Gestão", phase: "mvp", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Workspace diário: pendências, tarefas, agenda, atalhos rápidos",
    dependencies: ["mvp-auth"] },
  { id: "mvp-notificacoes", name: "Notificações principais", module: "Sistema", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Alertas de vencimento, aprovações, tarefas atribuídas",
    dependencies: ["mvp-auth"] },
  { id: "mvp-tarefas", name: "Tarefas principais", module: "Sistema", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "CRUD de tarefas com vínculo a entidades, responsável, prazo",
    dependencies: ["mvp-auth"] },
  { id: "mvp-metas-simples", name: "Metas simples", module: "Planejamento", phase: "mvp", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Meta mensal de receita/despesa com % atingido e alertas",
    dependencies: ["mvp-dre", "mvp-fluxo-caixa"] },

  // ── AUTOMAÇÕES MVP ──
  { id: "mvp-auto-pedido-provisoes", name: "Pedido aprovado → provisões", module: "Automação", phase: "mvp", category: "automacao",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Gera compromissos sobre vendas (CP) e projeto financeiro ao aprovar pedido",
    dependencies: ["mvp-pedidos", "mvp-contas-pagar", "mvp-projetos-financeiros"] },
  { id: "mvp-auto-pedido-projeto", name: "Pedido → projeto financeiro", module: "Automação", phase: "mvp", category: "automacao",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Cria projeto PED-{numero} {cliente} automaticamente",
    dependencies: ["mvp-pedidos", "mvp-projetos-financeiros"] },
  { id: "mvp-auto-faturamento-cr", name: "Pedido faturado → CR", module: "Automação", phase: "mvp", category: "automacao",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Gera contas a receber ao faturar pedido",
    dependencies: ["mvp-pedidos", "mvp-contas-receber"] },
  { id: "mvp-auto-conciliacao", name: "Extrato → sugestão conciliação", module: "Automação", phase: "mvp", category: "automacao",
    fechaFluxoPrincipal: true, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Match automático de transações bancárias com títulos por valor/data",
    dependencies: ["mvp-conciliacao"] },
  { id: "mvp-auto-status-workflow", name: "Workflow de status principal", module: "Automação", phase: "mvp", category: "automacao",
    fechaFluxoPrincipal: true, geraValorImediato: false, dependeDeOutraBase: true, obrigacaoOuDiferencial: "obrigacao",
    description: "Máquina de status com transições permitidas, bloqueios e log",
    dependencies: ["mvp-pedidos"] },

  // ── TELAS PADRÃO ──
  { id: "mvp-list-view", name: "Componente ListView universal", module: "Sistema", phase: "mvp", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: false, obrigacaoOuDiferencial: "obrigacao",
    description: "Header, filtros, tabela, paginação, export, badges, seleção em massa" },
  { id: "mvp-form-view", name: "Componente FormView universal", module: "Sistema", phase: "mvp", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: false, obrigacaoOuDiferencial: "obrigacao",
    description: "Header, seções, validação, timeline, documentos, auditoria" },
];

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — FASE 2
// Refinamento, automações avançadas, controles mais sofisticados
// ══════════════════════════════════════════════════════════════════════

const FASE2_ITEMS: RoadmapItem[] = [
  { id: "f2-aprovacao-multi", name: "Aprovação multi-etapas", module: "Sistema", phase: "fase_2", category: "regra",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Workflow de aprovação por valor, categoria, com múltiplos aprovadores",
    dependencies: ["mvp-pedidos", "mvp-auth"] },
  { id: "f2-docs-versionamento", name: "Documentos com versionamento", module: "Sistema", phase: "fase_2", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Histórico de versões, substituição rastreada, regras de obrigatoriedade",
    dependencies: ["mvp-form-view"] },
  { id: "f2-orcamento-completo", name: "Orçamento completo (budget)", module: "Controladoria", phase: "fase_2", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Planejamento por categoria × mês, previsto vs realizado, variação %",
    dependencies: ["mvp-plano-contas", "mvp-dre"] },
  { id: "f2-forecast", name: "Forecast financeiro", module: "Planejamento", phase: "fase_2", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Projeção de fechamento baseada em tendência + títulos futuros",
    dependencies: ["mvp-fluxo-caixa", "mvp-dre", "mvp-metas-simples"] },
  { id: "f2-assistencia-tecnica", name: "Assistência técnica completa", module: "Operacional", phase: "fase_2", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Ocorrência → assistência → custo → impacto DRE",
    dependencies: ["mvp-pedidos", "mvp-entregas-basicas"] },
  { id: "f2-automacoes-condicionais", name: "Automações condicionais avançadas", module: "Automação", phase: "fase_2", category: "automacao",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Regras com condições por valor, empresa, categoria + ações de bloqueio",
    dependencies: ["mvp-auto-status-workflow"] },
  { id: "f2-dre-multivisao", name: "DRE multivisão", module: "Financeiro", phase: "fase_2", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "DRE por centro custo, por projeto, por empresa, comparativo anual",
    dependencies: ["mvp-dre"] },
  { id: "f2-auditoria-avancada", name: "Auditoria avançada", module: "Sistema", phase: "fase_2", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: false, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Diff visual de alterações, filtros por usuário/período, export",
    dependencies: ["mvp-auth"] },
  { id: "f2-relatorios-analiticos", name: "Relatórios analíticos profundos", module: "Relatórios", phase: "fase_2", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Aging, inadimplência, rentabilidade por projeto, análise vendedor",
    dependencies: ["mvp-contas-pagar", "mvp-contas-receber", "mvp-projetos-financeiros"] },
  { id: "f2-menu-adaptativo", name: "Menu adaptativo por perfil", module: "Sistema", phase: "fase_2", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Sidebar e atalhos ajustados conforme profile_type do usuário",
    dependencies: ["mvp-auth"] },
  { id: "f2-financiamentos", name: "Financiamentos e parcelas", module: "Financeiro", phase: "fase_2", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Empréstimos com separação principal/juros, parcelas → CP automático",
    dependencies: ["mvp-contas-pagar"] },
  { id: "f2-comissoes-avancadas", name: "Comissões avançadas", module: "Comercial", phase: "fase_2", category: "regra",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Comissões por vendedor, profissional parceiro, produção com regras e apuração",
    dependencies: ["mvp-pedidos"] },
  { id: "f2-recebimento-compra", name: "Recebimento de compra completo", module: "Compras", phase: "fase_2", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Conferência de itens, aceite parcial, vínculo com NF",
    dependencies: ["mvp-pedido-compra"] },
  { id: "f2-crm-avancado", name: "CRM pipeline avançado", module: "Comercial", phase: "fase_2", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Kanban com cadências, follow-up automático, métricas de conversão",
    dependencies: ["mvp-clientes"] },
  { id: "f2-gestao-profissionais parceiros", name: "Gestão de profissionais parceiros/indicadores", module: "Comercial", phase: "fase_2", category: "entidade",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Cadastro de profissionais parceiros, indicações, projetos, timeline, comissões",
    dependencies: ["mvp-clientes", "mvp-pedidos"] },
];

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — FASE 3
// IA, predição, analytics premium, consolidação avançada
// ══════════════════════════════════════════════════════════════════════

const FASE3_ITEMS: RoadmapItem[] = [
  { id: "f3-ia-classificacao", name: "IA avançada de classificação", module: "Controladoria", phase: "fase_3", category: "automacao",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "ML para classificar lançamentos com confiança %, aprendizado contínuo",
    dependencies: ["mvp-classificacao-auto"] },
  { id: "f3-previsoes-auto", name: "Previsões automáticas", module: "Planejamento", phase: "fase_3", category: "automacao",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Projeção de receita e despesa por série temporal, sazonalidade",
    dependencies: ["f2-forecast"] },
  { id: "f3-score-risco", name: "Score de risco financeiro", module: "Financeiro", phase: "fase_3", category: "automacao",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Score de saúde por cliente, fornecedor, projeto baseado em histórico",
    dependencies: ["f2-relatorios-analiticos"] },
  { id: "f3-simulacoes", name: "Simulações avançadas (what-if)", module: "Planejamento", phase: "fase_3", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Cenários pessimista/otimista, impacto de decisões no fluxo e DRE",
    dependencies: ["f2-forecast", "mvp-dre"] },
  { id: "f3-forecast-preditivo", name: "Forecast preditivo com IA", module: "Planejamento", phase: "fase_3", category: "automacao",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Projeção inteligente combinando pipeline comercial + histórico + sazonalidade",
    dependencies: ["f2-forecast", "f3-previsoes-auto"] },
  { id: "f3-consolidacao-multi", name: "Consolidação multiempresa avançada", module: "Controladoria", phase: "fase_3", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "DRE e Fluxo consolidados entre tenants, eliminações intercompany",
    dependencies: ["mvp-dre", "mvp-fluxo-caixa", "mvp-multi-tenant"] },
  { id: "f3-automacoes-custom", name: "Automações complexas customizadas", module: "Automação", phase: "fase_3", category: "automacao",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Builder visual de regras, encadeamento de ações, webhooks externos",
    dependencies: ["f2-automacoes-condicionais"] },
  { id: "f3-analytics-premium", name: "Analytics estratégicos premium", module: "Relatórios", phase: "fase_3", category: "tela",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Dashboards interativos, drill-down, cohorts, exportação BI",
    dependencies: ["f2-relatorios-analiticos"] },
  { id: "f3-ai-copilot", name: "Copilot financeiro com IA", module: "Sistema", phase: "fase_3", category: "automacao",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "Assistente conversacional: perguntas sobre DRE, fluxo, alertas inteligentes",
    dependencies: ["mvp-dre", "mvp-fluxo-caixa"] },
  { id: "f3-api-publica", name: "API pública e integrações", module: "Sistema", phase: "fase_3", category: "infra",
    fechaFluxoPrincipal: false, geraValorImediato: true, dependeDeOutraBase: true, obrigacaoOuDiferencial: "diferencial",
    description: "REST API documentada, webhooks, integrações com contabilidade e NF-e",
    dependencies: ["mvp-auth", "mvp-multi-tenant"] },
];

// ══════════════════════════════════════════════════════════════════════
// EXPORTAÇÕES
// ══════════════════════════════════════════════════════════════════════

export const ROADMAP: RoadmapItem[] = [...MVP_ITEMS, ...FASE2_ITEMS, ...FASE3_ITEMS];

export const MVP = MVP_ITEMS;
export const FASE_2 = FASE2_ITEMS;
export const FASE_3 = FASE3_ITEMS;

export function getItemsByPhase(phase: Phase): RoadmapItem[] {
  return ROADMAP.filter((i) => i.phase === phase);
}

export function getItemsByModule(module: string): RoadmapItem[] {
  return ROADMAP.filter((i) => i.module === module);
}

export function getDependencyChain(itemId: string): RoadmapItem[] {
  const item = ROADMAP.find((i) => i.id === itemId);
  if (!item?.dependencies) return [];
  const deps: RoadmapItem[] = [];
  for (const depId of item.dependencies) {
    const dep = ROADMAP.find((i) => i.id === depId);
    if (dep) {
      deps.push(...getDependencyChain(dep.id), dep);
    }
  }
  return [...new Map(deps.map((d) => [d.id, d])).values()];
}

// ══════════════════════════════════════════════════════════════════════
// SUMÁRIO
// ══════════════════════════════════════════════════════════════════════

export const ROADMAP_SUMMARY = {
  mvp: {
    label: "MVP",
    total: MVP_ITEMS.length,
    modules: Array.from(new Set(MVP_ITEMS.map((i) => i.module))),
    focus: "Ciclo completo: Cliente → Pedido → Produção → Faturamento → Financeiro → DRE → Fluxo",
  },
  fase_2: {
    label: "Fase 2",
    total: FASE2_ITEMS.length,
    modules: Array.from(new Set(FASE2_ITEMS.map((i) => i.module))),
    focus: "Refinamento, automações condicionais, relatórios analíticos, multi-visão DRE",
  },
  fase_3: {
    label: "Fase 3",
    total: FASE3_ITEMS.length,
    modules: Array.from(new Set(FASE3_ITEMS.map((i) => i.module))),
    focus: "IA, predição, simulações, consolidação multiempresa, analytics premium",
  },
} as const;
