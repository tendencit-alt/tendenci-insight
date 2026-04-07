import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/financeiro/SearchableSelect";
import { CreateChartAccountDialog } from "./CreateChartAccountDialog";
import { FolderCog, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

type StrategicResourceType = "rt" | "vendedor" | "orcamentista" | "projetista" | "montador" | "producao";

type ConfigRow = {
  id: string;
  resource_type: StrategicResourceType;
  chart_account_id: string | null;
  active: boolean;
  display_name: string | null;
  description: string | null;
};

type ChartAccountOption = {
  id: string;
  code: string;
  name: string;
};

const TABLE_NAME = "fin_strategic_resource_account_configs";

const RESOURCE_DEFAULTS: Record<StrategicResourceType, { label: string; description: string }> = {
  rt: { label: "RT", description: "Responsável técnico" },
  vendedor: { label: "Vendedor", description: "Comissão comercial" },
  orcamentista: { label: "Orçamentista", description: "Apoio à precificação" },
  projetista: { label: "Projetista", description: "Projeto técnico" },
  montador: { label: "Montador", description: "Equipe de montagem" },
  producao: { label: "Produção", description: "Comissão de produção" },
};

const RESOURCE_TYPES: StrategicResourceType[] = ["rt", "vendedor", "orcamentista", "projetista", "montador", "producao"];

const EMPTY_OPTION = "__none__";

export function StrategicResourceCategoriesManager() {
  const queryClient = useQueryClient();
  const [savingType, setSavingType] = useState<StrategicResourceType | null>(null);
  const [localEdits, setLocalEdits] = useState<Record<string, { display_name?: string; description?: string }>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForType, setCreateForType] = useState<StrategicResourceType | null>(null);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["fin-strategic-resource-account-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME as any)
        .select("id, resource_type, chart_account_id, active, display_name, description")
        .order("resource_type");
      if (error) throw error;
      return (data ?? []) as unknown as ConfigRow[];
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
    (configs ?? []).forEach((c) => map.set(c.resource_type, c));
    return map;
  }, [configs]);

  const accountOptions = useMemo(
    () => (chartAccounts ?? []).map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` })),
    [chartAccounts],
  );

  const getDisplayName = (type: StrategicResourceType) => {
    const edit = localEdits[type];
    if (edit?.display_name !== undefined) return edit.display_name;
    const config = configMap.get(type);
    return config?.display_name ?? RESOURCE_DEFAULTS[type].label;
  };

  const getDescription = (type: StrategicResourceType) => {
    const edit = localEdits[type];
    if (edit?.description !== undefined) return edit.description;
    const config = configMap.get(type);
    return config?.description ?? RESOURCE_DEFAULTS[type].description;
  };

  const updateLocalEdit = (type: StrategicResourceType, field: "display_name" | "description", value: string) => {
    setLocalEdits((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const handleSave = async (resourceType: StrategicResourceType, extraPayload?: Partial<Pick<ConfigRow, "chart_account_id" | "active">>) => {
    const existing = configMap.get(resourceType);
    const edits = localEdits[resourceType];

    const nextData = {
      resource_type: resourceType,
      chart_account_id: extraPayload?.chart_account_id ?? existing?.chart_account_id ?? null,
      active: extraPayload?.active ?? existing?.active ?? true,
      display_name: edits?.display_name ?? existing?.display_name ?? RESOURCE_DEFAULTS[resourceType].label,
      description: edits?.description ?? existing?.description ?? RESOURCE_DEFAULTS[resourceType].description,
    };

    setSavingType(resourceType);
    try {
      if (existing) {
        const { error } = await supabase.from(TABLE_NAME as any).update(nextData).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLE_NAME as any).insert(nextData);
        if (error) throw error;
      }
      setLocalEdits((prev) => {
        const copy = { ...prev };
        delete copy[resourceType];
        return copy;
      });
      await queryClient.invalidateQueries({ queryKey: ["fin-strategic-resource-account-configs"] });
      toast.success("Configuração salva");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configuração");
    } finally {
      setSavingType(null);
    }
  };

  const handleCreatedAccount = (newAccountId: string) => {
    if (createForType) {
      handleSave(createForType, { chart_account_id: newAccountId });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <FolderCog className="h-4 w-4" />
            Compromissos Sobre Venda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            RESOURCE_TYPES.map((type) => {
              const currentConfig = configMap.get(type);
              const isSaving = savingType === type;
              const hasEdits = !!localEdits[type];

              return (
                <div key={type} className="rounded-md border bg-card px-3 py-2.5 space-y-2">
                  {/* Row 1: badge + name + description + toggle */}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] uppercase shrink-0 px-1.5 py-0">
                      {type}
                    </Badge>
                    <Input
                      value={getDisplayName(type)}
                      onChange={(e) => updateLocalEdit(type, "display_name", e.target.value)}
                      disabled={isSaving}
                      className="h-7 text-sm flex-1 max-w-[160px]"
                      placeholder="Nome..."
                    />
                    <Input
                      value={getDescription(type)}
                      onChange={(e) => updateLocalEdit(type, "description", e.target.value)}
                      disabled={isSaving}
                      className="h-7 text-sm flex-1 max-w-[200px] text-muted-foreground"
                      placeholder="Descrição..."
                    />
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      <Switch
                        checked={currentConfig?.active ?? true}
                        disabled={isSaving}
                        onCheckedChange={(checked) => handleSave(type, { active: checked })}
                        className="scale-90"
                      />
                    </div>
                  </div>

                  {/* Row 2: category selector + actions */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={[{ value: EMPTY_OPTION, label: "Sem categoria" }, ...accountOptions]}
                        value={currentConfig?.chart_account_id ?? EMPTY_OPTION}
                        onChange={(value) =>
                          handleSave(type, { chart_account_id: value === EMPTY_OPTION ? null : value })
                        }
                        placeholder="Categoria..."
                        searchPlaceholder="Buscar..."
                        emptyMessage="Nenhuma encontrada."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={isSaving}
                      onClick={() => {
                        setCreateForType(type);
                        setCreateDialogOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    {hasEdits && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        disabled={isSaving}
                        onClick={() => handleSave(type)}
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Salvar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <CreateChartAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleCreatedAccount}
      />
    </>
  );
}
