import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProductionTimeline, TimelineOp } from "@/hooks/useProductionTimeline";
import { TimelineFilters, DEFAULT_FILTERS, TimelineFiltersValue } from "./TimelineFilters";
import { TimelineGantt } from "./TimelineGantt";
import { OpTimelineDrawer } from "./OpTimelineDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, AlertOctagon, AlertTriangle, CheckCircle2, Clock, Factory, Timer } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, isWithinInterval, differenceInCalendarDays } from "date-fns";

export function TimelineView() {
  const { data, isLoading } = useProductionTimeline();
  const [filters, setFilters] = useState<TimelineFiltersValue>(DEFAULT_FILTERS);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const focusOp = searchParams.get("op");

  const ops = data?.ops ?? [];
  const kpis = data?.kpis ?? { total: 0, em_producao: 0, aguardando: 0, concluidas: 0, vencidas: 0, atraso_projetado: 0, atrasadas: 0, alerta_prazo: 0, pct_concluidas: 0 };

  const phases = useMemo(() => {
    const map = new Map<string, string>();
    for (const op of ops) {
      for (const s of op.segments) if (!map.has(s.slug)) map.set(s.slug, s.label);
    }
    return Array.from(map.entries()).map(([slug, label]) => ({ slug, label }));
  }, [ops]);

  const filtered = useMemo(() => {
    let list = ops.slice();
    const q = filters.search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          String(o.order_number).includes(q) ||
          (o.client_name || "").toLowerCase().includes(q)
      );
    }
    if (filters.priority !== "all") list = list.filter((o) => o.priority === filters.priority);
    if (filters.phase !== "all") list = list.filter((o) => o.status === filters.phase);
    if (filters.late === "late") list = list.filter((o) => o.is_late_planned);
    if (filters.late === "ontime") list = list.filter((o) => !o.is_late_planned);
    if (filters.range !== "all") {
      const now = new Date();
      const interval = filters.range === "week"
        ? { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
        : filters.range === "quarter"
          ? { start: startOfQuarter(now), end: endOfQuarter(now) }
          : { start: startOfMonth(now), end: endOfMonth(now) };
      list = list.filter((o) => {
        const eta = new Date(o.eta);
        const start = new Date(o.actual_start_date ?? o.planned_start_date ?? o.status_changed_at);
        return isWithinInterval(eta, interval) || isWithinInterval(start, interval) || (start < interval.start && eta > interval.end);
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (filters.sort === "eta") {
        const today = new Date();
        const dueA = a.planned_end_date ? new Date(a.planned_end_date) : new Date(a.eta);
        const dueB = b.planned_end_date ? new Date(b.planned_end_date) : new Date(b.eta);
        const daysLeftA = differenceInCalendarDays(dueA, today);
        const daysLeftB = differenceInCalendarDays(dueB, today);
        return daysLeftA - daysLeftB;
      }
      if (filters.sort === "order") {
        return String(a.order_number).localeCompare(String(b.order_number), undefined, { numeric: true });
      }
      if (filters.sort === "date") {
        const dateA = new Date(a.actual_start_date ?? a.planned_start_date ?? a.status_changed_at).getTime();
        const dateB = new Date(b.actual_start_date ?? b.planned_start_date ?? b.status_changed_at).getTime();
        return dateA - dateB;
      }
      if (filters.sort === "priority") {
        const pMap: Record<string, number> = { alta: 0, normal: 1, baixa: 2 };
        return (pMap[a.priority] ?? 1) - (pMap[b.priority] ?? 1);
      }
      if (filters.sort === "client") {
        return (a.client_name || "").localeCompare(b.client_name || "");
      }
      return 0;
    });

    return list;
  }, [ops, filters]);

  const grouped = useMemo(() => {
    if (filters.group === "none") return [{ key: "Todas", ops: filtered }];
    const map = new Map<string, TimelineOp[]>();
    for (const op of filtered) {
      const key =
        filters.group === "phase" ? (op.current_phase_label ?? op.status)
          : filters.group === "priority" ? op.priority
            : (op.client_name || "Sem cliente");
      const arr = map.get(key) ?? [];
      arr.push(op);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, ops]) => ({ key, ops }));
  }, [filtered, filters.group]);

  const selectedOp = focusOp ? ops.find((o) => o.id === focusOp) ?? null : null;

  const openOpDrawer = (op: TimelineOp) => {
    const next = new URLSearchParams(searchParams);
    next.set("op", op.id);
    setSearchParams(next, { replace: true });
  };
  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("op");
    setSearchParams(next, { replace: true });
  };
  const openInKanban = (opId: string) => {
    navigate(`/producao-operacoes?tab=producao&op=${opId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        <KpiCard icon={<Factory className="h-4 w-4" />} label="Em produção" value={kpis.em_producao} hint="Ordens ativas com fase já iniciada (não 'Aguardando' nem concluídas)." />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Aguardando" value={kpis.aguardando} hint="Ordens criadas que ainda não saíram da fase inicial 'Aguardando'." />
        <KpiCard
          icon={<AlertOctagon className="h-4 w-4 text-destructive" />}
          label="Vencidas"
          value={kpis.vencidas}
          tone="text-destructive"
          hint="Prazo final já passou de hoje e a OP ainda não foi concluída. Urgência real — exige ação agora."
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          label="Atraso projetado"
          value={kpis.atraso_projetado}
          tone="text-amber-600"
          hint="Prazo ainda não venceu, mas a previsão calculada (ETA) já ultrapassa o prazo planejado. Alerta preditivo."
        />
        <KpiCard
          icon={<Timer className="h-4 w-4 text-amber-500" />}
          label="Alerta prazo"
          value={kpis.alerta_prazo}
          hint="Ainda dentro do prazo, mas a folga restante até o ETA está abaixo de 10% do tempo até o prazo final."
        />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Concluídas" value={kpis.concluidas} hint="Ordens em fases finais (concluído ou entregue)." />
        <KpiCard icon={<Activity className="h-4 w-4" />} label="% Concluídas" value={`${kpis.pct_concluidas ?? 0}%`} hint="Percentual de OPs concluídas sobre o total." />
      </div>

      <TimelineFilters value={filters} onChange={setFilters} phases={phases} />

      {grouped.map((g) => (
        <div key={g.key} className="space-y-1">
          {filters.group !== "none" && (
            <div className="text-xs font-medium text-muted-foreground px-1">{g.key} · {g.ops.length}</div>
          )}
          <TimelineGantt
            ops={g.ops}
            density={filters.density}
            onSelect={openOpDrawer}
            highlightId={focusOp}
          />
        </div>
      ))}

      <OpTimelineDrawer op={selectedOp} onClose={closeDrawer} onOpenInKanban={openInKanban} />
    </div>
  );
}

function KpiCard({ icon, label, value, tone, hint }: { icon: React.ReactNode; label: string; value: number | string; tone?: string; hint?: string }) {
  const card = (
    <Card className="cursor-help group relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-muted/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-3 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 ring-1 ring-border/40 flex items-center justify-center shadow-inner">{icon}</div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 leading-tight font-medium">{label}</div>
          <div className={`text-xl font-bold leading-tight truncate tracking-tight ${tone ?? "text-foreground"}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
  if (!hint) return card;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-xs">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
