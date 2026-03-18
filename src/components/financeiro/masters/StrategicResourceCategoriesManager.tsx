import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/financeiro/SearchableSelect";
import { FolderCog, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

type StrategicResourceType = "rt" | "vendedor" | "orcamentista" | "projetista" | "montador" | "producao";

type ConfigRow = {
  id: string;
  resource_type: StrategicResourceType;
  chart_account_id: string | null;
  active: boolean;
};

type ChartAccountOption = {
  id: string;
  code: string;
  name: string;
};

const TABLE_NAME = "fin_strategic_resource_account_configs";

const RESOURCE_OPTIONS: Array<{
  value: StrategicResourceType;
  label: string;
  description: string;
}> = [
  { value: "rt", label: "RT", description: "Responsável técnico do pedido." },
  { value: "vendedor", label: "Vendedor", description: "Comissão comercial vinculada ao pedido." },
  { value: "orcamentista", label: "Orçamentista", description: "Recurso de apoio à precificação e orçamento." },
  { value: "projetista", label: "Projetista", description: "Responsável pelo projeto técnico/comercial." },
  { value: "montador", label: "Montador", description: "Equipe ou responsável de montagem." },
  { value: "producao", label: "Produção", description: "Comissão/recurso ligado à produção." },
];

const EMPTY_OPTION = "__none__";

export function StrategicResourceCategoriesManager() {
  const queryClient = useQueryClient();
  const [savingType, setSavingType] = useState<StrategicResourceType | null>(null);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["fin-strategic-resource-account-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME as any)
        .select("id, resource_type, chart_account_id, active")
        .order("resource_type");

      if (error) throw error;
      return ((data ?? []) as unknown) as ConfigRow[];
    },
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["fin-chart-accounts-despesa-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name")
        .eq("nature", "DESPESA")
        .eq("active", true)
        .order("code");

      if (error) throw error;
      return (data ?? []) as ChartAccountOption[];
    },
  });

  const configMap = useMemo(() => {
    const map = new Map<StrategicResourceType, ConfigRow>();
    (configs ?? []).forEach((config) => map.set(config.resource_type, config));
    return map;
  }, [configs]);

  const accountOptions = useMemo(
    () =>
      (chartAccounts ?? []).map((account) => ({
        value: account.id,
        label: `${account.code} - ${account.name}`,
      })),
    [chartAccounts],
  );

  const handleSave = async (
    resourceType: StrategicResourceType,
    payload: Partial<Pick<ConfigRow, "chart_account_id" | "active">>,
  ) => {
    const existing = configMap.get(resourceType);
    const nextData = {
      resource_type: resourceType,
      chart_account_id: payload.chart_account_id ?? existing?.chart_account_id ?? null,
      active: payload.active ?? existing?.active ?? true,
    };

    setSavingType(resourceType);
    try {
      if (existing) {
        const { error } = await supabase
          .from(TABLE_NAME as any)
          .update(nextData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLE_NAME as any).insert(nextData);
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["fin-strategic-resource-account-configs"] });
      toast.success("Configuração salva");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configuração");
    } finally {
      setSavingType(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <FolderCog className="h-5 w-5" />
            Categorias dos Recursos Estratégicos
          </CardTitle>
          <CardDescription>
            Defina a categoria contábil usada automaticamente no contas a pagar e no razão para cada recurso.
          </CardDescription>
        </div>
        <Badge variant="outline">Configuração automática</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          RESOURCE_OPTIONS.map((resource) => {
            const currentConfig = configMap.get(resource.value);
            const isSaving = savingType === resource.value;

            return (
              <div
                key={resource.value}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{resource.label}</h3>
                      <Badge variant={currentConfig?.active === false ? "secondary" : "default"}>
                        {currentConfig?.active === false ? "Inativo" : "Ativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                  </div>

                  <div className="flex items-center gap-3 self-start lg:self-center">
                    <Label htmlFor={`active-${resource.value}`} className="text-sm text-muted-foreground">
                      Usar automação
                    </Label>
                    <Switch
                      id={`active-${resource.value}`}
                      checked={currentConfig?.active ?? true}
                      disabled={isSaving}
                      onCheckedChange={(checked) => handleSave(resource.value, { active: checked })}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Categoria do Plano de Contas</Label>
                    <SearchableSelect
                      options={[{ value: EMPTY_OPTION, label: "Sem categoria" }, ...accountOptions]}
                      value={currentConfig?.chart_account_id ?? EMPTY_OPTION}
                      onChange={(value) =>
                        handleSave(resource.value, {
                          chart_account_id: value === EMPTY_OPTION ? null : value,
                        })
                      }
                      placeholder="Selecione a categoria..."
                      searchPlaceholder="Buscar categoria..."
                      emptyMessage="Nenhuma categoria encontrada."
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={isSaving}
                    onClick={() =>
                      handleSave(resource.value, {
                        chart_account_id: currentConfig?.chart_account_id ?? null,
                        active: currentConfig?.active ?? true,
                      })
                    }
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
