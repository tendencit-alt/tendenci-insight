import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, CalendarIcon, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface ProjectsFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

const STAGE_OPTIONS = [
  { key: "recebido", label: "Recebido" },
  { key: "em_orcamento", label: "Em Orçamento" },
  { key: "orcado", label: "Orçado" },
  { key: "apresentado", label: "Apresentado" },
  { key: "em_negociacao", label: "Em Negociação" },
  { key: "aprovado", label: "Aprovado" },
  { key: "perdido", label: "Perdido" },
];

const ENTREGUES_STAGES = ["orcado", "apresentado", "em_negociacao", "aprovado"];

export function ProjectsFilters({ filters, onFiltersChange }: ProjectsFiltersProps) {
  const [architects, setArchitects] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [stagesOpen, setStagesOpen] = useState(false);

  useEffect(() => {
    fetchArchitects();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchArchitects = async () => {
    const { data, error } = await supabase
      .from('architects')
      .select('id, name')
      .eq('active', true)
      .order('name');
    
    if (!error && data) {
      setArchitects(data);
    }
  };

  const handleClearFilters = () => {
    setSearchInput("");
    onFiltersChange({
      period: "all",
      stages: [],
      architect: "Todos",
      search: "",
      customDateRange: { from: undefined, to: undefined }
    });
  };

  const handleStageToggle = (stageKey: string) => {
    const currentStages = filters.stages || [];
    let newStages: string[];
    
    if (currentStages.includes(stageKey)) {
      newStages = currentStages.filter((s: string) => s !== stageKey);
    } else {
      newStages = [...currentStages, stageKey];
    }
    
    onFiltersChange({ ...filters, stages: newStages });
  };

  const handleEntreguesToggle = () => {
    const currentStages = filters.stages || [];
    const hasAllEntregues = ENTREGUES_STAGES.every(s => currentStages.includes(s));
    
    if (hasAllEntregues) {
      // Remove all entregues stages
      const newStages = currentStages.filter((s: string) => !ENTREGUES_STAGES.includes(s));
      onFiltersChange({ ...filters, stages: newStages });
    } else {
      // Add all entregues stages
      const newStages = [...new Set([...currentStages, ...ENTREGUES_STAGES])];
      onFiltersChange({ ...filters, stages: newStages });
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({ 
      ...filters, 
      customDateRange: range || { from: undefined, to: undefined },
      period: range?.from ? "custom" : filters.period
    });
  };

  const handlePeriodChange = (value: string) => {
    if (value === "custom") {
      onFiltersChange({ ...filters, period: value });
    } else {
      onFiltersChange({ 
        ...filters, 
        period: value,
        customDateRange: { from: undefined, to: undefined }
      });
    }
  };

  const getSelectedStagesLabel = () => {
    const stages = filters.stages || [];
    if (stages.length === 0) return "Todos Estágios";
    if (stages.length === 1) {
      const stage = STAGE_OPTIONS.find(s => s.key === stages[0]);
      return stage?.label || stages[0];
    }
    return `${stages.length} estágios`;
  };

  const hasActiveFilters = 
    (filters.stages && filters.stages.length > 0) || 
    filters.architect !== "Todos" || 
    filters.period !== "all" ||
    filters.search ||
    filters.customDateRange?.from;

  const formatDateRange = () => {
    if (filters.customDateRange?.from) {
      if (filters.customDateRange.to) {
        return `${format(filters.customDateRange.from, "dd/MM/yy")} - ${format(filters.customDateRange.to, "dd/MM/yy")}`;
      }
      return format(filters.customDateRange.from, "dd/MM/yyyy");
    }
    return null;
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Filtro de Estágios (Multi-select) */}
      <Popover open={stagesOpen} onOpenChange={setStagesOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[180px] justify-between">
            <span className="truncate">{getSelectedStagesLabel()}</span>
            <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="entregues"
                checked={ENTREGUES_STAGES.every(s => (filters.stages || []).includes(s))}
                onCheckedChange={handleEntreguesToggle}
              />
              <label htmlFor="entregues" className="text-sm font-medium cursor-pointer">
                📦 Entregues
              </label>
            </div>
            {STAGE_OPTIONS.map((stage) => (
              <div key={stage.key} className="flex items-center space-x-2">
                <Checkbox
                  id={stage.key}
                  checked={(filters.stages || []).includes(stage.key)}
                  onCheckedChange={() => handleStageToggle(stage.key)}
                />
                <label htmlFor={stage.key} className="text-sm cursor-pointer">
                  {stage.label}
                </label>
              </div>
            ))}
            {(filters.stages?.length || 0) > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => onFiltersChange({ ...filters, stages: [] })}
              >
                Limpar seleção
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Filtro de Profissional Parceiro */}
      <Select 
        value={filters.architect} 
        onValueChange={(v) => onFiltersChange({ ...filters, architect: v })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Profissional Parceiro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todos">Todos Profissionais Parceiros</SelectItem>
          <SelectItem value="sem-profissional parceiro">Sem Profissional Parceiro</SelectItem>
          {architects.map((arch) => (
            <SelectItem key={arch.id} value={arch.id}>
              {arch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro de Período - Simplificado */}
      <Select 
        value={filters.period} 
        onValueChange={handlePeriodChange}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo período</SelectItem>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
          <SelectItem value="thisMonth">Este mês</SelectItem>
          <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Calendário para Data Personalizada */}
      {filters.period === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn(
              "w-[220px] justify-start text-left font-normal",
              !filters.customDateRange?.from && "text-muted-foreground"
            )}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange() || "Selecione o período"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={filters.customDateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Busca com debounce */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar projeto, cliente..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10 w-[200px]"
        />
      </div>

      {/* Botão Limpar Filtros */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
