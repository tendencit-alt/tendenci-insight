// Utilitários compartilhados para manipulação de timezone - UTC consistente
// IMPORTANTE: Todas as datas são tratadas em UTC para consistência

// Offset de Brasília em milissegundos (-3 horas)
// UTC - 3 = Brasília, então para obter horário Brasil a partir de UTC: UTC + (-3h) = UTC - 3h
const BRASIL_OFFSET_MS = -3 * 60 * 60 * 1000

/**
 * Retorna timestamp UTC atual
 */
export function getNowUTC(): number {
  return Date.now()
}

/**
 * Retorna o horário atual em Brasília como Date
 * NOTA: O objeto Date ainda está em UTC internamente, mas representa o horário de Brasília
 */
export function getNowBrasil(): Date {
  return new Date(Date.now() + BRASIL_OFFSET_MS)
}

/**
 * Retorna a hora atual em Brasília (0-23)
 * Com logs de debug para rastreamento
 */
export function getCurrentHourBrasil(): number {
  const nowUTC = Date.now()
  const brasilTime = new Date(nowUTC + BRASIL_OFFSET_MS)
  const hour = brasilTime.getUTCHours()
  
  console.log(`[TIMEZONE DEBUG] UTC now: ${new Date(nowUTC).toISOString()}`)
  console.log(`[TIMEZONE DEBUG] Brasil time (adjusted): ${brasilTime.toISOString()}`)
  console.log(`[TIMEZONE DEBUG] Hour extracted: ${hour}`)
  
  return hour
}

/**
 * Retorna o dia da semana em Brasília (0=Dom, 6=Sab)
 */
export function getCurrentDayOfWeekBrasil(): number {
  const brasilTime = new Date(Date.now() + BRASIL_OFFSET_MS)
  const day = brasilTime.getUTCDay()
  
  console.log(`[TIMEZONE DEBUG] Day of week Brasil: ${day} (0=Dom, 1=Seg, ..., 6=Sab)`)
  
  return day
}

/**
 * Verifica se está dentro do horário comercial Brasil (9h-18h, seg-sex)
 * Com logs detalhados para debug
 */
export function isBusinessHoursBrasil(): boolean {
  const nowUTC = Date.now()
  const brasilTime = new Date(nowUTC + BRASIL_OFFSET_MS)
  const hour = brasilTime.getUTCHours()
  const day = brasilTime.getUTCDay()
  
  const isBusinessDay = day >= 1 && day <= 5 // Segunda (1) a Sexta (5)
  const isBusinessHour = hour >= 9 && hour < 18 // 9h às 17:59
  const isBusinessTime = isBusinessDay && isBusinessHour
  
  console.log(`[BUSINESS HOURS CHECK]`)
  console.log(`  UTC: ${new Date(nowUTC).toISOString()}`)
  console.log(`  Brasil: ${brasilTime.toISOString()} (representação)`)
  console.log(`  Hora Brasil: ${hour}h`)
  console.log(`  Dia Brasil: ${day} (${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][day]})`)
  console.log(`  É dia útil (1-5): ${isBusinessDay}`)
  console.log(`  É hora comercial (9-18): ${isBusinessHour}`)
  console.log(`  RESULTADO: ${isBusinessTime ? '✅ DENTRO do horário comercial' : '❌ FORA do horário comercial'}`)
  
  return isBusinessTime
}

/**
 * Retorna o início do dia atual em Brasília como timestamp UTC
 * Ex: Se são 14:00 de 05/12 em Brasília, retorna 03:00 UTC de 05/12
 */
export function getStartOfDayBrasilAsUTC(): Date {
  const now = new Date()
  // Ajustar para horário Brasil
  const brasilTime = new Date(now.getTime() + BRASIL_OFFSET_MS)
  // Pegar ano, mês, dia em "horário Brasil"
  const year = brasilTime.getUTCFullYear()
  const month = brasilTime.getUTCMonth()
  const day = brasilTime.getUTCDate()
  // Criar data às 00:00 Brasil, que é 03:00 UTC
  return new Date(Date.UTC(year, month, day, 3, 0, 0, 0))
}

/**
 * Retorna a data de N dias atrás (início do dia) em UTC
 */
export function getDaysAgoBrasilAsUTC(days: number): Date {
  const startOfToday = getStartOfDayBrasilAsUTC()
  return new Date(startOfToday.getTime() - (days * 24 * 60 * 60 * 1000))
}

/**
 * Retorna a data de 7 dias atrás (início do dia) em UTC
 */
export function getLast7DaysAsUTC(): Date {
  return getDaysAgoBrasilAsUTC(7)
}

/**
 * Retorna o cutoff de 48 horas atrás em timestamp UTC
 */
export function get48HoursCutoffUTC(): number {
  return Date.now() - (48 * 60 * 60 * 1000)
}

/**
 * Compara duas datas ISO e retorna a mais recente
 */
export function getMostRecentDate(date1: string | null, date2: string | null): Date | null {
  if (!date1 && !date2) return null
  if (!date1) return new Date(date2!)
  if (!date2) return new Date(date1!)
  
  const d1 = new Date(date1).getTime()
  const d2 = new Date(date2).getTime()
  return new Date(Math.max(d1, d2))
}

/**
 * Formata timestamp para string legível em horário Brasil
 */
export function formatBrasilDateTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  })
}
