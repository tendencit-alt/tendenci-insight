import type { IntentDefinition, SearchContext, SearchEntityType } from "./types";

export const INTENT_REGISTRY: IntentDefinition[] = [
  {
    key: "contas-vencendo-hoje",
    patterns: [/contas?\s+vencendo\s+hoje/i, /vence\s+hoje/i, /vencimento\s+hoje/i],
    label: "Contas vencendo hoje",
    description: "Abrir lista de contas com vencimento na data atual",
    route: "/financeiro?filter=due_today",
    type: "intent",
  },
  {
    key: "contas-vencidas",
    patterns: [/contas?\s+vencidas?/i, /atrasadas?/i, /em\s+atraso/i],
    label: "Contas vencidas",
    description: "Lista de contas em atraso",
    route: "/financeiro?filter=overdue",
    type: "intent",
  },
  {
    key: "pipeline-parado",
    patterns: [/pipeline\s+parad/i, /oportunidades?\s+parad/i, /sem\s+atualiza/i],
    label: "Pipeline parado",
    description: "Oportunidades sem atualização recente",
    route: "/crm?filter=stale",
    type: "intent",
  },
  {
    key: "projetos-atrasados",
    patterns: [/projetos?\s+atrasad/i, /projetos?\s+em\s+risco/i, /obras?\s+atrasad/i],
    label: "Projetos atrasados",
    description: "Projetos com prazo vencido ou em risco",
    route: "/producao-operacoes?filter=delayed",
    type: "intent",
  },
  {
    key: "fluxo-30-dias",
    patterns: [/fluxo\s+(de\s+)?caixa\s+30/i, /fluxo\s+30\s+dias/i, /caixa\s+pr[oó]ximos\s+30/i],
    label: "Fluxo de caixa 30 dias",
    description: "Projeção de caixa para os próximos 30 dias",
    route: "/bi-dashboard?view=cashflow&period=30d",
    type: "intent",
  },
  {
    key: "dre-mes",
    patterns: [/dre\s+(do\s+)?m[eê]s/i, /resultado\s+(do\s+)?m[eê]s/i, /demonstrativo/i],
    label: "DRE do mês",
    description: "Demonstrativo de resultados do mês corrente",
    route: "/bi-dashboard?view=dre&period=current_month",
    type: "intent",
  },
  {
    key: "forecast-vendas",
    patterns: [/forecast\s+vend/i, /previs[aã]o\s+vend/i, /forecast/i],
    label: "Forecast de vendas",
    description: "Projeção comercial",
    route: "/bi-dashboard?view=forecast",
    type: "intent",
  },
  {
    key: "inadimplencia",
    patterns: [/inadimpl[eê]ncia/i, /clientes?\s+inadimplent/i],
    label: "Inadimplência",
    description: "Clientes inadimplentes e valores em aberto",
    route: "/financeiro?filter=defaulting",
    type: "intent",
  },
  {
    key: "conciliacao-pendente",
    patterns: [/concilia[cç][aã]o/i, /extrato\s+banc/i, /conciliar/i],
    label: "Conciliação bancária pendente",
    description: "Lançamentos aguardando conciliação",
    route: "/financeiro?tab=reconciliation",
    type: "intent",
  },
  {
    key: "metas-mes",
    patterns: [/metas?\s+(do\s+)?m[eê]s/i, /objetivos?\s+(do\s+)?m[eê]s/i],
    label: "Metas do mês",
    description: "Acompanhamento de metas",
    route: "/bi-dashboard?view=goals",
    type: "intent",
  },
];

export const CONTEXT_PRIORITIES: Record<SearchContext, SearchEntityType[]> = {
  financeiro: ["payable", "receivable", "expense", "revenue", "report", "intent"],
  crm: ["client", "order", "intent", "report"],
  operacional: ["project", "order", "supplier", "intent"],
  projetos: ["project", "order", "expense", "intent"],
  relatorios: ["report", "dashboard", "intent"],
  global: ["intent", "client", "order", "project", "payable", "receivable"],
};

export function detectContext(pathname: string): SearchContext {
  if (pathname.startsWith("/financeiro") || pathname.startsWith("/cadastros-financeiros")) return "financeiro";
  if (pathname.startsWith("/crm") || pathname.startsWith("/pedidos")) return "crm";
  if (pathname.startsWith("/producao-operacoes") || pathname.startsWith("/fornecedores")) return "operacional";
  if (pathname.startsWith("/bi-dashboard") || pathname.startsWith("/relatorios")) return "relatorios";
  return "global";
}

export function matchIntent(query: string): IntentDefinition | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  for (const intent of INTENT_REGISTRY) {
    if (intent.patterns.some((p) => p.test(trimmed))) {
      return intent;
    }
  }
  return null;
}
