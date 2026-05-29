import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useActiveTenant';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Settings, Clock, CheckCircle2, AlertTriangle, Timer, CalendarClock, ChevronDown } from 'lucide-react';
import { startOfMonth, subMonths, endOfMonth, differenceInCalendarDays, addDays, format } from 'date-fns';

interface Props {
  productionTypeId?: string;
  filters?: { status: string; priority: string; search: string; responsible: string };
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

export function ProductionKPIs({ productionTypeId, filters }: Props) {
  const { activeTenantId } = useActiveTenant();

  const { data, isLoading } = useQuery({
    queryKey: ['production-kpis-v2', activeTenantId, productionTypeId, filters],
    enabled: !!activeTenantId,
    staleTime: 15000,
    queryFn: async () => {
      const now = new Date();
      const mStart = startOfMonth(now);
      const prevStart = startOfMonth(subMonths(now, 1));
      const prevEnd = endOfMonth(subMonths(now, 1));

      let q = supabase
        .from('production_orders')
        .select(`
          id, order_number, title, status, value, planned_end_date, created_at, updated_at,
          client:clients!production_orders_client_id_fkey(name),
          current_phase:production_phases!production_orders_current_phase_id_fkey(
            phase_template:production_phase_templates(name)
          )
        `)
        .eq('tenant_id', activeTenantId!);
      if (productionTypeId) q = q.eq('production_type_id', productionTypeId);
      const { data: orders, error } = await q.limit(2000);
      if (error) throw error;
      const all = orders ?? [];

      const ativas = all.filter((o: any) => !['cancelado', 'concluido', 'entregue'].includes(o.status));
      const valorAtivas = ativas.reduce((s: number, o: any) => s + (o.value || 0), 0);

      const aguardando = all.filter(
        (o: any) =>
          o.status === 'aguardando' ||
          (o.current_phase?.phase_template?.name || '').toLowerCase().includes('fila')
      );
      const aguardandoAntigas = aguardando.filter(
        (o: any) => differenceInCalendarDays(new Date(), new Date(o.created_at)) > 3
      ).length;

      const concluidasMes = all.filter(
        (o: any) =>
          ['concluido', 'entregue'].includes(o.status) &&
          new Date(o.updated_at) >= mStart
      ).length;
      const concluidasPrev = all.filter(
        (o: any) =>
          ['concluido', 'entregue'].includes(o.status) &&
          new Date(o.updated_at) >= prevStart &&
          new Date(o.updated_at) <= prevEnd
      ).length;
      const varPct = concluidasPrev === 0 ? null : Math.round(((concluidasMes - concluidasPrev) / concluidasPrev) * 100);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const atrasadas = ativas
        .filter((o: any) => o.planned_end_date && new Date(o.planned_end_date) < today)
        .sort((a: any, b: any) => new Date(a.planned_end_date).getTime() - new Date(b.planned_end_date).getTime());

      // Tempo médio (dias entre created_at e updated_at para concluídas no mês)
      const concluidasArr = all.filter(
        (o: any) =>
          ['concluido', 'entregue'].includes(o.status) &&
          new Date(o.updated_at) >= mStart
      );
      const tempoMedio = concluidasArr.length
        ? Math.round(
            concluidasArr.reduce(
              (s: number, o: any) => s + differenceInCalendarDays(new Date(o.updated_at), new Date(o.created_at)),
              0
            ) / concluidasArr.length
          )
        : 0;

      const in7 = addDays(today, 7);
      const proximas = ativas
        .filter((o: any) => o.planned_end_date && new Date(o.planned_end_date) >= today && new Date(o.planned_end_date) <= in7)
        .sort((a: any, b: any) => new Date(a.planned_end_date).getTime() - new Date(b.planned_end_date).getTime())
        .slice(0, 5);

      return {
        ativasCount: ativas.length,
        valorAtivas,
        aguardandoCount: aguardando.length,
        aguardandoAntigas,
        concluidasMes,
        varPct,
        atrasadas,
        tempoMedio,
        proximas,
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {/* Em produção */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-blue-600">
            <Settings className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Em produção agora</span>
          </div>
          <p className="text-2xl font-bold">{data.ativasCount}</p>
          <p className="text-sm font-semibold text-emerald-600">{fmtBRL(data.valorAtivas)}</p>
          <p className="text-xs text-muted-foreground">Ordens ativas (todas as fases)</p>
        </CardContent>
      </Card>

      {/* Aguardando início */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Aguardando início</span>
          </div>
          <p className="text-2xl font-bold">{data.aguardandoCount}</p>
          {data.aguardandoAntigas > 0 && (
            <p className="text-xs text-amber-600 font-medium">⚠ {data.aguardandoAntigas} parada(s) há &gt; 3 dias</p>
          )}
          <p className="text-xs text-muted-foreground">Na fila, ainda não iniciadas</p>
        </CardContent>
      </Card>

      {/* Concluídas no mês */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Concluídas no mês</span>
          </div>
          <p className="text-2xl font-bold">{data.concluidasMes}</p>
          {data.varPct !== null && (
            <p className={`text-xs font-medium ${data.varPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {data.varPct >= 0 ? '↑' : '↓'} {Math.abs(data.varPct)}% vs mês anterior
            </p>
          )}
          <p className="text-xs text-muted-foreground">Entregues no período</p>
        </CardContent>
      </Card>

      {/* Atrasadas */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Atrasadas</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{data.atrasadas.length}</p>
          {data.atrasadas.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                Ver top 5 <ChevronDown className="h-3 w-3" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1">
                {data.atrasadas.slice(0, 5).map((o: any) => (
                  <div key={o.id} className="text-xs flex justify-between border-b pb-0.5">
                    <span className="truncate max-w-[140px]">OP-{String(o.order_number).padStart(4, '0')} · {o.client?.name || '—'}</span>
                    <span className="text-red-600 font-medium">{Math.abs(differenceInCalendarDays(new Date(o.planned_end_date), new Date()))}d</span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
          {data.atrasadas.length === 0 && <p className="text-xs text-muted-foreground">Tudo em dia 🎉</p>}
        </CardContent>
      </Card>

      {/* Tempo médio */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-purple-600">
            <Timer className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Tempo médio por OP</span>
          </div>
          <p className="text-2xl font-bold">{data.tempoMedio} <span className="text-sm font-normal text-muted-foreground">dias</span></p>
          <p className="text-xs text-muted-foreground">Da abertura à conclusão (mês)</p>
        </CardContent>
      </Card>

      {/* Próximas entregas */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-cyan-600">
            <CalendarClock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Próximas 7 dias</span>
          </div>
          <p className="text-2xl font-bold">{data.proximas.length}</p>
          {data.proximas.length > 0 ? (
            <div className="mt-1 space-y-0.5">
              {data.proximas.map((o: any) => (
                <div key={o.id} className="text-xs flex justify-between">
                  <span className="truncate max-w-[140px]">OP-{String(o.order_number).padStart(4, '0')} · {o.client?.name || '—'}</span>
                  <span className="text-muted-foreground">{format(new Date(o.planned_end_date), 'dd/MM')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nada nos próximos 7 dias</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
