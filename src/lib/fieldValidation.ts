/**
 * Validação por campo + tradução de erros do banco para o campo certo.
 *
 * Complementa `formValidation.ts` com:
 *  - Schemas zod prontos para campos comuns (email, telefone, CPF/CNPJ, CEP, dinheiro, datas)
 *  - `zodToFieldErrors(error)` → map { field → message } para alimentar formulários
 *  - `parseDatabaseFieldError(error, labels?)` → identifica QUAL campo violou
 *    constraints do Postgres (23505 duplicidade, 23502 not-null, 23503 FK, 22P02 formato, 23514 check)
 *    e devolve { field, message } em PT-BR.
 */
import { z, ZodError } from 'zod';

/* ----------------------------- Schemas zod ----------------------------- */

const onlyDigits = (s: string) => s.replace(/\D/g, '');

export const zRequired = (label: string) =>
  z.string({ required_error: `${label} é obrigatório` }).trim().min(1, `${label} é obrigatório`);

export const zEmail = (label = 'E-mail') =>
  z
    .string({ required_error: `${label} é obrigatório` })
    .trim()
    .min(1, `${label} é obrigatório`)
    .email(`${label} inválido (use formato nome@dominio.com)`)
    .max(255, `${label} deve ter no máximo 255 caracteres`);

export const zPhoneBR = (label = 'Telefone') =>
  z
    .string()
    .trim()
    .min(1, `${label} é obrigatório`)
    .transform(onlyDigits)
    .refine((v) => v.length === 10 || v.length === 11, `${label} deve ter 10 ou 11 dígitos (com DDD)`);

export const zCPF = (label = 'CPF') =>
  z
    .string()
    .trim()
    .min(1, `${label} é obrigatório`)
    .transform(onlyDigits)
    .refine((v) => v.length === 11, `${label} deve ter 11 dígitos`)
    .refine(isValidCPF, `${label} inválido (dígitos verificadores não conferem)`);

export const zCNPJ = (label = 'CNPJ') =>
  z
    .string()
    .trim()
    .min(1, `${label} é obrigatório`)
    .transform(onlyDigits)
    .refine((v) => v.length === 14, `${label} deve ter 14 dígitos`)
    .refine(isValidCNPJ, `${label} inválido (dígitos verificadores não conferem)`);

export const zCEP = (label = 'CEP') =>
  z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine((v) => v.length === 8, `${label} deve ter 8 dígitos`);

export const zMoneyPositive = (label = 'Valor') =>
  z
    .number({ required_error: `${label} é obrigatório`, invalid_type_error: `${label} deve ser numérico` })
    .positive(`${label} deve ser maior que zero`);

export const zDateISO = (label = 'Data') =>
  z
    .string()
    .trim()
    .min(1, `${label} é obrigatório`)
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} deve estar no formato AAAA-MM-DD`);

/* ----------------------------- CPF / CNPJ ----------------------------- */

function isValidCPF(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(cpf[i], 10) * (slice + 1 - i);
    const d = (sum * 10) % 11;
    return d === 10 ? 0 : d;
  };
  return calc(9) === +cpf[9] && calc(10) === +cpf[10];
}

function isValidCNPJ(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (slice: number) => {
    const w = slice === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(cnpj[i], 10) * w[i];
    const d = sum % 11;
    return d < 2 ? 0 : 11 - d;
  };
  return calc(12) === +cnpj[12] && calc(13) === +cnpj[13];
}

/* ----------------------------- Zod helpers ----------------------------- */

export type FieldErrors = Record<string, string>;

/** Converte um ZodError em { campo: 'mensagem' } para popular formulários. */
export function zodToFieldErrors(err: unknown): FieldErrors {
  const result: FieldErrors = {};
  if (!(err instanceof ZodError)) return result;
  for (const issue of err.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_root';
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

/**
 * Faz parse de um schema e devolve { data, errors }. Nunca lança.
 *   const { data, errors } = parseWithSchema(schema, payload);
 *   if (errors) { setFormErrors(errors); return; }
 */
export function parseWithSchema<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown
): { data: z.infer<T> | null; errors: FieldErrors | null } {
  const r = schema.safeParse(input);
  if (r.success) return { data: r.data, errors: null };
  return { data: null, errors: zodToFieldErrors(r.error) };
}

/* ------------------ Erros do banco mapeados por campo ----------------- */

export interface DatabaseFieldError {
  /** Nome do campo no payload/form (snake_case do DB), ou null se desconhecido */
  field: string | null;
  /** Mensagem amigável em PT-BR para mostrar no campo (ou geral) */
  message: string;
  /** Código SQLSTATE original, se houver */
  code?: string;
}

/**
 * Analisa um erro do Supabase/Postgres e tenta identificar QUAL campo causou.
 * `labels` mapeia nome-do-campo-DB → rótulo amigável que será usado na mensagem.
 *
 * Exemplos detectados:
 *  - 23505 unique_violation  → "Já existe um cadastro com este {label}"
 *  - 23502 not_null_violation → "{label} é obrigatório"
 *  - 23503 foreign_key       → "{label} referencia um registro inexistente"
 *  - 23514 check_violation   → "{label} não atende às regras de validação"
 *  - 22P02 invalid_text      → "{label} está em formato inválido"
 */
export function parseDatabaseFieldError(
  error: unknown,
  labels: Record<string, string> = {}
): DatabaseFieldError | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as { code?: string; message?: string; details?: string; constraint?: string };
  const code = e.code ? String(e.code) : '';
  const msg = `${e.message || ''} ${e.details || ''} ${e.constraint || ''}`;

  const label = (field: string | null) =>
    field ? labels[field] ?? humanizeFieldName(field) : null;

  // 23505 — duplicidade. Postgres devolve: Key (email)=(x@y.com) already exists.
  if (code === '23505' || /duplicate key|already exists/i.test(msg)) {
    const field = extractField(msg, /Key \(([^)]+)\)=/i) ?? extractConstraintField(e.constraint);
    const l = label(field);
    return {
      field,
      code,
      message: l
        ? `Já existe um cadastro com este ${l}.`
        : 'Já existe um registro com estes dados (valor duplicado).',
    };
  }

  // 23502 — NOT NULL. "null value in column \"email\" of relation \"...\""
  if (code === '23502' || /violates not-null/i.test(msg)) {
    const field = extractField(msg, /column "([^"]+)"/i);
    const l = label(field);
    return {
      field,
      code,
      message: l ? `${l} é obrigatório.` : 'Um campo obrigatório não foi preenchido.',
    };
  }

  // 23503 — FK
  if (code === '23503' || /violates foreign key/i.test(msg)) {
    const field = extractField(msg, /Key \(([^)]+)\)=/i);
    const l = label(field);
    return {
      field,
      code,
      message: l
        ? `${l} referencia um registro que não existe (ou foi removido).`
        : 'Existe um vínculo inválido com outro registro.',
    };
  }

  // 23514 — CHECK
  if (code === '23514' || /violates check constraint/i.test(msg)) {
    const field = extractConstraintField(e.constraint);
    const l = label(field);
    return {
      field,
      code,
      message: l
        ? `${l} não atende às regras de validação.`
        : 'Os dados informados não atendem às regras de validação.',
    };
  }

  // 22P02 — invalid_text_representation (texto em campo numérico/uuid)
  if (code === '22P02' || /invalid input syntax/i.test(msg)) {
    const typeMatch = /invalid input syntax for type (\w+)/i.exec(msg);
    return {
      field: null,
      code,
      message: typeMatch
        ? `Formato inválido (esperado: ${typeMatch[1]}).`
        : 'Formato de valor inválido em algum campo.',
    };
  }

  // 22001 — string longa demais
  if (code === '22001' || /value too long/i.test(msg)) {
    return { field: null, code, message: 'Um campo ultrapassou o tamanho máximo permitido.' };
  }

  return null;
}

function extractField(msg: string, re: RegExp): string | null {
  const m = re.exec(msg);
  return m?.[1]?.split(',')[0]?.trim() || null;
}

function extractConstraintField(constraint?: string): string | null {
  if (!constraint) return null;
  // ex.: "users_email_key" → "email"; "orders_total_check" → "total"
  const m = /^[a-z0-9]+_(.+?)_(?:key|check|fkey|unique|idx)$/i.exec(constraint);
  return m?.[1] ?? null;
}

function humanizeFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\bid\b/gi, '')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/* ----------------------------- React helpers ----------------------------- */

/**
 * Combina erros de validação local (zod) e do banco em um único `FieldErrors`
 * para alimentar o estado do formulário.
 */
export function mergeFieldErrors(
  ...sources: Array<FieldErrors | null | undefined>
): FieldErrors {
  const out: FieldErrors = {};
  for (const s of sources) {
    if (!s) continue;
    for (const k of Object.keys(s)) if (!out[k]) out[k] = s[k];
  }
  return out;
}
