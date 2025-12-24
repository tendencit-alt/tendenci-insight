import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ProductionSLAChartProps {
  productionTypeId?: string;
}

interface PhaseMetric {
  fase: string;
  fase_completa: string;
  prazo_horas: number | null;
  tempo_medio_horas: number | null;
  total_ordens: number;
  em_andamento: number;
  concluidas: number;
  violacoes: number;
  tipo_producao: string;
  position: number;
}

export function ProductionSLAChart({ productionTypeId }: ProductionSLAChartProps) {
  const queryClient = useQueryClient();

  // Query direta para buscar métricas de fases com dados reais
  const { data: phaseMetrics, isLoading } = useQuery({
    queryKey: ['production-phase-metrics', productionTypeId],
    queryFn: async () => {
      // Buscar templates de fases
      let phasesQuery = supabase
        .from('production_phase_templates')
        .select(`
          id,
          name,
          sla_hours,
          position,
          production_type_id,
          production_types!inner(name)
        `)
        .eq('active', true)
        .order('position');

      if (productionTypeId) {
        phasesQuery = phasesQuery.eq('production_type_id', productionTypeId);
      }

      const { data: phases, error: phasesError } = await phasesQuery;
      if (phasesError) throw phasesError;

      // Buscar dados das fases de produção
      let phasesDataQuery = supabase
        .from('production_phases')
        .select(`
          id,
          phase_template_id,
          started_at,
          completed_at,
          status,
          production_orders!inner(production_type_id)
        `);

      if (productionTypeId) {
        phasesDataQuery = phasesDataQuery.eq('production_orders.production_type_id', productionTypeId);
      }

      const { data: phasesData, error: phasesDataError } = await phasesDataQuery;
      if (phasesDataError) throw phasesDataError;

      // Calcular métricas por fase
      const metrics: PhaseMetric[] = phases?.map((phase) => {
        const phaseData = phasesData?.filter(p => p.phase_template_id === phase.id) || [];
        
        // Calcular tempo médio das fases concluídas
        const completedPhases = phaseData.filter(p => p.completed_at && p.started_at);
        const temposHoras = completedPhases.map(p => {
          const start = new Date(p.started_at!).getTime();
          const end = new Date(p.completed_at!).getTime();
          return (end - start) / (1000 * 60 * 60); // Converter para horas
        });
        
        const tempoMedio = temposHoras.length > 0 
          ? temposHoras.reduce((a, b) => a + b, 0) / temposHoras.length 
          : null;

        // Contar violações de prazo
        const violacoes = phase.sla_hours 
          ? temposHoras.filter(t => t > phase.sla_hours!).length 
          : 0;

        const productionType = phase.production_types as { name: string };

        return {
          fase: phase.name.length > 15 ? phase.name.substring(0, 15) + '...' : phase.name,
          fase_completa: phase.name,
          prazo_horas: phase.sla_hours,
          tempo_medio_horas: tempoMedio ? Math.round(tempoMedio * 10) / 10 : null,
          total_ordens: phaseData.length,
          em_andamento: phaseData.filter(p => p.status === 'em_andamento').length,
          concluidas: completedPhases.length,
          violacoes,
          tipo_producao: productionType?.name || '',
          position: phase.position
        };
      }) || [];

      return metrics.sort((a, b) => a.position - b.position);
    },
    staleTime: 5000,
  });

  // Realtime subscription
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel('production-phases-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_phases'
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['production-phase-metrics'] });
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_orders'
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['production-phase-metrics'] });
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Preparar dados do gráfico
  const chartData = phaseMetrics?.map(m => ({
    name: m.fase,
    fullName: m.fase_completa,
    tempoMedio: m.tempo_medio_horas || 0,
    prazo: m.prazo_horas || 0,
    totalOrdens: m.total_ordens,
    emAndamento: m.em_andamento,
    concluidas: m.concluidas,
    violacoes: m.violacoes,
    tipoProducao: m.tipo_producao,
    status: !m.tempo_medio_horas ? 'sem_dados' : 
            !m.prazo_horas ? 'sem_prazo' :
            m.tempo_medio_horas <= m.prazo_horas * 0.8 ? 'ok' : 
            m.tempo_medio_horas <= m.prazo_horas ? 'atencao' : 'critico',
    percentual: m.prazo_horas && m.tempo_medio_horas 
      ? Math.round((m.tempo_medio_horas / m.prazo_horas) * 100) 
      : null
  })) || [];

  // Calcular KPIs resumidos
  const fasesComDados = chartData.filter(d => d.status !== 'sem_dados');
  const fasesOk = chartData.filter(d => d.status === 'ok').length;
  const fasesAtencao = chartData.filter(d => d.status === 'atencao').length;
  const fasesCriticas = chartData.filter(d => d.status === 'critico').length;

  const chartConfig = {
    tempoMedio: { label: 'Tempo Médio (h)', color: 'hsl(var(--primary))' },
    prazo: { label: 'Prazo (h)', color: 'hsl(var(--muted-foreground))' }
  };

  const getBarColor = (status: string) => {
    switch (status) {
      case 'ok': return 'hsl(142 76% 36%)'; // green-600
      case 'atencao': return 'hsl(45 93% 47%)'; // yellow-500
      case 'critico': return 'hsl(0 84% 60%)'; // red-500
      case 'sem_prazo': return 'hsl(217 91% 60%)'; // blue-500
      default: return 'hsl(var(--muted))';
    }
  };

  const formatHours = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
    return `${hours}h`;
  };

  if (isLoading) {
    return <Skeleton className="h-80 rounded-lg" />;
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhuma fase configurada para este tipo de produção.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Tempo Médio por Fase vs Prazo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs Resumidos */}
        <div className="grid grid-cols-4 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <div className="p-1.5 rounded-full bg-primary/10">
              <Clock className="h-3 w-3 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Fases</p>
              <p className="text-sm font-semibold">{chartData.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
            <div className="p-1.5 rounded-full bg-green-500/20">
              <CheckCircle className="h-3 w-3 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">No Prazo</p>
              <p className="text-sm font-semibold text-green-600">{fasesOk}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10">
            <div className="p-1.5 rounded-full bg-yellow-500/20">
              <AlertTriangle className="h-3 w-3 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Atenção</p>
              <p className="text-sm font-semibold text-yellow-600">{fasesAtencao}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
            <div className="p-1.5 rounded-full bg-red-500/20">
              <XCircle className="h-3 w-3 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Crítico</p>
              <p className="text-sm font-semibold text-red-600">{fasesCriticas}</p>
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ left: 0, right: 60, top: 5, bottom: 5 }}
            >
              <XAxis type="number" fontSize={10} tickFormatter={(v) => `${v}h`} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={100} 
                fontSize={10}
                tickLine={false}
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
                      <p className="font-semibold mb-2">{data.fullName}</p>
                      <div className="space-y-1 text-muted-foreground">
                        <p>
                          <span className="font-medium text-foreground">Tempo Médio:</span>{' '}
                          {data.tempoMedio > 0 ? formatHours(data.tempoMedio) : 'Sem dados'}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Prazo:</span>{' '}
                          {data.prazo > 0 ? formatHours(data.prazo) : 'Não definido'}
                        </p>
                        {data.percentual && (
                          <p>
                            <span className="font-medium text-foreground">Uso do Prazo:</span>{' '}
                            <span className={
                              data.percentual <= 80 ? 'text-green-600' :
                              data.percentual <= 100 ? 'text-yellow-600' : 'text-red-600'
                            }>
                              {data.percentual}%
                            </span>
                          </p>
                        )}
                        <div className="border-t pt-1 mt-1">
                          <p>Total de ordens: {data.totalOrdens}</p>
                          <p>Concluídas: {data.concluidas}</p>
                          <p>Em andamento: {data.emAndamento}</p>
                          {data.violacoes > 0 && (
                            <p className="text-red-600">Violações de prazo: {data.violacoes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              {/* Barra do tempo médio */}
              <Bar 
                dataKey="tempoMedio" 
                radius={[0, 4, 4, 0]}
                maxBarSize={18}
                label={({ x, y, width, height, value, index }) => {
                  const data = chartData[index];
                  if (!value || value === 0) return null;
                  return (
                    <text
                      x={x + width + 5}
                      y={y + height / 2}
                      fill="hsl(var(--foreground))"
                      fontSize={9}
                      dominantBaseline="middle"
                    >
                      {formatHours(value)} {data.percentual ? `(${data.percentual}%)` : ''}
                    </text>
                  );
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={getBarColor(entry.status)}
                  />
                ))}
              </Bar>
              {/* Linha de referência do prazo médio */}
              {chartData.some(d => d.prazo > 0) && (
                <ReferenceLine
                  x={Math.max(...chartData.filter(d => d.prazo > 0).map(d => d.prazo))}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Legenda */}
        <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(142 76% 36%)' }} /> 
            OK (≤80%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(45 93% 47%)' }} /> 
            Atenção (80-100%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(0 84% 60%)' }} /> 
            Crítico (&gt;100%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(217 91% 60%)' }} /> 
            Sem prazo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-muted" /> 
            Sem dados
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
