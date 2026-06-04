import { useMemo } from "react";
import { TimelineOp } from "@/hooks/useProductionTimeline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, differenceInCalendarDays, max as dMax, min as dMin } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp } from "lucide-react";

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
    const endCandidates: Date[] = [];
    for (const o of ops) {
      endCandidates.push(new Date(o.eta));
      if (o.planned_end_date) endCandidates.push(new Date(o.planned_end_date));
    }
    const start = dMin(starts);
    const end = dMax(endCandidates);
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
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Header with time scale */}
      <div className="flex border-b bg-muted/40 text-xs select-none">
        <div className="flex-shrink-0 px-4 py-3 font-black text-[10px] uppercase tracking-wider border-r border-border/80 bg-muted/30" style={{ width: labelWidth }}>
          ORDEM DE PRODUÇÃO
        </div>
        <div className="flex-1 relative h-12 overflow-hidden bg-white/50">
          {(() => {
            const days = [];
            const finalStep = totalDays < 20 ? 1 : (totalDays < 45 ? 2 : (totalDays < 90 ? 5 : 10));

            for (let i = 0; i < totalDays; i += finalStep) {
              const left = (i / totalDays) * 100;
              const date = addDays(rangeStart, i);
              const isWeekend = [0, 6].includes(date.getDay());
              
              days.push(
                <div
                  key={i}
                  className={`absolute top-0 bottom-0 border-l border-border/80 flex flex-col justify-center pl-2 transition-all ${
                    isWeekend ? "bg-muted/10" : ""
                  }`}
                  style={{ left: `${left}%`, width: `${(finalStep / totalDays) * 100}%` }}
                >
                  <span className="text-[11px] font-black text-foreground">{format(date, "dd/MM")}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-80">
                    {format(date, "EEE", { locale: ptBR }).replace(".", "")}
                  </span>
                </div>
              );
            }
            return days;
          })()}

          {/* Marcador "Hoje" no Header */}
          <div 
            className="absolute top-0 bottom-0 border-l-2 border-dashed border-black/80 z-50 pointer-events-none"
            style={{ left: `${todayOffsetPct}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {/* Vertical Grid Lines */}
        <div className="absolute inset-0 flex-1 ml-[240px] pointer-events-none overflow-hidden bg-white/20">
          {Array.from({ length: totalDays }).map((_, i) => {
            const left = (i / totalDays) * 100;
            const date = addDays(rangeStart, i);
            const isWeekend = [0, 6].includes(date.getDay());
            return (
              <div
                key={i}
                className={`absolute top-0 bottom-0 border-l border-border/40 ${isWeekend ? "bg-muted/10" : ""}`}
                style={{ left: `${left}%`, width: `${(1 / totalDays) * 100}%` }}
              />
            );
          })}
        </div>

        {/* "Hoje" guide line (Dia Vigente) - Preto */}
        <div
          className="absolute top-0 bottom-0 border-l-2 border-dashed border-black/80 z-50 pointer-events-none"
          style={{ left: `calc(${labelWidth}px + ${todayOffsetPct}% * (100% - ${labelWidth}px) / 100)` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -left-3 text-[8px] font-black bg-black text-white px-1.5 py-0.5 rounded shadow-sm z-50">
            HOJE
          </div>
        </div>



        {ops.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground bg-muted/5">
            Nenhuma OP no período. Ajuste os filtros ou crie novas ordens de produção.
          </div>
        )}

        {ops.map((op) => {
          const startSource = op.actual_start_date ?? op.planned_start_date ?? op.status_changed_at;
          const opStart = new Date(startSource);
          const opEta = new Date(op.eta);
          const due = op.planned_end_date ? new Date(op.planned_end_date) : null;
          
          // Ajuste para evitar que os marcadores HOJE/META fiquem "presos" no início/fim de forma confusa
          const today = new Date();

          const offsetPct = (differenceInCalendarDays(opStart, rangeStart) / totalDays) * 100;
          const widthPct = Math.max(
            1.5,
            (differenceInCalendarDays(opEta, opStart) / totalDays) * 100
          );

          // ETA status color
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

          const totalDur = op.segments.reduce((acc, s) => acc + (s.duration_days || 0), 0) || 1;
          const currentIdx = op.segments.findIndex((s) => s.slug === op.status);

          return (
            <div
              key={op.id}
              role="button"
              onClick={() => onSelect(op)}
              className={`flex border-b hover:bg-accent/40 group transition-all ${
                highlightId === op.id ? "bg-primary/5 ring-inset ring-1 ring-primary" : ""
              }`}
              style={{ height: rowHeight }}
            >
              <div
                className="flex-shrink-0 flex items-center gap-3 px-4 py-1 overflow-hidden border-r border-border/80 bg-muted/20"
                style={{ width: labelWidth }}
              >
                <span className="text-[10px] font-black text-foreground bg-white border border-border shadow-sm px-1.5 py-0.5 rounded">#{op.order_number}</span>
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{op.title}</span>
                  {op.is_late_planned && (
                    <span className="text-[9px] font-black text-destructive uppercase tracking-tighter">OP ATRASADA</span>
                  )}
                </div>
              </div>
              
              <div className="flex-1 relative py-2.5">
                {/* due-date marker - Azul */}
                {due && (
                  <div
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-600 z-10 group/due"
                    style={{ left: `${(differenceInCalendarDays(due, rangeStart) / totalDays) * 100}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -left-3 text-[8px] font-black bg-blue-600 text-white px-1 rounded-sm shadow-md z-20 flex items-center gap-1">
                      FIM
                      {(() => {
                        const daysLeft = differenceInCalendarDays(due, today);
                        if (daysLeft > 0) {
                          return <span className="text-[7px] opacity-80 border-l border-white/30 pl-1 ml-0.5">{daysLeft}d</span>;
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}
                
                {/* Onde deveríamos estar (Seta de Planejado - Meta) */}
                {(() => {
                  const totalPlannedDur = op.segments.reduce((acc, s) => acc + (s.duration_days || 0), 0) || 1;
                  const elapsedSinceStart = differenceInCalendarDays(today, opStart);
                  
                  // Só mostra a META se o projeto já começou e não passou muito do fim planejado
                  if (elapsedSinceStart >= 0) {
                    let accumulatedDur = 0;
                    let targetSlug = op.segments[0]?.slug;
                    for (const s of op.segments) {
                      accumulatedDur += s.duration_days || 0;
                      if (accumulatedDur >= elapsedSinceStart) {
                        targetSlug = s.slug;
                        break;
                      }
                      targetSlug = s.slug;
                    }
                    
                    let accumulatedWidth = 0;
                    const targetIdx = op.segments.findIndex(s => s.slug === targetSlug);
                    if (targetIdx !== -1) {
                      for (let i = 0; i < targetIdx; i++) {
                        accumulatedWidth += ((op.segments[i].duration_days || 0) / totalPlannedDur) * 100;
                      }
                      const prevAccumulated = accumulatedDur - (op.segments[targetIdx].duration_days || 0);
                      const ratioInTarget = (elapsedSinceStart - prevAccumulated) / (op.segments[targetIdx].duration_days || 1);
                      accumulatedWidth += ratioInTarget * ((op.segments[targetIdx].duration_days || 0) / totalPlannedDur) * 100;
                    }

                    // IDEAL: Se a meta está após a data de fim ou em um ponto irreal, não desenha ou ajusta para o fim.
                    const idealLeftPct = Math.min(100, Math.max(0, accumulatedWidth));
                    
                    return (
                      <div 
                        className="absolute top-0 -translate-y-1 z-30 pointer-events-none transition-all duration-300 flex flex-col items-center group-hover:scale-110"
                        style={{ 
                          left: `calc(${offsetPct}% + ${idealLeftPct}% * ${widthPct} / 100)`,
                        }}
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-600 border-2 border-white shadow-md" />
                        <span className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-sm mt-0.5">META</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Marcador de Onde Estamos (Seta de Status Atual) - Preto */}
                {currentIdx !== -1 && op.status !== 'concluido' && op.status !== 'entregue' && (
                  <div 
                    className="absolute bottom-0 translate-y-1 z-30 pointer-events-none transition-all duration-300 flex flex-col items-center group-hover:scale-110"
                    style={{ 
                      left: `calc(${offsetPct}% + ${(() => {
                        let acc = 0;
                        for (let i = 0; i < currentIdx; i++) acc += ((op.segments[i].duration_days || 0) / totalDur) * 100;
                        const ratio = Math.min(1, (op.days_in_current ?? 0) / (op.current_duration_days || 1));
                        acc += ratio * ((op.segments[currentIdx].duration_days || 0) / totalDur) * 100;
                        return Math.min(100, Math.max(0, acc));
                      })()}% * ${widthPct} / 100)`,
                    }}
                  >
                    <span className="text-[8px] font-black bg-black text-white px-1.5 py-0.5 rounded shadow-sm mb-0.5 uppercase">EXECUTADO</span>
                    <div className="w-2 h-2 rounded-full bg-black border-2 border-white shadow-md" />
                  </div>
                )}

                {/* Indicador de Status (Barra colorida) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 flex rounded overflow-hidden shadow-sm border border-black/5 ring-1 ring-black/5"
                  style={{
                    left: `${Math.max(0, offsetPct)}%`,
                    width: `${Math.max(1, widthPct)}%`,
                    height: rowHeight - 20,
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
                        className={`relative h-full ${cls} ${isPast ? "opacity-90" : isCurrent ? "ring-inset ring-1 ring-black/20" : "opacity-30"}`}
                        style={{ width: `${w}%` }}
                        title={`${s.label}: ${s.duration_days} dias`}
                      >
                        {isCurrent && op.current_duration_days ? (
                          <div
                            className="absolute inset-y-0 left-0 bg-white/30 animate-[pulse_2s_infinite]"
                            style={{
                              width: `${Math.min(100, ((op.days_in_current ?? 0) / (op.current_duration_days || 1)) * 100)}%`,
                            }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {/* ETA label */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 ${etaClass} rounded px-2 py-0.5 text-[9px] font-black whitespace-nowrap shadow-md z-20 flex items-center gap-1 border-2 border-white group-hover:scale-105 transition-transform`}
                  style={{
                    left: `${offsetPct + widthPct}%`,
                    marginLeft: '12px',
                  }}
                  title={etaStatusLabel}
                >
                  {format(opEta, "dd/MM")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend and Analysis Helper */}
      <div className="bg-muted/30 px-4 py-3 flex flex-wrap items-center gap-x-8 gap-y-3 text-[10px] font-medium border-t">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shadow-sm" />
            <span className="text-muted-foreground uppercase font-bold text-[9px]">Onde a OP DEVE estar (Meta)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-black border border-white shadow-sm" />
            <span className="text-muted-foreground uppercase font-bold text-[9px]">Onde a OP REALMENTE está (Executado)</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 border-l border-border/50 pl-6">
          <span className="text-muted-foreground italic font-semibold">Dica de avaliação:</span>
          <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
            <span className="font-bold text-[9px]">✓ NO PRAZO:</span>
            <span className="text-[9px]">EXECUTADO está à frente ou igual à META.</span>
          </div>
          <div className="flex items-center gap-1.5 text-destructive bg-destructive/5 px-2 py-0.5 rounded border border-destructive/10">
            <span className="font-bold text-[9px]">⚠ ATRASADO:</span>
            <span className="text-[9px]">EXECUTADO está atrás da META.</span>
          </div>
        </div>
        </div>
      </div>
    </Card>
  );
}
