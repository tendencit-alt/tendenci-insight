// ══════════════════════════════════════════════════════════════════════
// DECOMPOSIÇÃO TÉCNICA — SPRINT 8: RH OPERACIONAL, APONTAMENTO E CUSTEIO
// ══════════════════════════════════════════════════════════════════════

import type { DecompositionBlock, DecompositionItem, SprintDecomposition } from "./sprint1-decomposition";

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — COLABORADORES
// ══════════════════════════════════════════════════════════════════════

const BLOCK_1: DecompositionBlock = {
  id: "s8-b1-employees",
  number: 1,
  name: "Cadastro de Colaboradores",
  objective: "CRUD de colaboradores com custo-hora, tipo de vínculo e vínculo a empresa/unidade",
  status: "pending",
  doneWhen: [
    "Tabela 'employees' com nome, cargo, departamento, custo_hora, tipo_vinculo, status",
    "Tipos vínculo: CLT, PJ, terceiro, temporário",
    "Campos: empresa, unidade, equipe, data_admissao, data_desligamento",
    "CRUD completo com listagem, filtros, detalhamento",
    "RLS por tenant_id",
  ],
  items: [
    {
      id: "s8-b1-01",
      name: "Tabela employees e CRUD",
      status: "pending",
      existing: [
        "profiles com dados de usuário do sistema (login)",
        "Nenhuma tabela de colaboradores operacionais existe",
      ],
      gaps: [
        "Criar tabela 'employees' (id, tenant_id, name, role_title, department, hourly_cost, contract_type [clt/pj/terceiro/temporario], status [ativo/inativo/ferias/afastado], company, unit, team_id, hire_date, termination_date, phone, email, notes, profile_id nullable ref profiles, created_at, updated_at, created_by)",
        "RLS: tenant_id = get_user_tenant_id()",
        "UI: EmployeesPage com listagem, filtros (status, departamento, tipo vínculo), busca",
        "UI: CreateEmployeeDialog com formulário completo",
        "UI: EmployeeDetailSheet com detalhe lateral e histórico de apontamentos",
        "Trigger updated_at automático",
      ],
      files: [],
      estimatedHoursRemaining: 10,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — EQUIPES OPERACIONAIS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_2: DecompositionBlock = {
  id: "s8-b2-teams",
  number: 2,
  name: "Equipes Operacionais",
  objective: "Organização de colaboradores em equipes com responsável, permitindo múltiplas equipes",
  status: "pending",
  doneWhen: [
    "Tabela 'work_teams' com nome, responsável, status",
    "Tabela 'work_team_members' (N:N) para colaborador × equipe",
    "CRUD de equipes com gestão de membros",
    "Colaborador pode participar de múltiplas equipes",
  ],
  items: [
    {
      id: "s8-b2-01",
      name: "Tabelas e UI de equipes",
      status: "pending",
      existing: [],
      gaps: [
        "Criar tabela 'work_teams' (id, tenant_id, name, leader_id ref employees, status, notes, created_at, updated_at)",
        "Criar tabela 'work_team_members' (id, team_id ref work_teams, employee_id ref employees, role_in_team, joined_at, left_at, active)",
        "RLS: tenant_id = get_user_tenant_id()",
        "UI: WorkTeamsManager com CRUD e gestão de membros",
        "UI: AddTeamMemberDialog com busca de colaborador",
        "Badge de equipe no card do colaborador",
      ],
      files: [],
      estimatedHoursRemaining: 6,
      dependencies: ["s8-b1-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — APONTAMENTO DE HORAS PRODUÇÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_3: DecompositionBlock = {
  id: "s8-b3-production-timesheet",
  number: 3,
  name: "Apontamento de Horas — Produção",
  objective: "Registro de horas por colaborador/etapa de produção com validação e aprovação",
  status: "pending",
  doneWhen: [
    "Tabela 'time_entries_production' com colaborador, OP, etapa, data, hora_inicio, hora_fim, total_horas, status",
    "Status: registrado, validado, aprovado",
    "UI de registro com seleção de OP e etapa",
    "Cálculo automático de total_horas",
    "Validação de sobreposição de horários",
  ],
  items: [
    {
      id: "s8-b3-01",
      name: "Tabela e UI de apontamento produção",
      status: "pending",
      existing: [
        "production_orders com etapas de produção",
        "production_stages/phases no PCP existente",
      ],
      gaps: [
        "Criar tabela 'time_entries' (id, tenant_id, employee_id ref employees, entry_type [producao/montagem/indireto], production_order_id nullable, production_stage nullable, order_id nullable, project_id nullable, cost_center_id nullable, activity nullable, date, start_time, end_time, total_hours numeric, status [registrado/validado/aprovado], validated_by nullable, validated_at nullable, approved_by nullable, approved_at nullable, notes, created_at, created_by)",
        "NOTA: tabela unificada 'time_entries' com entry_type para evitar 3 tabelas separadas",
        "RLS: tenant_id = get_user_tenant_id()",
        "UI: TimesheetProductionForm com seleção de OP, etapa, colaborador, horários",
        "Cálculo automático total_horas = end_time - start_time",
        "Validação de sobreposição (mesmo colaborador, mesmo dia, horários conflitantes)",
        "Fluxo: registrado → validado (supervisor) → aprovado (gestor)",
      ],
      files: [],
      estimatedHoursRemaining: 10,
      dependencies: ["s8-b1-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — APONTAMENTO DE HORAS MONTAGEM
// ══════════════════════════════════════════════════════════════════════

const BLOCK_4: DecompositionBlock = {
  id: "s8-b4-assembly-timesheet",
  number: 4,
  name: "Apontamento de Horas — Montagem",
  objective: "Registro de horas de montagem por colaborador/equipe vinculado a pedido/projeto",
  status: "pending",
  doneWhen: [
    "Apontamento tipo 'montagem' na tabela time_entries",
    "Vínculo a pedido e projeto",
    "Apontamento coletivo de equipe (batch insert para múltiplos colaboradores)",
    "Resumo de horas por pedido/projeto",
  ],
  items: [
    {
      id: "s8-b4-01",
      name: "UI de apontamento montagem + coletivo",
      status: "pending",
      existing: [
        "Tabela time_entries (unificada, criada no Bloco 3)",
      ],
      gaps: [
        "UI: TimesheetAssemblyForm com seleção de pedido, projeto, colaborador(es)",
        "Apontamento coletivo: selecionar equipe → inserir time_entries para cada membro",
        "TeamTimesheetDialog: selecionar equipe → preencher horários → batch insert",
        "Filtros de montagem na listagem de apontamentos",
      ],
      files: [],
      estimatedHoursRemaining: 6,
      dependencies: ["s8-b3-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — APONTAMENTO HORAS INDIRETAS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_5: DecompositionBlock = {
  id: "s8-b5-indirect-timesheet",
  number: 5,
  name: "Apontamento de Horas — Indiretas",
  objective: "Registro de horas não-produtivas vinculadas a centro de custo e atividade",
  status: "pending",
  doneWhen: [
    "Apontamento tipo 'indireto' na tabela time_entries",
    "Atividades: manutenção, limpeza, organização, reunião, treinamento + custom",
    "Vínculo a centro de custo",
    "KPI de horas indiretas por período/colaborador",
  ],
  items: [
    {
      id: "s8-b5-01",
      name: "UI de apontamento indireto",
      status: "pending",
      existing: [
        "Tabela time_entries (unificada, criada no Bloco 3)",
        "fin_cost_centers para centros de custo",
      ],
      gaps: [
        "UI: TimesheetIndirectForm com seleção de centro de custo e atividade",
        "Lista de atividades padrão + campo livre para custom",
        "Tabela 'indirect_activities' (id, tenant_id, name, active) para atividades configuráveis",
        "KPI de horas indiretas agrupado por atividade/CC/colaborador",
      ],
      files: [],
      estimatedHoursRemaining: 4,
      dependencies: ["s8-b3-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — ENGINE CUSTO-HORA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_6: DecompositionBlock = {
  id: "s8-b6-hourly-cost-engine",
  number: 6,
  name: "Engine de Custo-Hora",
  objective: "Cálculo automático: horas apontadas × custo-hora do colaborador",
  status: "pending",
  doneWhen: [
    "Coluna computed_cost em time_entries = total_hours × employee.hourly_cost",
    "Trigger ou cálculo em tempo real no frontend",
    "Suporte a custo-hora variável por período (histórico de custo)",
    "Resumo de custo por OP/projeto/CC",
  ],
  items: [
    {
      id: "s8-b6-01",
      name: "Cálculo de custo por apontamento",
      status: "pending",
      existing: [
        "employees.hourly_cost para custo-hora do colaborador",
        "time_entries.total_hours para horas apontadas",
      ],
      gaps: [
        "Adicionar coluna 'hourly_cost_snapshot' e 'computed_cost' em time_entries",
        "Trigger: ao inserir time_entry, copiar hourly_cost do employee e calcular computed_cost",
        "Opcional: tabela 'employee_cost_history' (id, employee_id, hourly_cost, valid_from, valid_to) para histórico",
        "RPC ou view: resumo de custo por OP, por projeto, por CC",
      ],
      files: [],
      estimatedHoursRemaining: 4,
      dependencies: ["s8-b3-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 7 — CUSTO REAL ORDEM DE PRODUÇÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_7: DecompositionBlock = {
  id: "s8-b7-production-order-cost",
  number: 7,
  name: "Custo Real da Ordem de Produção",
  objective: "Somar materiais + horas produção + horas montagem + terceiros e comparar com previsto",
  status: "pending",
  doneWhen: [
    "Componente CustoRealOP com breakdown: materiais, horas produção, horas montagem, serviços",
    "Custo previsto (orçamento) vs custo real com diferença % e indicador visual",
    "Atualização em tempo real conforme apontamentos são registrados",
    "Drill-down por categoria de custo",
  ],
  items: [
    {
      id: "s8-b7-01",
      name: "Dashboard de custo real da OP",
      status: "pending",
      existing: [
        "production_orders com vínculo a order_items",
        "production_products com cmv_total (custo de material)",
        "stock_movements com reference_type para consumo",
      ],
      gaps: [
        "RPC 'production_order_real_cost(op_id)' que soma: materiais (stock_movements tipo consumo_producao), horas produção (time_entries tipo producao where production_order_id), horas montagem (time_entries tipo montagem where order_id), serviços terceiros (fin_payables vinculados à OP)",
        "UI: ProductionOrderCostCard com breakdown visual (materiais, MO produção, MO montagem, terceiros)",
        "Comparador: custo previsto (orçamento/BOM) vs custo real com Δ% e semáforo (verde < 5%, amarelo 5-15%, vermelho > 15%)",
        "Integrar no detalhe da OP existente",
      ],
      files: [],
      estimatedHoursRemaining: 8,
      dependencies: ["s8-b6-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 — CUSTO REAL DO PROJETO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_8: DecompositionBlock = {
  id: "s8-b8-project-cost",
  number: 8,
  name: "Custo Real do Projeto",
  objective: "Consolidar todos os custos do projeto: materiais, horas, compras, serviços, despesas",
  status: "pending",
  doneWhen: [
    "Componente CustoRealProjeto com consolidação de todas as fontes",
    "Fontes: materiais consumidos, horas (produção + montagem), compras (POs), serviços terceiros, despesas vinculadas (fin_payables)",
    "Comparador com orçamento original",
    "Margem real do projeto = receita - custo real",
  ],
  items: [
    {
      id: "s8-b8-01",
      name: "Dashboard de custo real do projeto",
      status: "pending",
      existing: [
        "fin_projects para projetos financeiros",
        "fin_ledger_entries com project_id para despesas vinculadas",
        "Conceito de DRE por projeto no Sprint 6",
      ],
      gaps: [
        "RPC 'project_real_cost(project_id)' que agrega: materiais (stock_movements com project_id), horas (time_entries com project_id, computed_cost), compras (purchase_orders com project), fin_payables com project_id, fin_receivables com project_id (receita)",
        "UI: ProjectCostDashboard com cards de custo por categoria + gráfico de evolução",
        "Cálculo de margem real: receita (fin_receivables) - custo total",
        "Comparação: orçamento original (budget) vs custo real acumulado",
        "Timeline de evolução de custo ao longo do tempo",
      ],
      files: [],
      estimatedHoursRemaining: 8,
      dependencies: ["s8-b7-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 9 — PRODUTIVIDADE COLABORADOR
// ══════════════════════════════════════════════════════════════════════

const BLOCK_9: DecompositionBlock = {
  id: "s8-b9-employee-productivity",
  number: 9,
  name: "Indicadores de Produtividade — Colaborador",
  objective: "Métricas individuais: horas produtivas, improdutivas, indiretas e % eficiência",
  status: "pending",
  doneWhen: [
    "KPIs por colaborador: total horas, % produtivo, % indireto, custo total",
    "Ranking de colaboradores por produtividade",
    "Gráfico de distribuição de horas por tipo",
    "Filtro por período",
  ],
  items: [
    {
      id: "s8-b9-01",
      name: "Dashboard de produtividade individual",
      status: "pending",
      existing: [
        "time_entries com entry_type e employee_id",
      ],
      gaps: [
        "RPC 'employee_productivity(employee_id, date_from, date_to)' que calcula: horas produção, horas montagem, horas indiretas, total, % produtivo",
        "UI: EmployeeProductivityCard com pie chart (produção/montagem/indireto) + KPIs",
        "Ranking: tabela de colaboradores ordenável por % produtividade",
        "Filtros: período, departamento, tipo vínculo",
      ],
      files: [],
      estimatedHoursRemaining: 6,
      dependencies: ["s8-b6-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 10 — PRODUTIVIDADE EQUIPE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_10: DecompositionBlock = {
  id: "s8-b10-team-productivity",
  number: 10,
  name: "Indicadores de Produtividade — Equipe",
  objective: "Métricas de equipe: tempo execução, volume produzido, entregas concluídas",
  status: "pending",
  doneWhen: [
    "KPIs por equipe: horas totais, custo total, OPs concluídas, entregas concluídas",
    "Comparação entre equipes",
    "Gráfico de evolução ao longo do tempo",
  ],
  items: [
    {
      id: "s8-b10-01",
      name: "Dashboard de produtividade de equipe",
      status: "pending",
      existing: [
        "work_teams e work_team_members para composição",
        "time_entries para horas",
      ],
      gaps: [
        "RPC 'team_productivity(team_id, date_from, date_to)' que agrega horas dos membros da equipe",
        "UI: TeamProductivityCard com bar chart comparativo entre equipes",
        "Métricas: tempo médio por OP, volume produzido (OPs concluídas), entregas",
        "Ranking de equipes por eficiência",
      ],
      files: [],
      estimatedHoursRemaining: 5,
      dependencies: ["s8-b2-01", "s8-b9-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 11 — PRODUTIVIDADE POR ETAPA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_11: DecompositionBlock = {
  id: "s8-b11-stage-productivity",
  number: 11,
  name: "Indicadores de Produtividade — Etapa",
  objective: "Tempo médio por etapa de produção (corte, CNC, conferência, montagem)",
  status: "pending",
  doneWhen: [
    "Tempo médio por etapa calculado a partir de apontamentos",
    "Comparação: tempo padrão vs tempo real",
    "Identificação de gargalos (etapas mais lentas)",
    "Tendência ao longo do tempo",
  ],
  items: [
    {
      id: "s8-b11-01",
      name: "Dashboard de produtividade por etapa",
      status: "pending",
      existing: [
        "production_stages com nomes de etapa",
        "time_entries com production_stage",
      ],
      gaps: [
        "RPC 'stage_productivity(date_from, date_to)' que calcula: avg(total_hours) por production_stage",
        "UI: StageProductivityChart com bar chart horizontal de tempo médio por etapa",
        "Tabela: etapa, tempo médio, desvio padrão, min, max, quantidade OPs",
        "Indicador de gargalo: etapa com maior tempo médio destacada",
        "Comparação com tempo padrão (se configurado)",
      ],
      files: [],
      estimatedHoursRemaining: 5,
      dependencies: ["s8-b3-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 12 — INTEGRAÇÃO DRE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_12: DecompositionBlock = {
  id: "s8-b12-dre-integration",
  number: 12,
  name: "Integração com DRE",
  objective: "Horas indiretas → custos fixos, horas produção → custos produção, horas montagem → custos operacionais",
  status: "pending",
  doneWhen: [
    "Lançamentos automáticos no Livro Razão baseados em apontamentos aprovados",
    "Mapeamento: horas indiretas → conta de custos fixos",
    "Mapeamento: horas produção → conta de custos de produção",
    "Mapeamento: horas montagem → conta de custos operacionais",
    "Configuração de contas destino por tipo de apontamento",
  ],
  items: [
    {
      id: "s8-b12-01",
      name: "Automação apontamento → Livro Razão",
      status: "pending",
      existing: [
        "fin_ledger_entries como fonte de verdade do razão",
        "fin_chart_accounts com plano de contas hierárquico",
        "Trigger de sincronização já existe para pedidos e compras",
      ],
      gaps: [
        "Criar tabela 'timesheet_account_mapping' (id, tenant_id, entry_type [producao/montagem/indireto], chart_account_id ref fin_chart_accounts, cost_center_id nullable, active)",
        "Trigger: ao aprovar apontamento (status → aprovado), gerar fin_ledger_entry com: valor = computed_cost, conta = mapping por entry_type, CC = do apontamento ou do mapping, project_id = do apontamento",
        "Reversão: se apontamento for desaprovado, reverter lançamento",
        "UI de configuração: TimesheetAccountMappingSettings para definir contas destino",
        "Idempotência: limpar e recriar lançamentos ao re-aprovar",
      ],
      files: [],
      estimatedHoursRemaining: 8,
      dependencies: ["s8-b6-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// SPRINT 8 CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

export const SPRINT_8_DECOMPOSITION: SprintDecomposition = {
  sprint: 8,
  name: "RH Operacional, Apontamento de Horas e Custeio Real por Projeto",
  objective: "Colaboradores → Equipes → Apontamento (Produção/Montagem/Indireto) → Custo Real OP/Projeto → Produtividade → DRE",
  totalBlocks: 12,
  totalItems: 12,
  estimatedHoursRemaining: 80,
  blocks: [
    BLOCK_1, BLOCK_2, BLOCK_3, BLOCK_4, BLOCK_5, BLOCK_6,
    BLOCK_7, BLOCK_8, BLOCK_9, BLOCK_10, BLOCK_11, BLOCK_12,
  ],
  doneCriteria: [
    "Cadastrar colaboradores com custo-hora e tipo vínculo",
    "Cadastrar equipes operacionais com membros",
    "Registrar apontamento de horas produção por OP/etapa",
    "Registrar apontamento de horas montagem por pedido/projeto (individual e coletivo)",
    "Registrar apontamento de horas indiretas por centro de custo/atividade",
    "Calcular custo-hora automático (horas × custo colaborador)",
    "Calcular custo real da ordem de produção (materiais + horas + terceiros)",
    "Calcular custo real do projeto (todas as fontes consolidadas)",
    "Visualizar produtividade por colaborador (% produtivo/indireto)",
    "Visualizar produtividade por equipe (ranking comparativo)",
    "Visualizar produtividade por etapa (tempo médio, gargalos)",
    "Integrar horas aprovadas com DRE via Livro Razão",
  ],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

export function getSprint8PendingItems(): DecompositionItem[] {
  return SPRINT_8_DECOMPOSITION.blocks.flatMap(b =>
    b.items.filter(i => i.status !== "done" && i.status !== "not_needed")
  );
}

export function getSprint8ReadyItems(): DecompositionItem[] {
  const doneIds = new Set(
    SPRINT_8_DECOMPOSITION.blocks
      .flatMap(b => b.items)
      .filter(i => i.status === "done")
      .map(i => i.id)
  );
  return getSprint8PendingItems().filter(item =>
    item.dependencies.every(dep => doneIds.has(dep))
  );
}

export function getSprint8BlockSummary() {
  return SPRINT_8_DECOMPOSITION.blocks.map(b => ({
    block: b.number,
    name: b.name,
    status: b.status,
    hoursRemaining: b.items.reduce((sum, i) => sum + i.estimatedHoursRemaining, 0),
  }));
}
