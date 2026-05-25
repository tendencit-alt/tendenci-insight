import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useActiveTenant';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, X } from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrdersFiltersProps {
  filters: {
    status: string;
    vendedorId: string;
    centroCusto: string;
    clientId: string;
    period: string;
    dateFrom: Date;
    dateTo: Date;
    dateField: string;
  };
  onFiltersChange: (filters: any) => void;
}

const ORDER_STATUSES = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'em_negociacao', label: 'Em Negociação' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'liberado_producao', label: 'Lib. Produção' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'producao_concluida', label: 'Prod. Concluída' },
  { value: 'liberado_faturamento', label: 'Lib. Faturamento' },
  { value: 'faturado', label: 'Faturado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'encerrado', label: 'Encerrado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const PERIODS = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoje' },
  { value: 'last7days', label: '7 dias' },
  { value: 'last30days', label: '30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'last90days', label: '90 dias' },
  { value: 'custom', label: 'Personalizado' },
];

export function OrdersFilters({ filters, onFiltersChange }: OrdersFiltersProps) {
  const { data: vendedores } = useQuery({
    queryKey: ['vendedores-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['admin', 'vendedor'])
        .order('full_name');
      return data || [];
    },
  });

  const { activeTenantId } = useActiveTenant();
  const { data: centrosCusto } = useQuery({
    queryKey: ['centros-custo-list', activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from('fin_cost_centers')
        .select('id, name')
        .eq('tenant_id', activeTenantId!)
        .eq('active', true)
        .order('name');
      return data || [];
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes-list-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });

  const handlePeriodChange = (period: string) => {
    if (period === 'custom') {
      onFiltersChange({ ...filters, period });
      return;
    }
    const now = new Date();
    let dateFrom: Date;
    switch (period) {
      case 'today': dateFrom = now; break;
      case 'last7days': dateFrom = subDays(now, 7); break;
      case 'last30days': dateFrom = subDays(now, 30); break;
      case 'thisMonth': dateFrom = startOfMonth(now); break;
      case 'last90days': dateFrom = subDays(now, 90); break;
      default: dateFrom = new Date(2020, 0, 1);
    }
    onFiltersChange({ ...filters, period, dateFrom, dateTo: now });
  };

  const clearFilters = () => {
    const now = new Date();
    onFiltersChange({
      status: '',
      vendedorId: '',
      centroCusto: '',
      clientId: '',
      period: 'all',
      dateFrom: new Date(2020, 0, 1),
      dateTo: now,
      dateField: 'created_at',
    });
  };

  const hasFilters = filters.status || filters.vendedorId || filters.centroCusto || filters.clientId || filters.period !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="h-9 w-[140px] border-border/60 bg-card text-sm">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filters.period === 'custom' && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-9 w-[140px] justify-start text-left text-sm border-border/60 bg-card font-normal", !filters.dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'De'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => date && onFiltersChange({ ...filters, dateFrom: date })}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-9 w-[140px] justify-start text-left text-sm border-border/60 bg-card font-normal", !filters.dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {filters.dateTo ? format(filters.dateTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Até'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => date && onFiltersChange({ ...filters, dateTo: date })}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </>
      )}

      <Select value={filters.status || 'all'} onValueChange={(v) => onFiltersChange({ ...filters, status: v === 'all' ? '' : v })}>
        <SelectTrigger className="h-9 w-[140px] border-border/60 bg-card text-sm">
          <SelectValue>{filters.status ? ORDER_STATUSES.find((s) => s.value === filters.status)?.label : 'Status'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {ORDER_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.vendedorId || 'all'} onValueChange={(v) => onFiltersChange({ ...filters, vendedorId: v === 'all' ? '' : v })}>
        <SelectTrigger className="h-9 w-[160px] border-border/60 bg-card text-sm">
          <SelectValue>{filters.vendedorId ? vendedores?.find((v) => v.id === filters.vendedorId)?.full_name : 'Responsável'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {vendedores?.map((v) => (
            <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.clientId || 'all'} onValueChange={(v) => onFiltersChange({ ...filters, clientId: v === 'all' ? '' : v })}>
        <SelectTrigger className="h-9 w-[180px] border-border/60 bg-card text-sm">
          <SelectValue>{filters.clientId ? clientes?.find((c) => c.id === filters.clientId)?.name : 'Cliente'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {clientes?.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.centroCusto || 'all'} onValueChange={(v) => onFiltersChange({ ...filters, centroCusto: v === 'all' ? '' : v })}>
        <SelectTrigger className="h-9 w-[180px] border-border/60 bg-card text-sm">
          <SelectValue>{filters.centroCusto ? centrosCusto?.find((c) => c.name === filters.centroCusto)?.name : 'Centro de Custo'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {centrosCusto?.map((c) => (
            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 text-muted-foreground hover:text-foreground">
          <X className="mr-1 h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
