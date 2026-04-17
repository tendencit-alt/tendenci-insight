import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useOwnerUpgradeDashboard,
  useAllUpgradeSignals,
  useGenerateSignalsBatch,
  usePersonalizeSignal,
  useUpdateSignalStatus,
  renderSignalMessage,
} from "@/hooks/useUpgradeSignals";
import { useTenantGrants } from "@/hooks/useEntitlements";
import { TrendingUp, Sparkles, Gift, AlertTriangle, Zap, BarChart3, RefreshCw, Wand2, X, Check } from "lucide-react";

export default function OwnerUpgradeCenter() {
  const { isOwner } = usePermissions();
  if (!isOwner) return <Navigate to="/" replace />;
  const generate = useGenerateSignalsBatch();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              📈 Upgrade Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Sinais de expansão, trials ativos e oportunidades de conversão por tenant
            </p>
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending} variant="outline" className="gap-2">
            <RefreshCw className={generate.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Gerar signals agora
          </Button>
        </div>

        <KPIs />

        <Tabs defaultValue="signals">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="signals" className="gap-1.5"><Zap className="h-4 w-4"/>Signals</TabsTrigger>
            <TabsTrigger value="trials" className="gap-1.5"><Gift className="h-4 w-4"/>Trials Ativos</TabsTrigger>
            <TabsTrigger value="expiring" className="gap-1.5"><AlertTriangle className="h-4 w-4"/>Trials Expirando</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4"/>Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="pt-6"><SignalsTab/></TabsContent>
          <TabsContent value="trials" className="pt-6"><TrialsTab expiring={false}/></TabsContent>
          <TabsContent value="expiring" className="pt-6"><TrialsTab expiring/></TabsContent>
          <TabsContent value="analytics" className="pt-6"><AnalyticsTab/></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function KPIs() {
  const { data, isLoading } = useOwnerUpgradeDashboard();
  if (isLoading) return <div className="grid gap-3 md:grid-cols-5"><Skeleton className="h-24"/><Skeleton className="h-24"/><Skeleton className="h-24"/><Skeleton className="h-24"/><Skeleton className="h-24"/></div>;
  const a = data ?? {};
  const items = [
    { label: "Signals ativos", value: a.active_signals ?? 0, icon: Zap, tone: "text-primary" },
    { label: "Críticos", value: a.critical_signals ?? 0, icon: AlertTriangle, tone: "text-destructive" },
    { label: "Trials ativos", value: a.active_trials ?? 0, icon: Gift, tone: "text-emerald-600" },
    { label: "Conversões 30d", value: a.conversions_30d ?? 0, icon: TrendingUp, tone: "text-blue-600" },
    { label: "CTR 30d", value: `${a.click_through_rate_30d ?? 0}%`, icon: BarChart3, tone: "text-violet-600" },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"><it.icon className={`h-5 w-5 ${it.tone}`}/></div>
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

function SignalsTab() {
  const { data, isLoading } = useAllUpgradeSignals();
  const personalize = usePersonalizeSignal();
  const setStatus = useUpdateSignalStatus();

  if (isLoading) return <Skeleton className="h-96"/>;
  if (!data?.length) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum signal ativo no momento.</CardContent></Card>;

  const sevColor: Record<string, string> = {
    critical: "destructive", high: "default", medium: "secondary", low: "outline",
  };

  return (
    <div className="space-y-2">
      {data.map((s: any) => (
        <Card key={s.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm">{s.tenants?.name ?? "—"}</span>
                  <Badge variant={sevColor[s.severity] as any}>{s.severity}</Badge>
                  <Badge variant="outline" className="text-[10px]">{s.signal_type}</Badge>
                  <Badge variant="outline" className="text-[10px]">conf {s.confidence_score}%</Badge>
                  {s.tenant_plans?.name && <Badge className="text-[10px]">→ {s.tenant_plans.name}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {renderSignalMessage({ signal_type: s.signal_type, context: s.context, message_template: s.message_template, ai_message: s.ai_message, recommended_plan_name: s.tenant_plans?.name })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => personalize.mutate(s.id)} disabled={personalize.isPending}>
                  <Wand2 className="h-3.5 w-3.5"/>{s.ai_message ? "Re-gerar" : "Personalizar IA"}
                </Button>
                <Button size="sm" variant="ghost" className="gap-1" onClick={() => setStatus.mutate({ id: s.id, status: "converted" })}>
                  <Check className="h-3.5 w-3.5"/>Convertido
                </Button>
                <Button size="sm" variant="ghost" className="gap-1" onClick={() => setStatus.mutate({ id: s.id, status: "ignored" })}>
                  <X className="h-3.5 w-3.5"/>Ignorar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TrialsTab({ expiring }: { expiring: boolean }) {
  const { data, isLoading } = useTenantGrants();
  if (isLoading) return <Skeleton className="h-96"/>;
  const trials = (data ?? []).filter((g: any) => {
    if (g.grant_type !== "trial" || g.status !== "active") return false;
    if (!expiring) return true;
    const exp = new Date(g.expires_at).getTime();
    return exp > Date.now() && exp < Date.now() + 7 * 86400000;
  });
  if (!trials.length) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum trial {expiring ? "expirando em 7 dias" : "ativo"}.</CardContent></Card>;

  return (
    <div className="space-y-2">
      {trials.map((g: any) => (
        <Card key={g.id}>
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-sm">{g.tenants?.name} → {g.entitlement_catalog?.name}</div>
              <div className="text-xs text-muted-foreground">{g.reason ?? "—"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{g.grant_type}</Badge>
              <Badge variant={expiring ? "destructive" : "outline"} className="text-[10px]">
                expira {new Date(g.expires_at).toLocaleDateString()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnalyticsTab() {
  const { data, isLoading } = useOwnerUpgradeDashboard();
  if (isLoading) return <Skeleton className="h-96"/>;
  const a = data ?? {};
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Top tipos de signal ativos</CardTitle></CardHeader>
        <CardContent>
          {!a.top_signal_types?.length && <p className="text-sm text-muted-foreground">Nenhum signal ativo.</p>}
          {a.top_signal_types?.map((t: any) => (
            <div key={t.signal_type} className="flex justify-between py-1.5 text-sm border-b last:border-0">
              <span className="font-mono text-xs">{t.signal_type}</span>
              <Badge>{t.count}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Tenants com signals</span><Badge>{a.tenants_with_signals ?? 0}</Badge></div>
          <div className="flex justify-between"><span>Trials expirando 7d</span><Badge variant="destructive">{a.expiring_trials_7d ?? 0}</Badge></div>
          <div className="flex justify-between"><span>Click-through rate (30d)</span><Badge>{a.click_through_rate_30d ?? 0}%</Badge></div>
        </CardContent>
      </Card>
    </div>
  );
}
