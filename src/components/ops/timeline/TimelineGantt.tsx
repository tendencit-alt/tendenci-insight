import { useMemo } from "react";
import { TimelineOp } from "@/hooks/useProductionTimeline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, differenceInCalendarDays, max as dMax, min as dMin } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  ops: TimelineOp[];
  density: "compact" | "normal" | "expanded";
  onSelect: (op: TimelineOp) => void;
  highlightId?: string | null;
}

// Map "color" tokens (slate/blue/...) coming from production_status_columns to tailwind bg classes.
const COLOR_MAP: Record<string, string> = {
  slate: "bg-slate-400",
  gray: "bg-gray-400",
  zinc: "bg-zinc-400",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
};

function segColor(token?: string | null) {
  if (!token) return "bg-muted-foreground/40";
  // Some columns may store full class like "bg-blue-500"
  if (token.startsWith("bg-")) return token;
  return COLOR_MAP[token] ?? "bg-muted-foreground/40";
}

export function TimelineGantt({ ops, density, onSelect, highlightId }: Props) {
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    if (ops.length === 0) {
      const today = new Date();
      return { rangeStart: today, rangeEnd: addDays(today, 30), totalDays: 30 };
    }
    const starts = ops.map((o) =>
      o.actual_start_date
        ? new Date(o.actual_start_date)
        : o.planned_start_date
          ? new Date(o.planned_start_date)
          : new Date(o.status_changed_at)
    );
    const ends = ops.map((o) => new Date(o.eta));
    const start = dMin(starts);
    const end = dMax([...ends, ...ops.map((o) => (o.planned_end_date ? new Date(o.planned_end_date) : end_ ?? new Date()))]);
    var end_ = end;
    const padded = addDays(end, 3);
    const total = Math.max(7, differenceInCalendarDays(padded, start) + 1);
    return { rangeStart: start, rangeEnd: padded, totalDays: total };
  }, [ops]);

  const rowHeight = density === "compact" ? 32 : density === "expanded" ? 56 : 44;
  const labelWidth = 240;

  const today = new Date();
  const todayOffsetPct = Math.max(0, Math.min(100, (differenceInCalendarDays(today, rangeStart) / totalDays) * 100));

  return (
    <Card className="overflow-hidden">
      {/* Header with time scale */}
      <div className="flex border-b bg-muted/40 text-xs">
        <div className="flex-shrink-0 px-3 py-2 font-medium" style={{ width: labelWidth }}>
          Ordem de Produção
        </div>
        <div className="flex-1 relative h-8">
          {Array.from({ length: Math.min(totalDays + 1, 60) }).map((_, i) => {
            const step = Math.max(1, Math.ceil(totalDays / 30));
            if (i % step !== 0) return null;
            const left = (i / totalDays) * 100;
            const date = addDays(rangeStart, i);
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-border/50 text-[10px] text-muted-foreground pl-1"
                style={{ left: `${left}%` }}
              >
                {format(date, "dd/MM", { locale: ptBR })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {/* "Hoje" guide line */}
        <div
          className="absolute top-0 bottom-0 border-l-2 border-primary/70 z-10 pointer-events-none"
          style={{ left: `calc(${labelWidth}px + ${todayOffsetPct}% * (100% - ${labelWidth}px) / 100)` }}
          title={`Hoje: ${format(today, "dd/MM/yyyy")}`}
        />

        {ops.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma OP no período. Ajuste os filtros ou crie novas ordens de produção.
          </div>
        )}

        {ops.map((op) => {
          const startSource = op.actual_start_date ?? op.planned_start_date ?? op.status_changed_at;
          const opStart = new Date(startSource);
          const opEta = new Date(op.eta);
          const due = op.planned_end_date ? new Date(op.planned_end_date) : null;

          const offsetPct = (differenceInCalendarDays(opStart, rangeStart) / totalDays) * 100;
          const widthPct = Math.max(
            1,
            (differenceInCalendarDays(opEta, opStart) / totalDays) * 100
          );

          // ETA color
          let etaClass = "bg-emerald-500/80";
          if (due) {
            const desvioDays = differenceInCalendarDays(opEta, due);
            if (desvioDays > 0) etaClass = "bg-red-500/80";
            else if (desvioDays > -2) etaClass = "bg-amber-500/80";
          }

          // Render proportional segments inside the bar
          const totalDur = op.segments.reduce((acc, s) => acc + (s.duration_days || 0), 0) || 1;

          // Find current phase position to draw progress
          const currentIdx = op.segments.findIndex((s) => s.slug === op.status);

          return (
            <div
              key={op.id}
              role="button"
              onClick={() => onSelect(op)}
              className={`flex border-b hover:bg-accent/30 cursor-pointer transition-colors ${
                highlightId === op.id ? "bg-primary/10 ring-1 ring-primary" : ""
              }`}
              style={{ height: rowHeight }}
            >
              <div
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1 overflow-hidden"
                style={{ width: labelWidth }}
              >
                <span className="text-xs font-mono text-muted-foreground">#{op.order_number}</span>
                <span className="text-sm truncate flex-1">{op.title}</span>
                {op.is_late_planned && (
                  <Badge variant="destructive" className="text-[10px] h-4">Atrasada</Badge>
                )}
              </div>
              <div className="flex-1 relative py-2">
                {/* due-date marker */}
                {due && (
                  <div
                    className="absolute top-0 bottom-0 border-l border-dashed border-red-500/80 z-10"
                    style={{ left: `${(differenceInCalendarDays(due, rangeStart) / totalDays) * 100}%` }}
                    title={`Prazo original: ${format(due, "dd/MM/yyyy")}`}
                  />
                )}
                {/* bar */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 flex rounded overflow-hidden shadow-sm"
                  style={{
                    left: `${Math.max(0, offsetPct)}%`,
                    width: `${Math.max(1, widthPct)}%`,
                    height: rowHeight - 14,
                  }}
                >
                  {op.segments.map((s, idx) => {
                    const w = ((s.duration_days || 0) / totalDur) * 100;
                    const isPast = currentIdx >= 0 && idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    const cls = segColor(s.color);
                    return (
                      <div
                        key={s.slug}
                        className={`relative ${cls} ${isPast ? "opacity-60" : isCurrent ? "" : "opacity-40"}`}
                        style={{ width: `${w}%` }}
                        title={`${s.label} · ${s.duration_days}d`}
                      >
                        {isCurrent && op.current_duration_days ? (
                          <div
                            className="absolute inset-y-0 left-0 bg-foreground/30"
                            style={{
                              width: `${Math.min(100, ((op.days_in_current ?? 0) / (op.current_duration_days || 1)) * 100)}%`,
                            }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {/* ETA tip */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 ${etaClass} rounded-r px-1 text-[10px] text-white whitespace-nowrap`}
                  style={{
                    left: `calc(${offsetPct + widthPct}% - 36px)`,
                    height: rowHeight - 14,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {format(opEta, "dd/MM")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
