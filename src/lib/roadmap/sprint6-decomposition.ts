// ══════════════════════════════════════════════════════════════════════
// DECOMPOSIÇÃO TÉCNICA — SPRINT 6: CONTROLADORIA E BI EXECUTIVO
// Detalhamento bloco-a-bloco com status, gaps e dependências
// ══════════════════════════════════════════════════════════════════════

import type { DecompositionBlock, DecompositionItem, SprintDecomposition } from "./sprint1-decomposition";

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — ENGINE DRE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_1: DecompositionBlock = {
  id: "s6-b1-dre-engine",
  number: 1,
  name: "Engine DRE Automática",
  objective: "DRE gerencial completa com 6 raízes, 5 linhas calculadas e filtros multidimensionais",
  status: "done",
  doneWhen: [
    "DRE hierárquica baseada em fin_ledger_entries + fin_chart_accounts",
    "6 raízes: Receitas, Desp. Vendas, Desp. Operacionais, Depreciação, Resultado Financeiro, Capital",
    "5 linhas calculadas automaticamente: Receita Líquida, Margem Contribuição, EBITDA, RAI, Resultado Líquido",
    "Filtragem por competence_date",
    "Drill-down por categoria até lançamentos individuais",
    "Exportação CSV",
  ],
  items: [
    {
      id: "s6-b1-01",
      name: "DRETab com engine completa",
      status: "done",
      existing: [
        "DRETab (1034 linhas) com engine DRE completa",
        "Hierarquia do plano de contas até 9 níveis via buildTree()",
        "numericCodeSort para ordenação por código contábil",
        "6 raízes com natureza padronizada e participação DRE/Fluxo",
        "5 linhas calculadas injetadas como itens virtuais (isCalculated=true)",
        "Filtragem por competence_date exclusivamente",
        "Drill-down via EntryDetailsDialog",
        "Exportação CSV",
        "AccountsStatusTooltip para status de classificação",
        "Resolução de rateio via fin_ledger_splits quando filtro CC ativo",
        "CostCenterSubFilter para filtro por centro de custo",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/DRETab.tsx",
        "src/components/financeiro/EntryDetailsDialog.tsx",
        "src/components/financeiro/AccountsStatusTooltip.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — MARGEM DE CONTRIBUIÇÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_2: DecompositionBlock = {
  id: "s6-b2-margin",
  number: 2,
  name: "Margem de Contribuição Automática",
  objective: "Cálculo automático: Receita Líquida - Custos Diretos - Comissões",
  status: "done",
  doneWhen: [
    "Receita Líquida = Receitas (R1) - Despesas sobre Vendas (R2)",
    "Margem de Contribuição = RL - Custos Diretos - Comissões",
    "Filtros: período, centro custo, projeto, cliente, vendedor",
    "Valor e percentual exibidos",
  ],
  items: [
    {
      id: "s6-b2-01",
      name: "Margem de Contribuição calculada",
      status: "done",
      existing: [
        "Linha virtual 'Receita Líquida' = Raiz 1 - Raiz 2",
        "Linha virtual 'Margem de Contribuição' = RL - Custos Diretos (2.1+2.2) - Comissões (2.4)",
        "Cálculo automático no DRETab",
        "Filtros globais aplicados: período, CC, projeto, cliente, vendedor",
        "KPIs no DashboardBI com Margem de Contribuição",
      ],
      gaps: [],
      files: ["src/components/financeiro/DRETab.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — EBITDA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_3: DecompositionBlock = {
  id: "s6-b3-ebitda",
  number: 3,
  name: "EBITDA Automático",
  objective: "EBITDA = Margem de Contribuição - Despesas Operacionais",
  status: "done",
  doneWhen: [
    "EBITDA = MC - Despesas Operacionais (R3)",
    "Linha virtual exibida no DRE",
    "KPI no BI Dashboard",
  ],
  items: [
    {
      id: "s6-b3-01",
      name: "EBITDA calculado",
      status: "done",
      existing: [
        "Linha virtual 'EBITDA' = Margem de Contribuição - Despesas Operacionais (Raiz 3)",
        "Exibido no DRETab como linha calculada destacada",
        "KPI no DashboardBI",
        "Modo Executivo no CashflowTab também exibe EBITDA",
      ],
      gaps: [],
      files: ["src/components/financeiro/DRETab.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — RESULTADO LÍQUIDO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_4: DecompositionBlock = {
  id: "s6-b4-net-result",
  number: 4,
  name: "Resultado Líquido Automático",
  objective: "RAI e Resultado Líquido com impostos condicionais ao regime tributário",
  status: "done",
  doneWhen: [
    "RAI = EBITDA - Depreciação (R4) + Resultado Financeiro (R5)",
    "Resultado Líquido = RAI - Impostos (R7) [condicional]",
    "Raiz 7 oculta para Simples Nacional",
    "Regime tributário lido de company_settings.tax_regime",
  ],
  items: [
    {
      id: "s6-b4-01",
      name: "Resultado Líquido com regime condicional",
      status: "done",
      existing: [
        "Linha virtual 'RAI' = EBITDA - Depreciação (R4) + Resultado Financeiro (R5)",
        "Linha virtual 'Resultado Líquido' = RAI - Impostos (R7)",
        "Lógica condicional: company_settings.tax_regime",
        "Simples Nacional → oculta R7 e linha Resultado Líquido",
        "Lucro Presumido/Real → exibe IRPJ, CSLL, Adicional e calcula RL",
      ],
      gaps: [],
      files: ["src/components/financeiro/DRETab.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — ORÇAMENTO DRE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_5: DecompositionBlock = {
  id: "s6-b5-budget-dre",
  number: 5,
  name: "Orçamento DRE",
  objective: "Orçamento por categoria, mês, centro custo e projeto com versionamento",
  status: "done",
  doneWhen: [
    "Tabela fin_budgets com chart_account_id, month, year, amount",
    "Filtros: cost_center_id, project_id, client_id, vendedor_id, order_id",
    "Versionamento (version field)",
    "UI de gestão de orçamento",
    "Integração com DRE para comparação",
  ],
  items: [
    {
      id: "s6-b5-01",
      name: "Tabela fin_budgets",
      status: "done",
      existing: [
        "fin_budgets com amount, chart_account_id, month, year, version",
        "cost_center_id, project_id, client_id, vendedor_id, order_id",
        "notes, tenant_id, created_by, RLS",
        "FKs para chart_accounts, cost_centers, projects, clients, profiles",
      ],
      gaps: [],
      files: [],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s6-b5-02",
      name: "UI de orçamento",
      status: "partial",
      existing: [
        "PlanejamentoFinanceiro (1388 linhas) com metas em 3 camadas",
        "FinancialGoalsManager com gestão de metas",
        "Alertas visuais por % atingido",
        "Projeção de fechamento de mês",
      ],
      gaps: [
        "Criar tela de entrada de orçamento mensal por categoria (spreadsheet-like)",
        "Permitir copiar orçamento do ano anterior como base",
        "Permitir ajuste percentual em massa (ex: +10% em todas as categorias)",
        "Controle de versões de orçamento (draft → aprovado)",
        "Visão por centro de custo do orçamento",
      ],
      files: ["src/components/financeiro/PlanejamentoFinanceiro.tsx"],
      estimatedHoursRemaining: 10,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — COMPARADOR DRE REALIZADO VS ORÇADO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_6: DecompositionBlock = {
  id: "s6-b6-dre-comparison",
  number: 6,
  name: "Comparador DRE Realizado vs Orçado",
  objective: "Colunas: Realizado | Orçado | Δ R$ | Δ % com status visual",
  status: "partial",
  doneWhen: [
    "DRE com colunas: Realizado | Meta/Orçado | Diferença R$ | Diferença %",
    "Status visual: verde (atingiu/superou), amarelo (parcial), vermelho (abaixo)",
    "Filtro por período e dimensões",
    "Toggle para mostrar/ocultar colunas de orçamento",
  ],
  items: [
    {
      id: "s6-b6-01",
      name: "Colunas orçado vs realizado no DRE",
      status: "partial",
      existing: [
        "DRETab já possui campo 'Meta' na estrutura DRELine (realizedValue)",
        "Layout de grade responsiva com colunas fixas",
        "Largura 'Realizado' 120px para estabilidade",
        "PlanejamentoFinanceiro com comparação realizado vs meta por KPI",
      ],
      gaps: [
        "Carregar fin_budgets por mês/ano e chart_account_id no DRETab",
        "Adicionar coluna 'Orçado' ao lado de 'Realizado'",
        "Calcular Δ R$ (Realizado - Orçado) e Δ % ((Real-Orç)/Orç * 100)",
        "Colorir: verde se favorável, vermelho se desfavorável (receita: real > orç = verde; despesa: real < orç = verde)",
        "Toggle para mostrar/ocultar colunas de comparação",
        "Tooltip com detalhes do desvio",
      ],
      files: ["src/components/financeiro/DRETab.tsx"],
      estimatedHoursRemaining: 8,
      dependencies: ["s6-b5-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 7 — COMPARADOR FLUXO PREVISTO VS REALIZADO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_7: DecompositionBlock = {
  id: "s6-b7-cashflow-comparison",
  number: 7,
  name: "Comparador Fluxo Previsto vs Realizado",
  objective: "Entradas/saídas previstas vs realizadas com desvio e saldo projetado vs real",
  status: "partial",
  doneWhen: [
    "Tabela lado-a-lado: Categoria | Previsto | Realizado | Desvio R$ | Desvio %",
    "Saldo previsto vs saldo real acumulado",
    "Gráfico comparativo (barras agrupadas)",
    "Drill-down por categoria",
    "Filtro por período mensal",
  ],
  items: [
    {
      id: "s6-b7-01",
      name: "Comparador Previsto vs Realizado",
      status: "partial",
      existing: [
        "CashflowTab com 7 blocos hierárquicos",
        "Modo Executivo com Burn Rate, Runway, Geração Operacional",
        "Saldo Projetado 30/90 dias",
        "DRECashflowView com DRE e Fluxo lado a lado",
        "PlanejamentoFinanceiro com metas e % atingido",
      ],
      gaps: [
        "Criar componente ForecastVsActualComparator dedicado",
        "Calcular 'Previsto' = lançamentos com status ABERTO (due_date no período)",
        "Calcular 'Realizado' = lançamentos com cash_date no período",
        "Tabela: Categoria | Previsto | Realizado | Δ R$ | Δ %",
        "Saldo acumulado previsto vs realizado por dia/semana/mês",
        "Gráfico de barras agrupadas (previsto vs realizado)",
        "Drill-down por categoria/linha para ver lançamentos",
        "Exportação CSV/PDF do comparativo",
      ],
      files: [
        "src/components/financeiro/CashflowTab.tsx",
        "src/components/financeiro/DRECashflowView.tsx",
      ],
      estimatedHoursRemaining: 10,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 — BI EXECUTIVO CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_8: DecompositionBlock = {
  id: "s6-b8-bi-executive",
  number: 8,
  name: "BI Executivo Consolidado",
  objective: "Dashboard com 9+ KPIs financeiros, gráficos e drill-down",
  status: "done",
  doneWhen: [
    "KPIs: Receita Bruta, Margem, Resultado, EBITDA, Resultado Líquido",
    "KPIs: Burn Rate, Runway, Saldo Caixa Atual, Saldo Projetado",
    "Gráficos de evolução temporal",
    "Drill-down por categoria",
    "Filtros globais: período, CC, projeto, cliente, vendedor",
  ],
  items: [
    {
      id: "s6-b8-01",
      name: "DashboardBI com KPIs e gráficos",
      status: "done",
      existing: [
        "DashboardBI (508 linhas) com KPIs financeiros completos",
        "Saldo bancário, Receitas, Despesas, Resultado do período",
        "Drill-down por categoria com expandir/colapsar",
        "CostCenterKPIs (512 linhas) com KPIs por centro de custo",
        "ProjectKPIs (526 linhas) com KPIs por projeto",
        "FinanceiroKPIs com cards resumo",
        "FinanceiroCharts com gráficos",
        "FinanceiroAlerts com alertas inteligentes",
        "PendingAlertsCard com pendências",
        "Filtros globais aplicados: período, CC, projeto, cliente, vendedor, pedido",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/DashboardBI.tsx",
        "src/components/financeiro/CostCenterKPIs.tsx",
        "src/components/financeiro/ProjectKPIs.tsx",
        "src/components/financeiro/FinanceiroKPIs.tsx",
        "src/components/financeiro/FinanceiroCharts.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
    {
      id: "s6-b8-02",
      name: "Modo Executivo no Fluxo de Caixa",
      status: "done",
      existing: [
        "ExecutiveView (477 linhas) com visão simplificada",
        "Burn Rate, Runway, Geração Operacional de Caixa",
        "Saldo Projetado 30/90 dias",
        "Alerta de Saldo Mínimo de Segurança",
        "Toggle para alternar entre modo detalhado e executivo",
      ],
      gaps: [],
      files: ["src/components/financeiro/ExecutiveView.tsx"],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 9 — DRE POR CENTRO DE CUSTO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_9: DecompositionBlock = {
  id: "s6-b9-dre-cc",
  number: 9,
  name: "DRE por Centro de Custo",
  objective: "DRE filtrada por centro de custo com resolução de rateio",
  status: "done",
  doneWhen: [
    "Filtro por centro de custo no DRE",
    "Resolução de rateio via fin_ledger_splits",
    "Valores proporcionais quando lançamento rateado",
    "KPIs por centro de custo no BI",
  ],
  items: [
    {
      id: "s6-b9-01",
      name: "DRE com filtro por CC e rateio",
      status: "done",
      existing: [
        "CostCenterSubFilter como componente de filtro dedicado",
        "DRETab aplica filtro cost_center_id na query",
        "Resolução de rateio: consulta fin_ledger_splits para lançamentos com has_splits=true",
        "Valor proporcional calculado por split percentage",
        "CostCenterKPIs com visão dedicada por CC",
        "CostCenterEntriesDialog para drill-down por CC",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/CostCenterSubFilter.tsx",
        "src/components/financeiro/CostCenterKPIs.tsx",
        "src/components/financeiro/CostCenterEntriesDialog.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 10 — DRE POR PROJETO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_10: DecompositionBlock = {
  id: "s6-b10-dre-project",
  number: 10,
  name: "DRE por Projeto",
  objective: "DRE filtrada por projeto financeiro com KPIs dedicados",
  status: "done",
  doneWhen: [
    "Filtro por projeto no DRE",
    "KPIs por projeto: receita, custo, margem, resultado",
    "Drill-down por projeto",
  ],
  items: [
    {
      id: "s6-b10-01",
      name: "DRE com filtro por projeto",
      status: "done",
      existing: [
        "DRETab aplica filtro project_id na query",
        "ProjectKPIs (526 linhas) com visão dedicada por projeto",
        "ProjectKPIsDialog para detalhamento por projeto",
        "FinProjectsManager com gestão de projetos financeiros",
        "Projetos gerados automaticamente de pedidos (PED-{numero} {client})",
      ],
      gaps: [],
      files: [
        "src/components/financeiro/ProjectKPIs.tsx",
        "src/components/financeiro/masters/ProjectKPIsDialog.tsx",
        "src/components/financeiro/masters/FinProjectsManager.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 11 — DRE CONSOLIDADA MULTIVISÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_11: DecompositionBlock = {
  id: "s6-b11-dre-consolidated",
  number: 11,
  name: "DRE Consolidada Multivisão",
  objective: "Alternância entre visões: consolidada, por empresa, unidade, projeto, CC",
  status: "partial",
  doneWhen: [
    "Toggle de visão: Consolidada | Por CC | Por Projeto | Por Cliente | Por Vendedor",
    "Colunas lado-a-lado por dimensão selecionada",
    "Total consolidado + individuais",
    "Exportação comparativa",
  ],
  items: [
    {
      id: "s6-b11-01",
      name: "DRE Multivisão com colunas comparativas",
      status: "partial",
      existing: [
        "DRETab aceita filtros de CC, projeto, cliente, vendedor",
        "DRECashflowView com DRE e Fluxo lado a lado",
        "CostCenterKPIs e ProjectKPIs já mostram comparativos por dimensão",
        "Filtros globais funcionais para todas as dimensões",
      ],
      gaps: [
        "Criar modo 'Colunas Comparativas' no DRE: selecionar dimensão (CC, Projeto, Cliente) e exibir uma coluna por item",
        "Exemplo: DRE com colunas 'Planejados | Náutico | Rústico | TOTAL'",
        "Limitar a N dimensões mais relevantes + coluna Total",
        "Exportação CSV com todas as colunas",
        "Alternância entre modo filtro-único e modo multi-coluna",
      ],
      files: ["src/components/financeiro/DRETab.tsx"],
      estimatedHoursRemaining: 12,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// SPRINT 6 CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

export const SPRINT_6_DECOMPOSITION: SprintDecomposition = {
  sprint: 6,
  name: "Controladoria e BI Executivo",
  objective: "DRE automática, EBITDA, Margem, Resultado Líquido, Orçamento, Comparadores e BI consolidado",
  totalBlocks: 11,
  totalItems: 14,
  estimatedHoursRemaining: 40,
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
  ],
  doneCriteria: [
    "Visualizar DRE automática com 6 raízes e hierarquia até 9 níveis",
    "Margem de Contribuição calculada automaticamente (RL - Custos - Comissões)",
    "EBITDA calculado automaticamente (MC - Desp. Operacionais)",
    "RAI = EBITDA - Depreciação + Resultado Financeiro",
    "Resultado Líquido condicional ao regime tributário",
    "Orçamento DRE por categoria, mês, CC e projeto com versionamento",
    "Comparar DRE Realizado vs Orçado com Δ R$ e Δ % e status visual",
    "Comparar Fluxo Previsto vs Realizado com gráfico comparativo",
    "BI Executivo com 9+ KPIs: Receita, Margem, EBITDA, RL, Burn Rate, Runway, Saldo",
    "DRE filtrada por Centro de Custo com resolução de rateio",
    "DRE filtrada por Projeto com KPIs dedicados",
    "DRE Multivisão com colunas comparativas por dimensão",
    "Exportação de todos os relatórios em CSV",
    "Dados 100% do banco de dados interno (nunca de APIs externas)",
  ],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

export function getSprint6PendingItems(): DecompositionItem[] {
  return SPRINT_6_DECOMPOSITION.blocks.flatMap(b =>
    b.items.filter(i => i.status !== "done" && i.status !== "not_needed")
  );
}

export function getSprint6ReadyItems(): DecompositionItem[] {
  const doneIds = new Set(
    SPRINT_6_DECOMPOSITION.blocks
      .flatMap(b => b.items)
      .filter(i => i.status === "done")
      .map(i => i.id)
  );
  return getSprint6PendingItems().filter(item =>
    item.dependencies.every(dep => doneIds.has(dep))
  );
}

export function getSprint6BlockSummary() {
  return SPRINT_6_DECOMPOSITION.blocks.map(b => ({
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
