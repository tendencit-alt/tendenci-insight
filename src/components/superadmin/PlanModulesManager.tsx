import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_META } from "@/hooks/useModulesConfig";

export function PlanModulesManager() {
  const qc = useQueryClient();
  const [planId, setPlanId] = useState<string>("");

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ["tenant-plans-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_plans").select("*").order("price");
      if (error) throw error;
      return data;
    },
  });

  const { data: modules = [], isLoading: loadingMods } = useQuery({
    queryKey: ["modules_config_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("modules_config")
        .select("module_key,label,category,sort_order")
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data as Array<{ module_key: string; label: string; category: string; sort_order: number }>;
    },
  });

  const { data: planMods = [], isLoading: loadingPM } = useQuery({
    queryKey: ["plan_modules", planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("plan_modules").select("module_key").eq("plan_id", planId);
      if (error) throw error;
      return (data as any[]).map((r) => r.module_key);
    },
  });

  const enabledSet = useMemo(() => new Set(planMods), [planMods]);

  const toggle = useMutation({
    mutationFn: async ({ module_key, enabled }: { module_key: string; enabled: boolean }) => {
      if (enabled) {
        const { error } = await (supabase as any)
          .from("plan_modules").insert({ plan_id: planId, module_key });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("plan_modules").delete().eq("plan_id", planId).eq("module_key", module_key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan_modules", planId] });
      qc.invalidateQueries({ queryKey: ["tenant-plan-modules"] });
    },
    onError: (e: any) => toast.error("Erro: " + (e?.message ?? "")),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof modules>();
    modules.forEach((m) => {
      if (!map.has(m.category)) map.set(m.category, [] as any);
      map.get(m.category)!.push(m);
    });
    return Array.from(map.entries())
      .map(([cat, items]) => ({
        category: cat,
        label: CATEGORY_META[cat]?.label ?? cat,
        order: CATEGORY_META[cat]?.order ?? 999,
        items: items.sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .sort((a, b) => a.order - b.order);
  }, [modules]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" /> Módulos por Plano
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Defina quais módulos cada plano comercial inclui. Tenants sem plano configurado mantêm acesso completo (fallback seguro).
          </p>
        </div>
        <div className="min-w-[260px]">
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger>
              <SelectValue placeholder={loadingPlans ? "Carregando…" : "Selecione um plano"} />
            </SelectTrigger>
            <SelectContent>
              {plans?.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!planId && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Selecione um plano para configurar seus módulos.
        </CardContent></Card>
      )}

      {planId && (loadingMods || loadingPM) && (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      )}

      {planId && !loadingMods && !loadingPM && grouped.map((g) => (
        <Card key={g.category}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{g.label}</span>
              <Badge variant="outline">
                {g.items.filter((i) => enabledSet.has(i.module_key)).length} / {g.items.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {g.items.map((m) => {
              const checked = enabledSet.has(m.module_key);
              return (
                <label
                  key={m.module_key}
                  className="flex items-center gap-3 p-2.5 rounded-md border hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={checked}
                    disabled={toggle.isPending}
                    onCheckedChange={(v) => toggle.mutate({ module_key: m.module_key, enabled: !!v })}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">{m.module_key}</div>
                  </div>
                </label>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
