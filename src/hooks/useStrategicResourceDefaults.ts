import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";

const PARENT_CODE = "2.2";
const TABLE_NAME = "fin_strategic_resource_account_configs";

type ResourceType = "rt" | "vendedor" | "orcamentista" | "projetista" | "montador" | "producao";

// Mapping from position index (0-5) to resource type key for backward compat
const POSITION_TO_KEY: ResourceType[] = [
  "rt",         // 2.2.1
  "vendedor",   // 2.2.2
  "orcamentista", // 2.2.3
  "projetista",   // 2.2.4
  "montador",     // 2.2.5
  "producao",     // 2.2.6
];

type ResourceInfo = { active: boolean; percentage: number; label: string; chartAccountId?: string };

export type StrategicResourceDefaults = Record<ResourceType, ResourceInfo>;

const FALLBACK: StrategicResourceDefaults = {
  rt: { active: false, percentage: 0, label: "Comissão vendedor" },
  vendedor: { active: false, percentage: 0, label: "Premiação comercial" },
  orcamentista: { active: false, percentage: 0, label: "Comissão de parceiros" },
  projetista: { active: false, percentage: 0, label: "Bônus produção" },
  montador: { active: false, percentage: 0, label: "Comissão de representantes" },
  producao: { active: false, percentage: 0, label: "Afiliados e indicações" },
};

export function useStrategicResourceDefaults() {
  const { activeTenantId } = useActiveTenant();
  const { data, isSuccess } = useQuery({
    queryKey: ["strategic-resource-defaults", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      // 1. Find parent account 2.2 for active tenant
      const { data: parent } = await supabase
        .from("fin_chart_accounts")
        .select("id")
        .eq("code", PARENT_CODE)
        .eq("active", true)
        .eq("tenant_id", activeTenantId!)
        .maybeSingle();

      if (!parent) return { ...FALLBACK };

      // 2. Get children (ordered by code)
      const { data: children } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name")
        .eq("parent_id", parent.id)
        .eq("active", true)
        .order("code");

      if (!children?.length) return { ...FALLBACK };

      // 3. Get configs
      const { data: configs } = await supabase
        .from(TABLE_NAME as any)
        .select("chart_account_id, active, default_percentage");

      const configMap = new Map<string, { active: boolean; default_percentage: number }>();
      ((configs ?? []) as any[]).forEach((c: any) => {
        if (c.chart_account_id) configMap.set(c.chart_account_id, c);
      });

      // 4. Map children by position to old keys
      const result: StrategicResourceDefaults = { ...FALLBACK };
      children.forEach((child, index) => {
        const key = POSITION_TO_KEY[index];
        if (!key) return;
        const cfg = configMap.get(child.id);
        result[key] = {
          active: cfg?.active ?? false,
          percentage: Number(cfg?.default_percentage) || 0,
          label: child.name,
          chartAccountId: child.id,
        };
      });

      return result;
    },
    staleTime: 60_000,
  });

  return { defaults: data ?? FALLBACK, isLoaded: isSuccess };
}

