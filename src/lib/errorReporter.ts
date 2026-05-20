/**
 * Correlation ID / Request ID para erros.
 *
 * Toda vez que um erro é mostrado ao usuário, geramos um ID curto e:
 *  - imprimimos no console.error com o payload completo
 *  - enviamos para a edge function `log-system-error` (best-effort)
 *  - devolvemos a string final do toast com o ID visível
 *
 * O usuário pode copiar esse ID e enviar para o suporte; basta procurar
 * o mesmo ID nos logs (console do navegador, system_errors, edge logs).
 */
import { supabase } from '@/integrations/supabase/client';
import { describeError, humanizeError, getErrorMessage } from '@/lib/errorMessage';

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I

export function newCorrelationId(): string {
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return `ERR-${id}`;
}

interface ReportOptions {
  /** Frase base mostrada antes do motivo. Ex.: "Não foi possível salvar" */
  base?: string;
  /** Módulo lógico (crm, financeiro, producao...) para o log estruturado */
  module?: string;
  /** Severidade do log no backend */
  severity?: 'low' | 'medium' | 'high' | 'critical';
  /** Contexto adicional (ids, payload, rota) */
  context?: Record<string, unknown>;
  /** Se false, não envia para o backend (apenas console). Default: true */
  remote?: boolean;
}

export interface ReportedError {
  /** ID curto para o usuário copiar e o suporte buscar */
  correlationId: string;
  /** Mensagem amigável + ID, pronta para usar em toast/alert */
  description: string;
  /** Mensagem técnica completa (com code/hint) */
  technical: string;
}

/**
 * Loga um erro e devolve uma descrição pronta para o toast, com Request ID.
 *
 * Uso:
 *   const r = reportError(error, { base: 'Não foi possível salvar', module: 'crm' });
 *   toast({ title: 'Erro', description: r.description, variant: 'destructive' });
 */
export function reportError(error: unknown, options: ReportOptions = {}): ReportedError {
  const correlationId = newCorrelationId();
  const base = options.base;
  const friendly = humanizeError(error);
  const technical = getErrorMessage(error);

  const description = base
    ? `${describeError(base, error)} · ID: ${correlationId}`
    : `${friendly} · ID: ${correlationId}`;

  // 1) Console — sempre, para o dev/suporte achar no DevTools
  console.error(`[${correlationId}]`, base ?? 'Erro', {
    error,
    technical,
    module: options.module,
    context: options.context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    at: new Date().toISOString(),
  });

  // 2) Backend — best-effort, não bloqueia a UI
  if (options.remote !== false) {
    void sendToBackend(correlationId, error, options).catch((e) =>
      console.warn(`[${correlationId}] Falha ao registrar erro remoto:`, e)
    );
  }

  return { correlationId, description, technical };
}

async function sendToBackend(correlationId: string, error: unknown, options: ReportOptions) {
  try {
    const e = (error && typeof error === 'object' ? (error as any) : {}) || {};
    await supabase.functions.invoke('log-system-error', {
      body: {
        title: options.base ?? `Frontend error (${correlationId})`,
        description: getErrorMessage(error),
        module: options.module ?? 'frontend',
        severity: options.severity ?? 'medium',
        source: 'frontend',
        error_code: e.code ? String(e.code) : (correlationId),
        stack_trace: error instanceof Error ? error.stack : undefined,
        metadata: {
          correlation_id: correlationId,
          context: options.context ?? null,
          url: typeof window !== 'undefined' ? window.location.href : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          hint: e.hint ?? null,
          details: e.details ?? null,
          status: e.status ?? e.statusCode ?? null,
        },
      },
    });
  } catch {
    /* silencioso — já logado no console */
  }
}
