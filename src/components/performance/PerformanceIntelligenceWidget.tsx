import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Brain, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Lightbulb, BarChart3,
  DollarSign, Activity, ShieldAlert, ArrowUpRight,
} from "lucide-react";
import {
  usePerformanceIntelligence,
  type DiagnosticSeverity,
  type DiagnosticItem,
} from "@/hooks/usePerformanceIntelligence";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const SEV_STYLES: Record<DiagnosticSeverity, { border: string; bg: string; icon: any; text: string }> = {
  positivo: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", icon: CheckCircle2, text: "text-emerald-600" },
  neutro: { border: "border-border/50", bg: "bg-muted/30", icon: Activity, text: "text-muted-foreground" },
  atencao: { border: "border-amber-500/30", bg: "bg-amber-500/10", icon: AlertTriangle, text: "text-amber-600" },
  critico: { border: "border-destructive/30", bg: "bg-destructive/10", icon: ShieldAlert, text: "text-destructive" },
};

const CATEGORY_ICONS: Record<string, any> = {
  margem: BarChart3,
  caixa: DollarSign,
  crescimento: TrendingUp,
  risco: ShieldAlert,
  eficiencia: Activity,
};

type Tab = "diagnosticos" | "custos" | "recomendacoes";

export function PerformanceIntelligenceWidget() {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("diagnosticos");
  const { data, isLoading } = usePerformanceIntelligence();

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-56" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const critCount = data.diagnostics.filter(d => d.severity === "critico").length;
  const warnCount = data.diagnostics.filter(d => d.severity === "atencao").length;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Performance Intelligence</span>
            {critCount > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{critCount} crítico{critCount > 1 ? "s" : ""}</Badge>}
            {warnCount > 0 && <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-500/40">{warnCount} alerta{warnCount > 1 ? "s" : ""}</Badge>}
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Health Bars */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          <HealthBar label="Score Geral" value={data.overallScore} />
          <HealthBar label="Margem" value={data.marginHealth} />
          <HealthBar label="Caixa" value={data.cashHealth} />
          <HealthBar label="Crescimento" value={data.growthHealth} />
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 animate-in fade-in-0 duration-200">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-border/50 pb-1">
              {([
                { key: "diagnosticos" as Tab, label: "Diagnósticos", icon: Brain, count: data.diagnostics.length },
                { key: "custos" as Tab, label: "Top Custos", icon: BarChart3, count: data.costRanking.length },
                { key: "recomendacoes" as Tab, label: "Recomendações", icon: Lightbulb, count: data.recommendations.length },
              ]).map(t => (
                <Button key={t.key} variant={tab === t.key ? "default" : "ghost"} size="sm" className="h-7 text-[11px] gap-1" onClick={() => setTab(t.key)}>
                  <t.icon className="h-3 w-3" />{t.label}
                  {t.count > 0 && <span className="ml-0.5 text-[9px] opacity-70">({t.count})</span>}
                </Button>
              ))}
            </div>

            {tab === "diagnosticos" && <DiagnosticsPanel items={data.diagnostics} />}
            {tab === "custos" && <CostRankingPanel items={data.costRanking} />}
            {tab === "recomendacoes" && <RecommendationsPanel items={data.recommendations} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HealthBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-destructive";
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono font-bold">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function DiagnosticsPanel({ items }: { items: DiagnosticItem[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Nenhum diagnóstico relevante no período.</p>;
  }

  const sorted = [...items].sort((a, b) => {
    const order: Record<DiagnosticSeverity, number> = { critico: 0, atencao: 1, neutro: 2, positivo: 3 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-1.5">
      {sorted.map(item => {
        const style = SEV_STYLES[item.severity];
        const Icon = style.icon;
        const CatIcon = CATEGORY_ICONS[item.category] || Activity;
        return (
          <div key={item.id} className={`rounded-lg border p-2.5 ${style.border} ${style.bg}`}>
            <div className="flex items-start gap-2">
              <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${style.text}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">{item.title}</span>
                  {item.value && <Badge variant="outline" className="text-[9px] h-3.5 px-1">{item.value}</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              <CatIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CostRankingPanel({ items }: { items: { name: string; amount: number; pctOfTotal: number }[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Sem dados de custos no período.</p>;
  }
  const maxAmount = items[0]?.amount || 1;
  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-lg border border-border/50 p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground w-4">#{idx + 1}</span>
              <span className="text-xs font-medium truncate max-w-[200px]">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono">{item.pctOfTotal.toFixed(1)}%</span>
              <span className="text-xs font-mono font-bold">{fmt(item.amount)}</span>
            </div>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${(item.amount / maxAmount) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecommendationsPanel({ items }: { items: { id: string; title: string; description: string; impact: string; category: string }[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Sem recomendações no momento. Bom sinal!</p>;
  }

  const impactColors: Record<string, string> = {
    alto: "bg-destructive/10 text-destructive border-destructive/30",
    medio: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    baixo: "bg-muted text-muted-foreground border-border/50",
  };

  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item.id} className="rounded-lg border border-border/50 p-2.5">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold">{item.title}</span>
                <Badge variant="outline" className={`text-[9px] h-3.5 px-1 ${impactColors[item.impact] || ""}`}>
                  {item.impact}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            <ArrowUpRight className="h-3 w-3 text-muted-foreground shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
