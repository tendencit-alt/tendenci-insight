import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardFiltersData {
  dateRange?: DateRange;
  vendedor?: string;
  arquiteto?: string;
  pipeline?: string;
  categoria?: string;
}

interface DashboardFiltersProps {
  filters: DashboardFiltersData;
  onChange: (filters: DashboardFiltersData) => void;
}

export function DashboardFilters({ filters, onChange }: DashboardFiltersProps) {
  const [vendedores, setVendedores] = useState<Array<{ id: string; full_name: string }>>([]);
  const [arquitetos, setArquitetos] = useState<Array<{ id: string; name: string }>>([]);
  const [pipelines, setPipelines] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    // Buscar vendedores
    const { data: vendData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    if (vendData) setVendedores(vendData);

    // Buscar parceiros profissionais ativos
    const { data: arqData } = await supabase
      .from("architects")
      .select("id, name")
      .eq("active", true)
      .order("name");
    if (arqData) setArquitetos(arqData);

    // Buscar pipelines
    const { data: pipeData } = await supabase
      .from("crm_pipelines")
      .select("id, name")
      .order("name");
    if (pipeData) setPipelines(pipeData);
  };

  const handleDateChange = (range: DateRange | undefined) => {
    onChange({ ...filters, dateRange: range });
  };

  const clearFilters = () => {
    onChange({});
  };

  const hasActiveFilters = filters.dateRange || filters.vendedor || filters.arquiteto || filters.pipeline || filters.categoria;

  return (
    <div className="flex flex-wrap items-center gap-3 p-5 bg-gradient-to-r from-card/80 via-card to-card/80 rounded-xl border border-border/50 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {/* Filtro de Período */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "w-[280px] justify-start text-left font-normal shadow-sm hover:shadow-md transition-all",
                "bg-background/50 backdrop-blur-sm border-border/60",
                filters.dateRange && "border-primary/50 bg-primary/5"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange?.from ? (
                filters.dateRange.to ? (
                  <>
                    {format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                    {format(filters.dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </>
                ) : (
                  format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                )
              ) : (
                <span>Período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange?.from}
              selected={filters.dateRange}
              onSelect={handleDateChange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        {/* Filtro de Vendedor */}
        <Select 
          value={filters.vendedor || "todos"} 
          onValueChange={(value) => onChange({ ...filters, vendedor: value === "todos" ? undefined : value })}
        >
          <SelectTrigger className={cn(
            "w-[200px] shadow-sm hover:shadow-md transition-all bg-background/50 backdrop-blur-sm border-border/60",
            filters.vendedor && "border-primary/50 bg-primary/5"
          )}>
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos vendedores</SelectItem>
            {vendedores.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.full_name || "Sem nome"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro de Parceiro Profissional */}
        <Select 
          value={filters.arquiteto || "todos"} 
          onValueChange={(value) => onChange({ ...filters, arquiteto: value === "todos" ? undefined : value })}
        >
          <SelectTrigger className={cn(
            "w-[200px] shadow-sm hover:shadow-md transition-all bg-background/50 backdrop-blur-sm border-border/60",
            filters.arquiteto && "border-primary/50 bg-primary/5"
          )}>
            <SelectValue placeholder="Parceiro Profissional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos parceiros profissionais</SelectItem>
            {arquitetos.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro de Pipeline */}
        <Select 
          value={filters.pipeline || "todos"} 
          onValueChange={(value) => onChange({ ...filters, pipeline: value === "todos" ? undefined : value })}
        >
          <SelectTrigger className={cn(
            "w-[200px] shadow-sm hover:shadow-md transition-all bg-background/50 backdrop-blur-sm border-border/60",
            filters.pipeline && "border-primary/50 bg-primary/5"
          )}>
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos pipelines</SelectItem>
            {pipelines.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro de Categoria */}
        <Select 
          value={filters.categoria || "todos"} 
          onValueChange={(value) => onChange({ ...filters, categoria: value === "todos" ? undefined : value })}
        >
          <SelectTrigger className={cn(
            "w-[200px] shadow-sm hover:shadow-md transition-all bg-background/50 backdrop-blur-sm border-border/60",
            filters.categoria && "border-primary/50 bg-primary/5"
          )}>
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas categorias</SelectItem>
            <SelectItem value="metropolitano">Metropolitano</SelectItem>
            <SelectItem value="interior">Interior</SelectItem>
            <SelectItem value="especial">Especial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Limpar filtros */}
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilters}
          className="ml-auto hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <X className="mr-2 h-4 w-4" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
