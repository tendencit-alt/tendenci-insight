import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChartContainer, 
  ChartTooltip
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts';
import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ProductionSLAChartProps {
  productionTypeId?: string;
}

interface PhaseTemplate {
  id: string;
  name: string;
  sla_hours: number | null;
  position: number;
  production_type_id: string;
}

interface PhaseData {
  id: string;
  phase_template_id: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
}

export function ProductionSLAChart({ productionTypeId }: ProductionSLAChartProps) {
  const queryClient = useQueryClient();

  // Query para buscar templates de fases
  const { data: phaseTemplates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['production-phase-templates-chart', productionTypeId],
    queryFn: async () => {
      let query = supabase
        .from('production_phase_templates')
        .select('id, name, sla_hours, position, production_type_id')
        .eq('active', true)
        .order('position');

      if (productionTypeId) {
        query = query.eq('production_type_id', productionTypeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PhaseTemplate[];
    },
    staleTime: 10000,
  });

  // Query para buscar dados das fases de produção
  const { data: phasesData, isLoading: loadingPhases } = useQuery({
    queryKey: ['production-phases-chart', productionTypeId],
    queryFn: async () => {
      // Buscar fases com suas ordens de produção
      let query = supabase
        .from('production_phases')
        .select(`
          id,
          phase_template_id,
          started_at,
          completed_at,
          status,
          production_order_id
        `);

      const { data, error } = await query;
      if (error) throw error;

      // Se temos productionTypeId, filtrar pelo tipo
      if (productionTypeId && phaseTemplates) {
        const templateIds = phaseTemplates.map(t => t.id);
        return (data || []).filter(p => templateIds.includes(p.phase_template_id)) as PhaseData[];
      }

      return data as PhaseData[];
    },
    enabled: !!phaseTemplates,
    staleTime: 5000,
  });

  const isLoading = loadingTemplates || loadingPhases;

  // Realtime subscription
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel('production-phases-chart-realtime')
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
            queryClient.invalidateQueries({ queryKey: ['production-phases-chart'] });
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calcular métricas por fase
  const chartData = phaseTemplates?.map(template => {
    const phaseData = phasesData?.filter(p => p.phase_template_id === template.id) || [];
    
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
    const violacoes = template.sla_hours 
      ? temposHoras.filter(t => t > template.sla_hours!).length 
      : 0;

    const prazo = template.sla_hours || 0;
    const tempoMedioArredondado = tempoMedio ? Math.round(tempoMedio * 10) / 10 : null;

    // Determinar status
    let status = 'sem_dados';
    if (tempoMedioArredondado !== null) {
      if (prazo === 0) {
        status = 'sem_prazo';
      } else if (tempoMedioArredondado <= prazo * 0.8) {
        status = 'ok';
      } else if (tempoMedioArredondado <= prazo) {
        status = 'atencao';
      } else {
        status = 'critico';
      }
    }

    return {
      name: template.name.length > 15 ? template.name.substring(0, 15) + '...' : template.name,
      fullName: template.name,
      tempoMedio: tempoMedioArredondado || 0,
      prazo,
      totalOrdens: phaseData.length,
      emAndamento: phaseData.filter(p => p.status === 'em_andamento').length,
      concluidas: completedPhases.length,
      violacoes,
      status,
      percentual: prazo && tempoMedioArredondado 
        ? Math.round((tempoMedioArredondado / prazo) * 100) 
        : null
    };
  }) || [];

  // Calcular KPIs resumidos
  const fasesOk = chartData.filter(d => d.status === 'ok').length;
  const fasesAtencao = chartData.filter(d => d.status === 'atencao').length;
  const fasesCriticas = chartData.filter(d => d.status === 'critico').length;

  const chartConfig = {
    tempoMedio: { label: 'Tempo Médio (h)', color: 'hsl(var(--primary))' },
    prazo: { label: 'Prazo (h)', color: 'hsl(var(--muted-foreground))' }
  };

  const getBarColor = (status: string) => {
    switch (status) {
      case 'ok': return 'hsl(142 76% 36%)';
      case 'atencao': return 'hsl(45 93% 47%)';
      case 'critico': return 'hsl(0 84% 60%)';
      case 'sem_prazo': return 'hsl(217 91% 60%)';
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

  if (!phaseTemplates || phaseTemplates.length === 0) {
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
