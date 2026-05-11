import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download, RefreshCw, Moon, Sun } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface DashboardFiltersProps {
  onDateRangeChange?: (range: DateRange | undefined) => void;
  onSourceChange?: (source: string) => void;
  onArchitectChange?: (architect: string) => void;
}

export function DashboardFilters({ 
  onDateRangeChange, 
  onSourceChange, 
  onArchitectChange 
}: DashboardFiltersProps) {
  const { theme, setTheme } = useTheme();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    onDateRangeChange?.(range);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Filtro de Período */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              "w-[280px] justify-start text-left font-medium",
              "hover:bg-muted/50 transition-all duration-200",
              "border-border/60 shadow-sm"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecionar período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateChange}
            numberOfMonths={2}
            locale={ptBR}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Filtro de Origem */}
      <Select onValueChange={onSourceChange}>
        <SelectTrigger className="w-[200px] shadow-sm">
          <SelectValue placeholder="Origem do Lead" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="meta">Meta Ads</SelectItem>
          <SelectItem value="organico">Orgânico</SelectItem>
          <SelectItem value="indicacao">Indicação</SelectItem>
          <SelectItem value="instagram">Instagram</SelectItem>
        </SelectContent>
      </Select>

      {/* Filtro de Parceiro Profissional */}
      <Select onValueChange={onArchitectChange}>
        <SelectTrigger className="w-[200px] shadow-sm">
          <SelectValue placeholder="Parceiro Profissional" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="joao">João Silva</SelectItem>
          <SelectItem value="maria">Maria Santos</SelectItem>
          <SelectItem value="pedro">Pedro Costa</SelectItem>
        </SelectContent>
      </Select>

      {/* Botões de Ação */}
      <div className="flex items-center gap-2 ml-auto">
        <Button 
          variant="outline" 
          size="icon" 
          className="hover:bg-muted/50 transition-colors shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="hover:bg-muted/50 transition-colors shadow-sm"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <Button className="bg-primary hover:bg-primary-dark transition-all duration-200 shadow-md hover:shadow-lg">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>
    </div>
  );
}
