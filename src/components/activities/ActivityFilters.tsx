import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Filter, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ActivityFiltersState } from "@/pages/ActivityCenter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ActivityFiltersProps {
  filters: ActivityFiltersState;
  onFiltersChange: (filters: ActivityFiltersState) => void;
}

interface UserOption {
  id: string;
  full_name: string;
}

const moduleOptions = [
  { value: "all", label: "Todos os Módulos" },
  { value: "prospeccao", label: "Prospecção" },
  { value: "crm", label: "CRM" },
  { value: "projetos", label: "Projetos" },
  { value: "producao", label: "Produção" },
  { value: "pedidos", label: "Pedidos" },
  { value: "metas", label: "Metas" },
  { value: "estoque", label: "Estoque" },
];

const actionOptions = [
  { value: "all", label: "Todas as Ações" },
  { value: "comment", label: "Comentários" },
  { value: "crm_comment", label: "Comentários CRM" },
  { value: "task_created", label: "Tarefas Criadas" },
  { value: "task_completed", label: "Tarefas Concluídas" },
  { value: "task_cancelled", label: "Tarefas Canceladas" },
  { value: "prospec_task_created", label: "Tarefas Prospecção" },
  { value: "prospec_task_completed", label: "Tarefas Prospecção Concluídas" },
  { value: "stage_change", label: "Mudança de Etapa" },
  { value: "deal_update", label: "Atualização de Negócio" },
  { value: "field_change", label: "Alteração de Campo" },
  { value: "created", label: "Criação" },
  { value: "won", label: "Ganho" },
  { value: "lost", label: "Perdido" },
];

const periodOptions = [
  { value: "last_hour", label: "Última Hora" },
  { value: "today", label: "Hoje" },
  { value: "last_7_days", label: "Últimos 7 Dias" },
  { value: "last_30_days", label: "Últimos 30 Dias" },
  { value: "custom", label: "Personalizado" },
  { value: "all", label: "Tudo" },
];

export function ActivityFilters({ filters, onFiltersChange }: ActivityFiltersProps) {
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    
    if (data) {
      setUsers(data);
    }
  };

  const updateFilter = (key: keyof ActivityFiltersState, value: string | Date | null) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handlePeriodChange = (value: string) => {
    if (value !== "custom") {
      onFiltersChange({ ...filters, period: value, startDate: null, endDate: null });
    } else {
      onFiltersChange({ ...filters, period: value });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Filtros</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Busca */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Descrição, entidade..."
                className="pl-8"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
              />
            </div>
          </div>

          {/* Módulo */}
          <div className="space-y-2">
            <Label>Módulo</Label>
            <Select
              value={filters.module}
              onValueChange={(value) => updateFilter("module", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {moduleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Ação */}
          <div className="space-y-2">
            <Label>Tipo de Ação</Label>
            <Select
              value={filters.actionType}
              onValueChange={(value) => updateFilter("actionType", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Usuário */}
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Select
              value={filters.userId}
              onValueChange={(value) => updateFilter("userId", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Usuários</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Período */}
          <div className="space-y-2">
            <Label>Período</Label>
            <Select
              value={filters.period}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Range Pickers - show when custom period is selected */}
        {filters.period === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg border">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? (
                      format(filters.startDate, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.startDate || undefined}
                    onSelect={(date) => updateFilter("startDate", date || null)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? (
                      format(filters.endDate, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.endDate || undefined}
                    onSelect={(date) => updateFilter("endDate", date || null)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                    disabled={(date) => 
                      filters.startDate ? date < filters.startDate : false
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}