import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, DollarSign, Clock, CheckCircle, Truck, FileText, TrendingUp, Factory, AlertCircle } from 'lucide-react';

interface OrdersKPIsProps {
  filters: {
    status: string;
    vendedorId: string;
    dateFrom: Date;
    dateTo: Date;
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
      });
      if (error) throw error;
      return data as {
        total_pedidos: number;
        valor_total: number;
        ticket_medio: number;
        rascunho: number;
        aguardando_aprovacao: number;
        aprovado: number;
        em_producao: number;
        faturado: number;
        entregue: number;
        cancelado: number;
        valor_aprovado: number;
        valor_em_producao: number;
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-12" />
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
      icon: Factory,
      gradient: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-l-purple-500',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(metrics?.ticket_medio || 0),
      icon: TrendingUp,
      gradient: 'from-emerald-500/20 to-emerald-600/10',
      borderColor: 'border-l-emerald-500',
    },
  ];

  const kpis = [
    {
      label: 'Total Pedidos',
      value: metrics?.total_pedidos || 0,
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      label: 'Valor Total',
      value: formatCurrency(metrics?.valor_total || 0),
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      label: 'Aguardando',
      value: metrics?.aguardando_aprovacao || 0,
      icon: Clock,
      color: 'text-yellow-500',
    },
    {
      label: 'Aprovados',
      value: metrics?.aprovado || 0,
      icon: CheckCircle,
      color: 'text-emerald-500',
    },
    {
      label: 'Em Produção',
      value: metrics?.em_producao || 0,
      icon: Factory,
      color: 'text-purple-500',
    },
    {
      label: 'Entregues',
      value: metrics?.entregue || 0,
      icon: Truck,
      color: 'text-teal-500',
    },
    {
      label: 'Cancelados',
      value: metrics?.cancelado || 0,
      icon: AlertCircle,
      color: 'text-red-500',
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs em destaque */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {highlightKpis.map((kpi) => (
          <Card key={kpi.label} className={`bg-gradient-to-br ${kpi.gradient} border-l-4 ${kpi.borderColor}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <kpi.icon className="h-10 w-10 opacity-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPIs secundários */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-lg font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
