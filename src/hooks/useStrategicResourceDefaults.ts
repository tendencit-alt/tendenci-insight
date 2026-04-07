import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TABLE_NAME = "fin_strategic_resource_account_configs";

type ResourceType = "rt" | "vendedor" | "orcamentista" | "projetista" | "montador" | "producao";

type ConfigRow = {
  resource_type: ResourceType | null;
  active: boolean;
  default_percentage: number;
  chart_account_id: string | null;
  display_name: string | null;
};

type ResourceInfo = { active: boolean; percentage: number; label: string };

export type StrategicResourceDefaults = Record<ResourceType, ResourceInfo>;

const FALLBACK: StrategicResourceDefaults = {
  rt: { active: true, percentage: 10, label: "RT" },
  vendedor: { active: true, percentage: 3, label: "Vendedor" },
  orcamentista: { active: true, percentage: 0.2, label: "Orçamentista" },
  projetista: { active: true, percentage: 0.2, label: "Projetista" },
  montador: { active: true, percentage: 10, label: "Montador" },
  producao: { active: true, percentage: 0.3, label: "Produção" },
};

export function useStrategicResourceDefaults() {
  const { data, isSuccess } = useQuery({
    queryKey: ["strategic-resource-defaults"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME as any)
        .select("resource_type, active, default_percentage, chart_account_id, display_name");
      if (error) throw error;
      const map: StrategicResourceDefaults = { ...FALLBACK };
      ((data ?? []) as unknown as ConfigRow[]).forEach((row) => {
        if (row.resource_type && row.resource_type in map) {
          map[row.resource_type] = {
            active: row.active,
            percentage: Number(row.default_percentage) || 0,
            label: row.display_name || FALLBACK[row.resource_type].label,
          };
        }
      });
      return map;
    },
    staleTime: 60_000,
  });

  return { defaults: data ?? FALLBACK, isLoaded: isSuccess };
}
