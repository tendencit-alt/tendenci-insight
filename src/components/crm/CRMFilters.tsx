import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CRMFiltersProps {
  pipelines: any[];
  selectedPipeline: string;
  onPipelineChange: (value: string) => void;
  owners: any[];
  selectedOwner: string;
  onOwnerChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
  onCustomDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

export function CRMFilters({ 
  pipelines, 
  selectedPipeline, 
  onPipelineChange,
  owners,
  selectedOwner,
  onOwnerChange,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  dateFilter,
  onDateFilterChange,
  customDateRange,
  onCustomDateRangeChange
}: CRMFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row">
        <Select value={selectedPipeline} onValueChange={onPipelineChange}>
          <SelectTrigger className="lg:w-64">
            <SelectValue placeholder="Selecione um funil" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por título, cliente, arquiteto..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap">
        <Select value={selectedOwner} onValueChange={onOwnerChange}>
          <SelectTrigger className="lg:w-64">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner.id} value={owner.id}>
                {owner.full_name || owner.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="lg:w-64">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="ganho">Ganho</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={onDateFilterChange}>
          <SelectTrigger className="lg:w-64">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="last7days">Últimos 7 dias</SelectItem>
            <SelectItem value="last30days">Últimos 30 dias</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {dateFilter === "custom" && onCustomDateRangeChange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "lg:w-80 justify-start text-left font-normal",
                  !customDateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateRange?.from ? (
                  customDateRange.to ? (
                    <>
                      {format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione o período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={customDateRange?.from}
                selected={{
                  from: customDateRange?.from,
                  to: customDateRange?.to,
                }}
                onSelect={(range) => {
                  onCustomDateRangeChange({
                    from: range?.from,
                    to: range?.to,
                  });
                }}
                numberOfMonths={2}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        )}

        {(selectedOwner !== "all" || searchQuery || selectedStatus !== "all" || dateFilter !== "all") && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              onOwnerChange("all");
              onSearchChange("");
              onStatusChange("all");
              onDateFilterChange("all");
              if (onCustomDateRangeChange) {
                onCustomDateRangeChange({ from: undefined, to: undefined });
              }
            }}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
