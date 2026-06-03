import { useMemo } from "react";

// ── Types ──
export type FlowPriority = "info" | "warning" | "critical";

export interface FlowStep {
  id: string;
  label: string;
  description?: string;
  owner?: string; // role or user
  expectedHours?: number;
  route?: string;
}

export interface FlowStepState extends FlowStep {
  status: "done" | "active" | "blocked" | "pending";
  blocker?: string;
  elapsedHours?: number;
  isLate?: boolean;
}

export interface FlowDefinition {
  id: string;
  name: string;
  icon: string;
  category: "comercial" | "producao" | "financeiro" | "fechamento";
  steps: FlowStep[];
}

export interface FlowInstance {
  flowId: string;
  name: string;
  icon: string;
  category: string;
  steps: FlowStepState[];
  progress: number; // 0-100
  currentStep: FlowStepState | null;
  nextStep: FlowStepState | null;
  blockers: FlowStepState[];
  bottleneck: FlowStepState | null;
}

// ── Flow Templates ──
const FLOW_TEMPLATES: FlowDefinition[] = [
  {
    id: "comercial",
    name: "Fluxo Comercial",
    icon: "🛒",
    category: "comercial",
    steps: [
      { id: "lead", label: "Lead", owner: "Comercial", expectedHours: 24, route: "/crm" },
      { id: "orcamento", label: "Orçamento", owner: "Comercial", expectedHours: 48, route: "/orcamentos" },
      { id: "pedido", label: "Pedido", owner: "Comercial", expectedHours: 8, route: "/pedidos" },
      { id: "contrato", label: "Contrato", owner: "Comercial", expectedHours: 24, route: "/pedidos" },
      { id: "liberacao", label: "Liberação Produção", owner: "Operacional", expectedHours: 4, route: "/producao-operacoes" },
    ],
  },
  {
    id: "producao",
    name: "Fluxo Produção",
    icon: "🏭",
    category: "producao",
    steps: [
      { id: "pedido-liberado", label: "Pedido Liberado", owner: "Comercial", expectedHours: 4 },
      { id: "medicao", label: "Medição Obra", owner: "Operacional", expectedHours: 48, route: "/producao-operacoes" },
      { id: "projeto-exec", label: "Projeto Executivo", owner: "Operacional", expectedHours: 72 },
      { id: "compra-material", label: "Compra Material", owner: "Operacional", expectedHours: 48, route: "/fornecedores" },
      { id: "corte", label: "Corte", owner: "Operacional", expectedHours: 24 },
      { id: "conferencia", label: "Conferência", owner: "Operacional", expectedHours: 8 },
      { id: "embalagem", label: "Embalagem", owner: "Operacional", expectedHours: 8 },
      { id: "envio", label: "Envio", owner: "Operacional", expectedHours: 24 },
      { id: "montagem", label: "Montagem", owner: "Operacional", expectedHours: 48 },
    ],
  },
  {
    id: "financeiro",
    name: "Fluxo Financeiro",
    icon: "💰",
    category: "financeiro",
    steps: [
      { id: "gerar-receber", label: "Gerar Contas a Receber", owner: "Financeiro", expectedHours: 2, route: "/contas-receber" },
      { id: "gerar-pagar", label: "Gerar Contas a Pagar", owner: "Financeiro", expectedHours: 2, route: "/contas-pagar" },
      { id: "conciliacao", label: "Conciliação", owner: "Financeiro", expectedHours: 24, route: "/conciliacao" },
      { id: "baixa", label: "Baixa", owner: "Financeiro", expectedHours: 4, route: "/financeiro" },
    ],
  },
  {
    id: "fechamento",
    name: "Fechamento Mensal",
    icon: "📅",
    category: "fechamento",
    steps: [
      { id: "conciliacao-f", label: "Conciliação Bancária", owner: "Financeiro", expectedHours: 48, route: "/conciliacao" },
      { id: "classificacao", label: "Classificação Lançamentos", owner: "Financeiro", expectedHours: 24, route: "/financeiro" },
      { id: "auditoria", label: "Auditoria", owner: "Controladoria", expectedHours: 24, route: "/auditoria" },
      { id: "centros-custo", label: "Conferência Centros Custo", owner: "Controladoria", expectedHours: 16 },
      { id: "dre-validada", label: "DRE Validada", owner: "Controladoria", expectedHours: 8, route: "/dre" },
      { id: "resultado-fechado", label: "Resultado Fechado", owner: "Owner", expectedHours: 4 },
    ],
  },
];

// ── Simulated step state resolver ──
// In production this would query real DB state; here we derive from audit_log / orders etc.
function resolveStepStates(flow: FlowDefinition): FlowStepState[] {
  // Demo: show first 2 steps as done, 3rd as active, rest pending
  // Real implementation would check actual DB records
  return flow.steps.map((step, i) => {
    let status: FlowStepState["status"] = "pending";
    let blocker: string | undefined;
    let elapsedHours: number | undefined;
    let isLate = false;

    if (i === 0) {
      status = "done";
    } else if (i === 1) {
      status = "active";
      elapsedHours = (step.expectedHours || 8) * 0.6;
    } else if (i === 2 && flow.category === "producao") {
      status = "blocked";
      blocker = "Material não comprado";
    }

    if (status === "active" && step.expectedHours && elapsedHours && elapsedHours > step.expectedHours) {
      isLate = true;
    }

    return { ...step, status, blocker, elapsedHours, isLate };
  });
}

function computeProgress(steps: FlowStepState[]): number {
  if (steps.length === 0) return 0;
  const done = steps.filter(s => s.status === "done").length;
  const active = steps.filter(s => s.status === "active").length;
  return Math.round(((done + active * 0.5) / steps.length) * 100);
}

function findBottleneck(steps: FlowStepState[]): FlowStepState | null {
  const late = steps.filter(s => s.isLate || s.status === "blocked");
  if (late.length === 0) return null;
  return late.reduce((worst, s) => {
    const worstDelay = (worst.elapsedHours || 0) - (worst.expectedHours || 0);
    const sDelay = (s.elapsedHours || 0) - (s.expectedHours || 0);
    return s.status === "blocked" || sDelay > worstDelay ? s : worst;
  });
}

// ── Hook ──
export function useFlowLayer() {
  const flows = useMemo<FlowInstance[]>(() => {
    return FLOW_TEMPLATES.map(template => {
      const steps = resolveStepStates(template);
      const progress = computeProgress(steps);
      const currentStep = steps.find(s => s.status === "active") || null;
      const currentIdx = currentStep ? steps.indexOf(currentStep) : -1;
      const nextStep = currentIdx >= 0 && currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;
      const blockers = steps.filter(s => s.status === "blocked");
      const bottleneck = findBottleneck(steps);

      return {
        flowId: template.id,
        name: template.name,
        icon: template.icon,
        category: template.category,
        steps,
        progress,
        currentStep,
        nextStep,
        blockers,
        bottleneck,
      };
    });
  }, []);

  const getFlow = (id: string) => flows.find(f => f.flowId === id);

  const totalBlockers = flows.reduce((sum, f) => sum + f.blockers.length, 0);

  return { flows, getFlow, totalBlockers };
}
