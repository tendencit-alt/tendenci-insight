import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  Clock, 
  Settings, 
  CheckCircle, 
  DollarSign, 
  AlertTriangle,
  Target,
  Zap
} from 'lucide-react';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts';

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

interface SLAMetric {
  phase_name: string;
  phase_color: string;
  total_orders: number;
  avg_hours: number | null;
  sla_hours: number | null;
  sla_violations: number;
  in_progress: number;
}

export function ProductionKPIs({ productionTypeId, filters }: ProductionKPIsProps) {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
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

  const { data: slaMetrics, isLoading: slaLoading } = useQuery({
    queryKey: ['production-sla-metrics', productionTypeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('production_sla_metrics', {
        p_type_id: productionTypeId || null
      });
      if (error) throw error;
      return data as SLAMetric[];
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

  const kpiCards = [
    { 
      label: 'Total', 
      value: metrics?.total_orders || 0, 
      icon: Package, 
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    { 
      label: 'Aguardando', 
      value: metrics?.aguardando || 0, 
      icon: Clock, 
      color: 'text-amber-600',
      bgColor: 'bg-amber-100'
    },
    { 
      label: 'Em Produção', 
      value: metrics?.em_andamento || 0, 
      icon: Settings, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      label: 'Concluídas', 
      value: metrics?.concluido || 0, 
      icon: CheckCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    { 
      label: 'Valor Total', 
      value: formatCurrency(metrics?.valor_total || 0), 
      icon: DollarSign, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      isValue: true
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

  // Preparar dados para o gráfico de SLA
  const chartData = slaMetrics?.filter(m => m.sla_hours !== null).map(m => ({
    name: m.phase_name.length > 12 ? m.phase_name.substring(0, 12) + '...' : m.phase_name,
    fullName: m.phase_name,
    avgHours: m.avg_hours || 0,
    slaHours: m.sla_hours || 0,
    violations: m.sla_violations,
    status: !m.avg_hours ? 'sem_dados' : 
            m.avg_hours <= (m.sla_hours || 0) * 0.8 ? 'ok' : 
            m.avg_hours <= (m.sla_hours || 0) ? 'warning' : 'critical'
  })) || [];

  const chartConfig = {
    avgHours: { label: 'Tempo Médio (h)', color: 'hsl(var(--primary))' },
    slaHours: { label: 'SLA (h)', color: 'hsl(var(--muted-foreground))' }
  };

  if (metricsLoading || slaLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
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
              <p className="text-xs text-muted-foreground truncate">
                {kpi.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico de Tempo por Fase vs SLA */}
      {chartData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              📊 Tempo Médio por Fase vs SLA
            </h3>
            <ChartContainer config={chartConfig} className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData} 
                  layout="vertical"
                  margin={{ left: 0, right: 40 }}
                >
                  <XAxis type="number" fontSize={10} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80} 
                    fontSize={10}
                    tickLine={false}
                  />
                  <ChartTooltip 
                    content={
                      <ChartTooltipContent 
                        formatter={(value, name) => [
                          `${value}h`,
                          name === 'avgHours' ? 'Tempo Médio' : 'SLA'
                        ]}
                      />
                    } 
                  />
                  <Bar 
                    dataKey="avgHours" 
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={
                          entry.status === 'ok' ? 'hsl(var(--chart-2))' :
                          entry.status === 'warning' ? 'hsl(45 93% 47%)' :
                          entry.status === 'critical' ? 'hsl(0 84% 60%)' :
                          'hsl(var(--muted))'
                        }
                      />
                    ))}
                  </Bar>
                  <Bar 
                    dataKey="slaHours" 
                    fill="hsl(var(--muted))" 
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                    opacity={0.3}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-green-500" /> OK
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-yellow-500" /> Atenção
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-red-500" /> Crítico
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
