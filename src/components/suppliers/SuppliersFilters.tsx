import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface SuppliersFiltersProps {
  filters: {
    search: string;
    status: string;
    city: string;
  };
  setFilters: (filters: any) => void;
}

export default function SuppliersFilters({ filters, setFilters }: SuppliersFiltersProps) {
  const clearFilters = () => {
    setFilters({ search: "", status: "all", city: "" });
  };

  const hasFilters = filters.search || filters.status !== "all" || filters.city;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CNPJ ou email..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Ativos</SelectItem>
          <SelectItem value="inactive">Inativos</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Filtrar por cidade"
        value={filters.city}
        onChange={(e) => setFilters({ ...filters, city: e.target.value })}
        className="w-[180px]"
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
