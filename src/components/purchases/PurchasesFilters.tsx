import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface PurchasesFiltersProps {
  filters: {
    search: string;
    status: string;
    supplierId: string;
    period: string;
  };
  setFilters: (filters: any) => void;
}

export default function PurchasesFilters({ filters, setFilters }: PurchasesFiltersProps) {
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const clearFilters = () => {
    setFilters({ search: "", status: "all", supplierId: "", period: "all" });
  };

  const hasFilters = filters.search || filters.status !== "all" || filters.supplierId || filters.period !== "all";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[150px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Nº do pedido..."
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
          <SelectItem value="rascunho">Rascunho</SelectItem>
          <SelectItem value="enviado">Enviado</SelectItem>
          <SelectItem value="confirmado">Confirmado</SelectItem>
          <SelectItem value="aprovado">Aprovado</SelectItem>
          <SelectItem value="recebido_parcial">Recebido Parcial</SelectItem>
          <SelectItem value="recebido_total">Recebido</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.supplierId || "all"} onValueChange={(value) => setFilters({ ...filters, supplierId: value === "all" ? "" : value })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Fornecedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos fornecedores</SelectItem>
          {suppliers.map((s: any) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.period} onValueChange={(value) => setFilters({ ...filters, period: value })}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo período</SelectItem>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="week">Última semana</SelectItem>
          <SelectItem value="month">Último mês</SelectItem>
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
