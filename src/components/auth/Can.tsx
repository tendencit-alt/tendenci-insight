// Wrapper de UI para gating de ações sensíveis.
//
// Modos:
//  - hide   (padrão): se sem permissão, não renderiza nada.
//  - disable: se sem permissão, clona o filho com `disabled` + tooltip "Sem permissão".
//
// IMPORTANTE: NÃO use Can em botões de visualização, busca, filtros ou EXPORTAR
// (auditoria pode exportar). Use somente em ações de escrita / aprovação / conciliação.

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { useCan, type CanAction } from "@/hooks/useCan";
import type { AppModule } from "@/hooks/usePermissions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CanProps {
  module: AppModule | string;
  action?: CanAction;
  mode?: "hide" | "disable";
  fallback?: ReactNode;
  children: ReactNode;
  tooltip?: string;
}

export function Can({
  module,
  action = "view",
  mode = "hide",
  fallback = null,
  children,
  tooltip = "Sem permissão para esta ação",
}: CanProps) {
  const allowed = useCan(module, action);
  if (allowed) return <>{children}</>;
  if (mode === "hide") return <>{fallback}</>;

  // disable mode: clona o primeiro filho válido com disabled e envolve em tooltip
  const child = Children.only(children);
  if (!isValidElement(child)) return <>{fallback}</>;
  const disabled = cloneElement(child as ReactElement<any>, {
    disabled: true,
    "aria-disabled": true,
    onClick: (e: any) => e.preventDefault(),
  });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{disabled}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
