// ── Operational Date Architecture ──
// Single source of truth for date field usage across ERP reports.

/**
 * Date field types used in financial operations.
 * Each report type uses a specific date field for filtering.
 */
export type DateFieldType = "competence" | "due" | "liquidation" | "creation";

export interface DateFieldConfig {
  key: DateFieldType;
  label: string;
  description: string;
  /** Column name in fin_payables */
  payablesColumn: string;
  /** Column name in fin_receivables */
  receivablesColumn: string;
  /** Column name in fin_ledger_entries */
  ledgerColumn: string;
}

/** All date field configurations */
export const DATE_FIELDS: Record<DateFieldType, DateFieldConfig> = {
  competence: {
    key: "competence",
    label: "Competência",
    description: "Data do fato gerador (DRE)",
    payablesColumn: "competence_date",
    receivablesColumn: "competence_date",
    ledgerColumn: "competence_date",
  },
  due: {
    key: "due",
    label: "Vencimento",
    description: "Data prevista de pagamento/recebimento (Fluxo Previsto)",
    payablesColumn: "due_date",
    receivablesColumn: "due_date",
    ledgerColumn: "competence_date", // ledger doesn't have due_date, fallback
  },
  liquidation: {
    key: "liquidation",
    label: "Liquidação",
    description: "Data efetiva de pagamento/recebimento (Fluxo Realizado)",
    payablesColumn: "payment_date",
    receivablesColumn: "receipt_date",
    ledgerColumn: "cash_date",
  },
  creation: {
    key: "creation",
    label: "Criação",
    description: "Data de criação do registro (Auditoria)",
    payablesColumn: "created_at",
    receivablesColumn: "created_at",
    ledgerColumn: "created_at",
  },
};

/**
 * Report types and which date field they use by default.
 */
export const REPORT_DATE_MAP: Record<string, DateFieldType> = {
  dre: "competence",
  fluxo_previsto: "due",
  fluxo_realizado: "liquidation",
  conciliacao: "liquidation",
  forecast: "due",
  auditoria: "creation",
};

/**
 * Date field options for filter dropdowns in reports.
 */
export const DATE_FILTER_OPTIONS: { value: DateFieldType; label: string }[] = [
  { value: "competence", label: "Competência" },
  { value: "due", label: "Vencimento" },
  { value: "liquidation", label: "Liquidação" },
];

/**
 * Get the correct column name for a given table and date type.
 */
export function getDateColumn(
  table: "fin_payables" | "fin_receivables" | "fin_ledger_entries",
  dateType: DateFieldType,
): string {
  const config = DATE_FIELDS[dateType];
  switch (table) {
    case "fin_payables": return config.payablesColumn;
    case "fin_receivables": return config.receivablesColumn;
    case "fin_ledger_entries": return config.ledgerColumn;
  }
}

/**
 * Inheritance rules: when creating financial entries from orders.
 */
export const DATE_INHERITANCE_RULES = {
  /** competence_date = order approval date or order creation date */
  competenceFromOrder: "data_aprovacao || created_at",
  /** due_date = calculated from payment condition */
  dueDateFromCondition: true,
  /** payment_date/receipt_date = null until payment is registered */
  liquidationOnPayment: true,
} as const;
