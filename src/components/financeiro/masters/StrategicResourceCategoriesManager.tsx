import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FolderCog, Info, Loader2, Save, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const PARENT_ACCOUNT_CODE = "2.2";
const TABLE_NAME = "fin_strategic_resource_account_configs";

type ChartChild = { id: string; code: string; name: string };
type ConfigRow = {
  id: string;
  chart_account_id: string | null;
  active: boolean;
  default_percentage: number;
  cost_center_id: string | null;
};

export function StrategicResourceCategoriesManager() {
  const qc = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localPct, setLocalPct] = useState<Record<string, string>>({});

  // First find the parent account by code (scoped to active tenant)
  const { data: parentAccount } = useQuery({
    queryKey: ["fin-chart-parent-compromissos", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_chart_accounts")
        .select("id")
        .eq("code", PARENT_ACCOUNT_CODE)
        .eq("active", true)
        .eq("tenant_id", activeTenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: children, isLoading: loadingChildren } = useQuery({
    queryKey: ["fin-chart-children-compromissos", parentAccount?.id],
    queryFn: async () => {
      if (!parentAccount?.id) return [];
      const { data, error } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name")
        .eq("parent_id", parentAccount.id)
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return (data ?? []) as ChartChild[];
    },
    enabled: !!parentAccount?.id,
  });
  const { data: costCenters } = useQuery({
    queryKey: ["fin-cost-centers-strategic", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_cost_centers")
        .select("id, code, name")
        .eq("tenant_id", activeTenantId!)
        .eq("active", true)
        .order("code");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: configs, isLoading: loadingConfigs } = useQuery({
    queryKey: ["fin-strategic-resource-account-configs", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME as any)
        .select("id, chart_account_id, active, default_percentage, cost_center_id")
        .eq("tenant_id", activeTenantId!);
      if (error) throw error;
      return (data ?? []) as unknown as ConfigRow[];
    },
  });

  const configByAccount = useMemo(() => {
    const map = new Map<string, ConfigRow>();
    (configs ?? []).forEach((c) => {
      if (!c.chart_account_id) return;
      const existing = map.get(c.chart_account_id);
      // Prefer the config that has a resource_type (legacy) over orphan null ones
      if (!existing || (c.id && !existing.id) || (c.chart_account_id && !existing.chart_account_id)) {
        map.set(c.chart_account_id, c);
      }
    });
    return map;
  }, [configs]);

  const getPct = (accountId: string) => {
    if (localPct[accountId] !== undefined) return localPct[accountId];
    const cfg = configByAccount.get(accountId);
    return String(cfg?.default_percentage ?? 0);
  };

  const isActive = (accountId: string) => configByAccount.get(accountId)?.active ?? false;

  const save = async (
    accountId: string,
    payload: { active?: boolean; default_percentage?: number; cost_center_id?: string | null }
  ) => {
    const existing = configByAccount.get(accountId);
    setSavingId(accountId);
    try {
      const nextData: any = {
        chart_account_id: accountId,
        tenant_id: activeTenantId,
        active: payload.active ?? existing?.active ?? false,
        default_percentage: payload.default_percentage ?? existing?.default_percentage ?? 0,
        cost_center_id:
          payload.cost_center_id !== undefined
            ? payload.cost_center_id
            : existing?.cost_center_id ?? null,
      };
      if (existing) {
        const { error } = await supabase.from(TABLE_NAME as any).update(nextData).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLE_NAME as any).insert(nextData);
        if (error) throw error;
      }
      setLocalPct((p) => { const c = { ...p }; delete c[accountId]; return c; });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["fin-strategic-resource-account-configs"] }),
        qc.invalidateQueries({ queryKey: ["compromissos-venda-categories"] }),
        qc.invalidateQueries({ queryKey: ["strategic-resource-defaults"] }),
        qc.invalidateQueries({ queryKey: ["fin-chart-accounts-all"] }),
      ]);
      toast.success("Salvo");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSavingId(null);
    }
  };

  const isLoading = loadingChildren || loadingConfigs;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <FolderCog className="h-4 w-4" />
          Compromissos Sobre Venda
        </CardTitle>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Info className="h-3 w-3 shrink-0" />
          Espelha as categorias do Plano de Contas (2.2). Para adicionar ou renomear, edite o Plano de Contas.
        </p>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !children?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma subcategoria encontrada em 2.2 - Compromissos sobre vendas.
          </p>
        ) : (
          children.map((child) => {
            const isSaving = savingId === child.id;
            const hasPctEdit = localPct[child.id] !== undefined;

            return (
              <div key={child.id} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
                <Badge variant="outline" className="text-[10px] font-mono shrink-0 px-1.5 py-0">
                  {child.code}
                </Badge>
                <span className="text-sm truncate flex-1 min-w-0">{child.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={getPct(child.id)}
                    onChange={(e) => setLocalPct((p) => ({ ...p, [child.id]: e.target.value }))}
                    disabled={isSaving}
                    className="h-7 w-[72px] text-sm text-right"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <Select
                    value={configByAccount.get(child.id)?.cost_center_id ?? "_none"}
                    onValueChange={(v) => save(child.id, { cost_center_id: v === "_none" ? null : v })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-7 w-[160px] text-xs">
                      <SelectValue placeholder="Centro de custo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" className="text-xs">— Sem CC —</SelectItem>
                      {(costCenters ?? []).map((cc) => (
                        <SelectItem key={cc.id} value={cc.id} className="text-xs">
                          <span className="font-mono text-muted-foreground mr-1">{cc.code}</span>{cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasPctEdit && (
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 shrink-0"
                    disabled={isSaving}
                    onClick={() => save(child.id, { default_percentage: parseFloat(localPct[child.id]) || 0 })}
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Salvar
                  </Button>
                )}
                <Switch
                  checked={isActive(child.id)}
                  disabled={isSaving}
                  onCheckedChange={(checked) => save(child.id, { active: checked })}
                  className="scale-90 shrink-0"
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
