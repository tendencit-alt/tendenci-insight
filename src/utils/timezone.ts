// Utilitários de timezone para frontend - espelha supabase/functions/_shared/timezone.ts
// IMPORTANTE: Todas as datas são tratadas em UTC para consistência

// Offset de Brasília em milissegundos (-3 horas)
const BRASIL_OFFSET_MS = -3 * 60 * 60 * 1000;

/**
 * Retorna timestamp UTC atual
 */
export function getNowUTC(): number {
  return Date.now();
}

/**
 * Retorna o horário atual em Brasília como Date
 */
export function getNowBrasil(): Date {
  return new Date(Date.now() + BRASIL_OFFSET_MS);
}

/**
 * Retorna a hora atual em Brasília (0-23)
 */
export function getCurrentHourBrasil(): number {
  const brasilTime = new Date(Date.now() + BRASIL_OFFSET_MS);
  return brasilTime.getUTCHours();
}

/**
 * Retorna o dia da semana em Brasília (0=Dom, 6=Sab)
 */
export function getCurrentDayOfWeekBrasil(): number {
  const brasilTime = new Date(Date.now() + BRASIL_OFFSET_MS);
  return brasilTime.getUTCDay();
}

/**
 * Verifica se está dentro do horário comercial Brasil (9h-18h, seg-sex)
 */
export function isBusinessHoursBrasil(): boolean {
  const hour = getCurrentHourBrasil();
  const day = getCurrentDayOfWeekBrasil();
  return hour >= 9 && hour < 18 && day >= 1 && day <= 5;
}

/**
 * Retorna o cutoff de 48 horas atrás em timestamp UTC
 */
export function get48HoursCutoffUTC(): number {
  return Date.now() - (48 * 60 * 60 * 1000);
}

/**
 * Compara duas datas ISO e retorna a mais recente
 */
export function getMostRecentDate(date1: string | null, date2: string | null): Date | null {
  if (!date1 && !date2) return null;
  if (!date1) return new Date(date2!);
  if (!date2) return new Date(date1!);
  
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return new Date(Math.max(d1, d2));
}

/**
 * Formata timestamp para string legível em horário Brasil
 */
export function formatBrasilDateTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

/**
 * Retorna o início do dia atual em Brasília como timestamp UTC
 */
export function getStartOfDayBrasilAsUTC(): Date {
  const now = new Date();
  const brasilTime = new Date(now.getTime() + BRASIL_OFFSET_MS);
  const year = brasilTime.getUTCFullYear();
  const month = brasilTime.getUTCMonth();
  const day = brasilTime.getUTCDate();
  return new Date(Date.UTC(year, month, day, 3, 0, 0, 0));
}

/**
 * Retorna a data de N dias atrás (início do dia) em UTC
 */
export function getDaysAgoBrasilAsUTC(days: number): Date {
  const startOfToday = getStartOfDayBrasilAsUTC();
  return new Date(startOfToday.getTime() - (days * 24 * 60 * 60 * 1000));
}

/**
 * Parseia uma data no formato YYYY-MM-DD sem problemas de timezone
 * Útil para campos do tipo 'date' do banco (sem hora)
 */
export function parseDateOnly(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
}
