import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, DollarSign, Factory, TrendingUp } from 'lucide-react';

interface OrdersKPIsProps {
  filters: {
    status: string;
    vendedorId: string;
    centroCusto: string;
    dateFrom: Date;
    dateTo: Date;
    dateField: string;
  };
}

export function OrdersKPIs({ filters }: OrdersKPIsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['orders-metrics', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('orders_metrics', {
        p_status: filters.status || null,
        p_vendedor_id: filters.vendedorId || null,
        p_date_from: filters.dateFrom?.toISOString() || null,
        p_date_to: filters.dateTo?.toISOString() || null,
        p_date_field: 'created_at',
      });
      if (error) throw error;
      return data?.[0] || {
        total_pedidos: 0,
        valor_total: 0,
        ticket_medio: 0,
        valor_em_producao: 0,
        em_producao: 0,
      };
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value || 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card p-4">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Pedidos',
      value: String(metrics?.total_pedidos || 0),
      icon: ShoppingCart,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Valor Total',
      value: formatCurrency(metrics?.valor_total || 0),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Em Produção',
      value: formatCurrency(metrics?.valor_em_producao || 0),
      sub: `${metrics?.em_producao || 0} pedidos`,
      icon: Factory,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(metrics?.ticket_medio || 0),
      icon: TrendingUp,
      color: 'text-blue-700',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {kpi.label}
            </span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg}`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
          </div>
          <p className={`mt-2 text-xl font-bold tracking-tight ${kpi.color}`}>
            {kpi.value}
          </p>
          {kpi.sub && (
            <p className="mt-0.5 text-xs text-muted-foreground">{kpi.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
