import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { useBestOffer, useRecordOfferEvent } from "@/hooks/useOfferOrchestration";

interface SmartOfferSlotProps {
  channel: "in_app_contextual" | "dashboard_widget" | "billing_panel" | "banner_modulo_bloqueado" | "control_tower_owner";
  variant?: "card" | "banner" | "inline";
  onAccept?: (offerCode: string) => void;
  className?: string;
}

/**
 * Componente universal que consulta o motor de orquestração e renderiza
 * a melhor oferta para o canal informado, com tracking automático.
 */
export function SmartOfferSlot({ channel, variant = "card", onAccept, className }: SmartOfferSlotProps) {
  const { data: offer, isLoading } = useBestOffer(channel);
  const record = useRecordOfferEvent();
  const shownRef = useRef<string | null>(null);

  useEffect(() => {
    if (offer && shownRef.current !== offer.offer_code) {
      shownRef.current = offer.offer_code;
      record.mutate({
        offer_code: offer.offer_code,
        channel,
        event_type: "shown",
        signal_id: offer.signal_id,
      });
    }
  }, [offer, channel]);

  if (isLoading || !offer) return null;

  const handleClick = () => {
    record.mutate({ offer_code: offer.offer_code, channel, event_type: "clicked", signal_id: offer.signal_id });
    onAccept?.(offer.offer_code);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    record.mutate({ offer_code: offer.offer_code, channel, event_type: "dismissed", signal_id: offer.signal_id });
    shownRef.current = `dismissed:${offer.offer_code}`;
  };

  if (variant === "banner") {
    return (
      <div className={`relative flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 ${className ?? ""}`}>
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <div className="text-sm">
            <span className="font-medium">{offer.name}</span>
            <span className="text-muted-foreground"> — {offer.message}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleClick}>{offer.cta_label}</Button>
          <Button variant="ghost" size="icon" onClick={handleDismiss}><X className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 text-sm ${className ?? ""}`}>
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-muted-foreground">{offer.message}</span>
        <Button variant="link" size="sm" className="h-auto p-0" onClick={handleClick}>
          {offer.cta_label} <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={`relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4 ${className ?? ""}`}>
      <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-7 w-7" onClick={handleDismiss}>
        <X className="h-3.5 w-3.5" />
      </Button>
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2"><Sparkles className="h-4 w-4 text-primary" /></div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{offer.name}</h4>
            <Badge variant="secondary" className="text-xs">{offer.offer_type.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{offer.message}</p>
          <Button size="sm" onClick={handleClick}>{offer.cta_label} <ArrowRight className="ml-1 h-3 w-3" /></Button>
        </div>
      </div>
    </Card>
  );
}
