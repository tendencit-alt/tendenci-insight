import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle, Clock, RefreshCw, Network, TrendingUp, ShieldAlert,
} from "lucide-react";
import { useIntegrationMap, useReconcileIntegrationHealth } from "@/hooks/useIntegrationMap";
import { IntegrationGraph } from "@/components/owner/IntegrationGraph";
import { ModuleDetailDrawer } from "@/components/owner/ModuleDetailDrawer";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  green: { label: "Saudável", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  yellow: { label: "Atenção", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  red: { label: "Erro", className: "bg-destructive/15 text-destructive border-destructive/30" },
  gray: { label: "Sem dados", className: "bg-muted text-muted-foreground border-border" },
};

export default function OwnerIntegrationMap() {
  const { data, isLoading } = useIntegrationMap();
  const reconcile = useReconcileIntegrationHealth();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const tableRows = useMemo(() => {
    if (!data) return [];
    const moduleMap = new Map(data.modules.map((m) => [m.code, m]));
    const snapMap = new Map(
      data.snapshots.map((s) => [`${s.source_module_code}|${s.target_module_code}`, s]),
    );
    return data.edges
      .map((e) => {
        const snap = snapMap.get(`${e.source_module_code}|${e.target_module_code}`);
        return {
          edge: e,
          source: moduleMap.get(e.source_module_code),
          target: moduleMap.get(e.target_module_code),
          snap,
        };
      })
      .sort((a, b) => {
        const order = { red: 0, yellow: 1, gray: 2, green: 3 };
        const sa = order[(a.snap?.current_status || "gray") as keyof typeof order];
        const sb = order[(b.snap?.current_status || "gray") as keyof typeof order];
        return sa - sb;
      });
  }, [data]);

  const alerts = useMemo(() => tableRows.filter((r) => r.snap?.current_status === "red"), [tableRows]);

  const handleReconcile = async () => {
    try {
      const res = await reconcile.mutateAsync();
      toast.success(`Reconciliação: ${res?.result?.processed || 0} integrações atualizadas`);
    } catch {
      toast.error("Falha ao reconciliar");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const ov = data?.overview;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Network className="h-6 w-6 text-primary" />
            Integration Map
          </h1>
          <p className="text-sm text-muted-foreground">
            Mapa vivo da comunicação entre módulos do ERP Tendenci
          </p>
        </div>
        <Button onClick={handleReconcile} disabled={reconcile.isPending} size="sm" variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${reconcile.isPending ? "animate-spin" : ""}`} />
          Reconciliar agora
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          label="Integrações saudáveis"
          value={`${ov?.healthy_pct ?? 0}%`}
          subtitle={`${ov?.green ?? 0} de ${ov?.total ?? 0}`}
        />
        <KpiCard
          icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
          label="Críticas em erro"
          value={ov?.critical_red ?? 0}
          subtitle="alta criticidade"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          label="Em atenção"
          value={ov?.yellow ?? 0}
          subtitle={`${ov?.gray ?? 0} sem dados`}
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          label="Último erro sistêmico"
          value={ov?.last_systemic_error
            ? formatDistanceToNow(new Date(ov.last_systemic_error), { addSuffix: true, locale: ptBR })
            : "—"}
          subtitle={ov?.red ? `${ov.red} integração(ões) em erro` : "tudo ok"}
        />
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Alertas ativos ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {alerts.slice(0, 5).map((r, i) => (
              <button
                key={i}
                onClick={() => setSelectedModule(r.edge.source_module_code)}
                className="flex w-full items-center justify-between rounded border border-destructive/20 bg-background p-2 text-left hover:bg-destructive/5"
              >
                <span className="text-xs">
                  <strong>{r.source?.name}</strong> → <strong>{r.target?.name}</strong>{" "}
                  {r.snap?.delay_minutes != null && `há ${r.snap.delay_minutes}m sem atualização`}
                </span>
                <Badge variant="outline" className="text-[10px] text-destructive">detalhar</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Grafo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mapa de integrações</CardTitle>
        </CardHeader>
        <CardContent>
          {data && (
            <IntegrationGraph
              modules={data.modules}
              edges={data.edges}
              snapshots={data.snapshots}
              onSelectModule={setSelectedModule}
            />
          )}
        </CardContent>
      </Card>

      {/* Tabela técnica */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detalhe técnico das relações ({tableRows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Origem</th>
                  <th className="p-2">Destino</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Último evento</th>
                  <th className="p-2">Atraso</th>
                  <th className="p-2">Crit.</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => {
                  const status = r.snap?.current_status || "gray";
                  const cfg = STATUS_BADGE[status];
                  return (
                    <tr
                      key={i}
                      className="cursor-pointer border-b border-border/40 hover:bg-muted/40"
                      onClick={() => setSelectedModule(r.edge.source_module_code)}
                    >
                      <td className="p-2 font-medium">{r.source?.name}</td>
                      <td className="p-2 font-medium">{r.target?.name}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                      </td>
                      <td className="p-2 font-mono">{r.snap?.health_score ?? 0}</td>
                      <td className="p-2 text-muted-foreground">
                        {r.snap?.last_event_at
                          ? formatDistanceToNow(new Date(r.snap.last_event_at), { addSuffix: true, locale: ptBR })
                          : "—"}
                      </td>
                      <td className="p-2 font-mono">{r.snap?.delay_minutes != null ? `${r.snap.delay_minutes}m` : "—"}</td>
                      <td className="p-2">
                        <Badge variant={r.edge.criticality === "high" ? "destructive" : "secondary"} className="text-[9px]">
                          {r.edge.criticality}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      <ModuleDetailDrawer moduleCode={selectedModule} onClose={() => setSelectedModule(null)} />
    </div>
  );
}

function KpiCard({ icon, label, value, subtitle }: { icon: React.ReactNode; label: string; value: any; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
