import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2 } from "lucide-react";
import { useOpsOrders, useCreateOpsOrder, useDeleteOpsOrder, useProductionTypes } from "@/hooks/useOpsData";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  aguardando: { label: "Aguardando", variant: "secondary" },
  em_producao: { label: "Em Produção", variant: "default" },
  em_andamento: { label: "Em Andamento", variant: "default" },
  concluido: { label: "Concluído", variant: "outline" },
  entregue: { label: "Entregue", variant: "outline" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

const PRIORITY_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  low: { label: "Baixa", variant: "secondary" },
  normal: { label: "Normal", variant: "default" },
  high: { label: "Alta", variant: "destructive" },
  urgent: { label: "Urgente", variant: "destructive" },
};

export function OpsOrdersTab() {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: orders = [], isLoading } = useOpsOrders({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });
  const createMut = useCreateOpsOrder();
  const deleteMut = useDeleteOpsOrder();
  const { data: productionTypes = [] } = useProductionTypes();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    title: "", production_type_id: "", priority: "normal", planned_start_date: "", planned_end_date: "", notes: "",
  });

  const filtered = orders.filter((o: any) => o.title?.toLowerCase().includes(search.toLowerCase()));
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    createMut.mutate({
      title: form.title,
      production_type_id: form.production_type_id,
      priority: form.priority,
      planned_start_date: form.planned_start_date || null,
      planned_end_date: form.planned_end_date || null,
      notes: form.notes || null,
      status: "aguardando",
    }, { onSuccess: () => { setOpen(false); setForm({ title: "", production_type_id: "", priority: "normal", planned_start_date: "", planned_end_date: "", notes: "" }); } });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-lg">Ordens Operacionais</CardTitle>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-44" />
          </div>
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {productionTypes.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Ordem</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova Ordem de Produção</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo de Produção *</Label>
                    <Select value={form.production_type_id} onValueChange={v => setForm({ ...form, production_type_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{productionTypes.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(PRIORITY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Início Planejado</Label><DateBrInput value={form.planned_start_date} onChange={(iso) => setForm({ ...form, planned_start_date: iso })} /></div>
                  <div><Label>Previsão Conclusão</Label><DateBrInput value={form.planned_end_date} onChange={(iso) => setForm({ ...form, planned_end_date: iso })} /></div>
                </div>
                <div><Label>Observações</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <Button onClick={handleCreate} disabled={!form.title || !form.production_type_id || createMut.isPending}>Criar Ordem</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Nenhuma ordem</TableCell></TableRow>}
                {filtered.map((o: any) => {
                  const st = STATUS_MAP[o.status] || { label: o.status, variant: "secondary" as const };
                  const pr = PRIORITY_MAP[o.priority] || PRIORITY_MAP.normal;
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell className="font-medium">{o.title}</TableCell>
                      <TableCell><Badge variant="outline">{o.production_types?.name || "—"}</Badge></TableCell>
                      <TableCell><Badge variant={pr.variant}>{pr.label}</Badge></TableCell>
                      <TableCell>{o.clients?.name || "—"}</TableCell>
                      <TableCell>{o.suppliers?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{o.planned_start_date ? new Date(o.planned_start_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-sm">{o.planned_end_date ? new Date(o.planned_end_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(o.value)}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(o.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
