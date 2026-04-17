import { type ReactNode, useEffect } from "react";
import { useEntitlement } from "@/hooks/useEntitlements";
import { useRecordPremiumAttempt } from "@/hooks/useUpgradeSignals";
import { UpgradeNudge } from "@/components/upgrade/UpgradeNudge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Sparkles, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  code: string;
  children: ReactNode;
  fallback?: "hide" | "message" | "inline" | "nudge" | ReactNode;
  className?: string;
  onUpgradeClick?: () => void;
}

/**
 * Bloqueia acesso comercial (entitlement do plano) — distinto do RBAC.
 * Quando bloqueado, registra tentativa de feature premium e exibe upgrade UI.
 */
export function EntitlementGate({ code, children, fallback = "message", className, onUpgradeClick }: Props) {
  const ent = useEntitlement(code);
  const recordAttempt = useRecordPremiumAttempt();
  const { user, profile } = useAuth() as any;

  useEffect(() => {
    if (!ent.isLoading && !ent.allowed && user) {
      // log analytics + signal de premium attempt
      (supabase as any).from("entitlement_access_log").insert({
        tenant_id: profile?.tenant_id ?? null,
        user_id: user.id,
        entitlement_code: code,
        allowed: false,
        reason: ent.source,
      });
      if (ent.isPremium) recordAttempt.mutate(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ent.isLoading, ent.allowed, code]);


  if (ent.isLoading) return null;
  if (ent.allowed) return <>{children}</>;

  if (fallback === "hide") return null;
  if (fallback === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Lock className="h-3 w-3" />
        Recurso indisponível no plano atual
      </span>
    );
  }
  if (fallback === "nudge") {
    return <UpgradeNudge entitlementCode={code} surface="entitlement_gate" className={className} />;
  }
  if (fallback !== "message") return <>{fallback}</>;

  const isBilling = ent.source === "billing_blocked";

  return (
    <Card className={cn("p-6 border-dashed bg-muted/30", className)}>
      <div className="flex flex-col items-center text-center gap-3 max-w-md mx-auto">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          {isBilling ? <Clock className="h-6 w-6 text-destructive" /> : <Sparkles className="h-6 w-6 text-primary" />}
        </div>
        <div>
          <h3 className="font-semibold text-base">
            {isBilling ? "Acesso suspenso" : `${ent.name} não está disponível no plano atual`}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isBilling
              ? "Sua assinatura está com pendências. Regularize o pagamento para liberar este recurso."
              : "Solicite um upgrade do plano ou uma liberação temporária ao administrador da empresa."}
          </p>
        </div>
        {ent.isPremium && <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> Recurso Premium</Badge>}
        <Button size="sm" onClick={onUpgradeClick}>
          {isBilling ? "Regularizar pagamento" : "Solicitar upgrade"}
        </Button>
      </div>
    </Card>
  );
}
