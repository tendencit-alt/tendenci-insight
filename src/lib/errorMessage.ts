/**
 * Camada de mensagens de erro amigáveis.
 *
 * Reconhece códigos comuns do Postgres / Supabase (RLS, constraint, auth)
 * e devolve um texto claro para o usuário final, sem perder o detalhe
 * técnico (que é incluído em parênteses para suporte).
 */

type ErrLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string | number;
  status?: number;
  statusCode?: number;
  name?: string;
  error?: string;
  error_description?: string;
};

/* ---------------------------------------------------------------- */
/* Mapeamento por código                                            */
/* ---------------------------------------------------------------- */

// Postgres SQLSTATE → mensagem amigável
// Ref: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_CODE_MAP: Record<string, string> = {
  // Class 23 — Integridade
  '23502': 'Campo obrigatório não preenchido.',
  '23503': 'Operação bloqueada: existe outro registro vinculado a este item.',
  '23505': 'Já existe um registro com estes dados (valor duplicado).',
  '23514': 'Os dados informados não atendem às regras de validação.',
  '23P01': 'Conflito de exclusão entre registros relacionados.',

  // Class 22 — Tipo de dado
  '22001': 'Valor muito longo para o campo.',
  '22003': 'Valor numérico fora do intervalo permitido.',
  '22007': 'Formato de data/hora inválido.',
  '22008': 'Data/hora fora do intervalo permitido.',
  '22012': 'Divisão por zero não permitida.',
  '22023': 'Parâmetro inválido para a operação.',
  '22P02': 'Formato de valor inválido (texto enviado em campo numérico ou UUID).',

  // Class 42 — Sintaxe / permissão
  '42501': 'Você não tem permissão para executar esta ação.',
  '42P01': 'Recurso não encontrado no banco de dados.',
  '42703': 'Campo não existe ou foi removido.',
  '42883': 'Função do banco de dados não encontrada.',

  // Class 28 — Autorização
  '28000': 'Credenciais inválidas.',
  '28P01': 'Senha incorreta.',

  // Class 40 — Transação
  '40001': 'Conflito ao salvar (outro usuário alterou o registro). Tente novamente.',
  '40P01': 'Bloqueio entre operações simultâneas. Tente novamente.',

  // Class 53 — Recursos
  '53300': 'Muitas conexões abertas. Aguarde alguns segundos e tente novamente.',
  '53400': 'Limite de recursos do banco atingido.',

  // Class 57 — Operador
  '57014': 'Operação cancelada por tempo excedido.',

  // PostgREST específicos
  PGRST116: 'Nenhum registro encontrado.',
  PGRST301: 'Sessão expirada. Faça login novamente.',
  PGRST302: 'Você não tem permissão para acessar este recurso.',
};

// Códigos de autenticação Supabase / GoTrue
const AUTH_CODE_MAP: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  invalid_grant: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  user_not_found: 'Usuário não encontrado.',
  user_already_exists: 'Já existe uma conta com este e-mail.',
  email_exists: 'Já existe uma conta com este e-mail.',
  weak_password: 'Senha muito fraca. Use ao menos 8 caracteres com letras e números.',
  same_password: 'A nova senha deve ser diferente da atual.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  signup_disabled: 'Cadastro desabilitado pelo administrador.',
  email_address_invalid: 'E-mail inválido.',
  session_not_found: 'Sessão expirada. Faça login novamente.',
  refresh_token_not_found: 'Sessão expirada. Faça login novamente.',
  bad_jwt: 'Sessão inválida. Faça login novamente.',
};

// HTTP status → mensagem amigável (fallback)
const HTTP_STATUS_MAP: Record<number, string> = {
  400: 'Requisição inválida.',
  401: 'Você precisa estar autenticado. Faça login novamente.',
  403: 'Você não tem permissão para executar esta ação.',
  404: 'Recurso não encontrado.',
  408: 'O servidor demorou demais para responder.',
  409: 'Conflito com o estado atual do recurso.',
  413: 'Arquivo ou requisição muito grande.',
  422: 'Dados inválidos.',
  429: 'Muitas tentativas. Aguarde alguns segundos.',
  500: 'Erro interno no servidor. Tente novamente.',
  502: 'Servidor temporariamente indisponível.',
  503: 'Serviço temporariamente indisponível.',
  504: 'Tempo de resposta esgotado.',
};

// Padrões em mensagens livres (quando não vem código)
const MESSAGE_PATTERNS: Array<{ test: RegExp; friendly: string }> = [
  { test: /row-level security|RLS/i, friendly: 'Você não tem permissão para executar esta ação (bloqueio de segurança).' },
  { test: /violates foreign key/i, friendly: 'Operação bloqueada: existe outro registro vinculado a este item.' },
  { test: /duplicate key|already exists/i, friendly: 'Já existe um registro com estes dados.' },
  { test: /violates not-null/i, friendly: 'Campo obrigatório não preenchido.' },
  { test: /violates check constraint/i, friendly: 'Os dados informados não atendem às regras de validação.' },
  { test: /JWT expired|jwt expired/i, friendly: 'Sessão expirada. Faça login novamente.' },
  { test: /Invalid login credentials/i, friendly: 'E-mail ou senha incorretos.' },
  { test: /Email not confirmed/i, friendly: 'Confirme seu e-mail antes de entrar.' },
  { test: /Failed to fetch|NetworkError|network request failed/i, friendly: 'Falha de conexão. Verifique sua internet e tente novamente.' },
  { test: /timeout|timed out/i, friendly: 'A operação demorou demais e foi cancelada. Tente novamente.' },
  { test: /permission denied/i, friendly: 'Você não tem permissão para executar esta ação.' },
  { test: /tenant/i, friendly: 'Problema de associação à empresa (tenant). Recarregue a página.' },
];

/* ---------------------------------------------------------------- */
/* Resolução                                                         */
/* ---------------------------------------------------------------- */

function asObj(error: unknown): ErrLike | null {
  if (!error || typeof error !== 'object') return null;
  return error as ErrLike;
}

/**
 * Tenta mapear o erro para uma mensagem amigável.
 * Retorna `null` se nenhum padrão conhecido casar.
 */
export function getFriendlyError(error: unknown): string | null {
  if (!error) return null;

  const e = asObj(error);
  const code = e?.code != null ? String(e.code) : undefined;
  const status = e?.status ?? e?.statusCode;
  const raw = typeof error === 'string' ? error : e?.message || e?.error_description || e?.error || '';

  // 1) Códigos Postgres / PostgREST
  if (code && PG_CODE_MAP[code]) return PG_CODE_MAP[code];

  // 2) Códigos de Auth (Supabase costuma mandar em `code` ou `error`)
  if (code && AUTH_CODE_MAP[code]) return AUTH_CODE_MAP[code];
  if (e?.error && AUTH_CODE_MAP[e.error]) return AUTH_CODE_MAP[e.error];

  // 3) Padrões em mensagem livre
  if (raw) {
    for (const { test, friendly } of MESSAGE_PATTERNS) {
      if (test.test(raw)) return friendly;
    }
  }

  // 4) HTTP status
  if (typeof status === 'number' && HTTP_STATUS_MAP[status]) return HTTP_STATUS_MAP[status];

  return null;
}

/**
 * Extrai mensagem técnica completa (message + details + hint + code).
 * Útil para logs ou para anexar como detalhe ao usuário avançado.
 */
export function getErrorMessage(error: unknown, fallback = 'Erro desconhecido'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;

  const e = asObj(error);
  if (e) {
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
 * Mensagem pronta para mostrar ao usuário: amigável quando reconhecida,
 * senão a mensagem técnica original.
 *
 * Se `includeTechnical = true` (padrão), anexa o código entre parênteses
 * para facilitar o suporte. Ex.:
 *   "Você não tem permissão para executar esta ação. (42501)"
 */
export function humanizeError(error: unknown, includeTechnical = true): string {
  const friendly = getFriendlyError(error);
  if (friendly) {
    if (!includeTechnical) return friendly;
    const e = asObj(error);
    const code = e?.code ?? e?.status ?? e?.statusCode;
    return code ? `${friendly} (${code})` : friendly;
  }
  return getErrorMessage(error);
}

/**
 * Combina uma frase base ("Não foi possível salvar") com a mensagem
 * humanizada do erro. Sempre passa pelo `humanizeError`, então o
 * usuário vê o motivo real em linguagem clara.
 */
export function describeError(base: string, error: unknown): string {
  const reason = humanizeError(error);
  return reason ? `${base}: ${reason}` : base;
}
