import { useNavigate } from "react-router-dom";
import { useNotificationIntelligence } from "@/hooks/useNotificationIntelligence";
import { Card } from "@/components/ui/card";
import { Sun, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DailyDigest({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { dailySummary, criticalCount, notifications } = useNotificationIntelligence();

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const topActionable = notifications.filter((n) => !n.is_read && n.actionable).slice(0, 5);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sun className="h-4 w-4 text-warning" />
        <div>
          <h3 className="text-sm font-semibold">Resumo do dia</h3>
          <p className="text-[11px] text-muted-foreground capitalize">{today}</p>
        </div>
      </div>

      {/* Summary metrics grid */}
      {dailySummary && (
        <div className="grid grid-cols-2 gap-2">
          <DigestMetric
            label="Contas vencidas"
            value={dailySummary.contasVencidas}
            critical={dailySummary.contasVencidas > 0}
            onClick={() => navigate("/contas-pagar")}
          />
          <DigestMetric
            label="Pedidos"
            value={dailySummary.pedidosAguardando}
            onClick={() => navigate("/pedidos")}
          />
          <DigestMetric
            label="OPs atrasadas"
            value={dailySummary.ordensAtrasadas}
            critical={dailySummary.ordensAtrasadas > 0}
            onClick={() => navigate("/producao")}
          />
        </div>
      )}

      {/* Critical highlight */}
      {criticalCount > 0 && (
        <Card className="p-3 border-destructive/40 bg-destructive/5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs font-semibold text-destructive">
              {criticalCount} {criticalCount === 1 ? "alerta crítico" : "alertas críticos"} requer atenção
            </span>
          </div>
        </Card>
      )}

      {/* Top actionable */}
      {topActionable.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5 px-1">
            Ações sugeridas
          </h4>
          <div className="space-y-1">
            {topActionable.map((n) => (
              <button
                key={n.id}
                onClick={() => n.link_path && navigate(n.link_path)}
                className="w-full flex items-center gap-2 p-2 rounded text-left hover:bg-muted/50 transition-colors border border-border"
              >
                <TrendingUp className="h-3 w-3 text-primary shrink-0" />
                <span className="text-xs flex-1 truncate">{n.title}</span>
                <span className="text-[10px] text-primary font-medium">{n.actionLabel}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DigestMetric({
  label,
  value,
  critical,
  onClick,
}: {
  label: string;
  value: number;
  critical?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left p-2.5 rounded-lg border transition-colors hover:bg-muted/50",
        critical && value > 0 && "border-destructive/40 bg-destructive/5"
      )}
    >
      <div className={cn("text-xl font-bold", critical && value > 0 && "text-destructive")}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </button>
  );
}
