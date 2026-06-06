import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useProductionPhaseHistory, formatElapsed } from "@/hooks/useProductionPhaseMove";
import { useProductionStatusColumns } from "@/hooks/useProductionStatusColumns";
import { ArrowDown, ArrowUp, CalendarClock, History, Play } from "lucide-react";
import { useMemo } from "react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opId: string | null;
  orderNumber?: number | string;
}

function parseDeadlineReason(reason: string | null): { previous?: string; next?: string; text?: string } | null {
  if (!reason) return null;
  try {
    const obj = JSON.parse(reason);
    if (obj && typeof obj === "object") {
      return {
        previous: obj.previous_due_date ?? undefined,
        next: obj.new_due_date ?? undefined,
        text: obj.reason ?? undefined,
      };
    }
  } catch {
    return { text: reason };
  }
  return { text: reason };
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
}

export function PhaseHistoryDialog({ open, onOpenChange, opId, orderNumber }: Props) {
  const { data: rows = [], isLoading } = useProductionPhaseHistory(opId);
  const { data: cols = [] } = useProductionStatusColumns();
  const labelOf = useMemo(() => {
    const m: Record<string, string> = {};
    cols.forEach((c) => { m[c.slug] = c.label; });
    return m;
  }, [cols]);
  const displayRows = useMemo(() => rows.filter((row) => row.direction !== "deadline"), [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de fases {orderNumber ? `· OP #${orderNumber}` : ""}
          </DialogTitle>
          <DialogDescription>
            Linha do tempo permanente com cada entrada/saída de fase e reprogramações de prazo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && displayRows.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem histórico registrado.</p>
          )}
          {displayRows.map((r) => {
            const isDeadline = r.direction === "deadline";
            const Icon = isDeadline
              ? CalendarClock
              : r.direction === "regress"
              ? ArrowDown
              : r.direction === "initial"
              ? Play
              : ArrowUp;
            const tone = isDeadline
              ? "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300"
              : r.direction === "regress"
              ? "bg-destructive/10 text-destructive border-destructive/30"
              : r.direction === "initial"
              ? "bg-blue-500/10 text-blue-700 border-blue-500/30"
              : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
            const label = isDeadline
              ? "Reprogramação"
              : r.direction === "regress"
              ? "Retrocesso"
              : r.direction === "initial"
              ? "Inicial"
              : "Avanço";
            const deadlineInfo = isDeadline ? parseDeadlineReason(r.reason) : null;
            const duration = isDeadline
              ? null
              : r.exited_at
              ? formatElapsed(new Date(Date.now() - (new Date(r.exited_at).getTime() - new Date(r.entered_at).getTime())).toISOString())
              : `${formatElapsed(r.entered_at)} (em curso)`;
            return (
              <div key={r.id} className="border rounded-md p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs gap-1 ${tone}`}>
                      <Icon className="h-3 w-3" />
                      {label}
                    </Badge>
                    <span className="font-medium text-sm">
                      {isDeadline
                        ? `Prazo: ${fmtDate(deadlineInfo?.previous)} → ${fmtDate(deadlineInfo?.next)}`
                        : (labelOf[r.phase] ?? r.phase)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.entered_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                {duration && (
                  <div className="text-xs text-muted-foreground">Duração: {duration}</div>
                )}
                {isDeadline
                  ? deadlineInfo?.text && (
                      <div className="text-xs italic bg-muted/40 rounded p-2">
                        Justificativa: "{deadlineInfo.text}"
                      </div>
                    )
                  : r.reason && (
                      <div className="text-xs italic bg-muted/40 rounded p-2">
                        "{r.reason}"
                      </div>
                    )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
