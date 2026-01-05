import { addDays, isWeekend, format } from 'date-fns';

/**
 * Calcula uma data futura adicionando dias úteis (excluindo finais de semana)
 * @param startDate Data inicial
 * @param businessDays Número de dias úteis a adicionar
 * @returns Data final após adicionar os dias úteis
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  let currentDate = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    currentDate = addDays(currentDate, 1);
    if (!isWeekend(currentDate)) {
      daysAdded++;
    }
  }
  
  return currentDate;
}

/**
 * Calcula o número de dias úteis entre duas datas
 * @param startDate Data inicial
 * @param endDate Data final
 * @returns Número de dias úteis entre as datas
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  let currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    currentDate = addDays(currentDate, 1);
    if (!isWeekend(currentDate)) {
      count++;
    }
  }
  
  return count;
}

/**
 * Formata uma data no padrão brasileiro
 * @param date Data a formatar
 * @returns String formatada (dd/MM/yyyy)
 */
export function formatDateBR(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}
