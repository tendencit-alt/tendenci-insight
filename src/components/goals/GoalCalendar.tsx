import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isAfter, isBefore, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyRecord {
  date: string;
  meta: number;
  realizado: number;
  batida: boolean;
}

interface GoalCalendarProps {
  records: DailyRecord[];
  currentMonth: Date;
  loading?: boolean;
}

export function GoalCalendar({ records, currentMonth, loading }: GoalCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = new Date();

  const getDayStatus = (day: Date) => {
    const record = records.find(r => isSameDay(new Date(r.date), day));
    
    if (isAfter(day, today)) return 'future';
    if (!record) return 'no_data';
    if (record.batida) return 'success';
    if (record.realizado >= record.meta * 0.5) return 'partial';
    return 'failed';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500 text-white';
      case 'partial': return 'bg-yellow-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      case 'future': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted/50 text-muted-foreground';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'success': return '✓';
      case 'partial': return '~';
      case 'failed': return '✗';
      default: return '';
    }
  };

  // Calcular estatísticas
  const stats = {
    diasBatidos: records.filter(r => r.batida && !isAfter(new Date(r.date), today)).length,
    diasParciais: records.filter(r => !r.batida && r.realizado >= r.meta * 0.5 && !isAfter(new Date(r.date), today)).length,
    diasNaoBatidos: records.filter(r => !r.batida && r.realizado < r.meta * 0.5 && !isAfter(new Date(r.date), today)).length,
  };

  // Calcular offset para começar no dia correto da semana
  const startDayOfWeek = getDay(monthStart);
  const emptyDays = Array(startDayOfWeek).fill(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 animate-pulse">
          <div className="h-48 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4" />
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <div key={i} className="text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Dias do mês */}
        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const status = getDayStatus(day);
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className={`
                  aspect-square rounded-md flex flex-col items-center justify-center text-xs
                  ${getStatusColor(status)}
                  ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                  transition-all hover:scale-105
                `}
                title={`${format(day, 'dd/MM')}: ${status === 'success' ? 'Meta batida' : status === 'partial' ? 'Parcial' : status === 'failed' ? 'Não batida' : ''}`}
              >
                <span className="font-medium">{format(day, 'd')}</span>
                <span className="text-[10px]">{getStatusEmoji(status)}</span>
              </div>
            );
          })}
        </div>

        {/* Legenda e estatísticas */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-green-500" /> Batida
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-yellow-500" /> Parcial
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-red-500" /> Não batida
            </span>
          </div>
          <div className="flex gap-3 text-muted-foreground">
            <span className="text-green-600 font-medium">{stats.diasBatidos} ✓</span>
            <span className="text-yellow-600 font-medium">{stats.diasParciais} ~</span>
            <span className="text-red-600 font-medium">{stats.diasNaoBatidos} ✗</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}