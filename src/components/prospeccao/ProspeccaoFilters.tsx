import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, UserX } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProspeccaoFiltersProps {
  onFilterChange: (filters: any) => void;
  showNaoContactados: boolean;
  onToggleNaoContactados: () => void;
}

export function ProspeccaoFilters({ 
  onFilterChange, 
  showNaoContactados, 
  onToggleNaoContactados 
}: ProspeccaoFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendedor, setSelectedVendedor] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [selectedCidade, setSelectedCidade] = useState<string>("todas");
  const [selectedTier, setSelectedTier] = useState<string>("todos");

  // Buscar vendedores
  const { data: vendedores } = useQuery({
    queryKey: ["vendedores-prospeccao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("role", ["admin", "vendedor"])
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  // Buscar stages ativos (status do funil) - dinâmico do banco
  const { data: statusOptions } = useQuery({
    queryKey: ["prospec-stages-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_stages")
        .select("slug, nome")
        .eq("ativa", true)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  // Buscar cidades únicas
  const { data: cidades } = useQuery({
    queryKey: ["cidades-prospeccao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("architects")
        .select("city")
        .not("city", "is", null)
        .eq("active", true);

      if (error) throw error;
      
      const uniqueCities = [...new Set(data.map(a => a.city))].filter(Boolean);
      return uniqueCities.sort();
    },
  });

  const handleApplyFilters = () => {
    onFilterChange({
      search: searchTerm,
      vendedor: selectedVendedor,
      status: selectedStatus,
      cidade: selectedCidade,
      tier: selectedTier,
    });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedVendedor("todos");
    setSelectedStatus("todos");
    setSelectedCidade("todas");
    setSelectedTier("todos");
    onFilterChange({});
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      {/* Primeira linha - Busca e Não Contactados */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Nome, empresa, cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-end">
          <Button
            variant={showNaoContactados ? "default" : "outline"}
            onClick={onToggleNaoContactados}
            className="gap-2"
          >
            <UserX className="h-4 w-4" />
            Apenas Não Contactados
          </Button>
        </div>
      </div>

      {/* Segunda linha - Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="vendedor">Vendedor</Label>
          <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
            <SelectTrigger id="vendedor">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {vendedores?.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.full_name || v.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Status Funil</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {statusOptions?.map((status) => (
                <SelectItem key={status.slug} value={status.slug}>
                  {status.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="cidade">Cidade</Label>
          <Select value={selectedCidade} onValueChange={setSelectedCidade}>
            <SelectTrigger id="cidade">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {cidades?.map((cidade) => (
                <SelectItem key={cidade} value={cidade}>
                  {cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="tier">Tier</Label>
          <Select value={selectedTier} onValueChange={setSelectedTier}>
            <SelectTrigger id="tier">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-2">
        <Button onClick={handleApplyFilters} className="gap-2">
          <Search className="h-4 w-4" />
          Aplicar Filtros
        </Button>
        <Button variant="outline" onClick={handleClearFilters} className="gap-2">
          <X className="h-4 w-4" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
