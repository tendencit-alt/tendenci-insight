// Cálculos de provisões CLT (férias + 13º) — APENAS BASE, sem encargos.
// Base legal: CLT art.130 (férias) + 1/3 constitucional (art.7, XVII) + 13º (Lei 4.090/62).

export interface ProvisionInputs {
  baseSalary: number;
  admissionDate?: string | null; // ISO yyyy-mm-dd
  referenceDate?: Date;          // padrão: hoje
}

export interface VacationDueDates {
  currentCycleStart: string | null;   // início do período aquisitivo atual
  currentCycleEnd: string | null;     // quando o próximo direito de férias VENCE (adm + N anos)
  grantDeadline: string | null;       // limite legal de concessão (currentCycleEnd + 12 meses)
}

export interface VacationBreakdown {
  baseSalary: number;
  admissionDate: string | null;
  monthsInPeriod: number;        // 0..12
  monthlyProvision: number;      // (salário/12) * (1 + 1/3)
  accruedBalance: number;
  fullVacation: number;          // salário * (1 + 1/3)
  oneThirdAdditional: number;
  due: VacationDueDates;
  notes: string;
}

export interface ThirteenthDueDates {
  firstInstallmentDue: string;        // 30/11 do ano corrente
  secondInstallmentDue: string;       // 20/12 do ano corrente
  firstAmount: number;                // 50% do 13º proporcional
  secondAmount: number;               // 50% restante
  proportionalMonths: number;         // meses considerados no ano (>=15 dias = 1 mês cheio na lei; aqui usamos meses cheios)
  proportionalAmount: number;         // 13º proporcional total do ano corrente
}

export interface ThirteenthBreakdown {
  baseSalary: number;
  monthsInYear: number;
  monthlyProvision: number;
  accruedBalance: number;
  fullThirteenth: number;
  due: ThirteenthDueDates;
  notes: string;
}

function monthsBetween(from: Date, to: Date): number {
  if (to < from) return 0;
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, Math.min(12, m));
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Período aquisitivo de férias começa na admissão e renova a cada 12 meses. */
export function computeVacationProvision({ baseSalary, admissionDate, referenceDate }: ProvisionInputs): VacationBreakdown {
  const salary = Number(baseSalary) || 0;
  const ref = referenceDate ?? new Date();
  let monthsInPeriod = 0;
  let due: VacationDueDates = { currentCycleStart: null, currentCycleEnd: null, grantDeadline: null };
  if (admissionDate) {
    const adm = new Date(admissionDate + "T00:00:00");
    const totalMonths = monthsBetween(adm, ref) + Math.max(0, (ref.getFullYear() - adm.getFullYear()) * 12 + (ref.getMonth() - adm.getMonth()) - monthsBetween(adm, ref));
    // ciclos completos = anos completos desde a admissão
    const completed = Math.max(0, Math.floor(((ref.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24 * 365.25))));
    const cycleStart = new Date(adm);
    cycleStart.setFullYear(adm.getFullYear() + completed);
    // se cycleStart > ref (ainda não fechou ciclo), volta um
    if (cycleStart > ref) cycleStart.setFullYear(cycleStart.getFullYear() - 1);
    monthsInPeriod = monthsBetween(cycleStart, ref);
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setFullYear(cycleStart.getFullYear() + 1);
    const grant = new Date(cycleEnd);
    grant.setFullYear(cycleEnd.getFullYear() + 1);
    due = {
      currentCycleStart: isoDate(cycleStart),
      currentCycleEnd: isoDate(cycleEnd),
      grantDeadline: isoDate(grant),
    };
    // silence unused
    void totalMonths;
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
    due,
    notes:
      "Provisão = (salário ÷ 12) × (1 + 1/3). Acumulado = provisão mensal × meses do período aquisitivo atual. " +
      "Férias integrais = salário + 1/3 constitucional.",
  };
}

/** 13º proporcional dentro do ano-calendário (jan→dez), com 1ª parcela até 30/11 e 2ª até 20/12. */
export function computeThirteenthProvision({ baseSalary, admissionDate, referenceDate }: ProvisionInputs): ThirteenthBreakdown {
  const salary = Number(baseSalary) || 0;
  const ref = referenceDate ?? new Date();
  const year = ref.getFullYear();
  const yearStart = new Date(year, 0, 1);
  let from = yearStart;
  if (admissionDate) {
    const adm = new Date(admissionDate + "T00:00:00");
    if (adm > yearStart) from = adm;
  }
  const monthsInYear = monthsBetween(from, ref);
  const monthly = salary / 12;
  // Proporcional do ano todo (até dezembro) — para vencimentos legais.
  // Conta meses cheios trabalhados no ano (de "from" até 31/dez).
  const yearEnd = new Date(year, 11, 31);
  const monthsFullYear = monthsBetween(from, yearEnd);
  const proportionalAmount = round2((salary / 12) * monthsFullYear);
  const firstAmount = round2(proportionalAmount / 2);
  const secondAmount = round2(proportionalAmount - firstAmount);
  return {
    baseSalary: salary,
    monthsInYear,
    monthlyProvision: round2(monthly),
    accruedBalance: round2(monthly * monthsInYear),
    fullThirteenth: round2(salary),
    due: {
      firstInstallmentDue: `${year}-11-30`,
      secondInstallmentDue: `${year}-12-20`,
      firstAmount,
      secondAmount,
      proportionalMonths: monthsFullYear,
      proportionalAmount,
    },
    notes:
      "Provisão = salário ÷ 12. Acumulado = provisão mensal × meses trabalhados no ano-calendário. " +
      "13º integral = 1 salário. 1ª parcela até 30/11, 2ª até 20/12 (Lei 4.090/62).",
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }

export const brl = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// Haversine (metros) — mantido para uso do geofence.
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
