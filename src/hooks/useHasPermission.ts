import { useCallback } from "react";
import { useRBACPermissions } from "@/hooks/useRBACPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermissionCatalog, getCatalogEntry } from "@/hooks/usePermissionCatalog";
import { useDenialLogger } from "@/hooks/useDenialLogger";
import { usePermissionSimulation } from "@/contexts/PermissionSimulationContext";

export interface PermissionDecision {
  allowed: boolean;
  reason?: string;
  label?: string;
  module?: string;
  isCritical?: boolean;
  isSimulating?: boolean;
}

/**
 * Unified hook that resolves "can I do X?" with:
 *  - real RBAC critical permissions
 *  - active Permission Simulation (Owner mode)
 *  - human-readable reason for blocked access
 *  - automatic analytics logging when denied (call .audit())
 */
export function useHasPermission(permissionKey: string): PermissionDecision & {
  audit: (context?: Record<string, unknown>) => void;
} {
  const { hasCritical, isLoading } = useRBACPermissions();
  const { isMaster } = usePermissions();
  const { data: catalog } = usePermissionCatalog();
  const sim = usePermissionSimulation();
  const logDenial = useDenialLogger();

  const entry = getCatalogEntry(catalog, permissionKey);

  let allowed: boolean;
  if (sim.state.active && sim.effectivePermissions) {
    allowed = !!sim.effectivePermissions[permissionKey];
  } else if (isLoading) {
    allowed = false;
  } else {
    allowed = isMaster || hasCritical(permissionKey);
  }

  const reason = !allowed
    ? entry?.default_blocked_message ??
      "Você não possui permissão para executar esta ação. Solicite acesso ao administrador da empresa."
    : undefined;

  const audit = useCallback(
    (context: Record<string, unknown> = {}) => {
      if (allowed) return;
      logDenial(permissionKey, entry?.module, context);
    },
    [allowed, logDenial, permissionKey, entry?.module]
  );

  return {
    allowed,
    reason,
    label: entry?.label,
    module: entry?.module,
    isCritical: entry?.is_critical,
    isSimulating: sim.state.active,
    audit,
  };
}
