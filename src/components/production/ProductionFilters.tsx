import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, X, Download, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProductionFiltersProps {
  filters: {
    status: string;
    priority: string;
    search: string;
    responsible: string;
    period: string;
  };
  onFiltersChange: (filters: {
    status: string;
    priority: string;
    search: string;
    responsible: string;
    period: string;
  }) => void;
  onExport?: () => void;
  onUnifyOps?: () => void;
  viewMode?: 'individual' | 'grouped';
  onViewModeChange?: (mode: 'individual' | 'grouped') => void;
}

export function ProductionFilters({ 
  filters, 
  onFiltersChange, 
  onExport,
  onUnifyOps,
  viewMode = 'individual',
  onViewModeChange
}: ProductionFiltersProps) {
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-filters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data;
    }
  });

  const handleReset = () => {
    onFiltersChange({
      status: 'all',
      priority: 'all',
      search: '',
      responsible: 'all',
      period: 'all'
    });
  };

  const hasActiveFilters = filters.status !== 'all' || 
    filters.priority !== 'all' || 
    filters.search !== '' || 
    filters.responsible !== 'all' ||
    filters.period !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Busca */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar OP, cliente, produto..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Período */}
      <Select
        value={filters.period}
        onValueChange={(value) => onFiltersChange({ ...filters, period: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo Período</SelectItem>
          <SelectItem value="last7days">Últimos 7 dias</SelectItem>
          <SelectItem value="last30days">Últimos 30 dias</SelectItem>
          <SelectItem value="last60days">Últimos 60 dias</SelectItem>
          <SelectItem value="last90days">Últimos 90 dias</SelectItem>
          <SelectItem value="thisMonth">Este mês</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Status</SelectItem>
          <SelectItem value="aguardando">Aguardando</SelectItem>
          <SelectItem value="em_producao">Em Produção</SelectItem>
          <SelectItem value="pausado">Pausado</SelectItem>
          <SelectItem value="concluido">Concluído</SelectItem>
        </SelectContent>
      </Select>

      {/* Prioridade */}
      <Select
        value={filters.priority}
        onValueChange={(value) => onFiltersChange({ ...filters, priority: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="baixa">Baixa</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="alta">Alta</SelectItem>
          <SelectItem value="urgente">Urgente</SelectItem>
        </SelectContent>
      </Select>

      {/* Responsável */}
      <Select
        value={filters.responsible}
        onValueChange={(value) => onFiltersChange({ ...filters, responsible: value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.full_name || 'Sem nome'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Toggle Visualização Agrupada */}
      {onViewModeChange && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="grouped-view" className="text-sm cursor-pointer">
            Agrupar por Cliente
          </Label>
          <Switch
            id="grouped-view"
            checked={viewMode === 'grouped'}
            onCheckedChange={(checked) => onViewModeChange(checked ? 'grouped' : 'individual')}
          />
        </div>
      )}

      {/* Limpar Filtros */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}

      {/* Exportar */}
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport} className="gap-1">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      )}

      {/* Unificar OPs */}
      {onUnifyOps && (
        <Button variant="outline" size="sm" onClick={onUnifyOps} className="gap-1">
          <Layers className="h-4 w-4" />
          Unificar OPs
        </Button>
      )}
    </div>
  );
}