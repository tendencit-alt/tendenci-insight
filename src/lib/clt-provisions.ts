// Cálculos de provisões CLT (férias + 13º).
// Todas as funções são puras e determinísticas — sem chamadas externas.
// Base legal: CLT art.130 (férias) + 1/3 constitucional (art.7, XVII) + 13º (Lei 4.090/62).
// Encargos (FGTS, INSS patronal etc.) NÃO são cravados aqui: ficam configuráveis.

export interface ProvisionInputs {
  baseSalary: number;
  admissionDate?: string | null; // ISO yyyy-mm-dd
  referenceDate?: Date;          // padrão: hoje
}

export interface VacationBreakdown {
  baseSalary: number;
  admissionDate: string | null;
  monthsInPeriod: number;        // meses no período aquisitivo atual (0..12)
  monthlyProvision: number;      // (salário/12) * (1 + 1/3)
  accruedBalance: number;        // monthlyProvision * monthsInPeriod
  fullVacation: number;          // salário * (1 + 1/3)
  oneThirdAdditional: number;    // salário * (1/3)
  notes: string;
}

export interface ThirteenthBreakdown {
  baseSalary: number;
  monthsInYear: number;          // meses trabalhados no ano-calendário (0..12)
  monthlyProvision: number;      // salário / 12
  accruedBalance: number;        // monthlyProvision * monthsInYear
  fullThirteenth: number;        // 1 salário
  notes: string;
}

function monthsBetween(from: Date, to: Date): number {
  if (to < from) return 0;
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, Math.min(12, m));
}

/** Período aquisitivo de férias começa na admissão e renova a cada 12 meses. */
export function computeVacationProvision({ baseSalary, admissionDate, referenceDate }: ProvisionInputs): VacationBreakdown {
  const salary = Number(baseSalary) || 0;
  const ref = referenceDate ?? new Date();
  let monthsInPeriod = 0;
  if (admissionDate) {
    const adm = new Date(admissionDate + "T00:00:00");
    // Reinício a cada ano completo
    const completed = Math.floor(monthsBetween(adm, ref) / 12);
    const cycleStart = new Date(adm);
    cycleStart.setFullYear(adm.getFullYear() + completed);
    monthsInPeriod = monthsBetween(cycleStart, ref);
  }
  const monthly = (salary / 12) * (1 + 1 / 3);
  const accrued = monthly * monthsInPeriod;
  const full = salary * (1 + 1 / 3);
  return {
    baseSalary: salary,
    admissionDate: admissionDate ?? null,
    monthsInPeriod,
    monthlyProvision: round2(monthly),
    accruedBalance: round2(accrued),
    fullVacation: round2(full),
    oneThirdAdditional: round2(salary / 3),
    notes:
      "Provisão = (salário ÷ 12) × (1 + 1/3). Acumulado = provisão mensal × meses do período aquisitivo atual. " +
      "Férias integrais = salário + 1/3 constitucional. Encargos sociais NÃO inclusos.",
  };
}

/** 13º proporcional dentro do ano-calendário (jan→dez). */
export function computeThirteenthProvision({ baseSalary, admissionDate, referenceDate }: ProvisionInputs): ThirteenthBreakdown {
  const salary = Number(baseSalary) || 0;
  const ref = referenceDate ?? new Date();
  const yearStart = new Date(ref.getFullYear(), 0, 1);
  let from = yearStart;
  if (admissionDate) {
    const adm = new Date(admissionDate + "T00:00:00");
    if (adm > yearStart) from = adm;
  }
  const monthsInYear = monthsBetween(from, ref);
  const monthly = salary / 12;
  return {
    baseSalary: salary,
    monthsInYear,
    monthlyProvision: round2(monthly),
    accruedBalance: round2(monthly * monthsInYear),
    fullThirteenth: round2(salary),
    notes:
      "Provisão = salário ÷ 12. Acumulado = provisão mensal × meses trabalhados no ano-calendário corrente. " +
      "13º integral = 1 salário. Encargos sociais NÃO inclusos.",
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }

export const brl = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ────────────────────────────────────────────────────────────
// Encargos legais (configuráveis por tenant). Aplicados sobre a base
// (provisão acumulada de férias ou 13º). Quando Simples Optante, o
// INSS/CPP 20% é zerado (recolhido via DAS).
// ────────────────────────────────────────────────────────────
export interface PayrollCharges {
  fgts_pct: number;
  inss_cpp_pct: number;
  rat_pct: number;
  terceiros_pct: number;
  simples_optante: boolean;
}

export interface ChargeBreakdown { label: string; pct: number; amount: number; }
export interface ChargedTotal {
  base: number;
  charges: ChargeBreakdown[];
  totalCharges: number;
  total: number;
}

export function applyCharges(base: number, c?: PayrollCharges | null): ChargedTotal {
  const b = Number(base) || 0;
  const cppPct = c?.simples_optante ? 0 : Number(c?.inss_cpp_pct ?? 20);
  const items: ChargeBreakdown[] = [
    { label: "FGTS",          pct: Number(c?.fgts_pct ?? 8),          amount: 0 },
    { label: "INSS / CPP",    pct: cppPct,                            amount: 0 },
    { label: "RAT/SAT",       pct: Number(c?.rat_pct ?? 2),           amount: 0 },
    { label: "Terceiros (S)", pct: Number(c?.terceiros_pct ?? 5.8),   amount: 0 },
  ].map(x => ({ ...x, amount: round2(b * x.pct / 100) }));
  const totalCharges = round2(items.reduce((s, x) => s + x.amount, 0));
  return { base: round2(b), charges: items, totalCharges, total: round2(b + totalCharges) };
}

// Haversine (metros)
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

