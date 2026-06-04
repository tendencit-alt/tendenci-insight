import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, List, Search, RefreshCw, Loader2, AlertTriangle, Clock, CheckCircle2, Factory, CalendarClock } from "lucide-react";
import { ProjectDetailSheet } from "@/components/projects/ProjectDetailSheet";
import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import { useProductionStatusColumns, colorTone, slaState } from "@/hooks/useProductionStatusColumns";
import { ManageProductionStatusDialog } from "./ManageProductionStatusDialog";

// Map legacy slugs that may still exist on production_orders rows.
const SLUG_ALIASES: Record<string, string> = {
  em_andamento: "em_producao",
  pausado: "em_producao",
};

// Parses date-only strings (YYYY-MM-DD) as local dates to avoid UTC timezone shifts.
function parseLocalDate(d: string | null | undefined): Date {
  if (!d) return new Date(NaN);
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}
function fmtBR(d: string | null | undefined): string {
  if (!d) return "—";
  return parseLocalDate(d).toLocaleDateString("pt-BR");
}

interface ProjectProductionRow {
  id: string;
  name: string | null;
  order_valor_total: number;
  deadline: string | null;
  tenant_id: string | null;
  client: { name: string | null } | null;
  architect: { name: string | null } | null;
  pos: { status: string; planned_end_date: string | null; status_changed_at: string | null; value: number | null }[];
}

interface AggregatedRow extends ProjectProductionRow {
  total: number;
  done: number;
  inProgress: number;
  waiting: number;
  progressPct: number;
  aggStatus: string; // slug or "sem_op"
  isLate: boolean;
  slaAlerts: number;
  slaOverdue: number;
  value: number;
}

const SEM_OP_META = { label: "Sem OP", tone: "bg-muted text-muted-foreground border-border" };

function buildAggregator(
  columnsBySlug: Record<string, { sort_order: number; sla_days?: number | null; sla_unit?: "days" | "hours" }>,
  validSlugs: Set<string>,
  doneSlugs: Set<string>,
) {
  const resolve = (s: string) =>
    validSlugs.has(s) ? s : SLUG_ALIASES[s] && validSlugs.has(SLUG_ALIASES[s]) ? SLUG_ALIASES[s] : s;

  return (rows: ProjectProductionRow[]): AggregatedRow[] => {
    const today = new Date();
    const result: AggregatedRow[] = [];

    rows.forEach((p) => {
      const pos = (p.pos ?? []).map((x) => ({ ...x, status: resolve(x.status) }));
      const total = pos.length;
      
      if (total === 0) {
        result.push({
          ...p, total, done: 0, inProgress: 0, waiting: 0,
          progressPct: 0, aggStatus: "sem_op", isLate: false, slaAlerts: 0, slaOverdue: 0,
          value: p.order_valor_total // Se não tem OP, mostra valor total do pedido
        } as any);
        return;
      }

      const done = pos.filter((x) => doneSlugs.has(x.status)).length;
      const progressPct = Math.round((done / total) * 100);
      
      // Get unique statuses present in this project's OPs
      const uniqueStatuses = Array.from(new Set(pos.map(x => x.status)));
      
      uniqueStatuses.forEach(status => {
        const opsInStatus = pos.filter(x => x.status === status);
        const inProgress = opsInStatus.filter(x => x.status === "em_producao").length;
        const waiting = opsInStatus.filter(x => x.status === "aguardando").length;
        
        // Se a OP tiver valor, usamos ele. Caso contrário, distribuímos o valor do pedido entre as OPs
        const statusValue = opsInStatus.reduce((sum, op) => {
          const opVal = Number(op.value);
          if (opVal > 0) return sum + opVal;
          // Distribuição proporcional se o valor da OP for 0
          return sum + (p.order_valor_total / total);
        }, 0);
        
        let slaAlerts = 0;
        let slaOverdue = 0;
        for (const x of opsInStatus) {
          if (doneSlugs.has(x.status)) continue;
          const target = columnsBySlug[x.status]?.sla_days;
          if (!target) continue;
          const s = slaState(target, x.status_changed_at, columnsBySlug[x.status]?.sla_unit ?? "days");
          if (s.level === "overdue") { slaOverdue++; slaAlerts++; }
          else if (s.level === "warning") slaAlerts++;
        }

        const isLate = !!p.deadline && parseLocalDate(p.deadline) < today && !doneSlugs.has(status);

        result.push({
          ...p,
          id: `${p.id}-${status}`, // Unique ID for the card in this column
          total,
          done,
          inProgress,
          waiting,
          progressPct,
          aggStatus: status,
          isLate,
          slaAlerts,
          slaOverdue,
          value: statusValue,
          // Custom field to show which OPs are here
          _opsCountInStatus: opsInStatus.length
        } as any);
      });
    });

    return result;
  };
}

export function OpsProjectsTab() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawRows, setRawRows] = useState<ProjectProductionRow[]>([]);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailProject, setDetailProject] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  


  const { data: statusColumns = [] } = useProductionStatusColumns();

  // Build resolution structures from shared status registry
  const { columnsBySlug, validSlugs, doneSlugs } = useMemo(() => {
    const map: Record<string, { sort_order: number; label: string; color: string; sla_days: number | null; sla_unit: "days" | "hours" }> = {};
    statusColumns.forEach((c) => { map[c.slug] = { sort_order: c.sort_order, label: c.label, color: c.color, sla_days: c.sla_days, sla_unit: c.sla_unit }; });
    const slugs = new Set(statusColumns.map((c) => c.slug));
    const done = new Set(["concluido", "entregue"].filter((s) => slugs.has(s)));
    return { columnsBySlug: map, validSlugs: slugs, doneSlugs: done };
  }, [statusColumns]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, order_number, valor_total, data_entrega_prevista, status, tenant_id,
          client:clients(name),
          architect:architects(name),
          pos:production_orders(status, planned_end_date, status_changed_at, value)
        `)
        .neq("status", "cancelado")
        .order("data_entrega_prevista", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      if (error) {
        console.error("OpsProjectsTab fetch error", error);
        setRawRows([]);
      } else {
        const mapped = (data ?? []).map((o: any) => {
          const pos = o.pos ?? [];
          // Prazo efetivo: maior planned_end_date entre as OPs (reflete reprogramações),
          // caindo para a data do pedido quando não houver OPs.
          const posDeadlines = pos
            .map((p: any) => p?.planned_end_date)
            .filter(Boolean)
            .map((d: string) => String(d).slice(0, 10))
            .sort();
          const effectiveDeadline =
            posDeadlines.length > 0 ? posDeadlines[posDeadlines.length - 1] : o.data_entrega_prevista;
          return {
            id: o.id,
            name: `Pedido #${o.order_number}`,
            order_valor_total: Number(o.valor_total ?? 0),
            deadline: effectiveDeadline,
            tenant_id: o.tenant_id ?? null,
            client: o.client,
            architect: o.architect,
            pos,
          };
        });
        setRawRows(mapped);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Realtime: refetch quando orders/fin_projects/production_orders mudarem
  useEffect(() => {
    const channel = supabase
      .channel("ops-projects-tab-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => setRefreshKey((k) => k + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_projects" }, () => setRefreshKey((k) => k + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "production_orders" }, () => setRefreshKey((k) => k + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const aggregator = useMemo(
    () => buildAggregator(columnsBySlug, validSlugs, doneSlugs),
    [columnsBySlug, validSlugs, doneSlugs],
  );

  const rows = useMemo(() => aggregator(rawRows), [aggregator, rawRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.name ?? "").toLowerCase().includes(q) ||
      (r.client?.name ?? "").toLowerCase().includes(q) ||
      (r.architect?.name ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const kpis = useMemo(() => {
    const inProd = filtered.filter((r) => r.aggStatus === "em_producao").length;
    const waiting = filtered.filter((r) => r.aggStatus === "aguardando" || r.aggStatus === "sem_op").length;
    const late = filtered.filter((r) => r.isLate).length;
    const slaAlerts = filtered.filter((r) => r.slaAlerts > 0).length;
    const doneMonth = filtered.filter((r) => doneSlugs.has(r.aggStatus)).length;
    const totalPos = filtered.reduce((s, r) => s + r.total, 0);
    const donePos = filtered.reduce((s, r) => s + r.done, 0);
    const onTimePct = totalPos === 0 ? 0 : Math.round((donePos / totalPos) * 100);
    return { inProd, waiting, late, slaAlerts, doneMonth, onTimePct };
  }, [filtered, doneSlugs]);

  const openDetail = (orderId: string) => {
    console.log("Opening detail for order:", orderId);
    setSelectedOrderId(orderId);
    window.dispatchEvent(new CustomEvent('open-order-detail', { detail: { orderId } }));
  };

  // Kanban columns: "Sem OP" virtual column + every tenant-managed status, in sort_order.
  const kanbanColumns: { slug: string; label: string; tone: string }[] = useMemo(() => {
    const dyn = statusColumns.map((c) => ({ slug: c.slug, label: c.label, tone: colorTone(c.color) }));
    return [{ slug: "sem_op", label: SEM_OP_META.label, tone: SEM_OP_META.tone }, ...dyn];
  }, [statusColumns]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard icon={<Factory className="h-4 w-4" />} label="Em produção" value={kpis.inProd} tone="text-amber-600" />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Aguardando" value={kpis.waiting} tone="text-blue-600" />
        <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Atrasados" value={kpis.late} tone="text-destructive" />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Alertas SLA" value={kpis.slaAlerts} tone="text-amber-600" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Concluídos" value={kpis.doneMonth} tone="text-emerald-600" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="% OPs concluídas" value={`${kpis.onTimePct}%`} tone="text-primary" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar projeto, cliente, arquiteto…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <ManageProductionStatusDialog />
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4" />Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban" className="gap-1.5"><LayoutGrid className="h-4 w-4" />Kanban</TabsTrigger>
          <TabsTrigger value="tabela" className="gap-1.5"><List className="h-4 w-4" />Tabela</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />Carregando…
            </div>
          ) : (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.max(kanbanColumns.length, 1)}, minmax(220px, 1fr))` }}
            >
              {kanbanColumns.map((col) => {
                const colRows = filtered.filter((r) => r.aggStatus === col.slug);
                return (
                  <div key={col.slug} className="bg-muted/30 rounded-lg p-2 min-h-[200px]">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-semibold text-foreground">{col.label}</span>
                      <Badge variant="secondary" className="text-xs">{colRows.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {colRows.map((r) => {
                        const projectSlaTone =
                          r.slaOverdue > 0
                            ? "bg-destructive/10 border-destructive/40"
                            : r.slaAlerts > 0
                            ? "bg-amber-500/10 border-amber-500/40 dark:bg-amber-500/15"
                            : "";
                        return (
                        <div 
                          key={r.id} 
                          className={`p-3 rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer hover:border-primary hover:shadow-md transition-all active:bg-accent ${projectSlaTone}`} 
                          onClick={() => openDetail(r.id.split('-')[0])}
                        >
                          <div className="text-sm font-bold truncate pointer-events-none text-primary">{r.name || "Sem nome"}</div>
                          <div className="text-xs text-muted-foreground truncate pointer-events-none mb-3">{r.client?.name ?? "—"}</div>

                          {/* Prazo de entrega + botão editar */}
                          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                          <div className={`mt-2 flex items-center justify-between pointer-events-none p-2 rounded-md bg-muted/40 border border-border/50 ${r.isLate ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                            <div className="flex items-center gap-2">
                              <CalendarClock className="h-3.5 w-3.5" />
                              <span>Prazo: {fmtBR(r.deadline)}</span>
                            </div>
                            <span className="font-mono font-bold text-foreground">R$ {Number(r.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </div>
                          </div>

                          <div className="mt-3 pointer-events-none">
                            <Progress value={r.progressPct} className="h-1.5" title={`Progresso total do projeto: ${r.progressPct}%`} />
                            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground gap-1">
                              <span className="font-medium text-primary">{(r as any)._opsCountInStatus} de {r.total} OPs</span>
                              <div className="flex items-center gap-1">
                                {r.slaAlerts > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] gap-0.5 px-1.5 py-0 ${
                                      r.slaOverdue > 0
                                        ? "bg-destructive/10 text-destructive border-destructive/30"
                                        : "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300"
                                    }`}
                                    title={`${r.slaAlerts} OP(s) com alerta de prazo nesta fase${r.slaOverdue ? ` — ${r.slaOverdue} vencida(s)` : ""}`}
                                  >
                                    <Clock className="h-2.5 w-2.5" />SLA {r.slaAlerts}
                                  </Badge>
                                )}
                                {r.isLate && <span className="text-destructive font-medium">Atrasado</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                      {colRows.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-4">Vazio</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tabela">
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Progresso OPs</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando…
                  </TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhum pedido com produção encontrado
                  </TableCell></TableRow>
                ) : filtered.map((r) => {
                  const colMeta = r.aggStatus === "sem_op"
                    ? SEM_OP_META
                    : { label: columnsBySlug[r.aggStatus]?.label ?? r.aggStatus, tone: colorTone(columnsBySlug[r.aggStatus]?.color ?? "slate") };
                  return (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(r.id.split('-')[0])}>
                      <TableCell className="font-medium">{r.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.client?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">R$ {Number(r.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={r.isLate ? "text-destructive font-medium" : ""}>
                        {fmtBR(r.deadline)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <Progress value={r.progressPct} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-12 text-right">{r.done}/{r.total}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={colMeta.tone}>{colMeta.label}</Badge>
                          {r.slaAlerts > 0 && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] gap-0.5 px-1.5 py-0 ${
                                r.slaOverdue > 0
                                  ? "bg-destructive/10 text-destructive border-destructive/30"
                                  : "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300"
                              }`}
                              title={`${r.slaAlerts} OP(s) com alerta de prazo${r.slaOverdue ? ` — ${r.slaOverdue} vencida(s)` : ""}`}
                            >
                              <Clock className="h-2.5 w-2.5" />SLA {r.slaAlerts}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <ProjectDetailSheet
        project={detailProject}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />


      {selectedOrderId && (
        <OrderDetailSheet
          orderId={selectedOrderId}
          open={!!selectedOrderId}
          onOpenChange={(o) => { if (!o) setSelectedOrderId(null); }}
          onUpdate={() => setRefreshKey((k) => k + 1)}
          productionStepper
        />
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={tone}>{icon}</span>
      </div>
      <div className={`text-2xl font-bold mt-1 ${tone}`}>{value}</div>
    </Card>
  );
}
