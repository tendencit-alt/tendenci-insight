import { TimelineOp } from "@/hooks/useProductionTimeline";
import { Card } from "@/components/ui/card";
import { format, differenceInCalendarDays } from "date-fns";

interface Props {
  ops: TimelineOp[];
  density: "compact" | "normal" | "expanded";
  onSelect: (op: TimelineOp) => void;
  highlightId?: string | null;
}

// Map "color" tokens (slate/blue/...) coming from production_status_columns to tailwind bg classes.
const COLOR_MAP: Record<string, string> = {
  slate: "bg-slate-500",
  gray: "bg-gray-500",
  zinc: "bg-zinc-500",
  red: "bg-red-600",
  orange: "bg-orange-600",
  amber: "bg-amber-600",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-600",
  emerald: "bg-emerald-600",
  teal: "bg-teal-600",
  cyan: "bg-cyan-600",
  sky: "bg-sky-600",
  blue: "bg-blue-600",
  indigo: "bg-indigo-600",
  violet: "bg-violet-600",
  purple: "bg-purple-600",
  fuchsia: "bg-fuchsia-600",
  pink: "bg-pink-600",
  rose: "bg-rose-600",
};

function segColor(token?: string | null) {
  if (!token) return "bg-muted-foreground/40";
  if (token.startsWith("bg-")) return token;
  return COLOR_MAP[token] ?? "bg-muted-foreground/40";
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

export function TimelineGantt({ ops, density, onSelect, highlightId }: Props) {
  const rowHeight = density === "compact" ? 44 : density === "expanded" ? 68 : 56;
  const today = new Date();

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm rounded-xl bg-card">
      {/* Header */}
      <div className="grid grid-cols-[minmax(180px,22%)_1fr_minmax(76px,9%)] border-b border-border/60 bg-gradient-to-b from-muted/40 to-muted/10 text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/80 select-none">
        <div className="px-3 sm:px-4 py-3 border-r border-border/50">Ordem de Produção</div>
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
          <span>Início</span>
          <span className="opacity-70">Progresso da OP</span>
          <span>Fim</span>
        </div>
        <div className="px-2 py-3 border-l border-border/50 text-right">ETA</div>
      </div>

      {/* Body */}
      <div className="relative bg-gradient-to-b from-background to-muted/5">
        {ops.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground bg-muted/5">
            Nenhuma OP no período. Ajuste os filtros ou crie novas ordens de produção.
          </div>
        )}

        {ops.map((op) => {
          // A data de início deve ser a data da emissão do pedido, como solicitado
          const startSource =
            op.order_emission_date ?? op.actual_start_date ?? op.planned_start_date ?? op.status_changed_at;
          const opStart = new Date(startSource);
          const opEta = new Date(op.eta);
          const due = op.planned_end_date ? new Date(op.planned_end_date) : null;

          // Bar axis spans from start until the latest of ETA / planned end / today
          const axisEnd = new Date(
            Math.max(opEta.getTime(), due?.getTime() ?? 0, today.getTime())
          );
          const opSpanDays = Math.max(1, differenceInCalendarDays(axisEnd, opStart));

          const duePct = due ? clampPct((differenceInCalendarDays(due, opStart) / opSpanDays) * 100) : null;
          const etaPct = clampPct((differenceInCalendarDays(opEta, opStart) / opSpanDays) * 100);

          // ETA badge color
          let etaClass = "bg-blue-600 text-white";
          let etaStatusLabel = "Dentro do prazo";
          if (due) {
            const desvioDays = differenceInCalendarDays(opEta, due);
            if (desvioDays > 0) {
              etaClass = "bg-destructive text-white";
              etaStatusLabel = `Atraso: ${desvioDays}d`;
            } else if (desvioDays > -2) {
              etaClass = "bg-amber-500 text-white";
              etaStatusLabel = "Prazo apertado";
            }
          }

          // 1. Time axis logic (Visual scale)
          const todayPct = clampPct((differenceInCalendarDays(today, opStart) / opSpanDays) * 100);
          const isDone = op.status === "concluido" || op.status === "entregue";

          // 2. Calculation of planned progress (Meta)
          // How much time has passed vs total planned time
          const totalPlannedDaysForMeta = due ? Math.max(1, differenceInCalendarDays(due, opStart)) : opSpanDays;
          const daysPassed = differenceInCalendarDays(today, opStart);
          const metaProgressRatio = clampPct((daysPassed / totalPlannedDaysForMeta) * 100) / 100;

          // 3. Calculation of real progress (Executado)
          const totalPlannedDaysStatus = op.segments.reduce((acc, s) => acc + (s.duration_days || 0), 0) || 1;
          let completedPlannedDays = 0;
          const currentIdx = op.segments.findIndex((s) => s.slug === op.status);
          
          if (currentIdx >= 0) {
            for (let i = 0; i < currentIdx; i++) {
              completedPlannedDays += op.segments[i].duration_days || 0;
            }
            // Logic for the current segment
            const isLastSegment = currentIdx === op.segments.length - 1;
            const currentSegDuration = op.segments[currentIdx].duration_days || 1;
            
            if (isLastSegment || isDone) {
              completedPlannedDays += currentSegDuration;
            } else {
              const currentSegRatio = Math.min(1, (op.days_in_current ?? 0) / (op.current_duration_days || currentSegDuration));
              completedPlannedDays += currentSegRatio * currentSegDuration;
            }
          }
          const execProgressRatio = clampPct((completedPlannedDays / totalPlannedDaysStatus) * 100) / 100;

          // 4. Mapping to visual bar scale (opSpanDays)
          const metaPct = metaProgressRatio * 100;
          const executadoPct = execProgressRatio * 100;

          const metaMarkerClass = "text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(37,99,235,0.5)] border border-white/20";
          const execMarkerClass = "text-[8px] font-black bg-foreground text-background px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(0,0,0,0.3)] border border-white/20 uppercase";
          
          return (
            <div
              key={op.id}
              role="button"
              onClick={() => onSelect(op)}
              className={`grid grid-cols-[minmax(180px,22%)_1fr_minmax(76px,9%)] border-b border-border/30 hover:bg-accent/30 group transition-all duration-200 cursor-pointer ${
                highlightId === op.id ? "bg-primary/5 ring-inset ring-1 ring-primary/40" : ""
              }`}
              style={{ minHeight: rowHeight }}
            >
              {/* Label column */}
              <div className="flex items-center gap-2.5 px-3 sm:px-4 py-2 overflow-hidden border-r border-border/40">
                <span className="text-[10px] font-bold text-muted-foreground bg-muted/40 ring-1 ring-border/40 px-1.5 py-0.5 rounded-md tracking-tight group-hover:bg-primary/10 group-hover:text-primary group-hover:ring-primary/30 transition-colors whitespace-nowrap">#{op.order_number}</span>
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors tracking-tight">{op.title}</span>
                  {op.client_name && (
                    <span className="text-[10px] text-muted-foreground truncate">{op.client_name}</span>
                  )}
                  {op.is_late_planned && (
                    <span className="text-[9px] font-bold text-destructive uppercase tracking-wider">OP atrasada</span>
                  )}
                </div>
              </div>

              {/* Timeline column - full width, normalized per OP */}
              <div className="relative px-3 sm:px-4 py-2 flex flex-col justify-center">
                {/* Date labels (start/end of axis) */}
                <div className="flex justify-between text-[9px] font-medium text-muted-foreground/70 mb-1 tracking-tight">
                  <span>{format(opStart, "dd/MM")}</span>
                  <span>{format(axisEnd, "dd/MM")}</span>
                </div>

                {/* Bar track */}
                <div className="relative w-full" style={{ height: Math.max(16, rowHeight - 32) }}>
                  {/* Phase bar (segments) */}
                  <div
                    className="absolute inset-0 flex rounded-full overflow-hidden shadow-md ring-1 ring-black/5"
                  >
                    {op.segments.map((s, idx) => {
                      const w = ((s.duration_days || 0) / totalPlannedDaysStatus) * 100;
                      const isPast = currentIdx >= 0 && idx < currentIdx;
                      const isCurrent = idx === currentIdx;
                      const cls = segColor(s.color);
                      return (
                        <div
                          key={s.slug}
                          className={`relative h-full ${cls} ${isPast ? "opacity-95" : isCurrent ? "ring-inset ring-1 ring-white/40 shadow-inner" : "opacity-25"} transition-opacity`}
                          style={{ width: `${w}%` }}
                          title={`${s.label}: ${s.duration_days} dias`}
                        >
                          {isCurrent && op.current_duration_days ? (
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/40 to-white/10 animate-[pulse_2s_infinite]"
                              style={{
                                width: `${Math.min(100, ((op.days_in_current ?? 0) / (op.current_duration_days || 1)) * 100)}%`,
                              }}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* HOJE line */}
                  {(() => {
                    const isLate = executadoPct < metaPct;
                    const colorClass = isLate ? "bg-red-500" : "bg-blue-600";
                    const borderClass = isLate ? "border-red-500/60" : "border-blue-600/60";
                    
                    return (
                      <div
                        className={`absolute -top-1 -bottom-1 border-l-2 border-dashed ${borderClass} z-10 pointer-events-none`}
                        style={{ left: `${todayPct}%` }}
                      >
                        <div className={`absolute -top-4 -translate-x-1/2 text-[8px] font-black ${colorClass} text-white px-1.5 py-0.5 rounded shadow-sm border border-white/20 uppercase`}>
                          HOJE
                        </div>
                      </div>
                    );
                  })()}

                  {/* FIM (due) line */}
                  {duePct !== null && due && (() => {
                    const daysToDue = differenceInCalendarDays(due, today);
                    const daysLabel =
                      daysToDue > 0
                        ? `${daysToDue}d`
                        : daysToDue === 0
                          ? "hoje"
                          : `${Math.abs(daysToDue)}d`; // Removed "em atraso" as per previous instruction and keeping it clean
                    return (
                      <div
                        className="absolute -top-1 -bottom-1 border-l-2 border-dashed border-blue-600/40 z-10 pointer-events-none"
                        style={{ left: `${duePct}%` }}
                      >
                        <div className="absolute -bottom-4 -translate-x-1/2 text-[8px] font-black bg-blue-600/80 text-white px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                          FIM · {daysLabel}
                        </div>
                      </div>
                    );
                  })()}

                  {/* META marker */}
                  <div
                    className="absolute -top-3 z-30 pointer-events-none -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${metaPct}%` }}
                  >
                    <span className={metaMarkerClass}>META</span>
                    <div className="w-0.5 h-1.5 bg-blue-600 mt-0.5" />
                  </div>


                  {/* EXECUTADO marker */}
                  {!isDone && currentIdx !== -1 && (
                    <div
                      className="absolute -bottom-3 z-30 pointer-events-none -translate-x-1/2 flex flex-col items-center"
                      style={{ left: `${executadoPct}%` }}
                    >
                      <div className="w-0.5 h-1.5 bg-foreground mb-0.5" />
                      <span className={execMarkerClass}>Exec</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ETA column */}
              <div className="px-2 py-2 border-l border-border/40 flex items-center justify-end">
                <span
                  className={`${etaClass} rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap shadow-sm ring-2 ring-background tracking-tight`}
                  title={etaStatusLabel}
                >
                  {format(opEta, "dd/MM")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-gradient-to-b from-muted/20 to-muted/40 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-medium border-t border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-background shadow-sm" />
          <span className="text-muted-foreground/90 uppercase tracking-wider font-semibold text-[9px]">Meta (onde deveria estar)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-foreground ring-2 ring-background shadow-sm" />
          <span className="text-muted-foreground/90 uppercase tracking-wider font-semibold text-[9px]">Executado (onde está)</span>
        </div>
        <div className="flex items-center gap-3 border-l border-border/40 pl-6">
          <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-full ring-1 ring-blue-200/60">
            <span className="font-bold text-[9px]">✓ NO PRAZO</span>
            <span className="text-[9px] text-blue-700/80">Executado ≥ Meta</span>
          </div>
          <div className="flex items-center gap-1.5 text-destructive bg-destructive/5 px-2.5 py-1 rounded-full ring-1 ring-destructive/15">
            <span className="font-bold text-[9px]">⚠ ATRASADO</span>
            <span className="text-[9px] text-destructive/80">Executado &lt; Meta</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
