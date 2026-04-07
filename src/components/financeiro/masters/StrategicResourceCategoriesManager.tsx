import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
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
  rt: { label: "RT", description: "Responsável técnico do pedido." },
  vendedor: { label: "Vendedor", description: "Comissão comercial vinculada ao pedido." },
  orcamentista: { label: "Orçamentista", description: "Recurso de apoio à precificação e orçamento." },
  projetista: { label: "Projetista", description: "Responsável pelo projeto técnico/comercial." },
  montador: { label: "Montador", description: "Equipe ou responsável de montagem." },
  producao: { label: "Produção", description: "Comissão/recurso ligado à produção." },
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
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <FolderCog className="h-5 w-5" />
              Categorias dos Compromissos Sobre Venda
            </CardTitle>
            <CardDescription>
              Defina a categoria contábil usada automaticamente no contas a pagar e no razão para cada compromisso. Edite nomes e descrições livremente.
            </CardDescription>
          </div>
          <Badge variant="outline">Configuração automática</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            RESOURCE_TYPES.map((type) => {
              const currentConfig = configMap.get(type);
              const isSaving = savingType === type;
              const hasEdits = !!localEdits[type];

              return (
                <div key={type} className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
                  {/* Header row */}
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs uppercase">{type}</Badge>
                      <Badge variant={currentConfig?.active === false ? "secondary" : "default"}>
                        {currentConfig?.active === false ? "Inativo" : "Ativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor={`active-${type}`} className="text-sm text-muted-foreground">
                        Usar automação
                      </Label>
                      <Switch
                        id={`active-${type}`}
                        checked={currentConfig?.active ?? true}
                        disabled={isSaving}
                        onCheckedChange={(checked) => handleSave(type, { active: checked })}
                      />
                    </div>
                  </div>

                  {/* Editable name & description */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nome de exibição</Label>
                      <Input
                        value={getDisplayName(type)}
                        onChange={(e) => updateLocalEdit(type, "display_name", e.target.value)}
                        disabled={isSaving}
                        placeholder="Nome..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Descrição</Label>
                      <Input
                        value={getDescription(type)}
                        onChange={(e) => updateLocalEdit(type, "description", e.target.value)}
                        disabled={isSaving}
                        placeholder="Descrição..."
                      />
                    </div>
                  </div>

                  {/* Category selector + create + save */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Categoria do Plano de Contas</Label>
                      <SearchableSelect
                        options={[{ value: EMPTY_OPTION, label: "Sem categoria" }, ...accountOptions]}
                        value={currentConfig?.chart_account_id ?? EMPTY_OPTION}
                        onChange={(value) =>
                          handleSave(type, { chart_account_id: value === EMPTY_OPTION ? null : value })
                        }
                        placeholder="Selecione a categoria..."
                        searchPlaceholder="Buscar categoria..."
                        emptyMessage="Nenhuma categoria encontrada."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={isSaving}
                      onClick={() => {
                        setCreateForType(type);
                        setCreateDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Criar Categoria
                    </Button>
                    <Button
                      type="button"
                      variant={hasEdits ? "default" : "outline"}
                      className="gap-2"
                      disabled={isSaving}
                      onClick={() => handleSave(type)}
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

      <CreateChartAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleCreatedAccount}
      />
    </>
  );
}
