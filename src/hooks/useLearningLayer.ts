import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ───
interface NavEvent {
  route: string;
  label: string;
  ts: number;
}

interface FreqEntry {
  route: string;
  label: string;
  count: number;
  lastAccess: number;
}

export interface WorkflowSuggestion {
  id: string;
  label: string;
  description: string;
  route: string;
}

export type UserMaturity = "iniciante" | "intermediario" | "avancado";
export type CompanyOrientation = "caixa" | "margem" | "volume" | "indefinido";

const STORAGE_KEY = "erp-learning-layer";
const MAX_EVENTS = 200;

function loadEvents(): NavEvent[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveEvents(events: NavEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
}

// ─── Workflow suggestions based on last action ───
const WORKFLOW_MAP: Record<string, WorkflowSuggestion[]> = {
  "/pedidos": [
    { id: "wf-check-fin", label: "Verificar financeiro do pedido", description: "Conferir contas geradas", route: "/financeiro" },
    { id: "wf-send-contract", label: "Gerar contrato", description: "Criar contrato do pedido", route: "/pedidos" },
  ],
  "/financeiro": [
    { id: "wf-reconcile", label: "Conciliar extrato", description: "Conferir lançamentos bancários", route: "/financeiro" },
    { id: "wf-check-dre", label: "Verificar DRE", description: "Conferir resultado do mês", route: "/controladoria" },
  ],
  "/fornecedores": [
    { id: "wf-register-payable", label: "Registrar conta a pagar", description: "Lançar despesa da compra", route: "/financeiro" },
  ],
  "/producao-operacoes": [
    { id: "wf-update-order", label: "Atualizar pedido vinculado", description: "Sincronizar status do pedido", route: "/pedidos" },
  ],
  "/controladoria": [
    { id: "wf-export-report", label: "Exportar relatório", description: "Gerar relatório analítico", route: "/relatorios" },
  ],
};

export function useLearningLayer() {
  const { user } = useAuth();
  const [events, setEvents] = useState<NavEvent[]>(loadEvents);

  // ── Record navigation ──
  const recordNavigation = useCallback((label: string, route: string) => {
    setEvents((prev) => {
      const next = [...prev, { route, label, ts: Date.now() }].slice(-MAX_EVENTS);
      saveEvents(next);
      return next;
    });
  }, []);

  // ── Frequency analysis ──
  const frequencies: FreqEntry[] = useMemo(() => {
    const map = new Map<string, { label: string; count: number; lastAccess: number }>();
    for (const ev of events) {
      const existing = map.get(ev.route);
      if (existing) {
        existing.count++;
        existing.lastAccess = Math.max(existing.lastAccess, ev.ts);
      } else {
        map.set(ev.route, { label: ev.label, count: 1, lastAccess: ev.ts });
      }
    }
    return Array.from(map.entries())
      .map(([route, data]) => ({ route, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  // ── Top modules (adaptive favorites) ──
  const adaptiveFavorites = useMemo(() => frequencies.slice(0, 6), [frequencies]);

  // ── Workflow suggestions based on last navigation ──
  const workflowSuggestions: WorkflowSuggestion[] = useMemo(() => {
    if (events.length === 0) return [];
    const lastRoute = events[events.length - 1].route;
    const baseRoute = "/" + (lastRoute.split("/")[1] || "");
    return WORKFLOW_MAP[baseRoute] || [];
  }, [events]);

  // ── User maturity detection ──
  const userMaturity: UserMaturity = useMemo(() => {
    const uniqueRoutes = new Set(events.map((e) => e.route)).size;
    const totalEvents = events.length;
    if (totalEvents < 20 || uniqueRoutes < 3) return "iniciante";
    if (totalEvents > 100 && uniqueRoutes > 8) return "avancado";
    return "intermediario";
  }, [events]);

  // ── Company orientation detection ──
  const companyOrientation: CompanyOrientation = useMemo(() => {
    const finCount = events.filter((e) => e.route.includes("financeiro") || e.route.includes("controladoria")).length;
    const opsCount = events.filter((e) => e.route.includes("pedido") || e.route.includes("producao")).length;
    const reportCount = events.filter((e) => e.route.includes("relatorio") || e.route.includes("dre")).length;
    const total = events.length || 1;
    if (finCount / total > 0.4) return "caixa";
    if (reportCount / total > 0.3) return "margem";
    if (opsCount / total > 0.4) return "volume";
    return "indefinido";
  }, [events]);

  // ── Detect repetitive patterns (for automation suggestions) ──
  const repetitivePatterns = useMemo(() => {
    const recent = events.slice(-50);
    const sequences = new Map<string, number>();
    for (let i = 0; i < recent.length - 1; i++) {
      const seq = `${recent[i].route} → ${recent[i + 1].route}`;
      sequences.set(seq, (sequences.get(seq) || 0) + 1);
    }
    return Array.from(sequences.entries())
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([seq, count]) => ({ sequence: seq, count }));
  }, [events]);

  // ── Peak usage hours ──
  const peakHours = useMemo(() => {
    const hourMap = new Map<number, number>();
    for (const ev of events) {
      const hour = new Date(ev.ts).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }
    return Array.from(hourMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);
  }, [events]);

  return {
    recordNavigation,
    frequencies,
    adaptiveFavorites,
    workflowSuggestions,
    userMaturity,
    companyOrientation,
    repetitivePatterns,
    peakHours,
    totalInteractions: events.length,
  };
}
