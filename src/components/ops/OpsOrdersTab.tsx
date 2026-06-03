import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  LayoutGrid, List, Search, Loader2, AlertTriangle, AlertOctagon, Clock, CheckCircle2,
  Factory, Plus, Trash2, GripVertical, Calendar, Undo2, Timer, History, ClipboardCheck, Activity,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOpsOrders, useCreateOpsOrder, useDeleteOpsOrder, useProductionTypes } from "@/hooks/useOpsData";
import { useProductionKPIs } from "@/hooks/useProductionTimeline";
import {
  useProductionStatusColumns, colorTone,
} from "@/hooks/useProductionStatusColumns";
import {
  useMoveProductionPhase, useProductionPhaseSummary, formatElapsed, dueDateUrgency,
} from "@/hooks/useProductionPhaseMove";
import { ManageProductionStatusDialog } from "./ManageProductionStatusDialog";
import { ManageStatusChecklistsDialog } from "@/components/production/ManageStatusChecklistsDialog";
import { RegressReasonDialog } from "./RegressReasonDialog";
import { ReprogramOpDialog } from "./ReprogramOpDialog";
import { PhaseHistoryDialog } from "./PhaseHistoryDialog";
import { ProductionOrderDetailSheet } from "@/components/production/ProductionOrderDetailSheet";
import {
  DndContext, DragEndEvent, PointerSensor, useDroppable, useDraggable, useSensor, useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

const PRIORITY_META: Record<string, { label: string; tone: string }> = {
  low: { label: "Baixa", tone: "bg-muted text-muted-foreground border-border" },
  baixa: { label: "Baixa", tone: "bg-muted text-muted-foreground border-border" },
  normal: { label: "Normal", tone: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  high: { label: "Alta", tone: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  alta: { label: "Alta", tone: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  urgent: { label: "Urgente", tone: "bg-destructive/10 text-destructive border-destructive/30" },
  urgente: { label: "Urgente", tone: "bg-destructive/10 text-destructive border-destructive/30" },
};

const SLUG_ALIASES: Record<string, string> = { em_andamento: "em_producao" };

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

function DragCard({
  id, children,
}: {
  id: string;
  children: (handle: { ref: (el: HTMLElement | null) => void; props: any }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ref: setActivatorNodeRef, props: { ...attributes, ...listeners } })}
    </div>
  );
}

export function OpsOrdersTab() {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [checklistsOpen, setChecklistsOpen] = useState(false);
  const [form, setForm] = useState<any>({
    title: "", production_type_id: "", priority: "normal",
    planned_start_date: "", planned_end_date: "", notes: "",
  });

  // Move flow state
  const [pendingMove, setPendingMove] = useState<{ opId: string; fromSlug: string; toSlug: string } | null>(null);
  const [reprogramOp, setReprogramOp] = useState<{ id: string; orderNumber: any; dueDate: string | null } | null>(null);
  const [historyOp, setHistoryOp] = useState<{ id: string; orderNumber: any } | null>(null);
  const [detailOpId, setDetailOpId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Sincronia entre abas: ?op=<id> abre o detalhe e dá scroll/highlight
  useEffect(() => {
    const opParam = searchParams.get("op");
    if (opParam && opParam !== detailOpId) {
      setDetailOpId(opParam);
      setTimeout(() => {
        const el = document.querySelector(`[data-op-id="${opParam}"]`) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary");
          setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500);
        }
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleCloseDetail = (v: boolean) => {
    if (!v) {
      setDetailOpId(null);
      const next = new URLSearchParams(searchParams);
      next.delete("op");
      setSearchParams(next, { replace: true });
    }
  };

  const { data: orders = [], isLoading } = useOpsOrders({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });
  const { data: productionTypes = [] } = useProductionTypes();
  const { data: statusColumns = [] } = useProductionStatusColumns();
  const createMut = useCreateOpsOrder();
  const deleteMut = useDeleteOpsOrder();
  const moveMut = useMoveProductionPhase();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const validSlugs = useMemo(() => new Set(statusColumns.map((c) => c.slug)), [statusColumns]);
  const slugToColumn = useMemo(() => {
    const m: Record<string, typeof statusColumns[number]> = {};
    statusColumns.forEach((c) => { m[c.slug] = c; });
    return m;
  }, [statusColumns]);

  const orderIds = useMemo(() => (orders as any[]).map((o) => o.id), [orders]);
  const { data: phaseSummary = {} } = useProductionPhaseSummary(orderIds);

  const enriched = useMemo(() => {
    return (orders as any[]).map((o) => {
      const slug = resolveSlug(o.status, validSlugs);
      const due = dueDateUrgency(o.created_at, o.planned_end_date);
      const summary = phaseSummary[o.id] ?? { regressCount: 0, currentPhaseSince: o.status_changed_at };
      return {
        ...o,
        _slug: slug,
        _due: due,
        _regressCount: summary.regressCount,
        _phaseSince: summary.currentPhaseSince ?? o.status_changed_at ?? o.created_at,
      };
    });
  }, [orders, validSlugs, phaseSummary]);

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

  // KPIs unificados — mesma fonte do Cronograma (RPC get_production_timeline).
  // Garante 100% de paridade entre as abas Produção e Cronograma.
  const { kpis: timelineKpis } = useProductionKPIs();

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  /** Single handler used by BOTH drag-drop and dropdown. */
  const handleMove = (opId: string, fromSlug: string, toSlug: string) => {
    if (fromSlug === toSlug) return;
    const fromOrder = slugToColumn[fromSlug]?.sort_order ?? -1;
    const toOrder = slugToColumn[toSlug]?.sort_order ?? -1;
    const isRegress = fromOrder > toOrder;
    if (isRegress) {
      setPendingMove({ opId, fromSlug, toSlug });
      return;
    }
    moveMut.mutate(
      { op_id: opId, target_slug: toSlug },
      {
        onSuccess: () => toast.success("Fase avançada"),
        onError: (e: any) => toast.error("Erro ao mover fase", { description: e.message }),
      },
    );
  };

  const confirmRegress = async (reason: string) => {
    if (!pendingMove) return;
    try {
      await moveMut.mutateAsync({ op_id: pendingMove.opId, target_slug: pendingMove.toSlug, reason });
      toast.success("Retrocesso registrado");
      setPendingMove(null);
    } catch (e: any) {
      toast.error("Erro ao retroceder", { description: e.message });
    }
  };

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
      {/* KPIs — fonte única (get_production_timeline), idênticos ao Cronograma */}
      <TooltipProvider delayDuration={150}>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <KpiCardTip icon={<Factory className="h-4 w-4" />} label="Em produção" value={timelineKpis.em_producao} tone="text-amber-600" hint="Ordens ativas com fase já iniciada (não 'Aguardando' nem concluídas)." />
          <KpiCardTip icon={<Clock className="h-4 w-4" />} label="Aguardando" value={timelineKpis.aguardando} tone="text-blue-600" hint="Ordens criadas que ainda não saíram da fase inicial." />
          <KpiCardTip icon={<AlertOctagon className="h-4 w-4" />} label="Vencidas" value={timelineKpis.vencidas} tone="text-destructive" hint="Prazo final já passou de hoje e a OP ainda não foi concluída. Urgência real — exige ação agora." />
          <KpiCardTip icon={<AlertTriangle className="h-4 w-4" />} label="Atraso projetado" value={timelineKpis.atraso_projetado} tone="text-amber-600" hint="Prazo ainda não venceu, mas a previsão calculada (ETA) já ultrapassa o prazo planejado. Alerta preditivo." />
          <KpiCardTip icon={<Timer className="h-4 w-4" />} label="Alerta prazo" value={timelineKpis.alerta_prazo} tone="text-amber-600" hint="Ainda dentro do prazo, mas a folga até o ETA está abaixo de 10% do tempo restante." />
          <KpiCardTip icon={<CheckCircle2 className="h-4 w-4" />} label="Concluídas" value={timelineKpis.concluidas} tone="text-emerald-600" hint="Ordens em fases finais (concluído ou entregue)." />
          <KpiCardTip icon={<Activity className="h-4 w-4" />} label="% Concluídas" value={`${timelineKpis.pct_concluidas ?? 0}%`} tone="text-primary" hint="Percentual de OPs concluídas sobre o total." />
        </div>
      </TooltipProvider>

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
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setChecklistsOpen(true)}>
            <ClipboardCheck className="h-4 w-4" />Checklists por status
          </Button>
          <ManageStatusChecklistsDialog open={checklistsOpen} onOpenChange={setChecklistsOpen} />
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
                if (!ord) return;
                handleMove(activeId, ord._slug, newSlug);
              }}
            >
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${Math.max(statusColumns.length, 1)}, minmax(240px, 1fr))` }}
              >
                {statusColumns.map((col) => {
                  const colRows = filtered.filter((o) => o._slug === col.slug);
                  const lateCount = colRows.filter((o) => o._due.level === "late").length;
                  return (
                    <DropColumn key={col.id} slug={col.slug}>
                      <div className="flex items-center justify-between mb-2 px-1 gap-1">
                        <span className="text-xs font-semibold text-foreground truncate">{col.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {lateCount > 0 && (
                            <Badge className="text-[10px] gap-0.5 px-1.5 py-0 bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15">
                              <AlertTriangle className="h-2.5 w-2.5" />{lateCount}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">{colRows.length}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {colRows.map((o) => {
                          const pr = PRIORITY_META[o.priority] || PRIORITY_META.normal;
                          const dueTone =
                            o._due.level === "late"
                              ? "bg-destructive/10 border-destructive/40"
                              : o._due.level === "warn"
                              ? "bg-amber-500/10 border-amber-500/40"
                              : o._due.hasDue
                              ? "bg-emerald-500/5 border-emerald-500/30"
                              : "";
                          const dueBadgeTone =
                            o._due.level === "late"
                              ? "bg-destructive/10 text-destructive border-destructive/30"
                              : o._due.level === "warn"
                              ? "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300"
                              : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300";
                          return (
                            <DragCard key={o.id} id={o.id}>
                              {(handle) => (
                                <Card
                                  data-op-id={o.id}
                                  className={`p-3 space-y-1.5 transition-all cursor-pointer hover:ring-1 hover:ring-primary/30 ${dueTone}`}
                                  onClick={() => setDetailOpId(o.id)}
                                >

                                  {/* Linha 1: # + título */}
                                  <div className="flex items-start gap-1.5">
                                    <button
                                      ref={handle.ref as any}
                                      {...handle.props}
                                      className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground -ml-1 mt-0.5 shrink-0"
                                      aria-label="Arrastar"
                                      type="button"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold truncate">
                                        <span className="font-mono text-xs text-muted-foreground mr-1">#{o.order_number}</span>
                                        {o.title || "Sem título"}
                                      </div>
                                      {/* Linha 2: cliente */}
                                      <div className="text-xs text-muted-foreground truncate">
                                        {o.clients?.name ?? o.suppliers?.name ?? "Sem cliente"}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Linha 3: badges (prioridade + tipo + retrocessos) */}
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <Badge variant="outline" className={`${pr.tone} text-[10px]`}>{pr.label}</Badge>
                                    {o.production_types?.name && (
                                      <Badge variant="outline" className="text-[10px] truncate max-w-[100px]">
                                        {o.production_types.name}
                                      </Badge>
                                    )}
                                    {o._regressCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setHistoryOp({ id: o.id, orderNumber: o.order_number }); }}
                                        className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                                        title="Ver histórico"
                                      >
                                        <Undo2 className="h-2.5 w-2.5" />{o._regressCount}
                                      </button>
                                    )}
                                  </div>

                                  {/* Linha 4: prazo Xd/Yd */}
                                  <div className="flex items-center justify-between gap-2">
                                    {o._due.hasDue ? (
                                      <Badge variant="outline" className={`text-[10px] gap-1 ${dueBadgeTone}`}>
                                        <Calendar className="h-2.5 w-2.5" />
                                        {o._due.elapsedDays}d / {o._due.totalDays}d
                                        {o._due.level === "late" && " · atrasada"}
                                      </Badge>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setReprogramOp({ id: o.id, orderNumber: o.order_number, dueDate: null }); }}
                                        className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline decoration-dotted"
                                      >
                                        <Calendar className="h-2.5 w-2.5" />Sem prazo definido — definir
                                      </button>
                                    )}
                                    {o._due.hasDue && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setReprogramOp({ id: o.id, orderNumber: o.order_number, dueDate: o.planned_end_date }); }}
                                        className="text-[10px] text-muted-foreground hover:text-primary"
                                        title="Reprogramar prazo"
                                      >
                                        editar
                                      </button>
                                    )}
                                  </div>

                                  {/* Linha 5: tempo na fase */}
                                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                      <Timer className="h-2.5 w-2.5" />
                                      {formatElapsed(o._phaseSince)} nesta fase
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setHistoryOp({ id: o.id, orderNumber: o.order_number }); }}
                                      className="hover:text-foreground inline-flex items-center gap-0.5"
                                      title="Histórico de fases"
                                    >
                                      <History className="h-3 w-3" />
                                    </button>
                                  </div>

                                  {/* Dropdown de mudança de status */}
                                  <div onPointerDown={(e) => e.stopPropagation()}>
                                    <Select
                                      value={o._slug}
                                      onValueChange={(v) => handleMove(o.id, o._slug, v)}
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
                              )}
                            </DragCard>
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
                  <TableHead>Prazo</TableHead>
                  <TableHead>Tempo na fase</TableHead>
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
                      <TableCell className={
                        o._due.level === "late" ? "text-destructive font-medium"
                        : o._due.level === "warn" ? "text-amber-600 font-medium"
                        : "text-muted-foreground"
                      }>
                        {o._due.hasDue ? `${o._due.elapsedDays}d / ${o._due.totalDays}d` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatElapsed(o._phaseSince)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(Number(o.value ?? 0))}</TableCell>
                      <TableCell>
                        <Select
                          value={o._slug}
                          onValueChange={(v) => handleMove(o.id, o._slug, v)}
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

      {/* Dialogs */}
      <RegressReasonDialog
        open={!!pendingMove}
        onOpenChange={(v) => !v && setPendingMove(null)}
        fromLabel={pendingMove ? (slugToColumn[pendingMove.fromSlug]?.label ?? pendingMove.fromSlug) : ""}
        toLabel={pendingMove ? (slugToColumn[pendingMove.toSlug]?.label ?? pendingMove.toSlug) : ""}
        onConfirm={confirmRegress}
        loading={moveMut.isPending}
      />
      {reprogramOp && (
        <ReprogramOpDialog
          open={!!reprogramOp}
          onOpenChange={(v) => !v && setReprogramOp(null)}
          opId={reprogramOp.id}
          orderNumber={reprogramOp.orderNumber}
          currentDueDate={reprogramOp.dueDate}
        />
      )}
      <PhaseHistoryDialog
        open={!!historyOp}
        onOpenChange={(v) => !v && setHistoryOp(null)}
        opId={historyOp?.id ?? null}
        orderNumber={historyOp?.orderNumber}
      />
      <ProductionOrderDetailSheet
        orderId={detailOpId}
        open={!!detailOpId}
        onOpenChange={handleCloseDetail}
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
