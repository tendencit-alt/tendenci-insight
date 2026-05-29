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
  Factory, Plus, Trash2,
} from "lucide-react";
import { useOpsOrders, useCreateOpsOrder, useDeleteOpsOrder, useProductionTypes } from "@/hooks/useOpsData";

type OrderStatus = "aguardando" | "em_producao" | "em_andamento" | "concluido" | "entregue" | "cancelado";

const STATUS_META: Record<string, { label: string; tone: string }> = {
  aguardando: { label: "Aguardando", tone: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  em_producao: { label: "Em Produção", tone: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  em_andamento: { label: "Em Andamento", tone: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  concluido: { label: "Concluído", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  entregue: { label: "Entregue", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  cancelado: { label: "Cancelado", tone: "bg-muted text-muted-foreground border-border" },
};

const PRIORITY_META: Record<string, { label: string; tone: string }> = {
  low: { label: "Baixa", tone: "bg-muted text-muted-foreground border-border" },
  normal: { label: "Normal", tone: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  high: { label: "Alta", tone: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  urgent: { label: "Urgente", tone: "bg-destructive/10 text-destructive border-destructive/30" },
};

const KANBAN_COLUMNS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: "aguardando", label: "Aguardando", match: (s) => s === "aguardando" },
  { key: "em_producao", label: "Em Produção", match: (s) => s === "em_producao" || s === "em_andamento" },
  { key: "concluido", label: "Concluído", match: (s) => s === "concluido" },
  { key: "entregue", label: "Entregue", match: (s) => s === "entregue" },
  { key: "cancelado", label: "Cancelado", match: (s) => s === "cancelado" },
];

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
  const createMut = useCreateOpsOrder();
  const deleteMut = useDeleteOpsOrder();

  const today = new Date();

  const enriched = useMemo(() => {
    return (orders as any[]).map((o) => {
      const isLate = !!o.planned_end_date &&
        new Date(o.planned_end_date) < today &&
        o.status !== "concluido" && o.status !== "entregue" && o.status !== "cancelado";
      return { ...o, isLate };
    });
  }, [orders]);

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
    const inProd = filtered.filter((o) => o.status === "em_producao" || o.status === "em_andamento").length;
    const waiting = filtered.filter((o) => o.status === "aguardando").length;
    const late = filtered.filter((o) => o.isLate).length;
    const done = filtered.filter((o) => o.status === "concluido" || o.status === "entregue").length;
    const total = filtered.length;
    const donePct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { inProd, waiting, late, done, donePct };
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={<Factory className="h-4 w-4" />} label="Em produção" value={kpis.inProd} tone="text-amber-600" />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Aguardando" value={kpis.waiting} tone="text-blue-600" />
        <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Atrasadas" value={kpis.late} tone="text-destructive" />
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
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {(productionTypes as any[]).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {KANBAN_COLUMNS.map((col) => {
                const colRows = filtered.filter((o) => col.match(o.status));
                return (
                  <div key={col.key} className="bg-muted/30 rounded-lg p-2 min-h-[200px]">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-semibold text-foreground">{col.label}</span>
                      <Badge variant="secondary" className="text-xs">{colRows.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {colRows.map((o) => {
                        const pr = PRIORITY_META[o.priority] || PRIORITY_META.normal;
                        return (
                          <Card key={o.id} className="p-3">
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
                              {o.isLate && <span className="text-destructive font-medium">Atrasada</span>}
                            </div>
                          </Card>
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
                  const st = STATUS_META[o.status] || { label: o.status, tone: "" };
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
                      <TableCell><Badge variant="outline" className={st.tone}>{st.label}</Badge></TableCell>
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
