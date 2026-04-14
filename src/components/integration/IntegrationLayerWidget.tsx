import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Cable, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle,
  Landmark, FileText, CreditCard, MessageCircle, Users,
  BarChart3, Globe, FileDown, RefreshCw, Zap, Clock,
} from "lucide-react";
import { useIntegrationLayer, ConnectorInfo, ConnectorStatus } from "@/hooks/useIntegrationLayer";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Tab = "conectores" | "syncs" | "api";

const ICON_MAP: Record<string, React.ElementType> = {
  Landmark, FileText, FileDown, CreditCard, MessageCircle, Users, BarChart3, Globe,
};

const STATUS_CONFIG: Record<ConnectorStatus, { label: string; color: string }> = {
  connected: { label: "Conectado", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  configured: { label: "Configurado", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  available: { label: "Disponível", color: "bg-muted text-muted-foreground border-border/50" },
  error: { label: "Erro", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

const CATEGORY_LABELS: Record<string, string> = {
  banking: "Bancário", fiscal: "Fiscal", acquirer: "Adquirentes",
  communication: "Comunicação", crm: "CRM", bi: "BI Externo", api: "API",
};

export function IntegrationLayerWidget() {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("conectores");
  const { data, isLoading } = useIntegrationLayer();

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;
  const { stats } = data;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cable className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Integrações</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {stats.activeConnectors}/{stats.totalConnectors} ativos
            </Badge>
            {stats.errorRate > 0 && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{stats.errorRate}% erros</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <StatCard icon={<Zap className="h-3.5 w-3.5 text-primary" />} label="Conectores Ativos" value={stats.activeConnectors} />
          <StatCard icon={<RefreshCw className="h-3.5 w-3.5 text-emerald-500" />} label="Registros Sync" value={stats.totalSynced} />
          <StatCard icon={<CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />} label="Auto-Classificado" value={`${stats.autoClassifiedPercent}%`} />
          <StatCard icon={<Clock className="h-3.5 w-3.5 text-amber-500" />} label="Pend. Classificar" value={stats.pendingClassification} />
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 animate-in fade-in-0 duration-200">
            <div className="flex gap-1 border-b border-border/50 pb-1">
              {([
                { key: "conectores" as Tab, label: "Conectores", icon: Cable },
                { key: "syncs" as Tab, label: "Sincronizações", icon: RefreshCw, count: data.recentSyncs.length },
                { key: "api" as Tab, label: "API & Webhooks", icon: Globe },
              ]).map(t => (
                <Button key={t.key} variant={tab === t.key ? "default" : "ghost"} size="sm" className="h-7 text-[11px] gap-1" onClick={() => setTab(t.key)}>
                  <t.icon className="h-3 w-3" />{t.label}
                  {t.count != null && t.count > 0 && <span className="text-[9px] opacity-70">({t.count})</span>}
                </Button>
              ))}
            </div>

            {tab === "conectores" && <ConnectorsTab connectors={data.connectors} />}
            {tab === "syncs" && <SyncsTab syncs={data.recentSyncs} />}
            {tab === "api" && <ApiTab webhookUrl={data.webhookUrl} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/50 p-2">
      <div className="flex items-center gap-1 mb-1">{icon}<span className="text-[10px] text-muted-foreground">{label}</span></div>
      <p className="text-sm font-bold font-mono">{value}</p>
    </div>
  );
}

function ConnectorsTab({ connectors }: { connectors: ConnectorInfo[] }) {
  const grouped = connectors.reduce<Record<string, ConnectorInfo[]>>((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-3 max-h-[280px] overflow-y-auto">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{CATEGORY_LABELS[cat] || cat}</span>
          <div className="space-y-1 mt-1">
            {items.map(c => {
              const Icon = ICON_MAP[c.icon] || Cable;
              const statusCfg = STATUS_CONFIG[c.status];
              return (
                <div key={c.id} className="rounded-lg border border-border/50 p-2 flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium truncate">{c.name}</span>
                      <Badge variant="outline" className={`text-[9px] h-3.5 px-1 ${statusCfg.color}`}>{statusCfg.label}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{c.description}</p>
                  </div>
                  {c.recordsSynced > 0 && (
                    <span className="text-[9px] font-mono text-muted-foreground shrink-0">{c.recordsSynced} reg.</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SyncsTab({ syncs }: { syncs: ReturnType<typeof useIntegrationLayer>["data"] extends infer T ? T extends { recentSyncs: infer S } ? S : never : never }) {
  if (!syncs || syncs.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Nenhuma sincronização recente.</p>;
  }

  return (
    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
      {syncs.map(s => (
        <div key={s.id} className={`rounded-lg border p-2 ${s.status === "error" ? "border-destructive/30 bg-destructive/5" : "border-border/50"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {s.status === "success" ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : s.status === "error" ? <AlertTriangle className="h-3 w-3 text-destructive" /> : <Clock className="h-3 w-3 text-amber-500" />}
              <span className="text-[11px] font-medium">{s.connector}</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">
              {formatDistanceToNow(new Date(s.timestamp), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{s.event}</span>
            <span className="text-[9px] font-mono">{s.recordCount} registros</span>
          </div>
          {s.details && <p className="text-[9px] text-destructive mt-0.5">{s.details}</p>}
        </div>
      ))}
    </div>
  );
}

function ApiTab({ webhookUrl }: { webhookUrl: string | null }) {
  const endpoints = [
    { method: "POST", path: "/api/pedidos", description: "Criar pedido externo" },
    { method: "POST", path: "/api/clientes", description: "Cadastrar cliente" },
    { method: "POST", path: "/api/receitas", description: "Registrar receita" },
    { method: "POST", path: "/api/despesas", description: "Registrar despesa" },
    { method: "GET", path: "/api/dre", description: "Consultar DRE" },
    { method: "GET", path: "/api/fluxo-caixa", description: "Consultar fluxo de caixa" },
  ];

  return (
    <div className="space-y-3">
      {/* Webhook Status */}
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Webhook n8n</span>
        <div className={`rounded-lg border p-2 mt-1 ${webhookUrl ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
          <div className="flex items-center gap-1.5">
            {webhookUrl ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
            <span className="text-xs font-medium">{webhookUrl ? "Webhook configurado" : "Webhook não configurado"}</span>
          </div>
          {webhookUrl && <p className="text-[9px] text-muted-foreground mt-0.5 font-mono truncate">{webhookUrl}</p>}
        </div>
      </div>

      {/* API Endpoints */}
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Endpoints API Pública</span>
        <div className="space-y-1 mt-1">
          {endpoints.map((ep, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-1.5 flex items-center gap-2">
              <Badge variant={ep.method === "POST" ? "default" : "secondary"} className="text-[9px] h-4 px-1 font-mono shrink-0">
                {ep.method}
              </Badge>
              <span className="text-[10px] font-mono text-muted-foreground">{ep.path}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{ep.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
