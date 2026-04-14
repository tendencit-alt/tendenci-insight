import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Link2, ChevronDown, ChevronRight, FileText, ShoppingCart,
  CalendarClock, Upload, PenLine, Layers, TrendingUp,
  ShieldCheck, AlertTriangle, CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ORIGIN_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  pedido: { label: "Pedido", icon: ShoppingCart, color: "text-blue-600" },
  compra: { label: "Compra", icon: FileText, color: "text-purple-600" },
  contrato_recorrente: { label: "Contrato Recorrente", icon: CalendarClock, color: "text-cyan-600" },
  folha: { label: "Folha de Pagamento", icon: FileText, color: "text-amber-600" },
  importacao_bancaria: { label: "Importação OFX", icon: Upload, color: "text-green-600" },
  manual: { label: "Manual", icon: PenLine, color: "text-muted-foreground" },
};

const LAYER_COLORS: Record<string, string> = {
  dre: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  fluxo: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  forecast: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  budget: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  kpi: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
};

export function OriginLinksPanel() {
  const [expandedOrigin, setExpandedOrigin] = useState<string | null>(null);

  // Origin links summary
  const { data: links, isLoading } = useQuery({
    queryKey: ["fin-origin-links-summary"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_origin_links")
        .select("id, origin_type, origin_id, impact_type, impact_layer, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  // Maturity metrics
  const { data: maturity } = useQuery({
    queryKey: ["fin-erp-maturity"],
    queryFn: async () => {
      const q = (table: string, filters: Record<string, string> = {}) => {
        let query = (supabase as any).from(table).select("id", { count: "exact", head: true });
        Object.entries(filters).forEach(([k, v]) => { query = query.eq(k, v); });
        return query;
      };

      const [totalRes, linkedRes, manualRes, cancelledRes] = await Promise.all([
        (supabase as any).from("fin_ledger_entries").select("id", { count: "exact", head: true }).neq("status", "CANCELADO"),
        q("fin_origin_links", { status: "active" }),
        (supabase as any).from("fin_ledger_entries").select("id", { count: "exact", head: true }).neq("status", "CANCELADO").is("source_id", null),
        q("fin_origin_links", { status: "cancelled" }),
      ]);

      const total = totalRes.count || 0;
      const linked = linkedRes.count || 0;
      const manual = manualRes.count || 0;
      const cancelled = cancelledRes.count || 0;
      const auto = total - manual;

      return {
        total,
        auto,
        manual,
        linked,
        cancelled,
        pctAuto: total > 0 ? (auto / total) * 100 : 0,
        pctManual: total > 0 ? (manual / total) * 100 : 0,
        pctLinked: total > 0 ? (linked / total) * 100 : 0,
        maturityScore: total > 0 ? Math.min(100, ((auto / total) * 60 + (linked / total) * 40) * 100) : 0,
      };
    },
  });

  // Group links by origin_type
  const grouped = useMemo(() => {
    if (!links) return [];
    const map = new Map<string, { type: string; count: number; active: number; cancelled: number; layers: Set<string> }>();
    links.forEach((l: any) => {
      const existing = map.get(l.origin_type) || { type: l.origin_type, count: 0, active: 0, cancelled: 0, layers: new Set<string>() };
      existing.count++;
      if (l.status === "active") existing.active++;
      else existing.cancelled++;
      existing.layers.add(l.impact_layer);
      map.set(l.origin_type, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [links]);

  // Links for expanded origin
  const expandedLinks = useMemo(() => {
    if (!expandedOrigin || !links) return [];
    return links.filter((l: any) => l.origin_type === expandedOrigin);
  }, [expandedOrigin, links]);

  return (
    <div className="space-y-4">
      {/* Maturity Indicator */}
      {maturity ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Maturidade ERP — Integração Financeira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <Progress
                  value={maturity.maturityScore}
                  className={cn("h-4", maturity.maturityScore >= 70 ? "[&>div]:bg-green-500" : maturity.maturityScore >= 40 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500")}
                />
              </div>
              <span className={cn(
                "text-2xl font-bold font-mono",
                maturity.maturityScore >= 70 ? "text-green-600" : maturity.maturityScore >= 40 ? "text-amber-600" : "text-red-600"
              )}>
                {maturity.maturityScore.toFixed(0)}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricMini label="Total Lançamentos" value={maturity.total.toString()} />
              <MetricMini label="Automáticos" value={`${maturity.pctAuto.toFixed(0)}%`} sub={`${maturity.auto}`} color="green" />
              <MetricMini label="Manuais" value={`${maturity.pctManual.toFixed(0)}%`} sub={`${maturity.manual}`} color={maturity.pctManual <= 40 ? "green" : "amber"} />
              <MetricMini label="Vínculos Ativos" value={maturity.linked.toString()} sub={`${maturity.cancelled} cancelados`} color="blue" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Skeleton className="h-[160px]" />
      )}

      {/* Origin breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Rastreabilidade por Origem
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px]" />
          ) : !grouped.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum vínculo de origem registrado. Vínculos são criados automaticamente quando pedidos são aprovados, contratos recorrentes geram lançamentos, ou importações OFX são processadas.
            </p>
          ) : (
            <div className="space-y-2">
              {grouped.map((g) => {
                const cfg = ORIGIN_LABELS[g.type] || ORIGIN_LABELS.manual;
                const Icon = cfg.icon;
                const isExpanded = expandedOrigin === g.type;

                return (
                  <Collapsible key={g.type} open={isExpanded} onOpenChange={(open) => setExpandedOrigin(open ? g.type : null)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                        {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        <Icon className={cn("h-4 w-4 shrink-0", cfg.color)} />
                        <span className="text-sm font-medium flex-1">{cfg.label}</span>
                        <div className="flex items-center gap-1.5">
                          {Array.from(g.layers).map((layer) => (
                            <Badge key={layer} variant="secondary" className={cn("text-[9px] px-1.5", LAYER_COLORS[layer])}>
                              {layer.toUpperCase()}
                            </Badge>
                          ))}
                          <Badge variant="outline" className="text-[10px]">{g.active} ativos</Badge>
                          {g.cancelled > 0 && (
                            <Badge variant="destructive" className="text-[10px]">{g.cancelled} canc.</Badge>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ScrollArea className="max-h-[200px] ml-6 mt-1">
                        <div className="space-y-1">
                          {expandedLinks.map((link: any) => (
                            <div key={link.id} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs border-l-2 border-muted bg-muted/20">
                              <Layers className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="text-muted-foreground">{link.impact_type}</span>
                              <Badge variant="secondary" className={cn("text-[9px]", LAYER_COLORS[link.impact_layer])}>
                                {link.impact_layer}
                              </Badge>
                              <span className={cn("text-[10px] ml-auto", link.status === "cancelled" ? "text-red-500 line-through" : "text-green-600")}>
                                {link.status === "active" ? "✓ Ativo" : "✗ Cancelado"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {link.created_at ? format(new Date(link.created_at), "dd/MM HH:mm") : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration flow diagram */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Fluxo de Propagação Automática
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1.5 text-xs">
            {[
              { from: "Pedido Aprovado", to: "Contas a Receber → DRE (competência) → Fluxo (vencimento) → KPIs", icon: ShoppingCart },
              { from: "Liquidação Registrada", to: "Fluxo Realizado → Saldo Caixa → Dashboard Executivo", icon: CheckCircle },
              { from: "Conciliação Bancária", to: "Saldo Caixa Confirmado → Fluxo Realizado → KPIs", icon: ShieldCheck },
              { from: "Contrato Recorrente", to: "Fluxo Previsto → Forecast → Resultado Projetado", icon: CalendarClock },
              { from: "Pedido Cancelado", to: "Cancela: Contas + DRE + Fluxo + KPIs vinculados", icon: AlertTriangle },
            ].map((flow, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/30 border">
                <flow.icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", i === 4 ? "text-red-500" : "text-primary")} />
                <div>
                  <span className="font-medium">{flow.from}</span>
                  <span className="text-muted-foreground mx-1.5">→</span>
                  <span className="text-muted-foreground">{flow.to}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricMini({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const colorCls = color === "green" ? "text-green-600" : color === "amber" ? "text-amber-600" : color === "blue" ? "text-blue-600" : "text-foreground";
  return (
    <div className="text-center p-2 rounded-lg bg-muted/30">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold font-mono", colorCls)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
