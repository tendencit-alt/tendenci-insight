import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CalendarIcon, Search, X, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type SortDirection = "asc" | "desc" | null;
export type SortField = "date" | "value" | null;

export interface FinanceiroFiltersState {
  dateFrom: Date | null;
  dateTo: Date | null;
  bankAccountId: string | null;
  costCenterId: string | null;
  projectId: string | null;
  search: string;
  categoryId: string | null;
  subcategoryId: string | null;
  sortField: SortField;
  sortDirection: SortDirection;
  clientId: string | null;
  vendedorId: string | null;
  orderId: string | null;
}

interface FinanceiroFiltersProps {
  filters: FinanceiroFiltersState;
  onChange: (filters: FinanceiroFiltersState) => void;
}

export function FinanceiroFilters({ filters, onChange }: FinanceiroFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { activeTenantId } = useActiveTenant();

  const { data: bankAccounts } = useQuery({
    queryKey: ["fin-bank-accounts", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_bank_accounts")
        .select("id, nickname")
        .eq("tenant_id", activeTenantId!)
        .eq("active", true)
        .order("nickname");
      return data || [];
    },
  });

  const { data: costCenters } = useQuery({
    queryKey: ["fin-cost-centers", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_cost_centers")
        .select("id, name")
        .eq("tenant_id", activeTenantId!)
        .eq("active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["fin-projects", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_projects")
        .select("id, name")
        .eq("tenant_id", activeTenantId!)
        .eq("status", "ativo")
        .order("name");
      return data || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["fin-filter-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .order("name")
        .limit(500);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: vendedores } = useQuery({
    queryKey: ["fin-filter-vendedores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: orders } = useQuery({
    queryKey: ["fin-filter-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, client:clients(name)")
        .order("order_number", { ascending: false })
        .limit(200);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Busca apenas categorias pai (parent_id = null)
  const { data: categories } = useQuery({
    queryKey: ["fin-chart-accounts-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name")
        .eq("active", true)
        .is("parent_id", null)
        .order("code");
      return data || [];
    },
  });

  // Busca subcategorias baseado na categoria selecionada
  const { data: subcategories } = useQuery({
    queryKey: ["fin-chart-accounts-subcategories", filters.categoryId],
    queryFn: async () => {
      if (!filters.categoryId) return [];
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name")
        .eq("active", true)
        .eq("parent_id", filters.categoryId)
        .order("code");
      return data || [];
    },
    enabled: !!filters.categoryId,
  });

  const activeFiltersCount = [
    filters.bankAccountId,
    filters.costCenterId,
    filters.projectId,
    filters.search,
    filters.categoryId,
    filters.subcategoryId,
    filters.clientId,
    filters.vendedorId,
    filters.orderId,
  ].filter(Boolean).length;

  const handlePresetPeriod = (preset: string) => {
    if (preset === "all") {
      onChange({ ...filters, dateFrom: null, dateTo: null });
      return;
    }

    const today = new Date();
    let dateFrom = new Date();
    let dateTo = new Date();

    switch (preset) {
      case "today":
        dateFrom = today;
        dateTo = today;
        break;
      case "this_week":
        dateFrom = new Date(today.setDate(today.getDate() - today.getDay()));
        dateTo = new Date();
        break;
      case "this_month":
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
        dateTo = new Date();
        break;
      case "last_month":
        dateFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        dateTo = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "this_year":
        dateFrom = new Date(today.getFullYear(), 0, 1);
        dateTo = new Date();
        break;
    }

    onChange({ ...filters, dateFrom, dateTo });
  };

  const clearFilters = () => {
    onChange({
      ...filters,
      dateFrom: null,
      dateTo: null,
      bankAccountId: null,
      costCenterId: null,
      projectId: null,
      search: "",
      categoryId: null,
      subcategoryId: null,
      sortField: null,
      sortDirection: null,
      clientId: null,
      vendedorId: null,
      orderId: null,
    });
  };

  const handleSortToggle = (field: SortField) => {
    if (filters.sortField === field) {
      // Cycle through: asc -> desc -> null
      if (filters.sortDirection === "asc") {
        onChange({ ...filters, sortDirection: "desc" });
      } else if (filters.sortDirection === "desc") {
        onChange({ ...filters, sortField: null, sortDirection: null });
      } else {
        onChange({ ...filters, sortDirection: "asc" });
      }
    } else {
      onChange({ ...filters, sortField: field, sortDirection: "asc" });
    }
  };

  const getSortIcon = (field: SortField) => {
    if (filters.sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5" />;
    }
    if (filters.sortDirection === "asc") {
      return <ArrowUp className="h-3.5 w-3.5" />;
    }
    return <ArrowDown className="h-3.5 w-3.5" />;
  };

  return (
    <Card className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtros</span>
            <span className="text-xs text-muted-foreground">
              {filters.dateFrom && filters.dateTo
                ? `${format(filters.dateFrom, "dd/MM/yy", { locale: ptBR })} - ${format(filters.dateTo, "dd/MM/yy", { locale: ptBR })}`
                : "Todo período"}
            </span>
            {activeFiltersCount > 0 && (
              <span className="text-xs text-muted-foreground">
                (+{activeFiltersCount} filtros ativos)
              </span>
            )}
            {filters.sortField && (
              <span className="text-xs text-primary">
                Ordenado por {filters.sortField === "date" ? "Data" : "Valor"} ({filters.sortDirection === "asc" ? "↑" : "↓"})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(activeFiltersCount > 0 || filters.sortField) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent forceMount className={isExpanded ? "animate-in fade-in-0" : "hidden"}>
          <div className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Period Presets */}
              <Select defaultValue="all" onValueChange={handlePresetPeriod}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="this_week">Semana</SelectItem>
                  <SelectItem value="this_month">Mês</SelectItem>
                  <SelectItem value="last_month">Mês Ant.</SelectItem>
                  <SelectItem value="this_year">Ano</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 w-[130px] justify-start gap-1.5 text-xs font-normal px-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span className="truncate">
                      {filters.dateFrom && filters.dateTo
                        ? `${format(filters.dateFrom, "dd/MM", { locale: ptBR })} - ${format(filters.dateTo, "dd/MM", { locale: ptBR })}`
                        : "Todo período"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="range"
                    selected={filters.dateFrom && filters.dateTo ? { from: filters.dateFrom, to: filters.dateTo } : undefined}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        onChange({ ...filters, dateFrom: range.from, dateTo: range.to });
                      }
                    }}
                    locale={ptBR}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={filters.search}
                  onChange={(e) => onChange({ ...filters, search: e.target.value })}
                  className="h-8 w-[140px] pl-7 text-xs"
                />
              </div>

              {/* Categoria Filter */}
              <Select
                value={filters.categoryId || "all"}
                onValueChange={(value) => onChange({ 
                  ...filters, 
                  categoryId: value === "all" ? null : value,
                  subcategoryId: null
                })}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Categorias</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.code} - {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Subcategoria Filter */}
              <Select
                value={filters.subcategoryId || "all"}
                onValueChange={(value) => onChange({ ...filters, subcategoryId: value === "all" ? null : value })}
                disabled={!filters.categoryId || !subcategories?.length}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue placeholder="Subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Subcategorias</SelectItem>
                  {subcategories?.map((subcat) => (
                    <SelectItem key={subcat.id} value={subcat.id}>
                      {subcat.code} - {subcat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Bank Account */}
              <Select
                value={filters.bankAccountId || "all"}
                onValueChange={(value) => onChange({ ...filters, bankAccountId: value === "all" ? null : value })}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="Conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Contas</SelectItem>
                  {bankAccounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Cost Center */}
              <Select
                value={filters.costCenterId || "all"}
                onValueChange={(value) => onChange({ ...filters, costCenterId: value === "all" ? null : value })}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="Centro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Centros</SelectItem>
                  {costCenters?.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Project */}
              <Select
                value={filters.projectId || "all"}
                onValueChange={(value) => onChange({ ...filters, projectId: value === "all" ? null : value })}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="Projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Projetos</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Cliente */}
              <Select
                value={filters.clientId || "all"}
                onValueChange={(value) => onChange({ ...filters, clientId: value === "all" ? null : value })}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Clientes</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Vendedor */}
              <Select
                value={filters.vendedorId || "all"}
                onValueChange={(value) => onChange({ ...filters, vendedorId: value === "all" ? null : value })}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Vendedores</SelectItem>
                  {vendedores?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Pedido */}
              <Select
                value={filters.orderId || "all"}
                onValueChange={(value) => onChange({ ...filters, orderId: value === "all" ? null : value })}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue placeholder="Pedido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Pedidos</SelectItem>
                  {orders?.map((order: any) => (
                    <SelectItem key={order.id} value={order.id}>
                      #{order.order_number} {order.client?.name ? `- ${order.client.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1 ml-auto">
                <Button
                  variant={filters.sortField === "date" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 gap-1 text-xs px-2"
                  onClick={() => handleSortToggle("date")}
                >
                  {getSortIcon("date")}
                  Data
                </Button>
                <Button
                  variant={filters.sortField === "value" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 gap-1 text-xs px-2"
                  onClick={() => handleSortToggle("value")}
                >
                  {getSortIcon("value")}
                  Valor
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
