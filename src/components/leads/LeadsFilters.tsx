import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface LeadsFiltersProps {
  filters: {
    period: string;
    source: string;
    status: string;
    owner: string;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function LeadsFilters({ filters, onFiltersChange }: LeadsFiltersProps) {
  const updateFilter = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative min-w-[250px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar nome, telefone, e-mail..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Period */}
      <Select value={filters.period} onValueChange={(v) => updateFilter("period", v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
          <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
          <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
          <SelectItem value="all">Todos</SelectItem>
        </SelectContent>
      </Select>

      {/* Source */}
      <Select value={filters.source} onValueChange={(v) => updateFilter("source", v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Origem" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todos">Todas Origens</SelectItem>
          <SelectItem value="WhatsApp IA">WhatsApp IA</SelectItem>
          <SelectItem value="Meta Ads">Meta Ads</SelectItem>
          <SelectItem value="Indicação">Indicação</SelectItem>
          <SelectItem value="Orgânico">Orgânico</SelectItem>
          <SelectItem value="Instagram">Instagram</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todos">Todos Status</SelectItem>
          <SelectItem value="novo">Novo</SelectItem>
          <SelectItem value="qualificando">Qualificando</SelectItem>
          <SelectItem value="fechado">Fechado</SelectItem>
          <SelectItem value="perdido">Perdido</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
