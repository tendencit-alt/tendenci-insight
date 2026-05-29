import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useActiveTenant';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { subDays, startOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Props {
  productionTypeId?: string;
  filters?: { status: string; priority: string; search: string; responsible: string; period?: string };
  onOrderClick?: (id: string) => void;
}

type SortKey = 'order_number' | 'planned_end_date' | 'status' | 'priority';

export function ProductionListView({ productionTypeId, filters, onOrderClick }: Props) {
  const { activeTenantId } = useActiveTenant();
  const [sortKey, setSortKey] = useState<SortKey>('planned_end_date');
  const [sortAsc, setSortAsc] = useState(true);
  const navigate = useNavigate();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['production-list', activeTenantId, productionTypeId, filters],
    enabled: !!activeTenantId,
    queryFn: async () => {
      let q = supabase
        .from('production_orders')
        .select(`
          id, order_number, title, status, priority, value, planned_end_date, created_at,
          current_phase:production_phases!production_orders_current_phase_id_fkey(
            phase_template:production_phase_templates(name, color)
          ),
          client:clients!production_orders_client_id_fkey(name),
          responsible:profiles!production_orders_responsible_id_fkey(full_name),
          production_type:production_types!production_orders_production_type_id_fkey(name, color)
        `)
        .eq('tenant_id', activeTenantId!)
        .neq('status', 'cancelado');

      if (productionTypeId) q = q.eq('production_type_id', productionTypeId);
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.priority && filters.priority !== 'all') q = q.eq('priority', filters.priority);
      if (filters?.responsible && filters.responsible !== 'all') q = q.eq('responsible_id', filters.responsible);
      if (filters?.period && filters.period !== 'all') {
        const today = new Date();
        const map: Record<string, Date> = {
          last7days: subDays(today, 7),
          last30days: subDays(today, 30),
          last60days: subDays(today, 60),
          last90days: subDays(today, 90),
          thisMonth: startOfMonth(today),
        };
        if (map[filters.period]) q = q.gte('created_at', map[filters.period].toISOString());
      }
      const { data, error } = await q.limit(500);
      if (error) throw error;
      let result = data ?? [];
      if (filters?.search?.trim()) {
        const s = filters.search.toLowerCase().trim();
        result = result.filter((o: any) =>
          o.title?.toLowerCase().includes(s) ||
          String(o.order_number).includes(s) ||
          o.client?.name?.toLowerCase().includes(s)
        );
      }
      return result;
    },
    staleTime: 10000,
  });

  const sorted = useMemo(() => {
    const arr = [...orders];
    arr.sort((a: any, b: any) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return arr;
  }, [orders, sortKey, sortAsc]);

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const prazoBadge = (date: string | null) => {
    if (!date) return <Badge variant="outline">Sem prazo</Badge>;
    const d = differenceInCalendarDays(new Date(date), new Date());
    if (d < 0) return <Badge variant="destructive">Atrasada {Math.abs(d)}d</Badge>;
    if (d <= 3) return <Badge className="bg-amber-500 text-white hover:bg-amber-600">{d}d</Badge>;
    return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">{d}d</Badge>;
  };

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(true); }
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  if (sorted.length === 0)
    return <div className="text-center text-muted-foreground py-12 text-sm">Nenhuma ordem de produção</div>;

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => toggleSort('order_number')}>
              <span className="flex items-center gap-1">OP <ArrowUpDown className="h-3 w-3" /></span>
            </TableHead>
            <TableHead>Pedido / Título</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Fase atual</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort('priority')}>Prioridade</TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort('planned_end_date')}>Prazo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((o: any) => (
            <TableRow key={o.id} className="cursor-pointer hover:bg-muted/40" onClick={() => onOrderClick?.(o.id)}>
              <TableCell className="font-mono text-xs">OP-{String(o.order_number).padStart(4, '0')}</TableCell>
              <TableCell className="font-medium max-w-xs truncate">{o.title}</TableCell>
              <TableCell>{o.client?.name || '—'}</TableCell>
              <TableCell><Badge variant="outline">{o.production_type?.name || '—'}</Badge></TableCell>
              <TableCell>{o.current_phase?.phase_template?.name || 'Fila'}</TableCell>
              <TableCell>{o.responsible?.full_name || '—'}</TableCell>
              <TableCell>
                <Badge variant={o.priority === 'urgente' ? 'destructive' : o.priority === 'alta' ? 'default' : 'secondary'}>
                  {o.priority}
                </Badge>
              </TableCell>
              <TableCell>{prazoBadge(o.planned_end_date)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{fmtCurrency(o.value)}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Ver pedido vinculado"
                  onClick={() => navigate(`/pedidos`)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
