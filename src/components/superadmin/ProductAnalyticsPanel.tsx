import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, Building2, Clock, Eye, MousePointerClick,
  AlertTriangle, Layers, Users, Zap, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsEvent {
  id: string;
  tenant_id: string | null;
  user_id: string;
  event_type: string;
  module: string | null;
  feature: string | null;
  metadata: Record<string, unknown> | null;
  duration_ms: number | null;
  created_at: string;
}

type PeriodDays = 7 | 30 | 90;

export function ProductAnalyticsPanel() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodDays>(30);

  const fetchData = async () => {
    setLoading(true);
    const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await (supabase as any)
      .from("product_analytics_events")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [period]);

  // ── Derived analytics ──
  const pageViews = useMemo(() => events.filter(e => e.event_type === "page_view"), [events]);
  const featureUses = useMemo(() => events.filter(e => e.event_type === "feature_use"), [events]);
  const flowAbandons = useMemo(() => events.filter(e => e.event_type === "flow_abandon"), [events]);
  const durations = useMemo(() => events.filter(e => e.event_type === "page_duration"), [events]);

  // Module ranking
  const moduleRanking = useMemo(() => {
    const freq: Record<string, number> = {};
    pageViews.forEach(e => { if (e.module) freq[e.module] = (freq[e.module] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]);
  }, [pageViews]);

  // Feature ranking
  const featureRanking = useMemo(() => {
    const freq: Record<string, number> = {};
    featureUses.forEach(e => {
      const key = `${e.module} → ${e.feature}`;
      freq[key] = (freq[key] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]);
  }, [featureUses]);

  // Avg time per module
  const avgTimePerModule = useMemo(() => {
    const acc: Record<string, { total: number; count: number }> = {};
    durations.forEach(e => {
      if (e.module && e.duration_ms) {
        if (!acc[e.module]) acc[e.module] = { total: 0, count: 0 };
        acc[e.module].total += e.duration_ms;
        acc[e.module].count++;
      }
    });
    return Object.entries(acc)
      .map(([mod, d]) => ({ module: mod, avg: Math.round(d.total / d.count / 1000) }))
      .sort((a, b) => b.avg - a.avg);
  }, [durations]);

  // Per tenant usage
  const tenantUsage = useMemo(() => {
    const map: Record<string, { views: number; features: number; abandons: number; modules: Set<string> }> = {};
    events.forEach(e => {
      const tid = e.tenant_id || "sem-tenant";
      if (!map[tid]) map[tid] = { views: 0, features: 0, abandons: 0, modules: new Set() };
      if (e.event_type === "page_view") { map[tid].views++; if (e.module) map[tid].modules.add(e.module); }
      if (e.event_type === "feature_use") map[tid].features++;
      if (e.event_type === "flow_abandon") map[tid].abandons++;
    });
    return Object.entries(map)
      .map(([tid, d]) => ({ tenant_id: tid, ...d, moduleCount: d.modules.size }))
      .sort((a, b) => b.views - a.views);
  }, [events]);

  // Flow abandon ranking
  const abandonRanking = useMemo(() => {
    const freq: Record<string, number> = {};
    flowAbandons.forEach(e => {
      const key = `${e.module} → ${e.feature}`;
      freq[key] = (freq[key] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]);
  }, [flowAbandons]);

  const uniqueUsers = useMemo(() => new Set(events.map(e => e.user_id)).size, [events]);
  const uniqueTenants = useMemo(() => new Set(events.filter(e => e.tenant_id).map(e => e.tenant_id)).size, [events]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  const maxViews = moduleRanking[0]?.[1] || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Product Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Telemetria de uso real do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(period)} onValueChange={v => setPeriod(Number(v) as PeriodDays)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={<Eye className="h-5 w-5" />} label="Page Views" value={pageViews.length} />
        <KPICard icon={<MousePointerClick className="h-5 w-5" />} label="Feature Uses" value={featureUses.length} />
        <KPICard icon={<Users className="h-5 w-5" />} label="Usuários Ativos" value={uniqueUsers} />
        <KPICard icon={<Building2 className="h-5 w-5" />} label="Empresas Ativas" value={uniqueTenants} />
      </div>

      <Tabs defaultValue="modules" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="features">Funcionalidades</TabsTrigger>
          <TabsTrigger value="tenants">Por Empresa</TabsTrigger>
          <TabsTrigger value="time">Tempo Tela</TabsTrigger>
          <TabsTrigger value="abandons">Abandono</TabsTrigger>
        </TabsList>

        {/* Modules heatmap */}
        <TabsContent value="modules" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Heatmap Módulos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {moduleRanking.length === 0 && <p className="text-muted-foreground text-sm">Sem dados no período</p>}
              {moduleRanking.map(([mod, count]) => (
                <div key={mod} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{mod}</span>
                    <span className="text-muted-foreground">{count} acessos</span>
                  </div>
                  <Progress value={(count / maxViews) * 100} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature ranking */}
        <TabsContent value="features" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Ranking Funcionalidades</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Funcionalidade</TableHead>
                    <TableHead className="text-right">Usos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureRanking.slice(0, 20).map(([feat, count], i) => (
                    <TableRow key={feat}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{feat}</TableCell>
                      <TableCell className="text-right font-mono">{count}</TableCell>
                    </TableRow>
                  ))}
                  {featureRanking.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per tenant */}
        <TabsContent value="tenants" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Uso por Empresa</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Features</TableHead>
                    <TableHead className="text-right">Módulos</TableHead>
                    <TableHead className="text-right">Abandonos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantUsage.slice(0, 30).map(t => (
                    <TableRow key={t.tenant_id}>
                      <TableCell className="font-mono text-xs">{t.tenant_id.slice(0, 8)}…</TableCell>
                      <TableCell className="text-right">{t.views}</TableCell>
                      <TableCell className="text-right">{t.features}</TableCell>
                      <TableCell className="text-right">{t.moduleCount}</TableCell>
                      <TableCell className="text-right">
                        {t.abandons > 0 ? <Badge variant="destructive">{t.abandons}</Badge> : "0"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time per screen */}
        <TabsContent value="time" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Tempo Médio por Tela</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead className="text-right">Tempo Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avgTimePerModule.map(t => (
                    <TableRow key={t.module}>
                      <TableCell>{t.module}</TableCell>
                      <TableCell className="text-right font-mono">
                        {t.avg >= 60 ? `${Math.floor(t.avg / 60)}m ${t.avg % 60}s` : `${t.avg}s`}
                      </TableCell>
                    </TableRow>
                  ))}
                  {avgTimePerModule.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow abandons */}
        <TabsContent value="abandons" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Abandono de Fluxo</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fluxo</TableHead>
                    <TableHead className="text-right">Abandonos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abandonRanking.slice(0, 15).map(([flow, count]) => (
                    <TableRow key={flow}>
                      <TableCell>{flow}</TableCell>
                      <TableCell className="text-right"><Badge variant="destructive">{count}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {abandonRanking.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum abandono detectado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
