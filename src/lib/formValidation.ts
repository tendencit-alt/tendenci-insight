import { toast } from "sonner";

export interface ValidationRule {
  field: string;
  label: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: any) => string | null;
}

export interface ValidationError {
  field: string;
  label: string;
  message: string;
}

/**
 * Validates form data against a set of rules and returns detailed error messages
 */
export function validateFormData(
  data: Record<string, any>,
  rules: ValidationRule[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const value = data[rule.field];
    const isEmpty = value === undefined || value === null || value === "" || 
                    (Array.isArray(value) && value.length === 0);

    // Required check
    if (rule.required && isEmpty) {
      errors.push({
        field: rule.field,
        label: rule.label,
        message: `${rule.label} é obrigatório`,
      });
      continue;
    }

    // Skip other validations if empty and not required
    if (isEmpty) continue;

    // String validations
    if (typeof value === "string") {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field: rule.field,
          label: rule.label,
          message: `${rule.label} deve ter pelo menos ${rule.minLength} caracteres`,
        });
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          field: rule.field,
          label: rule.label,
          message: `${rule.label} deve ter no máximo ${rule.maxLength} caracteres`,
        });
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          field: rule.field,
          label: rule.label,
          message: rule.patternMessage || `${rule.label} está em formato inválido`,
        });
      }
    }

    // Number validations
    const numValue = typeof value === "number" ? value : parseFloat(value);
    if (!isNaN(numValue)) {
      if (rule.min !== undefined && numValue < rule.min) {
        errors.push({
          field: rule.field,
          label: rule.label,
          message: `${rule.label} deve ser maior ou igual a ${rule.min}`,
        });
      }
      if (rule.max !== undefined && numValue > rule.max) {
        errors.push({
          field: rule.field,
          label: rule.label,
          message: `${rule.label} deve ser menor ou igual a ${rule.max}`,
        });
      }
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        errors.push({
          field: rule.field,
          label: rule.label,
          message: customError,
        });
      }
    }
  }

  return errors;
}

/**
 * Shows validation errors as toast notifications with detailed messages
 */
export function showValidationErrors(errors: ValidationError[]): void {
  if (errors.length === 0) return;

  if (errors.length === 1) {
    toast.error(errors[0].message, {
      description: `Verifique o campo "${errors[0].label}"`,
    });
    return;
  }

  // Multiple errors - show summary with details
  const errorList = errors.map(e => `• ${e.message}`).join("\n");
  toast.error(`${errors.length} campos com problemas`, {
    description: errorList,
    duration: 6000,
  });
}

/**
 * Combined validation and error display
 * Returns true if valid, false if has errors
 */
export function validateAndShowErrors(
  data: Record<string, any>,
  rules: ValidationRule[]
): boolean {
  const errors = validateFormData(data, rules);
  if (errors.length > 0) {
    showValidationErrors(errors);
    return false;
  }
  return true;
}

/**
 * Format Supabase/database errors into user-friendly messages
 */
export function formatDatabaseError(error: any): string {
  const message = error?.message || error?.toString() || "Erro desconhecido";
  
  // Common Supabase error patterns
  if (message.includes("duplicate key")) {
    if (message.includes("email")) return "Este e-mail já está cadastrado";
    if (message.includes("phone")) return "Este telefone já está cadastrado";
    if (message.includes("cpf") || message.includes("cnpj")) return "Este CPF/CNPJ já está cadastrado";
    return "Este registro já existe no sistema";
  }
  
  if (message.includes("violates foreign key")) {
    return "Registro relacionado não encontrado. Verifique os dados selecionados.";
  }
  
  if (message.includes("violates not-null")) {
    const match = message.match(/column "(\w+)"/);
    if (match) {
      return `O campo "${match[1]}" é obrigatório e não foi preenchido`;
    }
    return "Um campo obrigatório não foi preenchido";
  }
  
  if (message.includes("violates check constraint")) {
    return "Valor inválido para um dos campos";
  }
  
  if (message.includes("row-level security")) {
    return "Você não tem permissão para realizar esta ação";
  }
  
  if (message.includes("timeout") || message.includes("network")) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  }
  
  return message;
}

/**
 * Handle form submission errors with detailed messages
 */
export function handleFormError(error: any, context: string = "operação"): void {
  const formattedMessage = formatDatabaseError(error);
  toast.error(`Erro ao realizar ${context}`, {
    description: formattedMessage,
    duration: 5000,
  });
  console.error(`[${context}] Error:`, error);
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\(?[1-9]{2}\)?\s?(?:9\d{4}|\d{4})-?\d{4}$/,
  cpf: /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/,
  cnpj: /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
  cep: /^\d{5}-?\d{3}$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  currency: /^R?\$?\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?$/,
};

// Common validation messages
export const ValidationMessages = {
  email: "E-mail deve estar no formato exemplo@dominio.com",
  phone: "Telefone deve estar no formato (00) 00000-0000",
  cpf: "CPF deve estar no formato 000.000.000-00",
  cnpj: "CNPJ deve estar no formato 00.000.000/0000-00",
  cep: "CEP deve estar no formato 00000-000",
};
