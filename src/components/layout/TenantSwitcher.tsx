import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";
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
  const { memberships, activeTenantId, loading, switching, switchTenant } = useActiveTenant();

  const active = memberships.find((m) => m.tenant_id === activeTenantId);
  const activeName = active?.name ?? "Empresa";

  if (loading && memberships.length === 0) return null;
  // If user only belongs to one tenant, show a non-interactive label
  if (memberships.length <= 1) {
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
          variant="outline"
          size="sm"
          disabled={switching}
          className="h-8 gap-1.5 text-xs"
          title="Trocar empresa"
        >
          {switching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
          <span className="max-w-[140px] truncate hidden lg:inline">{activeName}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-card border border-border">
        <DropdownMenuLabel className="text-[11px] uppercase text-muted-foreground tracking-wide">
          Empresa ativa
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.tenant_id}
            disabled={switching || m.is_active}
            onClick={() => !m.is_active && switchTenant(m.tenant_id)}
            className="flex items-start gap-2 py-2 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{m.name}</div>
              <div className="text-[10px] text-muted-foreground capitalize">
                {m.role}{m.is_home ? " · principal" : ""}
              </div>
            </div>
            {m.is_active && <Check className="h-4 w-4 text-primary mt-0.5" />}
          </DropdownMenuItem>
        ))}
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
