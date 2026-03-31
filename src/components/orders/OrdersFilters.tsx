import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { subDays, startOfMonth } from 'date-fns';

interface OrdersFiltersProps {
  filters: {
    status: string;
    vendedorId: string;
    period: string;
    dateFrom: Date;
    dateTo: Date;
    dateField: 'data_emissao' | 'created_at';
  };
  onFiltersChange: (filters: any) => void;
}

const ORDER_STATUSES = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'aguardando_aprovacao', label: 'Aguardando' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'faturado', label: 'Faturado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

const PERIODS = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoje' },
  { value: 'last7days', label: '7 dias' },
  { value: 'last30days', label: '30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'last90days', label: '90 dias' },
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

  const handlePeriodChange = (period: string) => {
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
      period: 'thisMonth',
      dateFrom: startOfMonth(now),
      dateTo: now,
      dateField: 'data_emissao',
    });
  };

  const hasFilters = filters.status || filters.vendedorId || filters.period !== 'thisMonth' || filters.dateField !== 'data_emissao';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="h-9 w-[120px] border-border/60 bg-card text-sm">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

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

      <Select value={filters.dateField} onValueChange={(v) => onFiltersChange({ ...filters, dateField: v as 'data_emissao' | 'created_at' })}>
        <SelectTrigger className="h-9 w-[150px] border-border/60 bg-card text-sm">
          <SelectValue placeholder="Filtrar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="data_emissao">Dt. Emissão</SelectItem>
          <SelectItem value="created_at">Dt. Criação</SelectItem>
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
