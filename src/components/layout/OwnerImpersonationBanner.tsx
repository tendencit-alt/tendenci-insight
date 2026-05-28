import { AlertTriangle, Crown, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveTenant } from "@/hooks/useActiveTenant";

/**
 * Persistent banner shown to Owners while they are "acting as" another tenant.
 * One click returns them to Owner mode (templates + consolidated view).
 */
export function OwnerImpersonationBanner() {
  const { isImpersonating, activeTenantName, exitToOwnerMode, switching } = useActiveTenant();

  if (!isImpersonating) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500/95 text-amber-950 border-b border-amber-700 shadow-md">
      <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <Crown className="h-4 w-4 shrink-0" />
          <span className="truncate">
            <strong>Modo Owner:</strong> você está vendo e agindo como{" "}
            <strong className="font-bold">{activeTenantName ?? "tenant"}</strong>. Toda ação é registrada em auditoria.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={switching}
          onClick={() => exitToOwnerMode()}
          className="bg-white/90 hover:bg-white text-amber-950 border-amber-700 h-7 gap-1.5"
        >
          {switching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
          Voltar ao modo Owner
        </Button>
      </div>
    </div>
  );
}
