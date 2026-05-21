import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, DollarSign, Factory, TrendingUp } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  valor_total: number;
}

interface OrdersKPIsProps {
  orders: Order[];
  isLoading: boolean;
  selectedIds?: string[];
}

export function OrdersKPIs({ orders, isLoading, selectedIds = [] }: OrdersKPIsProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

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

  const activeOrders = selectedIds.length > 0
    ? orders.filter((o) => selectedIds.includes(o.id))
    : orders;

  const totalPedidos = activeOrders.length;
  const valorTotal = activeOrders.reduce((sum, o) => sum + (o.valor_total || 0), 0);
  const emProducao = activeOrders.filter((o) => o.status === 'em_producao');
  const valorEmProducao = emProducao.reduce((sum, o) => sum + (o.valor_total || 0), 0);
  const ticketMedio = totalPedidos > 0 ? valorTotal / totalPedidos : 0;

  const kpis = [
    {
      label: 'Pedidos',
      value: String(totalPedidos),
      icon: ShoppingCart,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Valor Total',
      value: formatCurrency(valorTotal),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Em Produção',
      value: formatCurrency(valorEmProducao),
      sub: `${emProducao.length} pedidos`,
      icon: Factory,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(ticketMedio),
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
