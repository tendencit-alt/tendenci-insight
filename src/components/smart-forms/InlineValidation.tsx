import { useMemo } from "react";
import type { FormValidationError } from "@/components/form-view/types";

// ── Inline validation rules ──
export interface InlineValidationRule {
  field: string;
  validate: (value: any, values: Record<string, any>) => string | null;
}

// ── Common inline validators ──
export const InlineValidators = {
  required: (label: string): InlineValidationRule["validate"] => (value) =>
    value === undefined || value === null || value === ""
      ? `${label} é obrigatório`
      : null,

  minValue: (min: number, label: string): InlineValidationRule["validate"] => (value) =>
    value !== null && value !== undefined && value !== "" && Number(value) < min
      ? `${label} deve ser maior ou igual a ${min}`
      : null,

  maxValue: (max: number, label: string): InlineValidationRule["validate"] => (value) =>
    value !== null && value !== undefined && value !== "" && Number(value) > max
      ? `${label} deve ser menor ou igual a ${max}`
      : null,

  dateAfter: (fieldRef: string, label: string, refLabel: string): InlineValidationRule["validate"] => (value, values) => {
    if (!value || !values[fieldRef]) return null;
    return value < values[fieldRef]
      ? `${label} deve ser posterior a ${refLabel}`
      : null;
  },

  dateBefore: (fieldRef: string, label: string, refLabel: string): InlineValidationRule["validate"] => (value, values) => {
    if (!value || !values[fieldRef]) return null;
    return value > values[fieldRef]
      ? `${label} deve ser anterior a ${refLabel}`
      : null;
  },

  positiveNumber: (label: string): InlineValidationRule["validate"] => (value) =>
    value !== null && value !== undefined && value !== "" && Number(value) <= 0
      ? `${label} deve ser um valor positivo`
      : null,

  email: (label: string): InlineValidationRule["validate"] => (value) =>
    value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? `${label} em formato inválido`
      : null,

  cpfCnpj: (label: string): InlineValidationRule["validate"] => (value) => {
    if (!value) return null;
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 14)
      return `${label} deve ter 11 (CPF) ou 14 (CNPJ) dígitos`;
    return null;
  },
};

/** Hook: run inline validations in real-time as values change */
export function useInlineValidation(
  rules: InlineValidationRule[],
  values: Record<string, any>
): FormValidationError[] {
  return useMemo(() => {
    const errors: FormValidationError[] = [];
    for (const rule of rules) {
      const value = values[rule.field];
      const msg = rule.validate(value, values);
      if (msg) {
        errors.push({ field: rule.field, message: msg });
      }
    }
    return errors;
  }, [rules, values]);
}
