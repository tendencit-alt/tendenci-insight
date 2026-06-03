import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProductionTimeline, TimelineOp } from "@/hooks/useProductionTimeline";
import { TimelineFilters, DEFAULT_FILTERS, TimelineFiltersValue } from "./TimelineFilters";
import { TimelineGantt } from "./TimelineGantt";
import { OpTimelineDrawer } from "./OpTimelineDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, CheckCircle2, Clock, Factory, Timer } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, isWithinInterval } from "date-fns";

export function TimelineView() {
  const { data, isLoading } = useProductionTimeline();
  const [filters, setFilters] = useState<TimelineFiltersValue>(DEFAULT_FILTERS);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const focusOp = searchParams.get("op");

  const ops = data?.ops ?? [];
  const kpis = data?.kpis ?? { total: 0, em_producao: 0, aguardando: 0, concluidas: 0, atrasadas: 0, alerta_prazo: 0, pct_concluidas: 0 };

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
          String(o.order_number).includes(q)
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
    return list;
  }, [ops, filters]);

  const grouped = useMemo(() => {
    if (filters.group === "none") return [{ key: "Todas", ops: filtered }];
    const map = new Map<string, TimelineOp[]>();
    for (const op of filtered) {
      const key =
        filters.group === "phase" ? (op.current_phase_label ?? op.status)
          : filters.group === "priority" ? op.priority
            : (op.client_id ?? "Sem cliente");
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <KpiCard icon={<Factory className="h-4 w-4" />} label="Em produção" value={kpis.em_producao} />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Aguardando" value={kpis.aguardando} />
        <KpiCard icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Atrasadas" value={kpis.atrasadas} />
        <KpiCard icon={<Timer className="h-4 w-4 text-amber-500" />} label="Alerta prazo" value={kpis.alerta_prazo} />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Concluídas" value={kpis.concluidas} />
        <KpiCard icon={<Activity className="h-4 w-4" />} label="% Concluídas" value={`${kpis.pct_concluidas ?? 0}%`} />
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

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center">{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
          <div className="text-lg font-semibold leading-tight truncate">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
