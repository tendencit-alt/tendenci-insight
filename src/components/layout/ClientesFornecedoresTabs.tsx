import { NavLink, useLocation } from "react-router-dom";
import { Users, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Seletor de abas compartilhado entre /clientes e /fornecedores.
 * Apresenta os dois cadastros como um hub unificado, sem alterar
 * as tabelas no banco nem os componentes internos de cada página.
 */
export function ClientesFornecedoresTabs() {
  const { pathname } = useLocation();

  const tabs = [
    { to: "/clientes", label: "Clientes", icon: Users },
    { to: "/fornecedores", label: "Fornecedores", icon: Truck },
  ];

  return (
    <div className="mb-4 flex items-center gap-1 border-b border-border">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.to);
        const Icon = t.icon;
        return (
          <NavLink
            key={t.to}
            to={t.to}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </NavLink>
        );
      })}
    </div>
  );
}
