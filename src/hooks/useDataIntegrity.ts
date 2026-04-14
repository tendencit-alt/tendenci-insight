import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──
export type IntegritySeverity = "info" | "warning" | "critical";

export interface IntegrityIssue {
  id: string;
  rule: string;
  severity: IntegritySeverity;
  message: string;
  detail?: string;
  module: "financeiro" | "comercial" | "operacional" | "controladoria";
  count: number;
  route?: string;
}

export interface IntegrityScore {
  overall: number; // 0-100
  categories: {
    label: string;
    score: number;
    issues: number;
  }[];
}

export interface DataIntegrityData {
  issues: IntegrityIssue[];
  score: IntegrityScore;
  isLoading: boolean;
  lastChecked: string;
}

// ── Validation engine ──
export function useDataIntegrity(): DataIntegrityData {
  const { data, isLoading } = useQuery({
    queryKey: ["data-integrity-check"],
    queryFn: runIntegrityChecks,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const issues = data?.issues ?? [];
  const score = data?.score ?? { overall: 100, categories: [] };

  return {
    issues,
    score,
    isLoading,
    lastChecked: new Date().toISOString(),
  };
}

async function runIntegrityChecks(): Promise<{ issues: IntegrityIssue[]; score: IntegrityScore }> {
  const issues: IntegrityIssue[] = [];

  // Run all checks in parallel
  const [
    uncategorizedEntries,
    revenueNoOrigin,
    approvedNoReceivables,
    missingCostCenter,
    orderValueDivergence,
    orphanEntries,
    duplicateEntries,
  ] = await Promise.all([
    checkUncategorizedEntries(),
    checkRevenueWithoutOrigin(),
    checkApprovedOrdersNoReceivables(),
    checkMissingCostCenter(),
    checkOrderFinancialDivergence(),
    checkOrphanEntries(),
    checkDuplicateEntries(),
  ]);

  issues.push(...uncategorizedEntries, ...revenueNoOrigin, ...approvedNoReceivables,
    ...missingCostCenter, ...orderValueDivergence, ...orphanEntries, ...duplicateEntries);

  // Calculate scores
  const catMap: Record<string, { total: number; issues: number }> = {
    "Classificação": { total: 25, issues: 0 },
    "Vínculos": { total: 25, issues: 0 },
    "Centros de Custo": { total: 25, issues: 0 },
    "Consistência": { total: 25, issues: 0 },
  };

  for (const issue of issues) {
    const weight = issue.severity === "critical" ? 3 : issue.severity === "warning" ? 1.5 : 0.5;
    const penalty = Math.min(issue.count * weight, 25);
    if (issue.rule.includes("categoria") || issue.rule.includes("classificacao")) {
      catMap["Classificação"].issues += penalty;
    } else if (issue.rule.includes("origem") || issue.rule.includes("receber") || issue.rule.includes("divergencia")) {
      catMap["Vínculos"].issues += penalty;
    } else if (issue.rule.includes("centro_custo")) {
      catMap["Centros de Custo"].issues += penalty;
    } else {
      catMap["Consistência"].issues += penalty;
    }
  }

  const categories = Object.entries(catMap).map(([label, { total, issues: penalty }]) => ({
    label,
    score: Math.max(0, Math.round(((total - Math.min(penalty, total)) / total) * 100)),
    issues: Math.round(penalty),
  }));

  const overall = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);

  return { issues, score: { overall, categories } };
}

// ── Individual checks ──

async function checkUncategorizedEntries(): Promise<IntegrityIssue[]> {
  try {
    const { count } = await supabase
      .from("fin_ledger_entries" as any)
      .select("*", { count: "exact", head: true })
      .is("category_id", null)
      .neq("status", "CANCELADO");

    if (count && count > 0) {
      return [{
        id: "uncategorized-entries",
        rule: "categoria_obrigatoria",
        severity: count > 10 ? "critical" : "warning",
        message: `${count} lançamento(s) sem categoria DRE`,
        detail: "Classifique antes de incluir no fechamento",
        module: "financeiro",
        count,
        route: "/financeiro",
      }];
    }
  } catch {}
  return [];
}

async function checkRevenueWithoutOrigin(): Promise<IntegrityIssue[]> {
  try {
    const { count } = await supabase
      .from("fin_ledger_entries" as any)
      .select("*", { count: "exact", head: true })
      .eq("type", "RECEITA")
      .is("order_id", null)
      .is("project_id", null);

    if (count && count > 0) {
      return [{
        id: "revenue-no-origin",
        rule: "receita_com_origem",
        severity: "warning",
        message: `${count} receita(s) sem origem operacional`,
        detail: "Receita sem vínculo com pedido, contrato ou projeto",
        module: "financeiro",
        count,
        route: "/financeiro",
      }];
    }
  } catch {}
  return [];
}

async function checkApprovedOrdersNoReceivables(): Promise<IntegrityIssue[]> {
  try {
    // Find approved orders
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .in("status", ["aprovado", "em_producao", "faturado", "entregue"])
      .limit(500);

    if (!orders?.length) return [];

    // Check which have receivables
    const { data: linked } = await supabase
      .from("fin_ledger_entries" as any)
      .select("order_id")
      .in("order_id", orders.map(o => o.id))
      .eq("type", "RECEITA");

    const linkedIds = new Set((linked || []).map((l: any) => l.order_id));
    const missing = orders.filter(o => !linkedIds.has(o.id)).length;

    if (missing > 0) {
      return [{
        id: "orders-no-receivables",
        rule: "pedido_sem_receber",
        severity: "critical",
        message: `${missing} pedido(s) aprovado(s) sem contas a receber`,
        module: "comercial",
        count: missing,
        route: "/pedidos",
      }];
    }
  } catch {}
  return [];
}

async function checkMissingCostCenter(): Promise<IntegrityIssue[]> {
  try {
    const { count } = await supabase
      .from("fin_ledger_entries" as any)
      .select("*", { count: "exact", head: true })
      .eq("type", "DESPESA")
      .is("cost_center_id", null)
      .neq("status", "CANCELADO");

    if (count && count > 0) {
      return [{
        id: "missing-cost-center",
        rule: "centro_custo_obrigatorio",
        severity: count > 5 ? "critical" : "warning",
        message: `${count} despesa(s) sem centro de custo`,
        detail: "Despesa operacional requer centro de custo definido",
        module: "controladoria",
        count,
        route: "/financeiro",
      }];
    }
  } catch {}
  return [];
}

async function checkOrderFinancialDivergence(): Promise<IntegrityIssue[]> {
  try {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, valor_total")
      .in("status", ["aprovado", "em_producao", "faturado"])
      .not("valor_total", "is", null)
      .limit(200);

    if (!orders?.length) return [];

    const { data: entries } = await supabase
      .from("fin_ledger_entries" as any)
      .select("order_id, amount")
      .in("order_id", orders.map(o => o.id))
      .eq("type", "RECEITA");

    if (!entries?.length) return [];

    const sums: Record<string, number> = {};
    for (const e of entries as any[]) {
      sums[e.order_id] = (sums[e.order_id] || 0) + Math.abs(Number(e.amount) || 0);
    }

    let divergent = 0;
    for (const order of orders) {
      const finTotal = sums[order.id] || 0;
      const orderVal = Number(order.valor_total) || 0;
      if (orderVal > 0 && Math.abs(finTotal - orderVal) > orderVal * 0.01) {
        divergent++;
      }
    }

    if (divergent > 0) {
      return [{
        id: "order-financial-divergence",
        rule: "divergencia_pedido_financeiro",
        severity: "critical",
        message: `${divergent} pedido(s) com divergência financeira`,
        detail: "Valor do pedido difere do valor financeiro vinculado",
        module: "financeiro",
        count: divergent,
        route: "/pedidos",
      }];
    }
  } catch {}
  return [];
}

async function checkOrphanEntries(): Promise<IntegrityIssue[]> {
  try {
    const { count } = await supabase
      .from("fin_ledger_entries" as any)
      .select("*", { count: "exact", head: true })
      .is("category_id", null)
      .is("order_id", null)
      .is("project_id", null)
      .is("cost_center_id", null)
      .neq("status", "CANCELADO");

    if (count && count > 0) {
      return [{
        id: "orphan-entries",
        rule: "lancamentos_orfaos",
        severity: "warning",
        message: `${count} lançamento(s) órfão(s)`,
        detail: "Sem categoria, pedido, projeto ou centro de custo",
        module: "controladoria",
        count,
        route: "/financeiro",
      }];
    }
  } catch {}
  return [];
}

async function checkDuplicateEntries(): Promise<IntegrityIssue[]> {
  // Heuristic: same amount + same date + same description = potential duplicate
  // This is lightweight; a real check would use SQL window functions
  try {
    const { data } = await supabase
      .from("fin_ledger_entries" as any)
      .select("id, amount, competence_date, description")
      .neq("status", "CANCELADO")
      .order("competence_date", { ascending: false })
      .limit(500);

    if (!data?.length) return [];

    const seen = new Map<string, number>();
    let dupes = 0;
    for (const entry of data as any[]) {
      const key = `${entry.amount}|${entry.competence_date}|${(entry.description || "").slice(0, 30)}`;
      const prev = seen.get(key) || 0;
      if (prev > 0) dupes++;
      seen.set(key, prev + 1);
    }

    if (dupes > 0) {
      return [{
        id: "duplicate-entries",
        rule: "duplicacoes",
        severity: dupes > 3 ? "critical" : "warning",
        message: `${dupes} possível(is) duplicação(ões)`,
        detail: "Lançamentos com mesmo valor, data e descrição",
        module: "controladoria",
        count: dupes,
        route: "/financeiro",
      }];
    }
  } catch {}
  return [];
}
