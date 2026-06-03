import type { Shortcut } from "./types";

// ── Global registry of all known shortcuts ──
export const SHORTCUT_REGISTRY: Shortcut[] = [
  // ── Create actions ──
  {
    id: "new-payable",
    label: "Nova despesa",
    description: "Criar nova conta a pagar",
    icon: "CreditCard",
    route: "/financeiro?tab=payables&new=1",
    keys: "n d",
    profiles: ["owner", "financeiro", "geral"],
    category: "create",
    isDefault: true,
  },
  {
    id: "new-receivable",
    label: "Nova receita",
    description: "Criar nova conta a receber",
    icon: "Wallet",
    route: "/financeiro?tab=receivables&new=1",
    keys: "n r",
    profiles: ["owner", "financeiro", "comercial", "geral"],
    category: "create",
    isDefault: true,
  },
  {
    id: "new-order",
    label: "Novo pedido",
    description: "Criar novo pedido",
    icon: "ClipboardList",
    route: "/pedidos?new=1",
    keys: "n p",
    profiles: ["owner", "comercial", "operacional", "geral"],
    category: "create",
    isDefault: true,
  },
  {
    id: "new-lead",
    label: "Novo lead",
    description: "Cadastrar novo lead/cliente",
    icon: "UserPlus",
    route: "/crm-comercial?new=1",
    keys: "n l",
    profiles: ["comercial"],
    category: "create",
  },
  {
    id: "new-task",
    label: "Nova tarefa",
    description: "Criar tarefa",
    icon: "CheckSquare",
    route: "/tarefas?new=1",
    keys: "n t",
    profiles: ["operacional", "geral"],
    category: "create",
  },
  {
    id: "new-goal",
    label: "Nova meta",
    description: "Definir meta financeira",
    icon: "Target",
    route: "/financeiro?tab=goals&new=1",
    profiles: ["owner", "financeiro"],
    category: "create",
  },

  // ── Navigation ──
  {
    id: "go-cashflow",
    label: "Fluxo de caixa",
    description: "Abrir fluxo de caixa",
    icon: "TrendingUp",
    route: "/bi-dashboard?view=cashflow",
    keys: "g f",
    profiles: ["owner", "financeiro"],
    category: "navigate",
    isDefault: true,
  },
  {
    id: "go-dre",
    label: "DRE",
    description: "Abrir DRE gerencial",
    icon: "BarChart3",
    route: "/bi-dashboard?view=dre",
    keys: "g d",
    profiles: ["owner", "financeiro"],
    category: "navigate",
    isDefault: true,
  },
  {
    id: "go-pipeline",
    label: "Pipeline",
    description: "Abrir CRM / Pipeline",
    icon: "Kanban",
    route: "/crm-comercial",
    keys: "g c",
    profiles: ["owner", "comercial"],
    category: "navigate",
    isDefault: true,
  },
  {
    id: "go-projects",
    label: "Projetos",
    description: "Abrir projetos",
    icon: "FolderKanban",
    route: "/projetos",
    keys: "g p",
    profiles: ["owner", "operacional"],
    category: "navigate",
  },
  {
    id: "go-payables",
    label: "Contas a pagar",
    icon: "ArrowDownCircle",
    route: "/financeiro?tab=payables",
    profiles: ["financeiro", "owner"],
    category: "navigate",
  },
  {
    id: "go-receivables",
    label: "Contas a receber",
    icon: "ArrowUpCircle",
    route: "/financeiro?tab=receivables",
    profiles: ["financeiro", "owner"],
    category: "navigate",
  },
  {
    id: "go-reconciliation",
    label: "Conciliação",
    description: "Conciliação bancária",
    icon: "ArrowLeftRight",
    route: "/financeiro?tab=reconciliation",
    profiles: ["financeiro"],
    category: "navigate",
  },
  {
    id: "go-control-tower",
    label: "Control Tower",
    icon: "LayoutDashboard",
    route: "/control-tower",
    profiles: ["owner"],
    category: "navigate",
  },
  {
    id: "go-forecast",
    label: "Forecast",
    icon: "LineChart",
    route: "/bi-dashboard?view=forecast",
    profiles: ["owner", "financeiro", "comercial"],
    category: "navigate",
  },
  {
    id: "go-week-priorities",
    label: "Prioridades da semana",
    icon: "ListChecks",
    route: "/central-navegacao?view=priorities",
    profiles: ["owner"],
    category: "navigate",
  },
  {
    id: "go-production",
    label: "Produção ativa",
    icon: "Factory",
    route: "/producao-operacoes",
    profiles: ["operacional"],
    category: "navigate",
  },
  {
    id: "go-overdue-orders",
    label: "Ordens atrasadas",
    icon: "AlertTriangle",
    route: "/producao-operacoes?filter=overdue",
    profiles: ["operacional"],
    category: "navigate",
  },
  {
    id: "go-defaulters",
    label: "Inadimplência",
    icon: "AlertCircle",
    route: "/financeiro?tab=receivables&filter=overdue",
    profiles: ["financeiro", "owner"],
    category: "navigate",
  },

  // ── Reports ──
  {
    id: "go-reports",
    label: "KPI's",
    icon: "FileBarChart",
    route: "/relatorios",
    profiles: ["owner", "financeiro", "comercial", "operacional"],
    category: "report",
  },
  {
    id: "go-simulations",
    label: "Simulações",
    icon: "Calculator",
    route: "/planning",
    profiles: ["owner", "financeiro"],
    category: "report",
  },

  // ── Contextual ──
  {
    id: "ctx-export-pdf",
    label: "Exportar PDF",
    icon: "FileDown",
    route: "/relatorios?export=pdf",
    contextRoutes: ["/bi-dashboard", "/relatorios"],
    category: "context",
  },
  {
    id: "ctx-create-proposal",
    label: "Criar proposta",
    icon: "FileText",
    route: "/pedidos?new=1&type=proposal",
    contextRoutes: ["/crm-comercial"],
    category: "context",
  },
  {
    id: "ctx-schedule-followup",
    label: "Agendar follow-up",
    icon: "CalendarClock",
    route: "/crm-comercial?action=followup",
    contextRoutes: ["/crm-comercial"],
    category: "context",
  },
  {
    id: "ctx-create-task",
    label: "Criar tarefa",
    icon: "Plus",
    route: "/tarefas?new=1",
    contextRoutes: ["/projetos", "/producao-operacoes"],
    category: "context",
  },
  {
    id: "ctx-view-margin",
    label: "Ver margem",
    icon: "Percent",
    route: "/bi-dashboard?view=margin",
    contextRoutes: ["/projetos", "/pedidos"],
    category: "context",
  },
];

export const getShortcutById = (id: string) =>
  SHORTCUT_REGISTRY.find((s) => s.id === id);

export const getShortcutsByProfile = (profile: string) =>
  SHORTCUT_REGISTRY.filter(
    (s) => !s.profiles || s.profiles.includes(profile as any)
  );

export const getContextualShortcuts = (currentPath: string) =>
  SHORTCUT_REGISTRY.filter((s) =>
    s.contextRoutes?.some((r) => currentPath.startsWith(r))
  );

export const getDefaultQuickAccess = (): string[] => [
  "new-payable",
  "new-receivable",
  "new-order",
  "go-cashflow",
  "go-dre",
  "go-pipeline",
  "go-projects",
];
