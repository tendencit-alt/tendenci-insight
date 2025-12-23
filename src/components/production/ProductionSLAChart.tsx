import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts';

interface ProductionSLAChartProps {
  productionTypeId?: string;
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

export function ProductionSLAChart({ productionTypeId }: ProductionSLAChartProps) {
  const { data: slaMetrics, isLoading } = useQuery({
    queryKey: ['production-sla-metrics', productionTypeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('production_sla_metrics', {
        p_type_id: productionTypeId || null
      });
      if (error) throw error;
      return data as SLAMetric[];
    }
  });

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

  if (isLoading) {
    return <Skeleton className="h-64 rounded-lg" />;
  }

  if (chartData.length === 0) {
    return null;
  }

  return (
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
  );
}
