import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ProjectsFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

export function ProjectsFilters({ filters, onFiltersChange }: ProjectsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select 
        value={filters.stage} 
        onValueChange={(v) => onFiltersChange({ ...filters, stage: v })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Estágio" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todos">Todos</SelectItem>
          <SelectItem value="captado">Captado</SelectItem>
          <SelectItem value="orçamento">Em Orçamento</SelectItem>
          <SelectItem value="aprovado">Aprovado</SelectItem>
          <SelectItem value="perdido">Perdido</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.origin} 
        onValueChange={(v) => onFiltersChange({ ...filters, origin: v })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Origem" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todas">Todas</SelectItem>
          <SelectItem value="Meta Ads">Meta Ads</SelectItem>
          <SelectItem value="Orgânico">Orgânico</SelectItem>
          <SelectItem value="Indicação">Indicação</SelectItem>
          <SelectItem value="WhatsApp IA">WhatsApp IA</SelectItem>
          <SelectItem value="Instagram">Instagram</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar projeto, cliente..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10 w-[240px]"
        />
      </div>
    </div>
  );
}
