import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings, 
  DollarSign, 
  AlertTriangle,
  Target,
  Zap
} from 'lucide-react';

interface ProductionKPIsProps {
  productionTypeId?: string;
  filters?: {
    status: string;
    priority: string;
    search: string;
    responsible: string;
  };
}

interface ProductionMetrics {
  total_orders: number;
  aguardando: number;
  em_andamento: number;
  concluido: number;
  pausado: number;
  cancelado: number;
  valor_total: number;
  valor_aguardando: number;
  valor_em_andamento: number;
  valor_concluido: number;
  atrasadas_prazo: number;
  urgente: number;
  alta: number;
  normal: number;
  baixa: number;
  concluidas_no_prazo: number;
  total_concluidas: number;
}

export function ProductionKPIs({ productionTypeId, filters }: ProductionKPIsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['production-metrics', productionTypeId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('production_metrics', {
        p_type_id: productionTypeId || null,
        p_status: filters?.status || null,
        p_priority: filters?.priority || null,
        p_responsible_id: filters?.responsible && filters.responsible !== 'all' ? filters.responsible : null
      });
      if (error) throw error;
      return data as unknown as ProductionMetrics;
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(value);
  };

  const taxaNoPrazo = metrics?.total_concluidas 
    ? ((metrics.concluidas_no_prazo / metrics.total_concluidas) * 100).toFixed(1)
    : '0';

  // Total de OPs ativas (não concluídas nem canceladas)
  const opsAtivas = (metrics?.aguardando || 0) + (metrics?.em_andamento || 0) + (metrics?.pausado || 0);
  const valorOpsAtivas = (metrics?.valor_aguardando || 0) + (metrics?.valor_em_andamento || 0);

  const kpiCards = [
    { 
      label: 'Em Produção', 
      value: opsAtivas, 
      subValue: formatCurrency(valorOpsAtivas),
      icon: Settings, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      label: 'Atrasadas', 
      value: metrics?.atrasadas_prazo || 0, 
      icon: AlertTriangle, 
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    { 
      label: 'No Prazo', 
      value: `${taxaNoPrazo}%`, 
      icon: Target, 
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    { 
      label: 'Urgentes', 
      value: metrics?.urgente || 0, 
      icon: Zap, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {kpiCards.map((kpi) => (
        <Card key={kpi.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-md ${kpi.bgColor}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
            <p className={`text-lg font-bold ${kpi.color}`}>
              {kpi.value}
            </p>
            {'subValue' in kpi && kpi.subValue && (
              <div className="mt-1 px-2 py-1 rounded-md bg-emerald-500/15">
                <p className="text-sm font-bold text-emerald-600">
                  {kpi.subValue}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground truncate mt-1">
              {kpi.label}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
