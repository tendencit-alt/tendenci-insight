export type BusinessSegment =
  | "servicos"
  | "comercio"
  | "industria"
  | "arquitetura"
  | "moveis_planejados"
  | "personalizado";

export type TeamSize = "solo" | "ate_5" | "6_20" | "21_50" | "50_mais";

export type PrimaryGoal =
  | "organizar_financeiro"
  | "controlar_projetos"
  | "acompanhar_vendas"
  | "implantar_gestao_completa";

export type FinancialMaturity = "iniciante" | "intermediario" | "avancado";

export interface BusinessProfile {
  segment: BusinessSegment | null;
  team_size: TeamSize | null;
  primary_goal: PrimaryGoal | null;
  financial_maturity: FinancialMaturity | null;
  chart_template: BusinessSegment | null;
}

export const SEGMENT_LABELS: Record<BusinessSegment, string> = {
  servicos: "Serviços",
  comercio: "Comércio",
  industria: "Indústria",
  arquitetura: "Arquitetura",
  moveis_planejados: "Móveis Planejados",
  personalizado: "Personalizado",
};

export const TEAM_SIZE_LABELS: Record<TeamSize, string> = {
  solo: "Apenas eu",
  ate_5: "Até 5 pessoas",
  "6_20": "6 a 20 pessoas",
  "21_50": "21 a 50 pessoas",
  "50_mais": "Mais de 50",
};

export const GOAL_LABELS: Record<PrimaryGoal, string> = {
  organizar_financeiro: "Organizar o financeiro",
  controlar_projetos: "Controlar projetos",
  acompanhar_vendas: "Acompanhar vendas",
  implantar_gestao_completa: "Implantar gestão completa",
};

export const MATURITY_LABELS: Record<FinancialMaturity, string> = {
  iniciante: "Iniciante – começando agora",
  intermediario: "Intermediário – já tenho controles",
  avancado: "Avançado – DRE e fluxo formais",
};

export interface OnboardingTask {
  key: string;
  label: string;
  description: string;
  route?: string;
  weight: number; // weight for progress %
  priority: boolean;
}

export const ONBOARDING_TASKS: OnboardingTask[] = [
  { key: "setup_completed", label: "Perfil da empresa", description: "Definir segmento, equipe e objetivo", route: "/onboarding", weight: 15, priority: true },
  { key: "chart_template", label: "Plano de contas", description: "Aplicar plano de contas inicial", route: "/financeiro/configuracoes", weight: 20, priority: true },
  { key: "first_bank_account", label: "Conta bancária", description: "Cadastrar primeira conta", route: "/financeiro/contas", weight: 15, priority: true },
  { key: "first_entry", label: "Primeiro lançamento", description: "Criar primeira despesa ou receita", route: "/financeiro", weight: 15, priority: true },
  { key: "first_dashboard", label: "Dashboard inicial", description: "Visualizar painel executivo", route: "/dashboard", weight: 10, priority: true },
  { key: "first_cost_center", label: "Centro de custo", description: "Criar primeiro centro de custo", route: "/financeiro/configuracoes", weight: 5, priority: false },
  { key: "first_project", label: "Primeiro projeto", description: "Criar primeiro projeto", route: "/projetos", weight: 5, priority: false },
  { key: "first_client", label: "Primeiro cliente", description: "Cadastrar primeiro cliente", route: "/clientes", weight: 5, priority: false },
  { key: "first_goal", label: "Primeira meta", description: "Definir uma meta financeira", route: "/financeiro/planejamento", weight: 5, priority: false },
  { key: "first_reconciliation", label: "Conciliação", description: "Realizar primeira conciliação", route: "/financeiro/conciliacao", weight: 5, priority: false },
];
