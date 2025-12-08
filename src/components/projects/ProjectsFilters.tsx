import { useState, useEffect, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProjectsFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

export function ProjectsFilters({ filters, onFiltersChange }: ProjectsFiltersProps) {
  const [architects, setArchitects] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState(filters.search || "");

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
      stage: "Todos",
      architect: "Todos",
      search: ""
    });
  };

  const hasActiveFilters = 
    filters.stage !== "Todos" || 
    filters.architect !== "Todos" || 
    filters.period !== "all" ||
    filters.search;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Filtro de Estágio */}
      <Select 
        value={filters.stage} 
        onValueChange={(v) => onFiltersChange({ ...filters, stage: v })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Estágio" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todos">Todos Estágios</SelectItem>
          <SelectItem value="recebido">Recebido</SelectItem>
          <SelectItem value="em_orcamento">Em Orçamento</SelectItem>
          <SelectItem value="orcado">Orçado</SelectItem>
          <SelectItem value="apresentado">Apresentado</SelectItem>
          <SelectItem value="em_negociacao">Em Negociação</SelectItem>
          <SelectItem value="aprovado">Aprovado</SelectItem>
          <SelectItem value="perdido">Perdido</SelectItem>
        </SelectContent>
      </Select>

      {/* Filtro de Arquiteto */}
      <Select 
        value={filters.architect} 
        onValueChange={(v) => onFiltersChange({ ...filters, architect: v })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Arquiteto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todos">Todos Arquitetos</SelectItem>
          <SelectItem value="sem-arquiteto">Sem Arquiteto</SelectItem>
          {architects.map((arch) => (
            <SelectItem key={arch.id} value={arch.id}>
              {arch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro de Período */}
      <Select 
        value={filters.period} 
        onValueChange={(v) => onFiltersChange({ ...filters, period: v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo período</SelectItem>
          <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
          <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
          <SelectItem value="last_60_days">Últimos 60 dias</SelectItem>
          <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
        </SelectContent>
      </Select>

      {/* Busca com debounce */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar projeto, cliente..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10 w-[220px]"
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
