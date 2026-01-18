import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CalendarIcon, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface FinanceiroFiltersState {
  dateFrom: Date;
  dateTo: Date;
  bankAccountId: string | null;
  costCenterId: string | null;
  projectId: string | null;
  search: string;
}

interface FinanceiroFiltersProps {
  filters: FinanceiroFiltersState;
  onChange: (filters: FinanceiroFiltersState) => void;
}

export function FinanceiroFilters({ filters, onChange }: FinanceiroFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: bankAccounts } = useQuery({
    queryKey: ["fin-bank-accounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_bank_accounts")
        .select("id, nickname")
        .eq("active", true)
        .order("nickname");
      return data || [];
    },
  });

  const { data: costCenters } = useQuery({
    queryKey: ["fin-cost-centers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_cost_centers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["fin-projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_projects")
        .select("id, name")
        .eq("status", "ativo")
        .order("name");
      return data || [];
    },
  });

  const activeFiltersCount = [
    filters.bankAccountId,
    filters.costCenterId,
    filters.projectId,
    filters.search,
  ].filter(Boolean).length;

  const handlePresetPeriod = (preset: string) => {
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
      bankAccountId: null,
      costCenterId: null,
      projectId: null,
      search: "",
    });
  };

  return (
    <Card className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtros</span>
            <span className="text-xs text-muted-foreground">
              {format(filters.dateFrom, "dd/MM/yy", { locale: ptBR })} - {format(filters.dateTo, "dd/MM/yy", { locale: ptBR })}
            </span>
            {activeFiltersCount > 0 && (
              <span className="text-xs text-muted-foreground">
                (+{activeFiltersCount} filtros ativos)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
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

        <CollapsibleContent>
          <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Period Presets */}
            <Select onValueChange={handlePresetPeriod}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Período rápido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="this_week">Esta Semana</SelectItem>
                <SelectItem value="this_month">Este Mês</SelectItem>
                <SelectItem value="last_month">Mês Passado</SelectItem>
                <SelectItem value="this_year">Este Ano</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 justify-start gap-2 text-sm font-normal">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="truncate">
                    {format(filters.dateFrom, "dd/MM", { locale: ptBR })} - {format(filters.dateTo, "dd/MM", { locale: ptBR })}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: filters.dateFrom, to: filters.dateTo }}
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
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={filters.search}
                onChange={(e) => onChange({ ...filters, search: e.target.value })}
                className="h-9 pl-8"
              />
            </div>

            {/* Bank Account */}
            <Select
              value={filters.bankAccountId || "all"}
              onValueChange={(value) => onChange({ ...filters, bankAccountId: value === "all" ? null : value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Conta Bancária" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
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
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Centro de Custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os centros</SelectItem>
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
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
