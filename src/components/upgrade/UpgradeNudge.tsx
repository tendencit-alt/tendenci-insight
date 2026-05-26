import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, ArrowUpRight, AlertTriangle } from "lucide-react";
import { useUpgradeSignals, useTrackUpgradeEvent, renderSignalMessage, type UpgradeSignal } from "@/hooks/useUpgradeSignals";
import { cn } from "@/lib/utils";

interface Props {
  /** Filtra para um entitlement específico (ex: usado dentro de feature bloqueada) */
  entitlementCode?: string;
  /** Filtra por tipo de signal */
  signalType?: string;
  /** Onde está sendo exibido (analytics) */
  surface?: string;
  /** Aceita override visual */
  className?: string;
  /** Variante */
  variant?: "card" | "banner" | "inline";
}

/**
 * Nudge contextual que respeita throttle (should_show calculado no banco).
 * Loga 'shown' uma vez por sessão e 'clicked'/'dismissed' nas interações.
 */
export function UpgradeNudge({ entitlementCode, signalType, surface = "unknown", className, variant = "card" }: Props) {
  const { data } = useUpgradeSignals();
  const track = useTrackUpgradeEvent();
  const [dismissed, setDismissed] = useState(false);

  const signal = data?.find((s) => {
    if (!s.should_show) return false;
    if (entitlementCode && s.recommended_entitlement_code !== entitlementCode) return false;
    if (signalType && s.signal_type !== signalType) return false;
    return true;
  });

  useEffect(() => {
    if (signal && !dismissed) {
      track.mutate({ signal_id: signal.id, signal_type: signal.signal_type, event_type: "shown", surface });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal?.id]);

  if (!signal || dismissed) return null;

  const message = renderSignalMessage(signal);
  const isCritical = signal.severity === "critical";

  const handleClick = () => {
    track.mutate({ signal_id: signal.id, signal_type: signal.signal_type, event_type: "clicked", surface });
    // TODO: rota /billing/upgrade ou abrir modal — placeholder
  };
  const handleDismiss = () => {
    track.mutate({ signal_id: signal.id, signal_type: signal.signal_type, event_type: "dismissed", surface });
    setDismissed(true);
  };

  if (variant === "inline") {
    return (
      <div className={cn("inline-flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Sparkles className="h-3 w-3 text-primary" />
        <span>{message}</span>
        <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={handleClick}>Ver upgrade</Button>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className={cn("flex items-center gap-3 px-4 py-3 rounded-lg border bg-primary/5 border-primary/20", className)}>
        {isCritical ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> : <Sparkles className="h-4 w-4 text-primary shrink-0" />}
        <p className="text-sm flex-1">{message}</p>
        {signal.recommended_plan_name && <Badge variant="outline" className="text-[10px]">{signal.recommended_plan_name}</Badge>}
        <Button size="sm" onClick={handleClick}>Fazer upgrade<ArrowUpRight className="h-3 w-3 ml-1"/></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleDismiss}><X className="h-3.5 w-3.5"/></Button>
      </div>
    );
  }

  return (
    <Card className={cn("relative p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5", className)}>
      <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={handleDismiss}>
        <X className="h-3.5 w-3.5" />
      </Button>
      <div className="flex items-start gap-3 pr-6">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", isCritical ? "bg-destructive/10" : "bg-primary/10")}>
          {isCritical ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Sparkles className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isCritical ? "Limite atingido" : "Oportunidade"}
            </span>
            {signal.recommended_plan_name && <Badge variant="outline" className="text-[10px]">Plano {signal.recommended_plan_name}</Badge>}
          </div>
          <p className="text-sm">{message}</p>
          <Button size="sm" onClick={handleClick} className="gap-1">
            {isCritical ? "Regularizar agora" : "Ver upgrade"}<ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
