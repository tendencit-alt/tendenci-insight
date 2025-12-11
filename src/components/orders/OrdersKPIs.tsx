import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, DollarSign, Clock, CheckCircle, Truck, FileText } from 'lucide-react';

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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
      icon: FileText,
      color: 'text-purple-500',
    },
    {
      label: 'Entregues',
      value: metrics?.entregue || 0,
      icon: Truck,
      color: 'text-teal-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
  );
}
