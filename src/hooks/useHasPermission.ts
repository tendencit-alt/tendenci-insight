import { useCallback } from "react";
import { useRBACPermissions } from "@/hooks/useRBACPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermissionCatalog, getCatalogEntry } from "@/hooks/usePermissionCatalog";
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
 *  - audit() is a no-op (denial telemetry removed in C2 cleanup)
 */
export function useHasPermission(permissionKey: string): PermissionDecision & {
  audit: (context?: Record<string, unknown>) => void;
} {
  const { hasCritical, isLoading } = useRBACPermissions();
  const { isMaster } = usePermissions();
  const { data: catalog } = usePermissionCatalog();
  const sim = usePermissionSimulation();

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

  // No-op: denial telemetry was removed when /auditoria-permissoes was retired.
  const audit = useCallback((_context: Record<string, unknown> = {}) => {}, []);

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
