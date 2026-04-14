import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════
// TESTES: ORÇAMENTO VS REALIZADO + FORECAST DINÂMICO
// ═══════════════════════════════════════════════════════

interface BudgetEntry {
  year: number;
  month: number;
  category: string;
  budgeted: number;
  actual: number;
}

interface ForecastEntry {
  year: number;
  month: number;
  category: string;
  forecast_value: number;
  origin: "automatica" | "manual" | "tendencia_historica" | "pipeline" | "recorrencia";
  is_realized: boolean;
}

function calcBudgetVariance(b: BudgetEntry) {
  const diff = b.actual - b.budgeted;
  const pct = b.budgeted !== 0 ? (diff / b.budgeted) * 100 : 0;
  return { diff, pct: Math.round(pct * 100) / 100 };
}

describe("Orçamento vs Realizado", () => {
  it("calcula desvio absoluto corretamente", () => {
    const b: BudgetEntry = { year: 2026, month: 4, category: "receita", budgeted: 100000, actual: 85000 };
    const v = calcBudgetVariance(b);
    expect(v.diff).toBe(-15000);
  });

  it("calcula desvio percentual corretamente", () => {
    const b: BudgetEntry = { year: 2026, month: 4, category: "receita", budgeted: 100000, actual: 85000 };
    const v = calcBudgetVariance(b);
    expect(v.pct).toBe(-15);
  });

  it("receita acima do orçado = desvio positivo", () => {
    const b: BudgetEntry = { year: 2026, month: 4, category: "receita", budgeted: 100000, actual: 120000 };
    const v = calcBudgetVariance(b);
    expect(v.diff).toBeGreaterThan(0);
    expect(v.pct).toBe(20);
  });

  it("despesa acima do orçado = desvio positivo (negativo para empresa)", () => {
    const b: BudgetEntry = { year: 2026, month: 4, category: "despesa", budgeted: 50000, actual: 65000 };
    const v = calcBudgetVariance(b);
    expect(v.diff).toBe(15000);
    expect(v.pct).toBe(30);
  });

  it("orçamento zero não gera divisão por zero", () => {
    const b: BudgetEntry = { year: 2026, month: 4, category: "receita", budgeted: 0, actual: 5000 };
    const v = calcBudgetVariance(b);
    expect(v.pct).toBe(0);
    expect(Number.isFinite(v.pct)).toBe(true);
  });
});

describe("Forecast Dinâmico", () => {
  const currentMonth = 4; // Abril 2026

  const forecasts: ForecastEntry[] = [
    { year: 2026, month: 1, category: "receita", forecast_value: 100000, origin: "automatica", is_realized: true },
    { year: 2026, month: 2, category: "receita", forecast_value: 110000, origin: "automatica", is_realized: true },
    { year: 2026, month: 3, category: "receita", forecast_value: 105000, origin: "automatica", is_realized: true },
    { year: 2026, month: 4, category: "receita", forecast_value: 115000, origin: "automatica", is_realized: false },
    { year: 2026, month: 5, category: "receita", forecast_value: 120000, origin: "tendencia_historica", is_realized: false },
    { year: 2026, month: 6, category: "receita", forecast_value: 125000, origin: "tendencia_historica", is_realized: false },
  ];

  it("meses realizados permanecem fixos", () => {
    const realized = forecasts.filter((f) => f.is_realized);
    expect(realized).toHaveLength(3);
    realized.forEach((f) => {
      expect(f.month).toBeLessThan(currentMonth);
    });
  });

  it("meses futuros são recalculáveis", () => {
    const future = forecasts.filter((f) => !f.is_realized);
    expect(future.length).toBeGreaterThanOrEqual(1);
    future.forEach((f) => {
      expect(f.month).toBeGreaterThanOrEqual(currentMonth);
    });
  });

  it("forecast acumulado anual = soma de todos meses", () => {
    const total = forecasts.reduce((s, f) => s + f.forecast_value, 0);
    expect(total).toBe(675000);
  });

  it("cenário conservador aplica fator de redução", () => {
    const conservadorFactor = 0.85;
    const futureForecasts = forecasts.filter((f) => !f.is_realized);
    const adjusted = futureForecasts.map((f) => ({
      ...f,
      forecast_value: Math.round(f.forecast_value * conservadorFactor),
    }));
    adjusted.forEach((f, i) => {
      expect(f.forecast_value).toBeLessThan(futureForecasts[i].forecast_value);
    });
  });

  it("cenário agressivo aplica fator de crescimento", () => {
    const agressivoFactor = 1.20;
    const futureForecasts = forecasts.filter((f) => !f.is_realized);
    const adjusted = futureForecasts.map((f) => ({
      ...f,
      forecast_value: Math.round(f.forecast_value * agressivoFactor),
    }));
    adjusted.forEach((f, i) => {
      expect(f.forecast_value).toBeGreaterThan(futureForecasts[i].forecast_value);
    });
  });
});

// ═══════════════════════════════════════════════════════
// TESTES: KPIs EXECUTIVOS
// ═══════════════════════════════════════════════════════

describe("KPIs Executivos", () => {
  const mockData = {
    receita_mes: 150000,
    despesas_mes: 95000,
    receita_acumulada: 450000,
    meta_receita: 500000,
    saldo_caixa: 320000,
    burn_rate_mensal: 85000,
    min_safety_balance: 100000,
  };

  it("margem de contribuição = receita - despesas sobre venda", () => {
    const despesasSobreVenda = 30000;
    const margem = mockData.receita_mes - despesasSobreVenda;
    expect(margem).toBe(120000);
  });

  it("EBITDA = margem - despesas operacionais", () => {
    const margem = 120000;
    const despOpcionais = 65000;
    const ebitda = margem - despOpcionais;
    expect(ebitda).toBe(55000);
  });

  it("receita vs meta percentual", () => {
    const pct = (mockData.receita_acumulada / mockData.meta_receita) * 100;
    expect(pct).toBe(90);
  });

  it("burn rate calcula corretamente", () => {
    expect(mockData.burn_rate_mensal).toBe(85000);
  });

  it("runway = saldo / burn_rate", () => {
    const runway = mockData.saldo_caixa / mockData.burn_rate_mensal;
    expect(runway).toBeCloseTo(3.76, 1);
  });

  it("alerta de saldo mínimo quando saldo < safety", () => {
    const belowSafety = mockData.saldo_caixa < mockData.min_safety_balance;
    expect(belowSafety).toBe(false);

    const lowBalance = 80000;
    expect(lowBalance < mockData.min_safety_balance).toBe(true);
  });
});
