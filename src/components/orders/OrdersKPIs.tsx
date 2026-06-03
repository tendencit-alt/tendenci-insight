import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, DollarSign, Factory, TrendingUp } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  valor_total: number;
  data_aprovacao?: string | null;
  data_emissao?: string;
  desconto_valor?: number;
}

interface OrdersKPIsProps {
  orders: any[];
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
  const valorTotal = activeOrders.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0);
  
  // 1. Taxa de Conversão (Aprovados / Total)
  const aprovados = activeOrders.filter(o => 
    o.data_aprovacao || ['aprovado', 'ativo', 'em_producao', 'entregue'].includes(o.status)
  );
  const taxaConversao = totalPedidos > 0 ? (aprovados.length / totalPedidos) * 100 : 0;

  // 2. Faturamento Estimado (Apenas pedidos aprovados/ativos)
  const faturamentoAprovado = aprovados.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0);

  // 3. Ticket Médio (Baseado no faturamento aprovado)
  const ticketMedio = aprovados.length > 0 ? faturamentoAprovado / aprovados.length : 0;

  // 4. Cancelamentos
  const cancelados = activeOrders.filter(o => o.status === 'cancelado');
  const valorCancelado = cancelados.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0);

  const kpis = [
    {
      label: 'Faturamento Aprovado',
      value: formatCurrency(faturamentoAprovado),
      sub: `${aprovados.length} pedidos confirmados`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Taxa de Conversão',
      value: `${taxaConversao.toFixed(1)}%`,
      sub: 'De emitidos para aprovados',
      icon: TrendingUp,
      color: 'text-blue-700',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(ticketMedio),
      sub: 'Média por pedido aprovado',
      icon: ShoppingCart,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Cancelamentos',
      value: formatCurrency(valorCancelado),
      sub: `${cancelados.length} pedidos perdidos`,
      icon: Factory,
      color: 'text-rose-600',
      bg: 'bg-rose-500/10',
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
