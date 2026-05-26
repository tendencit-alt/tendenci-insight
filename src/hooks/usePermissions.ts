// Wrapping hook: combina o PermissionsContext real com o
// PermissionSimulationContext para que "Simular permissões" afete o app
// (menu, guards de rota e botões de ação).
//
// Regras:
// - is_owner sempre acessa tudo (sem simulação).
// - Quando simulação está ativa: bypass de owner é desligado, e hasModuleAccess
//   passa a consultar a matriz profile_type_permissions do papel simulado.
// - Sem simulação: comportamento idêntico ao do PermissionsContext.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  usePermissionsContext,
  type AppModule,
  type ModulePermission,
  type PermissionAction,
} from "@/contexts/PermissionsContext";
import { usePermissionSimulation } from "@/contexts/PermissionSimulationContext";

export type { AppModule, ModulePermission } from "@/contexts/PermissionsContext";
export type { UserPermissions } from "@/contexts/PermissionsContext";

const aliasMap: Record<string, string> = {
  dashboard: "dashboard_executivo",
  gestao_usuarios: "configuracoes",
  producao: "producao",
  estoque: "operacional",
  pedidos: "operacional",
  fornecedores: "operacional",
  cadastros_financeiros: "cadastros",
  clientes: "comercial",
  crm: "comercial",
  leads: "comercial",
  catalogo: "comercial",
};

const actionMap: Record<PermissionAction, string> = {
  view: "can_view",
  create: "can_create",
  edit: "can_edit",
  delete: "can_delete",
  approve: "can_approve",
  conciliate: "can_conciliate",
  export: "can_export",
  admin: "can_admin",
};

function normalize(module: string): string {
  const raw = module.toLowerCase().trim();
  return aliasMap[raw] ?? raw;
}

export function usePermissions() {
  const ctx = usePermissionsContext();
  const sim = usePermissionSimulation();

  const simActive = sim.state.active && !!sim.state.targetProfileTypeId;
  const [simMatrix, setSimMatrix] = useState<Record<string, ModulePermission> | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const lastSimId = useRef<string | null>(null);

  // Carrega a matriz do papel simulado (client-side, RLS já permite leitura)
  useEffect(() => {
    if (!simActive) {
      lastSimId.current = null;
      setSimMatrix(null);
      return;
    }
    const id = sim.state.targetProfileTypeId!;
    if (lastSimId.current === id && simMatrix) return;
    lastSimId.current = id;
    setSimLoading(true);
    supabase
      .from("profile_type_permissions")
      .select(
        "module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin"
      )
      .eq("profile_type_id", id)
      .then(({ data }) => {
        const m: Record<string, ModulePermission> = {};
        data?.forEach((row: any) => {
          m[row.module] = {
            module: row.module,
            can_view: !!row.can_view,
            can_create: !!row.can_create,
            can_edit: !!row.can_edit,
            can_delete: !!row.can_delete,
            ...{
              can_approve: !!row.can_approve,
              can_conciliate: !!row.can_conciliate,
              can_export: !!row.can_export,
              can_admin: !!row.can_admin,
            },
          } as ModulePermission;
        });
        setSimMatrix(m);
        setSimLoading(false);
      });
  }, [simActive, sim.state.targetProfileTypeId, simMatrix]);

  const hasModuleAccess = useCallback(
    (module: AppModule | string, action: PermissionAction = "view"): boolean => {
      // Durante simulação: ignora bypass de owner e usa matriz simulada
      if (simActive) {
        if (simLoading || !simMatrix) return false;
        const key = normalize(module);
        const perm = simMatrix[key];
        if (!perm) return false;
        return Boolean((perm as any)[actionMap[action]]);
      }
      return ctx.hasModuleAccess(module, action);
    },
    [simActive, simLoading, simMatrix, ctx]
  );

  return useMemo(
    () => ({
      ...ctx,
      // Durante simulação owner perde o bypass para refletir o papel alvo
      isMaster: simActive ? false : ctx.isMaster,
      isOwner: simActive ? false : ctx.isOwner,
      hasModuleAccess,
      loading: ctx.loading || (simActive && simLoading),
      isSimulating: simActive,
    }),
    [ctx, hasModuleAccess, simActive, simLoading]
  );
}
