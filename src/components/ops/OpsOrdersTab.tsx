import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateBrInput } from "@/components/ui/date-br-input";
import {
  LayoutGrid, List, Search, Loader2, AlertTriangle, Clock, CheckCircle2,
  Factory, Plus, Trash2, GripVertical,
} from "lucide-react";
import { useOpsOrders, useCreateOpsOrder, useDeleteOpsOrder, useProductionTypes } from "@/hooks/useOpsData";
import {
  useProductionStatusColumns,
  useUpdateProductionOrderStatus,
  colorTone,
  slaState,
  slaSuffix,
} from "@/hooks/useProductionStatusColumns";
import { ManageProductionStatusDialog } from "./ManageProductionStatusDialog";
import {
  DndContext, DragEndEvent, PointerSensor, useDroppable, useDraggable, useSensor, useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const PRIORITY_META: Record<string, { label: string; tone: string }> = {
  low: { label: "Baixa", tone: "bg-muted text-muted-foreground border-border" },
  normal: { label: "Normal", tone: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  high: { label: "Alta", tone: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  urgent: { label: "Urgente", tone: "bg-destructive/10 text-destructive border-destructive/30" },
};

// Map legacy slugs to defaults so existing data keeps showing in the right column.
const SLUG_ALIASES: Record<string, string> = {
  em_andamento: "em_producao",
};

function resolveSlug(status: string, validSlugs: Set<string>): string {
  if (validSlugs.has(status)) return status;
  const alias = SLUG_ALIASES[status];
  if (alias && validSlugs.has(alias)) return alias;
  return status;
}

function DropColumn({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${slug}` });
  return (
    <div
      ref={setNodeRef}
      className={`bg-muted/30 rounded-lg p-2 min-h-[200px] transition-colors ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
    >
      {children}
    </div>
  );
}

function DragCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing">
      {children}
    </div>
  );
}

export function OpsOrdersTab() {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    title: "", production_type_id: "", priority: "normal",
    planned_start_date: "", planned_end_date: "", notes: "",
  });

  const { data: orders = [], isLoading } = useOpsOrders({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });
  const { data: productionTypes = [] } = useProductionTypes();
  const { data: statusColumns = [] } = useProductionStatusColumns();
  const createMut = useCreateOpsOrder();
  const deleteMut = useDeleteOpsOrder();
  const updateStatusMut = useUpdateProductionOrderStatus();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const today = new Date();
  const validSlugs = useMemo(() => new Set(statusColumns.map((c) => c.slug)), [statusColumns]);

  // Build a fast slug → column map for badges/colors
  const slugToColumn = useMemo(() => {
    const m: Record<string, typeof statusColumns[number]> = {};
    statusColumns.forEach((c) => { m[c.slug] = c; });
    return m;
  }, [statusColumns]);

  const enriched = useMemo(() => {
    return (orders as any[]).map((o) => {
      const slug = resolveSlug(o.status, validSlugs);
      const isLate = !!o.planned_end_date &&
        new Date(o.planned_end_date) < today &&
        slug !== "concluido" && slug !== "entregue" && slug !== "cancelado";
      const col = slugToColumn[slug];
      const isClosed = slug === "concluido" || slug === "entregue" || slug === "cancelado";
      const sla = !isClosed
        ? slaState(col?.sla_days, o.status_changed_at, col?.sla_unit ?? "days")
        : { elapsed: 0, days: 0, hours: 0, level: "ok" as const, ratio: 0, unit: "days" as const };
      return { ...o, _slug: slug, isLate, _sla: sla, _slaTarget: col?.sla_days ?? null, _slaUnit: col?.sla_unit ?? "days" };
    });
  }, [orders, validSlugs, slugToColumn]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((o) =>
      (o.title ?? "").toLowerCase().includes(q) ||
      String(o.order_number ?? "").includes(q) ||
      (o.clients?.name ?? "").toLowerCase().includes(q) ||
      (o.suppliers?.name ?? "").toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const kpis = useMemo(() => {
    const inProd = filtered.filter((o) => o._slug === "em_producao").length;
    const waiting = filtered.filter((o) => o._slug === "aguardando").length;
    const late = filtered.filter((o) => o.isLate).length;
    const slaAlerts = filtered.filter((o) => o._sla.level !== "ok").length;
    const done = filtered.filter((o) => o._slug === "concluido" || o._slug === "entregue").length;
    const total = filtered.length;
    const donePct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { inProd, waiting, late, slaAlerts, done, donePct };
  }, [filtered]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    createMut.mutate(
      {
        title: form.title,
        production_type_id: form.production_type_id,
        priority: form.priority,
        planned_start_date: form.planned_start_date || null,
        planned_end_date: form.planned_end_date || null,
        notes: form.notes || null,
        status: "aguardando",
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({ title: "", production_type_id: "", priority: "normal", planned_start_date: "", planned_end_date: "", notes: "" });
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard icon={<Factory className="h-4 w-4" />} label="Em produção" value={kpis.inProd} tone="text-amber-600" />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Aguardando" value={kpis.waiting} tone="text-blue-600" />
        <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Atrasadas" value={kpis.late} tone="text-destructive" />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Alertas SLA" value={kpis.slaAlerts} tone="text-amber-600" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Concluídas" value={kpis.done} tone="text-emerald-600" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="% Concluídas" value={`${kpis.donePct}%`} tone="text-primary" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ordem, cliente, fornecedor…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {statusColumns.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ManageProductionStatusDialog />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Nova Ordem</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova Ordem de Produção</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Título *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo de Produção *</Label>
                    <Select value={form.production_type_id} onValueChange={(v) => setForm({ ...form, production_type_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(productionTypes as any[]).map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_META).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Início Planejado</Label>
                    <DateBrInput value={form.planned_start_date} onChange={(iso) => setForm({ ...form, planned_start_date: iso })} />
                  </div>
                  <div>
                    <Label>Previsão Conclusão</Label>
                    <DateBrInput value={form.planned_end_date} onChange={(iso) => setForm({ ...form, planned_end_date: iso })} />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button onClick={handleCreate} disabled={!form.title || !form.production_type_id || createMut.isPending}>
                  Criar Ordem
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban" className="gap-1.5"><LayoutGrid className="h-4 w-4" />Kanban</TabsTrigger>
          <TabsTrigger value="tabela" className="gap-1.5"><List className="h-4 w-4" />Tabela</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />Carregando…
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragEnd={(e: DragEndEvent) => {
                const overId = String(e.over?.id ?? "");
                const activeId = String(e.active?.id ?? "");
                if (!overId.startsWith("col-") || !activeId) return;
                const newSlug = overId.slice(4);
                const ord = filtered.find((o) => o.id === activeId);
                if (!ord || ord._slug === newSlug) return;
                updateStatusMut.mutate({ id: activeId, status: newSlug });
              }}
            >
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.max(statusColumns.length, 1)}, minmax(220px, 1fr))` }}
            >
              {statusColumns.map((col) => {
                const colRows = filtered.filter((o) => o._slug === col.slug);
                const breaches = colRows.filter((o) => o._sla.level !== "ok").length;
                return (
                  <DropColumn key={col.id} slug={col.slug}>
                    <div className="flex items-center justify-between mb-2 px-1 gap-1">
                      <span className="text-xs font-semibold text-foreground truncate">{col.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {col.sla_days ? (
                          <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                            <Clock className="h-2.5 w-2.5" />{col.sla_days}{slaSuffix(col.sla_unit)}
                          </Badge>
                        ) : null}
                        {breaches > 0 && (
                          <Badge className="text-[10px] gap-0.5 px-1.5 py-0 bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15">
                            <AlertTriangle className="h-2.5 w-2.5" />{breaches}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">{colRows.length}</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {colRows.map((o) => {
                        const pr = PRIORITY_META[o.priority] || PRIORITY_META.normal;
                        const slaCardTone =
                          o._sla.level === "overdue"
                            ? "bg-destructive/10 border-destructive/40"
                            : o._sla.level === "warning"
                            ? "bg-amber-500/10 border-amber-500/40 dark:bg-amber-500/15"
                            : "";
                        return (
                          <DragCard key={o.id} id={o.id}>
                          <Card className={`p-3 transition-colors ${slaCardTone}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">{o.title || "Sem título"}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {o.clients?.name ?? o.suppliers?.name ?? "—"}
                                </div>
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                                #{o.order_number}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <Badge variant="outline" className={`${pr.tone} text-[10px]`}>{pr.label}</Badge>
                              <span className="text-[11px] text-muted-foreground truncate">
                                {o.production_types?.name ?? ""}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>
                                {o.planned_end_date
                                  ? new Date(o.planned_end_date).toLocaleDateString("pt-BR")
                                  : "Sem prazo"}
                              </span>
                              <div className="flex items-center gap-1">
                                {o._slaTarget && o._sla.level !== "ok" && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] gap-0.5 px-1.5 py-0 ${
                                      o._sla.level === "overdue"
                                        ? "bg-destructive/10 text-destructive border-destructive/30"
                                        : "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300"
                                    }`}
                                    title={`No status há ${o._sla.elapsed} ${o._slaUnit === "hours" ? "hora(s)" : "dia(s)"} — prazo ${o._slaTarget}${slaSuffix(o._slaUnit)}`}
                                  >
                                    <Clock className="h-2.5 w-2.5" />
                                    {o._sla.level === "overdue"
                                      ? `+${o._sla.elapsed - o._slaTarget}${slaSuffix(o._slaUnit)}`
                                      : `${o._sla.elapsed}/${o._slaTarget}${slaSuffix(o._slaUnit)}`}
                                  </Badge>
                                )}
                                {o.isLate && <span className="text-destructive font-medium">Atrasada</span>}
                              </div>
                            </div>
                            <div className="mt-2">
                              <Select
                                value={o._slug}
                                onValueChange={(v) => updateStatusMut.mutate({ id: o.id, status: v })}
                              >
                                <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {statusColumns.map((c) => (
                                    <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </Card>
                        );
                      })}
                      {colRows.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-4">Vazio</div>
                      )}
                    </div>
                  </DropColumn>
                );
              })}
            </div>
            </DndContext>
          )}
        </TabsContent>

        <TabsContent value="tabela">
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando…
                  </TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    Nenhuma ordem encontrada
                  </TableCell></TableRow>
                ) : filtered.map((o) => {
                  const col = slugToColumn[o._slug];
                  const pr = PRIORITY_META[o.priority] || PRIORITY_META.normal;
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell className="font-medium">{o.title}</TableCell>
                      <TableCell><Badge variant="outline">{o.production_types?.name ?? "—"}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={pr.tone}>{pr.label}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{o.clients?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{o.suppliers?.name ?? "—"}</TableCell>
                      <TableCell className={o.isLate ? "text-destructive font-medium" : ""}>
                        {o.planned_end_date ? new Date(o.planned_end_date).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(Number(o.value ?? 0))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={o._slug}
                            onValueChange={(v) => updateStatusMut.mutate({ id: o.id, status: v })}
                          >
                            <SelectTrigger className={`h-7 text-xs w-[140px] ${col ? colorTone(col.color) : ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusColumns.map((c) => (
                                <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {o._slaTarget && o._sla.level !== "ok" && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] gap-0.5 px-1.5 py-0 ${
                                o._sla.level === "overdue"
                                  ? "bg-destructive/10 text-destructive border-destructive/30"
                                  : "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300"
                              }`}
                              title={`No status há ${o._sla.days} dia(s) — prazo ${o._slaTarget}d`}
                            >
                              <Clock className="h-2.5 w-2.5" />
                              {o._sla.level === "overdue"
                                ? `+${o._sla.days - o._slaTarget}d`
                                : `${o._sla.days}/${o._slaTarget}d`}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(o.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
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
