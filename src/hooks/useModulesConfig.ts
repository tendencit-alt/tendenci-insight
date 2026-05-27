import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ModuleConfig {
  module_key: string;
  label: string;
  icon: string | null;
  category: string;
  visible_in_menu: boolean;
  visible_in_routes: boolean;
  sort_order: number;
}

/** Maps module_key from modules_config → real app route. Source of truth for menu links. */
export const MODULE_ROUTE_MAP: Record<string, string> = {
  // MVP
  "crm": "/crm",
  "clientes": "/clientes",
  "catalogo-produtos": "/catalogo",
  "pedidos": "/pedidos",
  "estoque": "/estoque",
  "financeiro": "/financeiro",
  "dashboard": "/bi-dashboard",
  "configuracoes-usuarios": "/configuracoes/usuarios",
  "configuracoes-marca": "/configuracoes/catalogo",
  "configuracoes-financeiro": "/configuracoes?tab=financeiro",
  // additional
  "leads": "/leads",
  "crm-comercial": "/crm-comercial",
  "prospeccao": "/prospeccao",
  "metas": "/planejamento",
  "customer-lifecycle": "/customer-lifecycle",
  "customer-success": "/customer-success",
  "orcamentos": "/propostas",
  "contratos": "/contratos",
  "comissoes": "/comissoes",
  "producao": "/producao",
  "producao-operacoes": "/producao-operacoes",
  "projetos": "/projetos",
  "tarefas": "/tarefas",
  "atividades": "/atividades",
  "fornecedores": "/fornecedores",
  "suprimentos": "/suprimentos",
  "cobranca": "/cobranca",
  "billing": "/billing",
  "cadastros-financeiros": "/cadastros-financeiros",
  "automacoes": "/automacoes",
  "automacoes-inteligentes": "/automacoes-inteligentes",
  "automation-center": "/automation-center",
  "ai-decision": "/ai-decision",
  "executive": "/executive",
  "control-tower": "/control-tower",
  "planning": "/planejamento",
  "data-flow": "/data-flow",
  "rh": "/rh",
  "education": "/educacao",
  "documentos": "/documentos",
  "aprovacoes": "/aprovacoes",
  "onboarding": "/onboarding",
  "smart-onboarding": "/smart-onboarding",
  "governanca": "/governanca",
  "auditoria": "/auditoria",
  "auditoria-permissoes": "/auditoria-permissoes",
  "benchmarking": "/benchmarking",
  "multi-company": "/empresas",
  "support-knowledge": "/support-knowledge",
  "bi-dashboard": "/bi-dashboard",
  "paineis": "/paineis",
  "relatorios": "/relatorios",
};

const COMMERCIAL_ORDER: Record<string, number> = {
  crm: 10,
  pedidos: 20,
  clientes: 30,
  "catalogo-produtos": 40,
  leads: 50,
  comissoes: 60,
};

function normalizeMenuModule(module: ModuleConfig): ModuleConfig {
  if (module.module_key === "dashboard") {
    return {
      ...module,
      label: "BI",
      category: "relatorios",
    };
  }

  if (module.module_key === "clientes") {
    return {
      ...module,
      label: "Clientes / Fornecedores",
      category: "comercial",
      sort_order: COMMERCIAL_ORDER.clientes,
    };
  }

  if (module.module_key === "relatorios") {
    return {
      ...module,
      label: "KPI's",
      category: "relatorios",
    };
  }

  if (module.module_key === "projetos" || module.module_key === "crm-comercial") {
    return {
      ...module,
      module_key: "crm",
      label: "CRM",
      category: "comercial",
      sort_order: COMMERCIAL_ORDER.crm,
    };
  }

  if (module.category === "comercial" && module.module_key in COMMERCIAL_ORDER) {
    return {
      ...module,
      sort_order: COMMERCIAL_ORDER[module.module_key],
    };
  }

  return module;
}

export const CATEGORY_META: Record<string, { label: string; order: number }> = {
  comercial:     { label: "Comercial",     order: 10 },
  operacional:   { label: "Operação",      order: 20 },
  financeiro:    { label: "Financeiro",    order: 30 },
  relatorios:    { label: "KPI's",    order: 40 },
  configuracoes: { label: "Configurações", order: 50 },
  futuro:        { label: "Em breve",      order: 90 },
  master:        { label: "Master",        order: 99 },
};

export function useModulesConfig() {
  return useQuery({
    queryKey: ["modules_config"],
    queryFn: async (): Promise<ModuleConfig[]> => {
      const { data, error } = await (supabase as any)
        .from("modules_config")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as ModuleConfig[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Returns the set of module_keys allowed by the active tenant's plan.
 * SAFE FALLBACK: if no tenant, no plan, or plan has no plan_modules rows,
 * returns null → caller must treat as "allow everything visible".
 */
export function useTenantPlanModules() {
  const { profile } = useAuth() as any;
  const tenantId = profile?.current_tenant_id ?? profile?.tenant_id ?? null;

  return useQuery({
    queryKey: ["tenant-plan-modules", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Set<string> | null> => {
      const { data: tenant, error: tErr } = await (supabase as any)
        .from("tenants").select("plan_id").eq("id", tenantId).maybeSingle();
      if (tErr || !tenant?.plan_id) return null; // fallback
      const { data: rows, error: pErr } = await (supabase as any)
        .from("plan_modules").select("module_key").eq("plan_id", tenant.plan_id);
      if (pErr) return null; // fallback
      if (!rows || rows.length === 0) return null; // fallback
      return new Set(rows.map((r: any) => r.module_key));
    },
  });
}

/** Returns only modules with visible_in_menu=true, gated by tenant plan (with safe fallback). */
export function useVisibleModuleGroups() {
  const { data = [], isLoading } = useModulesConfig();
  const { data: planModules } = useTenantPlanModules();

  const normalized = data
    .filter((m) => m.visible_in_menu && m.category !== "master")
    // Plan gating uses ORIGINAL module_key (matches plan_modules rows).
    // Safe fallback: if planModules is null/undefined → no gating.
    .filter((m) => !planModules || planModules.has(m.module_key))
    .map(normalizeMenuModule);

  const visible = Array.from(
    normalized.reduce((acc, module) => {
      const key = `${module.category}:${module.module_key}`;
      const current = acc.get(key);

      if (!current || module.sort_order < current.sort_order) {
        acc.set(key, module);
      }

      return acc;
    }, new Map<string, ModuleConfig>()).values()
  );

  const groupsMap = new Map<string, ModuleConfig[]>();
  for (const m of visible) {
    if (!groupsMap.has(m.category)) groupsMap.set(m.category, []);
    groupsMap.get(m.category)!.push(m);
  }

  const groups = Array.from(groupsMap.entries())
    .map(([category, items]) => ({
      category,
      label: CATEGORY_META[category]?.label ?? category,
      order: CATEGORY_META[category]?.order ?? 999,
      items: items.sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.order - b.order);

  return { groups, isLoading };
}

/** Hook helper: checks if a given module_key is visible_in_menu. */
export function useIsModuleVisible(module_key: string) {
  const { data = [], isLoading } = useModulesConfig();
  const m = data.find((x) => x.module_key === module_key);
  return { visible: !!m?.visible_in_menu, isLoading };
}

export function useToggleModuleVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ module_key, visible_in_menu }: { module_key: string; visible_in_menu: boolean }) => {
      const { error } = await (supabase as any)
        .from("modules_config")
        .update({ visible_in_menu })
        .eq("module_key", module_key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modules_config"] });
    },
  });
}
