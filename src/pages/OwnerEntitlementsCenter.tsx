import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useEntitlementCatalog,
  usePlanEntitlements,
  useTenantOverrides,
  useTenantGrants,
  useEntitlementAnalytics,
  useUpsertPlanEntitlement,
} from "@/hooks/useEntitlements";
import { useAllPlans } from "@/hooks/useSaasAdmin";
import { useState } from "react";
import { Boxes, ShieldCheck, Gift, BarChart3, Sparkles, Package } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OwnerEntitlementsCenter() {
  const { isOwner } = usePermissions();
  if (!isOwner) return <Navigate to="/" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🎟️ Entitlement Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Catálogo de módulos vendáveis, mapeamento por plano, overrides e trials por tenant
          </p>
        </div>

        <AnalyticsKPIs />

        <Tabs defaultValue="catalog">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="catalog" className="gap-1.5"><Boxes className="h-4 w-4" />Catálogo</TabsTrigger>
            <TabsTrigger value="plans" className="gap-1.5"><Package className="h-4 w-4" />Plan Mapping</TabsTrigger>
            <TabsTrigger value="overrides" className="gap-1.5"><ShieldCheck className="h-4 w-4" />Overrides</TabsTrigger>
            <TabsTrigger value="grants" className="gap-1.5"><Gift className="h-4 w-4" />Trials & Grants</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="pt-6"><CatalogTab /></TabsContent>
          <TabsContent value="plans" className="pt-6"><PlanMappingTab /></TabsContent>
          <TabsContent value="overrides" className="pt-6"><OverridesTab /></TabsContent>
          <TabsContent value="grants" className="pt-6"><GrantsTab /></TabsContent>
          <TabsContent value="analytics" className="pt-6"><AnalyticsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function AnalyticsKPIs() {
  const { data, isLoading } = useEntitlementAnalytics();
  if (isLoading) return <div className="grid gap-3 md:grid-cols-4"><Skeleton className="h-24"/><Skeleton className="h-24"/><Skeleton className="h-24"/><Skeleton className="h-24"/></div>;
  const a = data ?? {};
  const items = [
    { label: "Entitlements ativos", value: a.total_entitlements ?? 0, icon: Boxes },
    { label: "Overrides ativos", value: a.active_overrides ?? 0, icon: ShieldCheck },
    { label: "Grants ativos", value: a.active_grants ?? 0, icon: Gift },
    { label: "Tenants em trial", value: a.tenants_in_trial ?? 0, icon: Sparkles },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><it.icon className="h-5 w-5 text-primary"/></div>
            <div>
              <div className="text-2xl font-bold">{it.value}</div>
              <div className="text-xs text-muted-foreground">{it.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CatalogTab() {
  const { data, isLoading } = useEntitlementCatalog();
  if (isLoading) return <Skeleton className="h-96" />;
  const grouped = (data ?? []).reduce((acc: any, e: any) => {
    (acc[e.entitlement_group] ||= []).push(e);
    return acc;
  }, {});
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([group, items]: any) => (
        <Card key={group}>
          <CardHeader><CardTitle className="text-base capitalize">{group.replace(/_/g, " ")}</CardTitle></CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {items.map((e: any) => (
              <div key={e.code} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    {e.name}
                    {e.is_core && <Badge variant="secondary" className="text-[10px]">CORE</Badge>}
                    {e.is_premium && <Badge className="text-[10px] gap-1"><Sparkles className="h-2.5 w-2.5"/>PREMIUM</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{e.code}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{e.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlanMappingTab() {
  const { data: plans } = useAllPlans();
  const [planId, setPlanId] = useState<string | undefined>();
  const { data: catalog } = useEntitlementCatalog();
  const { data: mappings } = usePlanEntitlements(planId);
  const upsert = useUpsertPlanEntitlement();

  const isIncluded = (code: string) => mappings?.find((m: any) => m.entitlement_code === code)?.included ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mapeamento Plano → Entitlements</CardTitle>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
          <SelectContent>{plans?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} — R$ {p.price}</SelectItem>)}</SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-2">
        {!planId && <p className="text-sm text-muted-foreground">Selecione um plano para configurar.</p>}
        {planId && catalog?.filter((e: any) => !e.is_core).map((e: any) => (
          <div key={e.code} className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                {e.name}
                {e.is_premium && <Badge className="text-[10px] gap-1"><Sparkles className="h-2.5 w-2.5"/>PREMIUM</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{e.code}</div>
            </div>
            <Switch
              checked={isIncluded(e.code)}
              onCheckedChange={(v) => upsert.mutate({ plan_id: planId, entitlement_code: e.code, included: v })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function OverridesTab() {
  const { data, isLoading } = useTenantOverrides();
  if (isLoading) return <Skeleton className="h-96" />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Overrides ativos por tenant</CardTitle></CardHeader>
      <CardContent>
        {!data?.length && <p className="text-sm text-muted-foreground">Nenhum override criado ainda.</p>}
        <div className="space-y-2">
          {data?.map((o: any) => (
            <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">{o.tenants?.name} → {o.entitlement_catalog?.name}</div>
                <div className="text-xs text-muted-foreground">{o.reason} · origem: {o.source}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={o.enabled ? "default" : "destructive"}>{o.enabled ? "Liberado" : "Bloqueado"}</Badge>
                {o.expires_at && <Badge variant="outline" className="text-[10px]">expira {new Date(o.expires_at).toLocaleDateString()}</Badge>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GrantsTab() {
  const { data, isLoading } = useTenantGrants();
  if (isLoading) return <Skeleton className="h-96" />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Trials & Grants temporários</CardTitle></CardHeader>
      <CardContent>
        {!data?.length && <p className="text-sm text-muted-foreground">Nenhum grant ativo.</p>}
        <div className="space-y-2">
          {data?.map((g: any) => (
            <div key={g.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">{g.tenants?.name} → {g.entitlement_catalog?.name}</div>
                <div className="text-xs text-muted-foreground">{g.reason ?? "—"}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{g.grant_type}</Badge>
                <Badge variant={g.status === "active" ? "default" : "secondary"}>{g.status}</Badge>
                <span className="text-xs text-muted-foreground">expira {new Date(g.expires_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsTab() {
  const { data, isLoading } = useEntitlementAnalytics();
  if (isLoading) return <Skeleton className="h-96" />;
  const a = data ?? {};
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Top tentativas bloqueadas (30d)</CardTitle></CardHeader>
        <CardContent>
          {!a.top_blocked?.length && <p className="text-sm text-muted-foreground">Nenhum bloqueio registrado.</p>}
          {a.top_blocked?.map((t: any) => (
            <div key={t.entitlement_code} className="flex justify-between py-1.5 text-sm border-b last:border-0">
              <span className="font-mono text-xs">{t.entitlement_code}</span>
              <Badge variant="destructive">{t.count}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Top overrides por entitlement</CardTitle></CardHeader>
        <CardContent>
          {!a.top_overrides?.length && <p className="text-sm text-muted-foreground">Nenhum override registrado.</p>}
          {a.top_overrides?.map((t: any) => (
            <div key={t.entitlement_code} className="flex justify-between py-1.5 text-sm border-b last:border-0">
              <span className="font-mono text-xs">{t.entitlement_code}</span>
              <Badge>{t.count}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
