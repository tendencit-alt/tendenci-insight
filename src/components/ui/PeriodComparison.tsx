import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Plus, X, GitCompare } from 'lucide-react';
import { PeriodSelection, PeriodPreset, PERIOD_PRESETS } from '@/hooks/usePeriodComparison';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface PeriodComparisonProps {
  selectedPeriods: PeriodSelection[];
  onAddPeriod: (preset: PeriodPreset, customRange?: { from: Date; to: Date }) => void;
  onRemovePeriod: (id: string) => void;
  onClear: () => void;
  canAddMore: boolean;
  maxPeriods?: number;
}

export function PeriodComparison({
  selectedPeriods,
  onAddPeriod,
  onRemovePeriod,
  onClear,
  canAddMore,
  maxPeriods = 5,
}: PeriodComparisonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset | ''>('');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  const handleAddPeriod = () => {
    if (!selectedPreset) return;

    if (selectedPreset === 'custom' && customRange?.from && customRange?.to) {
      onAddPeriod('custom', { from: customRange.from, to: customRange.to });
      setCustomRange(undefined);
      setShowCustomCalendar(false);
    } else if (selectedPreset !== 'custom') {
      onAddPeriod(selectedPreset);
    }
    
    setSelectedPreset('');
    setIsOpen(false);
  };

  const presetOptions = Object.entries(PERIOD_PRESETS).filter(([key]) => key !== 'custom');

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Selected periods as badges */}
      {selectedPeriods.map((period, index) => (
        <Badge
          key={period.id}
          variant="outline"
          className="flex items-center gap-1.5 px-2 py-1 text-xs"
          style={{ borderColor: period.color, backgroundColor: `${period.color}15` }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: period.color }}
          />
          <span>{period.label}</span>
          <button
            onClick={() => onRemovePeriod(period.id)}
            className="ml-1 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Add period button */}
      {canAddMore && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" />
              <GitCompare className="h-3 w-3" />
              Comparar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-3">
              <div className="text-sm font-medium">
                Adicionar período ({selectedPeriods.length}/{maxPeriods})
              </div>
              
              <Select
                value={selectedPreset}
                onValueChange={(value) => {
                  setSelectedPreset(value as PeriodPreset);
                  setShowCustomCalendar(value === 'custom');
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione um período" />
                </SelectTrigger>
                <SelectContent>
                  {presetOptions.map(([key, { label }]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-xs">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Personalizado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {showCustomCalendar && (
                <div className="border rounded-md p-2">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={setCustomRange}
                    locale={ptBR}
                    numberOfMonths={1}
                    className="text-xs"
                  />
                  {customRange?.from && customRange?.to && (
                    <div className="text-xs text-muted-foreground mt-2 text-center">
                      {format(customRange.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                      {format(customRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleAddPeriod}
                  disabled={!selectedPreset || (selectedPreset === 'custom' && (!customRange?.from || !customRange?.to))}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Clear all button */}
      {selectedPeriods.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={onClear}
        >
          Limpar
        </Button>
      )}
    </div>
  );
}
