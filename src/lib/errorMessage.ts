/**
 * Extracts a clear, user-readable message from any error-like value.
 *
 * Handles:
 *  - Supabase PostgrestError ({ message, details, hint, code })
 *  - Standard Error
 *  - Plain strings
 *  - Unknown shapes (best-effort JSON)
 *
 * Always returns a non-empty string so toasts/alerts never show a blank reason.
 */
export function getErrorMessage(error: unknown, fallback = 'Erro desconhecido'): string {
  if (!error) return fallback;

  if (typeof error === 'string') return error;

  if (error instanceof Error && error.message) return error.message;

  if (typeof error === 'object') {
    const e = error as Record<string, any>;
    const parts: string[] = [];

    if (e.message) parts.push(String(e.message));
    if (e.details && e.details !== e.message) parts.push(String(e.details));
    if (e.hint) parts.push(`Dica: ${e.hint}`);
    if (e.code) parts.push(`[${e.code}]`);

    if (parts.length) return parts.join(' — ');

    try {
      const s = JSON.stringify(error);
      if (s && s !== '{}') return s;
    } catch {
      /* noop */
    }
  }

  return fallback;
}

/**
 * Builds a toast-ready description: a base sentence + the underlying reason.
 * Example: describeError('Não foi possível salvar', err)
 *   → "Não foi possível salvar: violates row-level security policy [42501]"
 */
export function describeError(base: string, error: unknown): string {
  const reason = getErrorMessage(error, '');
  return reason ? `${base}: ${reason}` : base;
}
