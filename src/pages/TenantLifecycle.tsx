import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ShieldAlert, Activity, TrendingUp, AlertTriangle, Heart, Sparkles } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import {
  useLifecycleOverview,
  useRecomputeLifecycle,
  useLifecycleAiInsight,
  type LifecycleOverviewRow,
} from "@/hooks/useTenantLifecycle";

const bandColor = (b: string) =>
  b === "alto" || b === "baixo" ? "destructive"
  : b === "moderado" ? "secondary"
  : "default";

const engColor = (b: string) =>
  b === "power_user" ? "default"
  : b === "saudavel" ? "default"
  : b === "moderado" ? "secondary"
  : "destructive";

function HealthCell({ value }: { value: number }) {
  const tone = value >= 75 ? "bg-primary" : value >= 50 ? "bg-secondary" : "bg-destructive";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-xs tabular-nums w-9 text-right">{Math.round(value)}</span>
    </div>
  );
}

function OverviewTable({ rows }: { rows: LifecycleOverviewRow[] }) {
  const aiInsight = useLifecycleAiInsight();
  const { toast } = useToast();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b">
          <tr>
            <th className="text-left p-2">Empresa</th>
            <th className="text-left p-2">Activation</th>
            <th className="text-left p-2">Engajamento</th>
            <th className="text-left p-2">Maturidade</th>
            <th className="text-left p-2">Expansion</th>
            <th className="text-left p-2">Churn Risk</th>
            <th className="text-left p-2">Health</th>
            <th className="text-left p-2">Ação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.tenant_id} className="border-b hover:bg-muted/40">
              <td className="p-2 font-medium">{r.tenant_name}</td>
              <td className="p-2"><HealthCell value={r.activation_score} /></td>
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <span className="tabular-nums w-9">{Math.round(r.engagement_score)}</span>
                  <Badge variant={engColor(r.engagement_band) as "default" | "secondary" | "destructive"}>{r.engagement_band}</Badge>
                </div>
              </td>
              <td className="p-2"><Badge variant="outline">{r.maturity_stage}</Badge></td>
              <td className="p-2"><HealthCell value={r.expansion_ready_score} /></td>
              <td className="p-2">
                <Badge variant={bandColor(r.churn_risk_band) as "default" | "secondary" | "destructive"}>
                  {Math.round(r.churn_risk_score)} · {r.churn_risk_band}
                </Badge>
              </td>
              <td className="p-2"><HealthCell value={r.lifecycle_health_index} /></td>
              <td className="p-2">
                <Button size="sm" variant="ghost" onClick={async () => {
                  const res = await aiInsight.mutateAsync(r.tenant_id);
                  toast({ title: r.tenant_name, description: res?.insight ?? "Sem insight" });
                }}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Insight IA
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TenantLifecycle() {
  const { isOwner, isMaster, loading } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const overview = useLifecycleOverview();
  const recompute = useRecomputeLifecycle();
  const [tab, setTab] = useState("heatmap");

  useEffect(() => {
    if (loading) return;
    if (!isOwner && !isMaster) {
      toast({ title: "Acesso restrito", description: "Apenas o Owner pode acessar.", variant: "destructive" });
      navigate("/", { replace: true });
    }
  }, [isOwner, isMaster, loading, navigate, toast]);

  const rows = overview.data ?? [];
  const stats = useMemo(() => {
    const total = rows.length;
    const churnHigh = rows.filter((r) => r.churn_risk_band === "alto").length;
    const expansionReady = rows.filter((r) => r.expansion_ready_score >= 70).length;
    const healthy = rows.filter((r) => r.lifecycle_health_index >= 75).length;
    const avgHealth = total ? Math.round(rows.reduce((a, b) => a + b.lifecycle_health_index, 0) / total) : 0;
    return { total, churnHigh, expansionReady, healthy, avgHealth };
  }, [rows]);

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }
  if (!isOwner && !isMaster) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Tenant Lifecycle · Owner
            </CardTitle>
            <Button onClick={() => recompute.mutate(undefined)} disabled={recompute.isPending} size="sm" variant="outline">
              {recompute.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Recalcular todos
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard label="Empresas ativas" value={stats.total} icon={<Activity className="h-4 w-4" />} />
            <KpiCard label="Saudáveis" value={stats.healthy} icon={<Heart className="h-4 w-4 text-primary" />} />
            <KpiCard label="Health médio" value={`${stats.avgHealth}%`} icon={<Heart className="h-4 w-4" />} />
            <KpiCard label="Pronto p/ upgrade" value={stats.expansionReady} icon={<TrendingUp className="h-4 w-4 text-primary" />} />
            <KpiCard label="Risco churn alto" value={stats.churnHigh} icon={<AlertTriangle className="h-4 w-4 text-destructive" />} />
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
            <TabsTrigger value="heatmap">Lifecycle Heatmap</TabsTrigger>
            <TabsTrigger value="activation">Activation</TabsTrigger>
            <TabsTrigger value="expansion">Expansion Signals</TabsTrigger>
            <TabsTrigger value="churn">Churn Radar</TabsTrigger>
            <TabsTrigger value="health">Health Index</TabsTrigger>
          </TabsList>

          <TabsContent value="heatmap" className="pt-4">
            <Card><CardContent className="pt-6">
              {overview.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <OverviewTable rows={rows} />}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="activation" className="pt-4">
            <Card><CardHeader><CardTitle className="text-base">Activation Status (ordenado por menor activation)</CardTitle></CardHeader>
              <CardContent>
                <OverviewTable rows={[...rows].sort((a, b) => a.activation_score - b.activation_score)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expansion" className="pt-4">
            <Card><CardHeader><CardTitle className="text-base">Expansion Ready (score ≥ 70)</CardTitle></CardHeader>
              <CardContent>
                <OverviewTable rows={rows.filter((r) => r.expansion_ready_score >= 70).sort((a, b) => b.expansion_ready_score - a.expansion_ready_score)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="churn" className="pt-4">
            <Card><CardHeader><CardTitle className="text-base">Churn Radar (risco moderado e alto)</CardTitle></CardHeader>
              <CardContent>
                <OverviewTable rows={rows.filter((r) => r.churn_risk_band !== "baixo").sort((a, b) => b.churn_risk_score - a.churn_risk_score)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="pt-4">
            <Card><CardHeader><CardTitle className="text-base">Health Index Dashboard (ordenado pelo menor)</CardTitle></CardHeader>
              <CardContent>
                <OverviewTable rows={[...rows].sort((a, b) => a.lifecycle_health_index - b.lifecycle_health_index)} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>{icon}
      </div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
