// Helper único de permissão (alimentado pelo MESMO resolver da guarda de rota).
// Respeita is_owner e "Simular permissões" automaticamente via usePermissions.
//
// Uso:
//   const canCreate = useCan("comercial", "create");
//   <Button disabled={!canCreate}>Novo</Button>
//
//   <Can module="financeiro" action="create"><Button>Novo Lançamento</Button></Can>

import { usePermissions, type AppModule } from "@/hooks/usePermissions";
import type { PermissionAction } from "@/contexts/PermissionsContext";

export type CanAction = PermissionAction;

export function useCan(module: AppModule | string, action: CanAction = "view"): boolean {
  const { hasModuleAccess, loading } = usePermissions();
  if (loading) return false;
  return hasModuleAccess(module, action);
}
