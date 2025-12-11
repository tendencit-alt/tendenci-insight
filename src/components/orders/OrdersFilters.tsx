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
    clientId: string;
    architectId: string;
    period: string;
    dateFrom: Date;
    dateTo: Date;
  };
  onFiltersChange: (filters: any) => void;
}

const ORDER_STATUSES = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'aguardando_aprovacao', label: 'Aguardando Aprovação' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'faturado', label: 'Faturado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

const PERIODS = [
  { value: 'today', label: 'Hoje' },
  { value: 'last7days', label: 'Últimos 7 dias' },
  { value: 'last30days', label: 'Últimos 30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'last90days', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todos' },
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

  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')
        .limit(100);
      return data || [];
    },
  });

  const { data: architects } = useQuery({
    queryKey: ['architects-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('architects')
        .select('id, name, company')
        .eq('active', true)
        .order('name');
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
    onFiltersChange({
      status: '',
      vendedorId: '',
      clientId: '',
      architectId: '',
      period: 'last30days',
      dateFrom: subDays(new Date(), 30),
      dateTo: new Date(),
    });
  };

  const hasFilters = filters.status || filters.vendedorId || filters.clientId || filters.architectId || filters.period !== 'last30days';

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filters.status || "all"} onValueChange={(v) => onFiltersChange({ ...filters, status: v === "all" ? "" : v })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
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
              <SelectValue placeholder="Vendedor" />
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

          <Select value={filters.clientId || "all"} onValueChange={(v) => onFiltersChange({ ...filters, clientId: v === "all" ? "" : v })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.architectId || "all"} onValueChange={(v) => onFiltersChange({ ...filters, architectId: v === "all" ? "" : v })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Arquiteto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {architects?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} {a.company && `- ${a.company}`}
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
