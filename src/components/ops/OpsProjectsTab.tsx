import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, List, Search, RefreshCw, Loader2, AlertTriangle, Clock, CheckCircle2, Factory } from "lucide-react";
import { ProjectDetailSheet } from "@/components/projects/ProjectDetailSheet";

type POStatus = "aguardando" | "em_producao" | "pausado" | "concluido" | "cancelado";

interface ProjectProductionRow {
  id: string;
  name: string | null;
  value: number;
  deadline: string | null;
  client: { name: string | null } | null;
  architect: { name: string | null } | null;
  pos: { status: POStatus; planned_end_date: string | null }[];
}

interface AggregatedRow extends ProjectProductionRow {
  total: number;
  done: number;
  inProgress: number;
  waiting: number;
  progressPct: number;
  aggStatus: POStatus | "sem_op";
  isLate: boolean;
}

const STATUS_META: Record<POStatus | "sem_op", { label: string; tone: string }> = {
  aguardando: { label: "Aguardando", tone: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  em_producao: { label: "Em Produção", tone: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  pausado: { label: "Pausado", tone: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  concluido: { label: "Concluído", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  cancelado: { label: "Cancelado", tone: "bg-muted text-muted-foreground border-border" },
  sem_op: { label: "Sem OP", tone: "bg-muted text-muted-foreground border-border" },
};

const KANBAN_COLUMNS: (POStatus | "sem_op")[] = ["sem_op", "aguardando", "em_producao", "pausado", "concluido"];

function aggregate(rows: ProjectProductionRow[]): AggregatedRow[] {
  const today = new Date();
  return rows.map((p) => {
    const pos = p.pos ?? [];
    const total = pos.length;
    const done = pos.filter((x) => x.status === "concluido").length;
    const inProgress = pos.filter((x) => x.status === "em_producao").length;
    const waiting = pos.filter((x) => x.status === "aguardando").length;
    let aggStatus: POStatus | "sem_op" = "sem_op";
    if (total > 0) {
      if (done === total) aggStatus = "concluido";
      else if (inProgress > 0) aggStatus = "em_producao";
      else if (pos.some((x) => x.status === "pausado")) aggStatus = "pausado";
      else aggStatus = "aguardando";
    }
    const isLate = !!p.deadline && new Date(p.deadline) < today && aggStatus !== "concluido";
    return {
      ...p,
      total, done, inProgress, waiting,
      progressPct: total === 0 ? 0 : Math.round((done / total) * 100),
      aggStatus, isLate,
    };
  });
}

export function OpsProjectsTab() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AggregatedRow[]>([]);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailProject, setDetailProject] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, order_number, valor_total, data_entrega_prevista, status,
          client:clients(name),
          architect:architects(name),
          pos:production_orders(status, planned_end_date)
        `)
        .neq("status", "cancelado")
        .order("data_entrega_prevista", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      if (error) {
        console.error("OpsProjectsTab fetch error", error);
        setRows([]);
      } else {
        const mapped = (data ?? []).map((o: any) => ({
          id: o.id,
          name: `Pedido #${o.order_number}`,
          value: Number(o.valor_total ?? 0),
          deadline: o.data_entrega_prevista,
          client: o.client,
          architect: o.architect,
          pos: o.pos ?? [],
        }));
        setRows(aggregate(mapped as any));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

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
    const doneMonth = filtered.filter((r) => r.aggStatus === "concluido").length;
    const totalPos = filtered.reduce((s, r) => s + r.total, 0);
    const donePos = filtered.reduce((s, r) => s + r.done, 0);
    const onTimePct = totalPos === 0 ? 0 : Math.round((donePos / totalPos) * 100);
    return { inProd, waiting, late, doneMonth, onTimePct };
  }, [filtered]);

  const openDetail = async (projectId: string) => {
    const { data } = await supabase
      .from("projects")
      .select(`*, client:clients(name, phone), architect:architects(name)`)
      .eq("id", projectId)
      .single();
    if (data) { setDetailProject(data); setDetailOpen(true); }
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={<Factory className="h-4 w-4" />} label="Em produção" value={kpis.inProd} tone="text-amber-600" />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Aguardando" value={kpis.waiting} tone="text-blue-600" />
        <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Atrasados" value={kpis.late} tone="text-destructive" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Concluídos" value={kpis.doneMonth} tone="text-emerald-600" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="% OPs concluídas" value={`${kpis.onTimePct}%`} tone="text-primary" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar projeto, cliente, arquiteto…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshCw className="h-4 w-4" />Atualizar
        </Button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {KANBAN_COLUMNS.map((col) => {
                const colRows = filtered.filter((r) => r.aggStatus === col);
                const meta = STATUS_META[col];
                return (
                  <div key={col} className="bg-muted/30 rounded-lg p-2 min-h-[200px]">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                      <Badge variant="secondary" className="text-xs">{colRows.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {colRows.map((r) => (
                        <Card key={r.id} className="p-3 cursor-pointer hover:shadow-md transition" onClick={() => openDetail(r.id)}>
                          <div className="text-sm font-medium truncate">{r.name || "Sem nome"}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.client?.name ?? "—"}</div>
                          <div className="mt-2">
                            <Progress value={r.progressPct} className="h-1.5" />
                            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                              <span>{r.done}/{r.total} OPs</span>
                              {r.isLate && <span className="text-destructive font-medium">Atrasado</span>}
                            </div>
                          </div>
                        </Card>
                      ))}
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
                    Nenhum projeto aprovado encontrado
                  </TableCell></TableRow>
                ) : filtered.map((r) => {
                  const meta = STATUS_META[r.aggStatus];
                  return (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => openDetail(r.id)}>
                      <TableCell className="font-medium">{r.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.client?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">R$ {Number(r.value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={r.isLate ? "text-destructive font-medium" : ""}>
                        {r.deadline ? new Date(r.deadline).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <Progress value={r.progressPct} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-12 text-right">{r.done}/{r.total}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={meta.tone}>{meta.label}</Badge></TableCell>
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
