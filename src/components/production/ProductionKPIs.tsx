import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useActiveTenant';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings, 
  AlertTriangle,
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
  const { activeTenantId } = useActiveTenant();

  // Query direta para calcular o TOTAL de TODOS os tipos em produção (exceto cancelado)
  const { data: totalEmProducao, isLoading: loadingTotal } = useQuery({
    queryKey: ['production-total-all', activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_orders')
        .select('value, status')
        .eq('tenant_id', activeTenantId!)
        .neq('status', 'cancelado');
      
      if (error) throw error;
      
      const total = data.reduce((acc, order) => acc + (order.value || 0), 0);
      const count = data.length;
      
      return { total, count };
    },
    staleTime: 5000,
  });


  // Métricas do tipo selecionado (para atrasadas e urgentes)
  const { data: metrics, isLoading: loadingType } = useQuery({
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
    },
    staleTime: 10000,
  });

  const isLoading = loadingTotal || loadingType;

  // Realtime é gerenciado pelo useGlobalRealtime no DashboardLayout

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Total de OPs de TODOS os tipos (exceto canceladas)
  const opsAtivasTotal = totalEmProducao?.count || 0;
  const valorOpsAtivasTotal = totalEmProducao?.total || 0;

  const kpiCards = [
    { 
      label: 'Total em Produção', 
      value: opsAtivasTotal, 
      subValue: formatCurrency(valorOpsAtivasTotal),
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
      label: 'Urgentes', 
      value: metrics?.urgente || 0, 
      icon: Zap, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
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
