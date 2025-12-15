import { useState, useCallback, useMemo } from 'react';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subYears, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface PeriodSelection {
  id: string;
  label: string;
  dateFrom: Date;
  dateTo: Date;
  color: string;
}

export type PeriodPreset = 
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'last3Months'
  | 'last6Months'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

const PERIOD_COLORS = [
  'hsl(var(--primary))',
  'hsl(142 76% 36%)',      // green
  'hsl(45 93% 47%)',       // yellow/amber
  'hsl(280 68% 60%)',      // purple
  'hsl(0 84% 60%)',        // red
  'hsl(199 89% 48%)',      // cyan
  'hsl(25 95% 53%)',       // orange
];

export const PERIOD_PRESETS: Record<PeriodPreset, { label: string; getRange: () => { from: Date; to: Date } }> = {
  today: {
    label: 'Hoje',
    getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  },
  yesterday: {
    label: 'Ontem',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    },
  },
  last7days: {
    label: 'Últimos 7 dias',
    getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }),
  },
  last30days: {
    label: 'Últimos 30 dias',
    getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }),
  },
  thisWeek: {
    label: 'Esta semana',
    getRange: () => ({ from: startOfWeek(new Date(), { locale: ptBR }), to: endOfWeek(new Date(), { locale: ptBR }) }),
  },
  lastWeek: {
    label: 'Semana passada',
    getRange: () => {
      const lastWeek = subDays(new Date(), 7);
      return { from: startOfWeek(lastWeek, { locale: ptBR }), to: endOfWeek(lastWeek, { locale: ptBR }) };
    },
  },
  thisMonth: {
    label: 'Este mês',
    getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  lastMonth: {
    label: 'Mês passado',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
  },
  last3Months: {
    label: 'Últimos 3 meses',
    getRange: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfDay(new Date()) }),
  },
  last6Months: {
    label: 'Últimos 6 meses',
    getRange: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: endOfDay(new Date()) }),
  },
  thisYear: {
    label: 'Este ano',
    getRange: () => ({ from: new Date(new Date().getFullYear(), 0, 1), to: endOfDay(new Date()) }),
  },
  lastYear: {
    label: 'Ano passado',
    getRange: () => {
      const lastYear = subYears(new Date(), 1);
      return { from: new Date(lastYear.getFullYear(), 0, 1), to: new Date(lastYear.getFullYear(), 11, 31) };
    },
  },
  custom: {
    label: 'Personalizado',
    getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  },
};

export function usePeriodComparison(maxPeriods: number = 5) {
  const [selectedPeriods, setSelectedPeriods] = useState<PeriodSelection[]>([]);

  const addPeriod = useCallback((preset: PeriodPreset, customRange?: { from: Date; to: Date }) => {
    if (selectedPeriods.length >= maxPeriods) return;

    const range = preset === 'custom' && customRange 
      ? customRange 
      : PERIOD_PRESETS[preset].getRange();

    const label = preset === 'custom' && customRange
      ? `${format(customRange.from, 'dd/MM/yy')} - ${format(customRange.to, 'dd/MM/yy')}`
      : PERIOD_PRESETS[preset].label;

    const newPeriod: PeriodSelection = {
      id: `${preset}-${Date.now()}`,
      label,
      dateFrom: range.from,
      dateTo: range.to,
      color: PERIOD_COLORS[selectedPeriods.length % PERIOD_COLORS.length],
    };

    setSelectedPeriods(prev => [...prev, newPeriod]);
  }, [selectedPeriods.length, maxPeriods]);

  const removePeriod = useCallback((id: string) => {
    setSelectedPeriods(prev => {
      const filtered = prev.filter(p => p.id !== id);
      // Reassign colors to maintain consistency
      return filtered.map((p, index) => ({
        ...p,
        color: PERIOD_COLORS[index % PERIOD_COLORS.length],
      }));
    });
  }, []);

  const clearPeriods = useCallback(() => {
    setSelectedPeriods([]);
  }, []);

  const setPeriods = useCallback((periods: PeriodSelection[]) => {
    setSelectedPeriods(periods.slice(0, maxPeriods).map((p, index) => ({
      ...p,
      color: PERIOD_COLORS[index % PERIOD_COLORS.length],
    })));
  }, [maxPeriods]);

  const formatPeriodDates = useCallback((period: PeriodSelection) => {
    return {
      from: format(period.dateFrom, 'yyyy-MM-dd'),
      to: format(period.dateTo, 'yyyy-MM-dd'),
    };
  }, []);

  const hasComparison = useMemo(() => selectedPeriods.length > 1, [selectedPeriods.length]);

  return {
    selectedPeriods,
    addPeriod,
    removePeriod,
    clearPeriods,
    setPeriods,
    formatPeriodDates,
    hasComparison,
    maxPeriods,
    canAddMore: selectedPeriods.length < maxPeriods,
  };
}

export function calculateVariation(current: number, previous: number): { value: number; isPositive: boolean } {
  if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
  const variation = ((current - previous) / previous) * 100;
  return { value: Math.abs(variation), isPositive: variation >= 0 };
}
