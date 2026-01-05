import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  { value: 'aguardando_aprovacao', label: 'Aguardando Aprovação' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'faturado', label: 'Faturado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

const PERIODS = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoje' },
  { value: 'last7days', label: 'Últimos 7 dias' },
  { value: 'last30days', label: 'Últimos 30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'last90days', label: 'Últimos 90 dias' },
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
    let dateTo = now;

    switch (period) {
      case 'today':
        dateFrom = now;
        break;
      case 'last7days':
        dateFrom = subDays(now, 7);
        break;
      case 'last30days':
        dateFrom = subDays(now, 30);
        break;
      case 'thisMonth':
        dateFrom = startOfMonth(now);
        break;
      case 'last90days':
        dateFrom = subDays(now, 90);
        break;
      default:
        dateFrom = new Date(2020, 0, 1);
    }

    onFiltersChange({ ...filters, period, dateFrom, dateTo });
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
    <Card>
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filters.status || "all"} onValueChange={(v) => onFiltersChange({ ...filters, status: v === "all" ? "" : v })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue>
                {filters.status 
                  ? ORDER_STATUSES.find(s => s.value === filters.status)?.label || 'Status'
                  : 'Status'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.vendedorId || "all"} onValueChange={(v) => onFiltersChange({ ...filters, vendedorId: v === "all" ? "" : v })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue>
                {filters.vendedorId 
                  ? vendedores?.find(v => v.id === filters.vendedorId)?.full_name || 'Responsável'
                  : 'Responsável'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {vendedores?.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={filters.dateField} 
            onValueChange={(v) => onFiltersChange({ ...filters, dateField: v as 'data_emissao' | 'created_at' })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data_emissao">Data de Emissão</SelectItem>
              <SelectItem value="created_at">Data de Criação</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
