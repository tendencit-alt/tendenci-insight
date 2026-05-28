import { Building2, Check, ChevronDown, Crown, Loader2, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveTenant } from "@/hooks/useActiveTenant";

export function TenantSwitcher() {
  const {
    memberships,
    activeTenantId,
    currentTenantId,
    loading,
    switching,
    switchTenant,
    exitToOwnerMode,
    isOwner,
    isImpersonating,
  } = useActiveTenant();

  const active = memberships.find((m) => m.tenant_id === activeTenantId);
  const activeName = isOwner && !currentTenantId
    ? "Modo Owner"
    : active?.name ?? "Empresa";

  if (loading && memberships.length === 0) return null;

  // Non-owner with single tenant: static label.
  if (!isOwner && memberships.length <= 1) {
    return (
      <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground px-2">
        <Building2 className="h-3.5 w-3.5" />
        <span className="max-w-[140px] truncate">{activeName}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isImpersonating ? "default" : "outline"}
          size="sm"
          disabled={switching}
          className="h-8 gap-1.5 text-xs"
          title="Trocar empresa"
        >
          {switching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isOwner && !currentTenantId ? (
            <Crown className="h-3.5 w-3.5" />
          ) : (
            <Building2 className="h-3.5 w-3.5" />
          )}
          <span className="max-w-[160px] truncate hidden lg:inline">{activeName}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-card border border-border">
        <DropdownMenuLabel className="text-[11px] uppercase text-muted-foreground tracking-wide">
          Empresa ativa
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isOwner && (
          <>
            <DropdownMenuItem
              disabled={switching || !currentTenantId}
              onClick={() => currentTenantId && exitToOwnerMode()}
              className="flex items-start gap-2 py-2 cursor-pointer"
            >
              <Crown className="h-4 w-4 mt-0.5 text-amber-500" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Modo Owner</div>
                <div className="text-[10px] text-muted-foreground">
                  Templates · visão consolidada
                </div>
              </div>
              {!currentTenantId && <Check className="h-4 w-4 text-primary mt-0.5" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wide">
              Entrar em um tenant
            </DropdownMenuLabel>
          </>
        )}

        <div className="max-h-72 overflow-y-auto">
          {memberships.map((m) => {
            const isActive = isOwner ? m.tenant_id === currentTenantId : m.is_active;
            return (
              <DropdownMenuItem
                key={m.tenant_id}
                disabled={switching || isActive}
                onClick={() => !isActive && switchTenant(m.tenant_id)}
                className="flex items-start gap-2 py-2 cursor-pointer"
              >
                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {m.role}
                    {m.is_home ? " · principal" : ""}
                    {isOwner && !m.is_home ? " · impersonar" : ""}
                  </div>
                </div>
                {isActive && <Check className="h-4 w-4 text-primary mt-0.5" />}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/empresas" className="text-xs text-muted-foreground">
            Gerenciar empresas →
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
