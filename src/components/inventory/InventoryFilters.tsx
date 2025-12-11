import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface InventoryFiltersProps {
  filters: {
    search: string;
    categoryId: string;
    locationId: string;
    status: string;
  };
  setFilters: (filters: any) => void;
}

export default function InventoryFilters({ filters, setFilters }: InventoryFiltersProps) {
  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("active", true)
        .order("position");
      if (error) throw error;
      return data;
    }
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_locations")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const clearFilters = () => {
    setFilters({ search: "", categoryId: "", locationId: "", status: "all" });
  };

  const hasFilters = filters.search || filters.categoryId || filters.locationId || filters.status !== "all";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou código..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select value={filters.categoryId || "all"} onValueChange={(value) => setFilters({ ...filters, categoryId: value === "all" ? "" : value })}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {categories.map((cat: any) => (
            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.locationId || "all"} onValueChange={(value) => setFilters({ ...filters, locationId: value === "all" ? "" : value })}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Local" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos locais</SelectItem>
          {locations.map((loc: any) => (
            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Ativos</SelectItem>
          <SelectItem value="inactive">Inativos</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
