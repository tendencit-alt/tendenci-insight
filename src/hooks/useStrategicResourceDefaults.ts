import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PARENT_CODE = "2.2";
const TABLE_NAME = "fin_strategic_resource_account_configs";

type ResourceType = "rt" | "vendedor" | "orcamentista" | "projetista" | "montador" | "producao";

// Mapping from position index (0-5) to resource type key for backward compat
const POSITION_TO_KEY: ResourceType[] = [
  "rt",         // 2.3.1
  "vendedor",   // 2.3.2
  "orcamentista", // 2.3.3
  "projetista",   // 2.3.4
  "montador",     // 2.3.5
  "producao",     // 2.3.6
];

type ResourceInfo = { active: boolean; percentage: number; label: string; chartAccountId?: string };

export type StrategicResourceDefaults = Record<ResourceType, ResourceInfo>;

const FALLBACK: StrategicResourceDefaults = {
  rt: { active: true, percentage: 10, label: "Comissão do vendedor" },
  vendedor: { active: true, percentage: 3, label: "Premiação de terceiros" },
  orcamentista: { active: true, percentage: 0.2, label: "Comissão de parceiros" },
  projetista: { active: true, percentage: 0.2, label: "Bônus comercial" },
  montador: { active: true, percentage: 10, label: "Comissão de representantes" },
  producao: { active: true, percentage: 0.3, label: "Afiliados e indicações" },
};

export function useStrategicResourceDefaults() {
  const { data, isSuccess } = useQuery({
    queryKey: ["strategic-resource-defaults"],
    queryFn: async () => {
      // 1. Find parent account 2.3
      const { data: parent } = await supabase
        .from("fin_chart_accounts")
        .select("id")
        .eq("code", PARENT_CODE)
        .eq("active", true)
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
