import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database, ChevronDown, ChevronUp, Users, Package,
  FolderTree, AlertTriangle, CheckCircle2, CreditCard,
  Landmark, Copy, Lightbulb,
} from "lucide-react";
import {
  useMasterDataLayer,
  STANDARD_COST_CENTERS,
  STANDARD_PAYMENT_METHODS,
  STANDARD_BANK_CATEGORIES,
} from "@/hooks/useMasterDataLayer";

type Tab = "resumo" | "duplicados" | "classificacao" | "padroes";

export function MasterDataWidget() {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("resumo");
  const { data, isLoading } = useMasterDataLayer();

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-44" />
          <div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;
  const { stats } = data;
  const hasDuplicates = stats.duplicateCandidates > 0;
  const hasUncategorized = stats.uncategorizedSuppliers > 0;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Dados Mestres</span>
            {hasDuplicates && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{stats.duplicateCandidates} duplicados</Badge>}
            {hasUncategorized && <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-500/40">{stats.uncategorizedSuppliers} sem categ.</Badge>}
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <StatCard icon={<Package className="h-3.5 w-3.5 text-primary" />} label="Fornecedores" value={stats.totalSuppliers} />
          <StatCard icon={<Users className="h-3.5 w-3.5 text-emerald-500" />} label="Clientes" value={stats.totalClients} />
          <StatCard icon={<FolderTree className="h-3.5 w-3.5 text-amber-500" />} label="Centros Custo" value={stats.totalCostCenters} />
          <StatCard icon={<Landmark className="h-3.5 w-3.5 text-primary" />} label="Contas Bancárias" value={stats.totalBankAccounts} />
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 animate-in fade-in-0 duration-200">
            <div className="flex gap-1 border-b border-border/50 pb-1">
              {([
                { key: "resumo" as Tab, label: "Resumo", icon: Database },
                { key: "duplicados" as Tab, label: "Duplicados", icon: Copy, count: stats.duplicateCandidates },
                { key: "classificacao" as Tab, label: "Classificação", icon: Lightbulb, count: stats.classificationSuggestions },
                { key: "padroes" as Tab, label: "Padrões", icon: CheckCircle2 },
              ]).map(t => (
                <Button key={t.key} variant={tab === t.key ? "default" : "ghost"} size="sm" className="h-7 text-[11px] gap-1" onClick={() => setTab(t.key)}>
                  <t.icon className="h-3 w-3" />{t.label}
                  {t.count != null && t.count > 0 && <span className="text-[9px] opacity-70">({t.count})</span>}
                </Button>
              ))}
            </div>

            {tab === "resumo" && <SummaryTab data={data} />}
            {tab === "duplicados" && <DuplicatesTab data={data} />}
            {tab === "classificacao" && <ClassificationTab data={data} />}
            {tab === "padroes" && <StandardsTab />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/50 p-2">
      <div className="flex items-center gap-1 mb-1">{icon}<span className="text-[10px] text-muted-foreground">{label}</span></div>
      <p className="text-sm font-bold font-mono">{value}</p>
    </div>
  );
}

function SummaryTab({ data }: { data: ReturnType<typeof useMasterDataLayer>["data"] }) {
  if (!data) return null;
  const checks = [
    { label: "Fornecedores categorizados", ok: data.stats.uncategorizedSuppliers === 0, detail: data.stats.uncategorizedSuppliers > 0 ? `${data.stats.uncategorizedSuppliers} sem categoria` : "Todos categorizados" },
    { label: "Sem duplicidades", ok: data.stats.duplicateCandidates === 0, detail: data.stats.duplicateCandidates > 0 ? `${data.stats.duplicateCandidates} candidatos` : "Nenhuma duplicidade" },
    { label: "Centros de custo ativos", ok: data.costCenters.filter(c => c.status === "ativo").length >= 3, detail: `${data.costCenters.filter(c => c.status === "ativo").length} ativos` },
    { label: "Contas bancárias ativas", ok: data.bankAccounts.filter(b => b.status === "ativo").length >= 1, detail: `${data.bankAccounts.filter(b => b.status === "ativo").length} ativas` },
  ];

  return (
    <div className="space-y-1.5">
      {checks.map((c, i) => (
        <div key={i} className={`rounded-lg border p-2 flex items-center gap-2 ${c.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
          {c.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          <div className="flex-1">
            <span className="text-xs font-medium">{c.label}</span>
            <p className="text-[10px] text-muted-foreground">{c.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DuplicatesTab({ data }: { data: ReturnType<typeof useMasterDataLayer>["data"] }) {
  if (!data) return null;
  const all = [...data.supplierDuplicates, ...data.clientDuplicates];
  if (all.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Nenhuma duplicidade detectada. ✓</p>;

  return (
    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
      {all.map((d, i) => (
        <div key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className="text-[9px] h-3.5 px-1">{d.entity}</Badge>
            <span className="text-[9px] text-muted-foreground font-mono">{(d.similarity * 100).toFixed(0)}% similar</span>
          </div>
          <div className="flex items-center gap-2">
            <Copy className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="text-[11px] font-medium truncate">{d.name}</span>
            <span className="text-[10px] text-muted-foreground">↔</span>
            <span className="text-[11px] font-medium truncate">{d.matchName}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClassificationTab({ data }: { data: ReturnType<typeof useMasterDataLayer>["data"] }) {
  if (!data) return null;
  const sug = data.classificationSuggestions;
  if (sug.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Todos os fornecedores estão classificados. ✓</p>;

  return (
    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
      {sug.map((s, i) => (
        <div key={i} className="rounded-lg border border-border/50 p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium truncate max-w-[200px]">{s.supplierName}</span>
            <Badge variant="outline" className="text-[9px] h-3.5 px-1">{s.confidence}%</Badge>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Lightbulb className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] text-muted-foreground">Baseado em {s.basedOn} lançamentos anteriores</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StandardsTab() {
  return (
    <div className="space-y-3">
      <StandardGroup title="Centros de Custo Padrão" icon={<FolderTree className="h-3 w-3 text-amber-500" />} items={STANDARD_COST_CENTERS} />
      <StandardGroup title="Formas de Pagamento" icon={<CreditCard className="h-3 w-3 text-primary" />} items={STANDARD_PAYMENT_METHODS} />
      <StandardGroup title="Categorias Bancárias" icon={<Landmark className="h-3 w-3 text-primary" />} items={STANDARD_BANK_CATEGORIES} />
    </div>
  );
}

function StandardGroup({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[11px] font-semibold">{title}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map(item => (
          <Badge key={item} variant="secondary" className="text-[10px] h-5 px-1.5">{item}</Badge>
        ))}
      </div>
    </div>
  );
}
