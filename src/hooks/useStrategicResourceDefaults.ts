import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";

const PARENT_CODE = "2.2";
const TABLE_NAME = "fin_strategic_resource_account_configs";

type ResourceType = "rt" | "vendedor" | "orcamentista" | "projetista" | "montador" | "producao";
const RESOURCE_KEYS: ResourceType[] = ["rt", "vendedor", "orcamentista", "projetista", "montador", "producao"];

const normalizeText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const inferResourceType = (label: string | null | undefined): ResourceType | null => {
  const normalized = normalizeText(label);

  if (!normalized) return null;
  if (/\brt\b|repasse tecnico|recurso tecnico|responsavel tecnico|tecnico/.test(normalized)) return "rt";
  if (/vendedor|comissao vendedor|premiacao comercial|comercial/.test(normalized)) return "vendedor";
  if (/orcament/.test(normalized)) return "orcamentista";
  if (/projet/.test(normalized)) return "projetista";
  if (/montad/.test(normalized)) return "montador";
  if (/produc|corte|separac|afiliad|indicac/.test(normalized)) return "producao";

  return null;
};

type ResourceInfo = { active: boolean; percentage: number; label: string; visible: boolean; chartAccountId?: string };

export type StrategicResourceDefaults = Record<ResourceType, ResourceInfo>;

const FALLBACK: StrategicResourceDefaults = {
  rt: { active: false, percentage: 0, label: "Comissão vendedor", visible: false },
  vendedor: { active: false, percentage: 0, label: "Premiação comercial", visible: false },
  orcamentista: { active: false, percentage: 0, label: "Comissão de parceiros", visible: false },
  projetista: { active: false, percentage: 0, label: "Bônus produção", visible: false },
  montador: { active: false, percentage: 0, label: "Comissão de representantes", visible: false },
  producao: { active: false, percentage: 0, label: "Afiliados e indicações", visible: false },
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
        .select("chart_account_id, active, default_percentage, resource_type, display_name");

      const configMap = new Map<string, {
        active: boolean;
        default_percentage: number;
        resource_type?: ResourceType | null;
        display_name?: string | null;
      }>();
      ((configs ?? []) as any[]).forEach((c: any) => {
        if (c.chart_account_id) configMap.set(c.chart_account_id, c);
      });

      // 4. Resolve the six legacy resource slots using explicit resource_type when
      //    present, otherwise infer from the category name. This avoids the old
      //    positional bug where 2.2.1 was rendered as RT, 2.2.2 as vendedor, etc.
      const result: StrategicResourceDefaults = { ...FALLBACK };
      const assignedKeys = new Set<ResourceType>();
      const assignedChildren = new Set<string>();

      const assign = (key: ResourceType, child: { id: string; name: string }, cfg?: {
        active: boolean;
        default_percentage: number;
      }) => {
        result[key] = {
          active: cfg?.active ?? false,
          percentage: Number(cfg?.default_percentage) || 0,
          label: child.name,
          visible: true,
          chartAccountId: child.id,
        };
        assignedKeys.add(key);
        assignedChildren.add(child.id);
      };

      children.forEach((child) => {
        const cfg = configMap.get(child.id);
        const inferredKey = (cfg?.resource_type as ResourceType | null | undefined)
          ?? inferResourceType(child.name)
          ?? inferResourceType(cfg?.display_name);

        if (!inferredKey || assignedKeys.has(inferredKey)) return;
        assign(inferredKey, child, cfg);
      });

      const remainingChildren = children.filter((child) => !assignedChildren.has(child.id));
      const remainingKeys = RESOURCE_KEYS.filter((key) => !assignedKeys.has(key));

      remainingKeys.forEach((key, index) => {
        const child = remainingChildren[index];
        if (!child) return;
        assign(key, child, configMap.get(child.id));
      });

      return result;
    },
    staleTime: 60_000,
  });

  return { defaults: data ?? FALLBACK, isLoaded: isSuccess };
}

