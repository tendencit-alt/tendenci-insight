/**
 * Formata um valor numérico para exibição em KPI.
 * Retorna "—" para null, undefined, NaN, Infinity ou quando explicitamente inválido.
 *
 * Uso:
 *   formatKpiNumber(runway, " meses")            // "12 meses" ou "—"
 *   formatKpiNumber(runway, "m")                 // "12m"
 *   formatKpiNumber(idx, "x", { decimals: 1 })   // "1.5x"
 *   formatKpiNumber(a / b, "%", { invalidWhen: b <= 0 })
 */
export const KPI_EMPTY = "—";

export interface FormatKpiOptions {
  /** Casas decimais (default: 0). */
  decimals?: number;
  /** Se true, renderiza KPI_EMPTY adicionalmente (use para divisor <= 0, etc). */
  invalidWhen?: boolean;
  /** Limite superior — acima disso renderiza `>{cap}{suffix}`. */
  cap?: number;
}

export function formatKpiNumber(
  value: number | null | undefined,
  suffix: string = "",
  options: FormatKpiOptions = {}
): string {
  const { decimals = 0, invalidWhen = false, cap } = options;

  if (
    invalidWhen ||
    value === null ||
    value === undefined ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return KPI_EMPTY;
  }

  if (cap !== undefined && value > cap) {
    return `>${cap}${suffix}`;
  }

  return `${value.toFixed(decimals)}${suffix}`;
}

/** Helper booleano para checagens de "positivo/negativo" em KPIs que podem ser null. */
export function isKpiValid(value: number | null | undefined): value is number {
  return (
    value !== null &&
    value !== undefined &&
    !Number.isNaN(value) &&
    Number.isFinite(value)
  );
}
