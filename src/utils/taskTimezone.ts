/**
 * Utilitários centralizados de timezone para o módulo de tarefas
 * Todos os componentes de tarefas devem usar estas funções para garantir consistência
 */

/**
 * Converte datetime-local para ISO string em UTC
 * Interpretando o input como horário de Brasília (UTC-3)
 * 
 * @example
 * localInputToUTC("2025-12-19T14:00") // "2025-12-19T17:00:00.000Z"
 */
export function localInputToUTC(datetimeLocal: string): string {
  if (!datetimeLocal) return "";
  // datetime-local retorna "2025-12-19T14:00" sem timezone
  // Anexar :00 (segundos) e offset -03:00 (Brasília)
  return new Date(datetimeLocal + ":00-03:00").toISOString();
}

/**
 * Converte ISO/UTC para formato datetime-local em horário de Brasília
 * Para uso em inputs do tipo datetime-local
 * 
 * @example
 * utcToLocalInput("2025-12-19T17:00:00.000Z") // "2025-12-19T14:00"
 */
export function utcToLocalInput(isoString: string): string {
  if (!isoString) return "";
  
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  
  // Usar Intl para formatar corretamente em Brasília
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  const parts = new Intl.DateTimeFormat('sv-SE', options).formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Verifica se datetime-local está no passado (considerando Brasília)
 * Útil para validação antes de salvar tarefas
 * 
 * @example
 * isLocalInputInPast("2025-12-15T10:00") // true se já passou
 */
export function isLocalInputInPast(datetimeLocal: string): boolean {
  if (!datetimeLocal) return false;
  const inputAsUTC = new Date(datetimeLocal + ":00-03:00");
  return inputAsUTC < new Date();
}

/**
 * Verifica se uma data ISO está no passado
 */
export function isISODateInPast(isoString: string): boolean {
  if (!isoString) return false;
  return new Date(isoString) < new Date();
}

/**
 * Formata ISO para exibição em horário de Brasília
 * Retorna formato curto: "19/12/2025 14:00"
 * 
 * @example
 * formatBrasil("2025-12-19T17:00:00.000Z") // "19/12/2025 14:00"
 */
export function formatBrasil(isoString: string): string {
  if (!isoString) return "";
  
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata ISO para exibição curta em horário de Brasília
 * Retorna formato: "19/12 14:00"
 */
export function formatBrasilShort(isoString: string): string {
  if (!isoString) return "";
  
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calcula dias até a data de vencimento
 * Retorna info para exibição em badges
 * IMPORTANTE: Compara datas no timezone de Brasília
 * 
 * CORREÇÃO: Compara primeiro os DIAS, depois verifica se a hora passou
 * para evitar que tarefas de "hoje" apareçam como "amanhã"
 */
export function getDaysUntilDue(isoString: string): {
  text: string;
  variant: "destructive" | "default" | "secondary" | "outline";
  isOverdue: boolean;
} {
  if (!isoString) {
    return { text: "Sem data", variant: "outline", isOverdue: false };
  }
  
  const dueDate = new Date(isoString);
  
  // Validar se a data é válida
  if (isNaN(dueDate.getTime())) {
    return { text: "Data inválida", variant: "outline", isOverdue: false };
  }
  
  const now = new Date();
  
  // Converter ambas as datas para "dia" em Brasília para comparação
  const brasilFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  try {
    const dueDateBrasil = brasilFormatter.format(dueDate); // "2026-01-05"
    const nowBrasil = brasilFormatter.format(now); // "2026-01-05"
    
    // CORREÇÃO: Comparar DIAS primeiro (strings no formato YYYY-MM-DD são comparáveis)
    if (dueDateBrasil === nowBrasil) {
      // Mesmo dia - verificar se a hora já passou
      if (dueDate < now) {
        return { text: "Atrasada", variant: "destructive", isOverdue: true };
      }
      return { text: "Hoje", variant: "default", isOverdue: false };
    }
    
    // Dias diferentes - calcular diferença
    const dueDay = new Date(dueDateBrasil + "T00:00:00");
    const nowDay = new Date(nowBrasil + "T00:00:00");
    const diffDays = Math.floor((dueDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      // Dia passado
      return { text: "Atrasada", variant: "destructive", isOverdue: true };
    } else if (diffDays === 1) {
      return { text: "Amanhã", variant: "secondary", isOverdue: false };
    } else {
      return { text: `${diffDays}d`, variant: "secondary", isOverdue: false };
    }
  } catch {
    return { text: "Data inválida", variant: "outline", isOverdue: false };
  }
}

/**
 * Verifica se uma data ISO é "hoje" em Brasília
 */
export function isTodayBrasil(isoString: string): boolean {
  if (!isoString) return false;
  
  try {
    const brasilFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const dateBrasil = brasilFormatter.format(new Date(isoString));
    const nowBrasil = brasilFormatter.format(new Date());
    
    return dateBrasil === nowBrasil;
  } catch {
    return false;
  }
}

/**
 * Verifica se uma data ISO é "ontem" em Brasília
 */
export function isYesterdayBrasil(isoString: string): boolean {
  if (!isoString) return false;
  
  try {
    const brasilFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const dateBrasil = brasilFormatter.format(new Date(isoString));
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayBrasil = brasilFormatter.format(yesterday);
    
    return dateBrasil === yesterdayBrasil;
  } catch {
    return false;
  }
}

/**
 * Verifica se uma data ISO é futura (após hoje) em Brasília
 */
export function isFutureDayBrasil(isoString: string): boolean {
  if (!isoString) return false;
  
  try {
    const brasilFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const dateBrasil = brasilFormatter.format(new Date(isoString));
    const nowBrasil = brasilFormatter.format(new Date());
    
    return dateBrasil > nowBrasil;
  } catch {
    return false;
  }
}

/**
 * Retorna data mínima permitida para criação de tarefas
 * Considera timezone de Brasília
 */
export function getMinDateTimeLocal(): string {
  const now = new Date();
  return utcToLocalInput(now.toISOString());
}
