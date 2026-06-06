import { useProductionTimeline } from "@/hooks/useProductionTimeline";
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";

interface Props {
  opId: string;
}

const COLOR_MAP: Record<string, string> = {
  slate: "bg-slate-400", gray: "bg-gray-400", blue: "bg-blue-500",
  green: "bg-green-500", emerald: "bg-emerald-500", amber: "bg-amber-500",
  red: "bg-red-500", orange: "bg-orange-500", violet: "bg-violet-500",
  indigo: "bg-indigo-500", purple: "bg-purple-500", pink: "bg-pink-500",
  cyan: "bg-cyan-500", teal: "bg-teal-500", yellow: "bg-yellow-500",
  rose: "bg-rose-500", sky: "bg-sky-500",
};
function segColor(t?: string | null) {
  if (!t) return "bg-muted-foreground/40";
  if (t.startsWith("bg-")) return t;
  return COLOR_MAP[t] ?? "bg-muted-foreground/40";
}

export function OpTimelineMini({ opId }: Props) {
  const { data, isLoading } = useProductionTimeline();
  const op = data?.ops.find((o) => o.id === opId);

  if (isLoading) return <div className="text-xs text-muted-foreground">Carregando cronograma…</div>;
  if (!op) return <div className="text-xs text-muted-foreground">Cronograma indisponível para esta OP.</div>;

  const currentIdx = op.segments.findIndex((s) => s.slug === op.status);
  const displayHistory = op.history.filter((entry) => entry.direction !== "deadline");
  const eta = new Date(op.eta);
  const due = op.planned_end_date ? new Date(op.planned_end_date) : null;
  const desvio = due
    ? eta.getTime() - due.getTime() > 0
      ? `${formatDistanceStrict(eta, due, { locale: ptBR })} de atraso projetado`
      : `${formatDistanceStrict(eta, due, { locale: ptBR })} de folga`
    : "Sem prazo definido";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Fase atual</div>
          <div className="font-medium">{op.current_phase_label ?? op.status}</div>
          <div className="text-xs text-muted-foreground">
            {op.days_in_current != null
              ? `${Math.floor(op.days_in_current)}d ${Math.floor((op.days_in_current - Math.floor(op.days_in_current)) * 24)}h nesta fase`
              : "—"}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Previsão de término</div>
          <div className="font-medium">{format(eta, "dd/MM/yyyy")}</div>
          <div className="text-xs text-muted-foreground">{desvio}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Fases</div>
        <div className="space-y-1">
          {op.segments.map((s, idx) => {
            const isPast = currentIdx >= 0 && idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const Icon = isPast ? CheckCircle2 : isCurrent ? PlayCircle : Circle;
            const histItem = displayHistory.find((h) => h.phase === s.slug && h.exited_at);
            return (
              <div key={s.slug} className="flex items-center gap-2 text-sm">
                <Icon className={`h-4 w-4 ${isPast ? "text-emerald-500" : isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`h-2 w-2 rounded-full ${segColor(s.color)}`} />
                <span className={`flex-1 ${isCurrent ? "font-medium" : ""}`}>{s.label}</span>
                <span className="text-xs text-muted-foreground">
                  {isPast && histItem
                    ? `${Math.round((histItem.duration_hours / 24) * 10) / 10}d real`
                    : `${s.duration_days}d planejado`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
