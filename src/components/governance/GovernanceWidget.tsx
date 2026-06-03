import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, ChevronDown, ChevronUp, Lock, Unlock,
  History, CheckCircle2, AlertTriangle, UserCheck,
  FileText, ShieldCheck,
} from "lucide-react";
import {
  useGovernanceLayer,
  PERMISSION_MATRIX,
  PERMISSION_LABELS,
  type PermissionLevel,
  type AuditEntry,
} from "@/hooks/useGovernanceLayer";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const LEVEL_LABELS: Record<PermissionLevel, { label: string; color: string }> = {
  owner: { label: "Owner Sistema", color: "text-primary" },
  admin: { label: "Admin Empresa", color: "text-emerald-600" },
  gestor: { label: "Gestor Setor", color: "text-amber-600" },
  operador: { label: "Operador", color: "text-muted-foreground" },
  visualizacao: { label: "Visualização", color: "text-muted-foreground" },
};

const TABLE_LABELS: Record<string, string> = {
  fin_ledger_entries: "Livro Razão",
  fin_chart_accounts: "Plano de Contas",
  fin_cost_centers: "Centros de Custo",
  fin_payables: "Contas a Pagar",
  fin_receivables: "Contas a Receber",
  orders: "Pedidos",
  company_settings: "Configurações",
  clients: "Clientes",
  quotes: "Propostas",
};

type Tab = "auditoria" | "permissoes" | "bloqueios";

export function GovernanceWidget() {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("auditoria");
  const { data, isLoading } = useGovernanceLayer();

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { stats, userLevel } = data;
  const lvl = LEVEL_LABELS[userLevel];

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Governança & Controle</span>
            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${lvl.color}`}>{lvl.label}</Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <StatCard icon={<History className="h-3.5 w-3.5 text-primary" />} label="Audit 7d" value={stats.totalAuditEntries7d} />
          <StatCard icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />} label="Críticas" value={stats.criticalChanges7d} isAlert={stats.criticalChanges7d > 0} />
          <StatCard icon={<Lock className="h-3.5 w-3.5 text-muted-foreground" />} label="Bloqueios" value={stats.activeStructuralLocks} />
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 animate-in fade-in-0 duration-200">
            <div className="flex gap-1 border-b border-border/50 pb-1">
              {([
                { key: "auditoria" as Tab, label: "Auditoria", icon: History, count: data.recentAudit.length },
                { key: "permissoes" as Tab, label: "Permissões", icon: UserCheck },
                { key: "bloqueios" as Tab, label: "Bloqueios", icon: Lock, count: data.structuralLocks.length },
              ]).map(t => (
                <Button key={t.key} variant={tab === t.key ? "default" : "ghost"} size="sm" className="h-7 text-[11px] gap-1" onClick={() => setTab(t.key)}>
                  <t.icon className="h-3 w-3" />{t.label}
                  {t.count != null && t.count > 0 && <span className="text-[9px] opacity-70">({t.count})</span>}
                </Button>
              ))}
            </div>

            {tab === "auditoria" && <AuditPanel entries={data.recentAudit} />}
            {tab === "permissoes" && <PermissionsPanel currentLevel={userLevel} />}
            {tab === "bloqueios" && <LocksPanel locks={data.structuralLocks} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value, isAlert }: { icon: React.ReactNode; label: string; value: number; isAlert?: boolean }) {
  return (
    <div className="rounded-lg border border-border/50 p-2">
      <div className="flex items-center gap-1 mb-1">{icon}<span className="text-[10px] text-muted-foreground">{label}</span></div>
      <p className={`text-sm font-bold font-mono ${isAlert ? "text-amber-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function AuditPanel({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Nenhuma alteração nos últimos 7 dias.</p>;
  return (
    <div className="space-y-1 max-h-[240px] overflow-y-auto">
      {entries.slice(0, 15).map(e => (
        <div key={e.id} className="rounded-lg border border-border/50 p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-medium">{TABLE_LABELS[e.table_name] || e.table_name}</span>
              <Badge variant="outline" className="text-[9px] h-3.5 px-1">{e.event_type}</Badge>
            </div>
            <span className="text-[9px] text-muted-foreground">
              {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          {e.field_name && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground">{e.field_name}:</span>
              {e.old_value && <span className="text-[10px] line-through text-destructive/70 font-mono truncate max-w-[100px]">{e.old_value}</span>}
              {e.new_value && <span className="text-[10px] text-emerald-600 font-mono truncate max-w-[100px]">{e.new_value}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PermissionsPanel({ currentLevel }: { currentLevel: PermissionLevel }) {
  const levels: PermissionLevel[] = ["owner", "admin", "gestor", "operador", "visualizacao"];
  const permKeys = Object.keys(PERMISSION_LABELS);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-1 pr-2 text-muted-foreground font-medium">Permissão</th>
            {levels.map(l => (
              <th key={l} className={`text-center py-1 px-1 font-medium ${l === currentLevel ? "text-primary" : "text-muted-foreground"}`}>
                {LEVEL_LABELS[l].label.split(" ")[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permKeys.map(k => (
            <tr key={k} className="border-b border-border/30">
              <td className="py-1 pr-2 text-muted-foreground">{PERMISSION_LABELS[k]}</td>
              {levels.map(l => (
                <td key={l} className="text-center py-1">
                  {PERMISSION_MATRIX[l][k]
                    ? <CheckCircle2 className="h-3 w-3 text-emerald-500 mx-auto" />
                    : <span className="text-muted-foreground/30">—</span>
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LocksPanel({ locks }: { locks: { id: string; entity: string; reason: string; locked: boolean; canOverride: boolean }[] }) {
  return (
    <div className="space-y-1.5">
      {locks.map(lock => (
        <div key={lock.id} className={`rounded-lg border p-2.5 ${lock.locked ? "border-amber-500/30 bg-amber-500/5" : "border-border/50"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {lock.locked ? <Lock className="h-3.5 w-3.5 text-amber-600" /> : <Unlock className="h-3.5 w-3.5 text-emerald-500" />}
              <span className="text-xs font-semibold">{lock.entity}</span>
            </div>
            {lock.canOverride && (
              <Badge variant="outline" className="text-[9px] h-3.5 px-1 text-primary border-primary/30">
                <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />Override
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 ml-5">{lock.reason}</p>
        </div>
      ))}
    </div>
  );
}
