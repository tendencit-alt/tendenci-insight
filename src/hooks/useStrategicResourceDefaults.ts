import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TABLE_NAME = "fin_strategic_resource_account_configs";

type ResourceType = "rt" | "vendedor" | "orcamentista" | "projetista" | "montador" | "producao";

type ConfigRow = {
  resource_type: ResourceType;
  active: boolean;
  default_percentage: number;
  chart_account_id: string | null;
};

export type StrategicResourceDefaults = Record<ResourceType, { active: boolean; percentage: number }>;

const FALLBACK: StrategicResourceDefaults = {
  rt: { active: true, percentage: 10 },
  vendedor: { active: true, percentage: 3 },
  orcamentista: { active: true, percentage: 0.2 },
  projetista: { active: true, percentage: 0.2 },
  montador: { active: true, percentage: 10 },
  producao: { active: true, percentage: 0.3 },
};

export function useStrategicResourceDefaults() {
  const { data } = useQuery({
    queryKey: ["strategic-resource-defaults"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME as any)
        .select("resource_type, active, default_percentage, chart_account_id");
      if (error) throw error;
      const map: StrategicResourceDefaults = { ...FALLBACK };
      ((data ?? []) as unknown as ConfigRow[]).forEach((row) => {
        if (row.resource_type in map) {
          map[row.resource_type] = {
            active: row.active,
            percentage: Number(row.default_percentage) || 0,
          };
        }
      });
      return map;
    },
    staleTime: 60_000,
  });

  return data ?? FALLBACK;
}
