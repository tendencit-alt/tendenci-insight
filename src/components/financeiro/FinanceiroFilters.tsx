import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Filter, Search, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const [isOpen, setIsOpen] = useState(false);

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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Filter className="h-4 w-4" />
          <span className="hidden md:inline">
            {format(filters.dateFrom, "dd/MM/yy", { locale: ptBR })} - {format(filters.dateTo, "dd/MM/yy", { locale: ptBR })}
          </span>
          <span className="md:hidden">Filtros</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtros</h4>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {/* Period Presets */}
            <Select onValueChange={handlePresetPeriod}>
              <SelectTrigger>
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
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(filters.dateFrom, "dd/MM/yy", { locale: ptBR })} - {format(filters.dateTo, "dd/MM/yy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar descrição..."
                value={filters.search}
                onChange={(e) => onChange({ ...filters, search: e.target.value })}
                className="pl-8"
              />
            </div>

            <Select
              value={filters.bankAccountId || ""}
              onValueChange={(value) => onChange({ ...filters, bankAccountId: value || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Conta Bancária" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as contas</SelectItem>
                {bankAccounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.costCenterId || ""}
              onValueChange={(value) => onChange({ ...filters, costCenterId: value || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Centro de Custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os centros</SelectItem>
                {costCenters?.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.projectId || ""}
              onValueChange={(value) => onChange({ ...filters, projectId: value || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os projetos</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
