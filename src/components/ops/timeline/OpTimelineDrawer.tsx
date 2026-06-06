import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, ExternalLink, Clock } from "lucide-react";
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TimelineOp } from "@/hooks/useProductionTimeline";

interface Props {
  op: TimelineOp | null;
  onClose: () => void;
  onOpenInKanban: (opId: string) => void;
}

function hhmm(hours: number) {
  if (!isFinite(hours) || hours < 0) return "—";
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function OpTimelineDrawer({ op, onClose, onOpenInKanban }: Props) {
  if (!op) return null;
  const phaseLabelMap = new Map(op.segments.map((segment) => [segment.slug, segment.label]));
  const displayHistory = op.history.filter((entry) => entry.direction !== "deadline");
  const phaseHistory = displayHistory.length > 0
    ? displayHistory
    : [{ phase: op.status, entered_at: op.status_changed_at, exited_at: null, duration_hours: Math.max(0, (op.days_in_current ?? 0) * 24) }];
  const currentSeg = op.segments.find((s) => s.slug === op.status);
  const nextSeg = currentSeg
    ? op.segments.find((s) => s.sort_order > currentSeg.sort_order)
    : op.segments[0];
  const completedSegs = currentSeg
    ? op.segments.filter((s) => s.sort_order < currentSeg.sort_order)
    : [];
  const pctCurrent =
    currentSeg && op.days_in_current != null && currentSeg.duration_days > 0
      ? Math.min(100, Math.round((op.days_in_current / currentSeg.duration_days) * 100))
      : 0;

  const eta = new Date(op.eta);
  const due = op.planned_end_date ? new Date(op.planned_end_date) : null;
  const desvioMs = due ? eta.getTime() - due.getTime() : 0;
  const desvioLabel = due
    ? desvioMs > 0
      ? `${formatDistanceStrict(eta, due, { locale: ptBR })} de atraso projetado`
      : `${formatDistanceStrict(eta, due, { locale: ptBR })} de folga`
    : "Sem prazo definido";

  let etaBadge: { variant: "default" | "secondary" | "destructive"; label: string } = {
    variant: "default",
    label: "No prazo",
  };
  if (due && desvioMs > 0) etaBadge = { variant: "destructive", label: "Atrasada projetada" };
  else if (due && desvioMs > -2 * 86400000) etaBadge = { variant: "secondary", label: "Alerta de prazo" };

  return (
    <Sheet open={!!op} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>OP #{op.order_number}</span>
            <Badge variant="outline" className="text-[10px] h-4">{op.priority}</Badge>
            <Badge variant={etaBadge.variant} className="text-[10px] h-4">{etaBadge.label}</Badge>
          </div>
          <SheetTitle className="text-base">{op.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 text-sm">
          <section className="rounded-lg border p-3 space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Fase atual</div>
            <div className="font-medium">{op.current_phase_label ?? op.status}</div>
            <div className="text-xs text-muted-foreground">
              {op.days_in_current != null ? `${hhmm(op.days_in_current * 24)} nesta fase` : ""}
              {currentSeg ? ` · prazo planejado ${currentSeg.duration_days}d` : ""}
            </div>
            <div className="mt-2 h-1.5 rounded bg-muted overflow-hidden">
              <div
                className={`h-full ${pctCurrent >= 100 ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${Math.min(100, pctCurrent)}%` }}
              />
            </div>
            <div className="text-[11px] text-muted-foreground">{pctCurrent}% consumido</div>
          </section>

          {nextSeg && (
            <section className="rounded-lg border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Próxima fase</div>
              <div className="flex items-center gap-2 mt-1">
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{nextSeg.label}</span>
                <span className="text-xs text-muted-foreground">· {nextSeg.duration_days}d planejados</span>
              </div>
            </section>
          )}

          <section className="rounded-lg border p-3 space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Previsão de término</div>
            <div className="font-medium">{format(eta, "dd/MM/yyyy")}</div>
            <div className="text-xs text-muted-foreground">
              Prazo original: {due ? format(due, "dd/MM/yyyy") : "—"}
            </div>
            <div className="text-xs">{desvioLabel}</div>
          </section>

          <section className="space-y-1.5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Histórico de fases</div>
            {phaseHistory.map((h, idx) => (
                <div key={`${h.phase}-${h.entered_at}-${idx}`} className="flex items-center justify-between text-xs">
                  <span>{phaseLabelMap.get(h.phase) ?? h.phase}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {hhmm(h.duration_hours)}{!h.exited_at ? " · atual" : ""}
                  </span>
                </div>
              ))}
          </section>

          <Separator />

          <Button className="w-full gap-2" onClick={() => onOpenInKanban(op.id)}>
            <ExternalLink className="h-4 w-4" /> Abrir no Kanban
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
