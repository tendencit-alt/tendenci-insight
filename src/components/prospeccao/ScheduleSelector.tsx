import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Repeat, 
  Zap,
  AlertCircle
} from "lucide-react";
import { format, addDays, setHours, setMinutes, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ScheduleConfig {
  enabled: boolean;
  type: 'unico' | 'recorrente';
  dataHoraUnica: Date | null;
  diasSemana: number[]; // 0-6 (domingo-sábado)
  horarioInicio: string; // "08:00"
  horarioFim: string; // "18:00"
  dataInicio: Date | null;
  dataFim: Date | null;
}

interface ScheduleSelectorProps {
  value: ScheduleConfig;
  onChange: (config: ScheduleConfig) => void;
  totalArquitetos: number;
}

const DIAS_SEMANA = [
  { value: 1, label: 'Seg', fullLabel: 'Segunda' },
  { value: 2, label: 'Ter', fullLabel: 'Terça' },
  { value: 3, label: 'Qua', fullLabel: 'Quarta' },
  { value: 4, label: 'Qui', fullLabel: 'Quinta' },
  { value: 5, label: 'Sex', fullLabel: 'Sexta' },
  { value: 6, label: 'Sáb', fullLabel: 'Sábado' },
  { value: 0, label: 'Dom', fullLabel: 'Domingo' },
];

const HORARIOS = Array.from({ length: 24 }, (_, i) => {
  const hora = i.toString().padStart(2, '0');
  return { value: `${hora}:00`, label: `${hora}:00` };
});

export function ScheduleSelector({ value, onChange, totalArquitetos }: ScheduleSelectorProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateInicioOpen, setDateInicioOpen] = useState(false);
  const [dateFimOpen, setDateFimOpen] = useState(false);

  const handleToggle = (enabled: boolean) => {
    onChange({ ...value, enabled });
  };

  const handleTypeChange = (type: 'unico' | 'recorrente') => {
    onChange({ ...value, type });
  };

  const handleDiasSemanaToggle = (dia: number) => {
    const newDias = value.diasSemana.includes(dia)
      ? value.diasSemana.filter(d => d !== dia)
      : [...value.diasSemana, dia];
    onChange({ ...value, diasSemana: newDias });
  };

  const calcularProximoDisparo = (): string => {
    if (!value.enabled) return '';
    
    const now = new Date();
    
    if (value.type === 'unico' && value.dataHoraUnica) {
      if (isAfter(value.dataHoraUnica, now)) {
        return format(value.dataHoraUnica, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      }
      return 'Data já passou';
    }
    
    if (value.type === 'recorrente' && value.diasSemana.length > 0 && value.dataInicio) {
      // Encontrar próximo dia válido
      let checkDate = isAfter(value.dataInicio, now) ? value.dataInicio : now;
      
      for (let i = 0; i < 8; i++) {
        const dayToCheck = addDays(checkDate, i);
        const dayOfWeek = dayToCheck.getDay();
        
        if (value.diasSemana.includes(dayOfWeek)) {
          // Verificar se está dentro do período
          if (value.dataFim && isAfter(dayToCheck, value.dataFim)) {
            return 'Período encerrado';
          }
          
          const [hora] = value.horarioInicio.split(':').map(Number);
          const disparoDate = setMinutes(setHours(startOfDay(dayToCheck), hora), 0);
          
          if (isAfter(disparoDate, now)) {
            return format(disparoDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          }
        }
      }
      return 'Não há data disponível';
    }
    
    return 'Configure o agendamento';
  };

  const calcularTotalDisparos = (): number => {
    if (!value.enabled || value.type === 'unico') {
      return totalArquitetos;
    }
    
    if (value.type === 'recorrente' && value.dataInicio && value.dataFim && value.diasSemana.length > 0) {
      let count = 0;
      let checkDate = value.dataInicio;
      
      while (isBefore(checkDate, value.dataFim) || checkDate.getTime() === value.dataFim.getTime()) {
        if (value.diasSemana.includes(checkDate.getDay())) {
          count++;
        }
        checkDate = addDays(checkDate, 1);
      }
      
      return count * totalArquitetos;
    }
    
    return totalArquitetos;
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        {/* Toggle principal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <Label className="text-base font-semibold">Agendar Campanha</Label>
          </div>
          <Switch
            checked={value.enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {value.enabled && (
          <>
            {/* Tipo de agendamento */}
            <div className="space-y-2">
              <Label>Tipo de Agendamento</Label>
              <div className="flex gap-2">
                <Button
                  variant={value.type === 'unico' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTypeChange('unico')}
                  className="flex-1 gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Único
                </Button>
                <Button
                  variant={value.type === 'recorrente' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTypeChange('recorrente')}
                  className="flex-1 gap-2"
                >
                  <Repeat className="h-4 w-4" />
                  Recorrente
                </Button>
              </div>
            </div>

            {/* Agendamento Único */}
            {value.type === 'unico' && (
              <div className="space-y-3">
                <Label>Data e Hora do Disparo</Label>
                <div className="flex gap-2">
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {value.dataHoraUnica 
                          ? format(value.dataHoraUnica, "dd/MM/yyyy", { locale: ptBR })
                          : "Selecionar data"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={value.dataHoraUnica || undefined}
                        onSelect={(date) => {
                          if (date) {
                            const hora = value.dataHoraUnica 
                              ? value.dataHoraUnica.getHours() 
                              : 9;
                            const minutos = value.dataHoraUnica 
                              ? value.dataHoraUnica.getMinutes() 
                              : 0;
                            onChange({ 
                              ...value, 
                              dataHoraUnica: setMinutes(setHours(date, hora), minutos) 
                            });
                          }
                          setDatePickerOpen(false);
                        }}
                        disabled={(date) => isBefore(date, startOfDay(new Date()))}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Select 
                    value={value.dataHoraUnica ? `${value.dataHoraUnica.getHours().toString().padStart(2, '0')}:00` : undefined}
                    onValueChange={(hora) => {
                      const [h] = hora.split(':').map(Number);
                      const baseDate = value.dataHoraUnica || new Date();
                      onChange({ 
                        ...value, 
                        dataHoraUnica: setMinutes(setHours(baseDate, h), 0) 
                      });
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <Clock className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {HORARIOS.map((h) => (
                        <SelectItem key={h.value} value={h.value}>
                          {h.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Agendamento Recorrente */}
            {value.type === 'recorrente' && (
              <div className="space-y-4">
                {/* Dias da semana */}
                <div className="space-y-2">
                  <Label>Dias da Semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {DIAS_SEMANA.map((dia) => (
                      <Button
                        key={dia.value}
                        variant={value.diasSemana.includes(dia.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleDiasSemanaToggle(dia.value)}
                        className="w-12"
                      >
                        {dia.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChange({ ...value, diasSemana: [1, 2, 3, 4, 5] })}
                      className="text-xs"
                    >
                      Seg-Sex
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChange({ ...value, diasSemana: [0, 1, 2, 3, 4, 5, 6] })}
                      className="text-xs"
                    >
                      Todos
                    </Button>
                  </div>
                </div>

                {/* Horário */}
                <div className="space-y-2">
                  <Label>Horário de Disparo</Label>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={value.horarioInicio}
                      onValueChange={(v) => onChange({ ...value, horarioInicio: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Início" />
                      </SelectTrigger>
                      <SelectContent>
                        {HORARIOS.map((h) => (
                          <SelectItem key={h.value} value={h.value}>
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">até</span>
                    <Select 
                      value={value.horarioFim}
                      onValueChange={(v) => onChange({ ...value, horarioFim: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Fim" />
                      </SelectTrigger>
                      <SelectContent>
                        {HORARIOS.map((h) => (
                          <SelectItem key={h.value} value={h.value}>
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Período */}
                <div className="space-y-2">
                  <Label>Período</Label>
                  <div className="flex items-center gap-2">
                    <Popover open={dateInicioOpen} onOpenChange={setDateInicioOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {value.dataInicio 
                            ? format(value.dataInicio, "dd/MM/yyyy", { locale: ptBR })
                            : "Data início"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={value.dataInicio || undefined}
                          onSelect={(date) => {
                            onChange({ ...value, dataInicio: date || null });
                            setDateInicioOpen(false);
                          }}
                          disabled={(date) => isBefore(date, startOfDay(new Date()))}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <span className="text-muted-foreground">até</span>
                    
                    <Popover open={dateFimOpen} onOpenChange={setDateFimOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {value.dataFim 
                            ? format(value.dataFim, "dd/MM/yyyy", { locale: ptBR })
                            : "Data fim"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={value.dataFim || undefined}
                          onSelect={(date) => {
                            onChange({ ...value, dataFim: date || null });
                            setDateFimOpen(false);
                          }}
                          disabled={(date) => isBefore(date, value.dataInicio || startOfDay(new Date()))}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}

            {/* Preview do agendamento */}
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Próximo disparo:</span>
                  <Badge variant="outline" className="font-mono">
                    {calcularProximoDisparo()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Parceiros Profissionais por disparo:</span>
                  <Badge variant="secondary">{totalArquitetos}</Badge>
                </div>
                {value.type === 'recorrente' && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total de disparos estimados:</span>
                    <Badge variant="secondary">{calcularTotalDisparos()}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Aviso importante */}
            <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {value.type === 'unico' 
                  ? 'A campanha será disparada automaticamente na data e hora configurada.'
                  : 'A campanha será repetida nos dias e horários configurados até a data fim.'
                }
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const defaultScheduleConfig: ScheduleConfig = {
  enabled: false,
  type: 'unico',
  dataHoraUnica: null,
  diasSemana: [1, 2, 3, 4, 5], // seg-sex
  horarioInicio: '09:00',
  horarioFim: '18:00',
  dataInicio: null,
  dataFim: null,
};
