import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, DollarSign, Clock, CheckCircle, Truck, TrendingUp, Factory, AlertCircle } from 'lucide-react';

interface OrdersKPIsProps {
  filters: {
    status: string;
    vendedorId: string;
    dateFrom: Date;
    dateTo: Date;
    dateField: 'data_emissao' | 'created_at';
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
        p_date_field: filters.dateField || 'data_emissao',
      });
      if (error) throw error;
      return data?.[0] || {
        total_pedidos: 0,
        valor_total: 0,
        ticket_medio: 0,
        rascunho: 0,
        ativo: 0,
        aguardando_aprovacao: 0,
        aprovado: 0,
        em_producao: 0,
        faturado: 0,
        entregue: 0,
        cancelado: 0,
        valor_aprovado: 0,
        valor_em_producao: 0,
        valor_ativo: 0,
      };
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/80 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 2xl:grid-cols-8">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="border-border/70 shadow-sm">
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const highlightKpis = [
    {
      label: 'Valor Total em Produção',
      value: formatCurrency(metrics?.valor_em_producao || 0),
      description: 'Pedidos atualmente em fase produtiva.',
      icon: Factory,
      accentBar: 'bg-primary/70',
      iconTone: 'bg-primary/10 text-primary',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(metrics?.ticket_medio || 0),
      description: 'Média de valor por pedido no período filtrado.',
      icon: TrendingUp,
      accentBar: 'bg-secondary',
      iconTone: 'bg-secondary text-secondary-foreground',
    },
  ];

  const kpis = [
    {
      label: 'Total Pedidos',
      value: metrics?.total_pedidos || 0,
      icon: ShoppingCart,
      iconTone: 'bg-primary/10 text-primary',
    },
    {
      label: 'Valor Total',
      value: formatCurrency(metrics?.valor_total || 0),
      icon: DollarSign,
      iconTone: 'bg-secondary text-secondary-foreground',
    },
    {
      label: 'Ativos',
      value: metrics?.ativo || 0,
      icon: CheckCircle,
      iconTone: 'bg-primary/10 text-primary',
    },
    {
      label: 'Aguardando',
      value: metrics?.aguardando_aprovacao || 0,
      icon: Clock,
      iconTone: 'bg-accent text-accent-foreground',
    },
    {
      label: 'Aprovados',
      value: metrics?.aprovado || 0,
      icon: CheckCircle,
      iconTone: 'bg-secondary text-secondary-foreground',
    },
    {
      label: 'Em Produção',
      value: metrics?.em_producao || 0,
      icon: Factory,
      iconTone: 'bg-primary/10 text-primary',
    },
    {
      label: 'Entregues',
      value: metrics?.entregue || 0,
      icon: Truck,
      iconTone: 'bg-accent text-accent-foreground',
    },
    {
      label: 'Cancelados',
      value: metrics?.cancelado || 0,
      icon: AlertCircle,
      iconTone: 'bg-destructive/10 text-destructive',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {highlightKpis.map((kpi) => (
          <Card key={kpi.label} className="overflow-hidden border-border/80 bg-card shadow-sm">
            <CardContent className="p-0">
              <div className={`h-1.5 w-full ${kpi.accentBar}`} />
              <div className="flex items-center justify-between gap-4 p-5">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-semibold tracking-tight text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.description}</p>
                </div>
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${kpi.iconTone}`}>
                  <kpi.icon className="h-7 w-7" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 2xl:grid-cols-8">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="border-border/70 bg-card/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardContent className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {kpi.label}
                </span>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${kpi.iconTone}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xl font-semibold tracking-tight text-foreground break-words">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
