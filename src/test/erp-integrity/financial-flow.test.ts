import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════
// TESTES: INTEGRIDADE FINANCEIRA — FLUXO VENDA
// Valida regras de negócio que garantem consistência
// entre pedido → financeiro → DRE → fluxo → KPI
// ═══════════════════════════════════════════════════════

// Simulador de lançamentos financeiros para validação de regras
interface FinancialEntry {
  id: string;
  type: "RECEITA" | "DESPESA" | "TRANSFERENCIA";
  amount: number;
  competence_date: string;
  cash_date: string | null;
  status: string;
  origin_type: string;
  origin_id: string;
  chart_account_id: string;
  cost_center_id: string;
  reconciled: boolean;
}

function createOrderEntries(order: {
  id: string;
  total: number;
  date: string;
  costCenterId: string;
  chartAccountId: string;
  commissions: { type: string; pct: number }[];
}): FinancialEntry[] {
  const entries: FinancialEntry[] = [];

  // Receita principal
  entries.push({
    id: `entry-receita-${order.id}`,
    type: "RECEITA",
    amount: order.total,
    competence_date: order.date,
    cash_date: null, // Aberto até pagamento
    status: "ABERTO",
    origin_type: "pedido",
    origin_id: order.id,
    chart_account_id: order.chartAccountId,
    cost_center_id: order.costCenterId,
    reconciled: false,
  });

  // Compromissos sobre venda
  for (const comm of order.commissions) {
    entries.push({
      id: `entry-${comm.type}-${order.id}`,
      type: "DESPESA",
      amount: order.total * (comm.pct / 100),
      competence_date: order.date,
      cash_date: null,
      status: "ABERTO",
      origin_type: "pedido",
      origin_id: order.id,
      chart_account_id: `chart-${comm.type}`,
      cost_center_id: order.costCenterId,
      reconciled: false,
    });
  }

  return entries;
}

describe("Fluxo Venda — Geração Financeira", () => {
  const order = {
    id: "order-001",
    total: 50000,
    date: "2026-04-01",
    costCenterId: "cc-planejados",
    chartAccountId: "chart-receita-moveis",
    commissions: [
      { type: "vendedor", pct: 5 },
      { type: "orcamentista", pct: 2 },
      { type: "projetista", pct: 3 },
    ],
  };

  const entries = createOrderEntries(order);

  it("pedido aprovado gera receita principal", () => {
    const receita = entries.find((e) => e.type === "RECEITA");
    expect(receita).toBeDefined();
    expect(receita!.amount).toBe(50000);
    expect(receita!.origin_type).toBe("pedido");
    expect(receita!.origin_id).toBe("order-001");
  });

  it("pedido aprovado gera compromissos sobre venda", () => {
    const despesas = entries.filter((e) => e.type === "DESPESA");
    expect(despesas).toHaveLength(3);
  });

  it("comissão vendedor = 5% do total", () => {
    const vendedor = entries.find((e) => e.id.includes("vendedor"));
    expect(vendedor!.amount).toBe(2500);
  });

  it("comissão orcamentista = 2% do total", () => {
    const orc = entries.find((e) => e.id.includes("orcamentista"));
    expect(orc!.amount).toBe(1000);
  });

  it("comissão projetista = 3% do total", () => {
    const proj = entries.find((e) => e.id.includes("projetista"));
    expect(proj!.amount).toBe(1500);
  });

  it("lançamentos abertos NÃO possuem cash_date", () => {
    entries.forEach((e) => {
      expect(e.cash_date).toBeNull();
    });
  });

  it("todos os lançamentos possuem competence_date", () => {
    entries.forEach((e) => {
      expect(e.competence_date).toBe("2026-04-01");
    });
  });

  it("todos os lançamentos vinculam ao pedido de origem", () => {
    entries.forEach((e) => {
      expect(e.origin_type).toBe("pedido");
      expect(e.origin_id).toBe("order-001");
    });
  });

  it("todos os lançamentos herdam centro de custo do pedido", () => {
    entries.forEach((e) => {
      expect(e.cost_center_id).toBe("cc-planejados");
    });
  });
});

// ═══════════════════════════════════════════════════════
// DRE: COMPETÊNCIA
// ═══════════════════════════════════════════════════════

function buildDRE(entries: FinancialEntry[], period: string) {
  const filtered = entries.filter(
    (e) => e.competence_date.startsWith(period) && e.status !== "CANCELADO"
  );
  const receitas = filtered.filter((e) => e.type === "RECEITA").reduce((s, e) => s + e.amount, 0);
  const despesas = filtered.filter((e) => e.type === "DESPESA").reduce((s, e) => s + e.amount, 0);
  return { receitas, despesas, resultado: receitas - despesas };
}

describe("DRE — Regime de Competência", () => {
  const entries = createOrderEntries({
    id: "order-dre",
    total: 100000,
    date: "2026-04-15",
    costCenterId: "cc-1",
    chartAccountId: "chart-receita",
    commissions: [{ type: "vendedor", pct: 10 }],
  });

  const dre = buildDRE(entries, "2026-04");

  it("DRE receita = valor total do pedido", () => {
    expect(dre.receitas).toBe(100000);
  });

  it("DRE despesas = comissões por competência", () => {
    expect(dre.despesas).toBe(10000);
  });

  it("resultado = receitas - despesas", () => {
    expect(dre.resultado).toBe(90000);
  });

  it("DRE ignora lançamentos cancelados", () => {
    const withCancelled = [
      ...entries,
      { ...entries[0], id: "cancelled-1", status: "CANCELADO", amount: 999 },
    ];
    const dre2 = buildDRE(withCancelled, "2026-04");
    expect(dre2.receitas).toBe(100000); // Não incluiu cancelado
  });
});

// ═══════════════════════════════════════════════════════
// FLUXO DE CAIXA: PREVISTO VS REALIZADO
// ═══════════════════════════════════════════════════════

function buildCashflow(entries: FinancialEntry[]) {
  const previsto = entries.filter((e) => e.status !== "CANCELADO");
  const realizado = entries.filter((e) => e.cash_date !== null && e.status !== "CANCELADO");

  return {
    previsto_entradas: previsto.filter((e) => e.type === "RECEITA").reduce((s, e) => s + e.amount, 0),
    previsto_saidas: previsto.filter((e) => e.type === "DESPESA").reduce((s, e) => s + e.amount, 0),
    realizado_entradas: realizado.filter((e) => e.type === "RECEITA").reduce((s, e) => s + e.amount, 0),
    realizado_saidas: realizado.filter((e) => e.type === "DESPESA").reduce((s, e) => s + e.amount, 0),
  };
}

describe("Fluxo de Caixa — Previsto vs Realizado", () => {
  const entries = createOrderEntries({
    id: "order-cf",
    total: 80000,
    date: "2026-04-01",
    costCenterId: "cc-1",
    chartAccountId: "chart-r",
    commissions: [{ type: "vendedor", pct: 5 }],
  });

  it("fluxo previsto = todos lançamentos ativos", () => {
    const cf = buildCashflow(entries);
    expect(cf.previsto_entradas).toBe(80000);
    expect(cf.previsto_saidas).toBe(4000);
  });

  it("fluxo realizado = apenas lançamentos com cash_date", () => {
    const cf = buildCashflow(entries);
    expect(cf.realizado_entradas).toBe(0); // Nenhum pago ainda
    expect(cf.realizado_saidas).toBe(0);
  });

  it("após liquidação, fluxo realizado atualiza", () => {
    const paid = entries.map((e) =>
      e.type === "RECEITA" ? { ...e, cash_date: "2026-04-10", status: "PAGO_RECEBIDO" } : e
    );
    const cf = buildCashflow(paid);
    expect(cf.realizado_entradas).toBe(80000);
    expect(cf.realizado_saidas).toBe(0); // Comissões ainda abertas
  });
});

// ═══════════════════════════════════════════════════════
// CANCELAMENTO: REVERSÃO FINANCEIRA
// ═══════════════════════════════════════════════════════

describe("Cancelamento — Reversão Financeira", () => {
  it("pedido cancelado cancela todos lançamentos vinculados", () => {
    const entries = createOrderEntries({
      id: "order-cancel",
      total: 30000,
      date: "2026-04-01",
      costCenterId: "cc-1",
      chartAccountId: "chart-r",
      commissions: [{ type: "vendedor", pct: 5 }],
    });

    // Simular cancelamento
    const cancelled = entries.map((e) => ({ ...e, status: "CANCELADO" }));
    const dre = buildDRE(cancelled, "2026-04");

    expect(dre.receitas).toBe(0);
    expect(dre.despesas).toBe(0);
    expect(dre.resultado).toBe(0);
  });

  it("cancelamento não afeta outros pedidos", () => {
    const order1 = createOrderEntries({
      id: "order-ok",
      total: 50000,
      date: "2026-04-01",
      costCenterId: "cc-1",
      chartAccountId: "chart-r",
      commissions: [],
    });
    const order2 = createOrderEntries({
      id: "order-cancel",
      total: 30000,
      date: "2026-04-01",
      costCenterId: "cc-1",
      chartAccountId: "chart-r",
      commissions: [],
    }).map((e) => ({ ...e, status: "CANCELADO" }));

    const all = [...order1, ...order2];
    const dre = buildDRE(all, "2026-04");
    expect(dre.receitas).toBe(50000); // Apenas order-ok
  });
});
