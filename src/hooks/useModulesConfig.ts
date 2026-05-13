import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  "clientes": "/clientes",
  "catalogo-produtos": "/catalogo",
  "pedidos": "/pedidos",
  "estoque": "/estoque",
  "financeiro": "/financeiro",
  "dashboard": "/bi-dashboard",
  "configuracoes-usuarios": "/configuracoes/usuarios",
  "configuracoes-marca": "/configuracoes/catalogo",
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

export const CATEGORY_META: Record<string, { label: string; order: number }> = {
  comercial:     { label: "Comercial",     order: 10 },
  operacional:   { label: "Operação",      order: 20 },
  financeiro:    { label: "Financeiro",    order: 30 },
  relatorios:    { label: "Relatórios",    order: 40 },
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

/** Returns only modules with visible_in_menu=true, grouped by category (excluding 'master'). */
export function useVisibleModuleGroups() {
  const { data = [], isLoading } = useModulesConfig();
  const visible = data.filter((m) => m.visible_in_menu && m.category !== "master");

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
