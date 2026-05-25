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
import { useOpsOrders, useCreateOpsOrder, useDeleteOpsOrder } from "@/hooks/useOpsData";
import { useCostCenters } from "@/hooks/useCostCenters";

const ORDER_TYPES = [
  { value: "production", label: "Produção" },
  { value: "assembly", label: "Montagem" },
  { value: "service", label: "Serviço" },
  { value: "rework", label: "Retrabalho" },
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  in_progress: { label: "Em Execução", variant: "default" },
  completed: { label: "Concluída", variant: "outline" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  delayed: { label: "Atrasada", variant: "destructive" },
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
  const { costCenters } = useCostCenters();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    title: "", order_type: "production", priority: "normal", start_date: "", expected_end_date: "", notes: "", cost_center_id: "",
  });

  const filtered = orders.filter((o: any) => o.title?.toLowerCase().includes(search.toLowerCase()));
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    createMut.mutate({
      ...form,
      cost_center_id: form.cost_center_id || null,
    }, { onSuccess: () => { setOpen(false); setForm({ title: "", order_type: "production", priority: "normal", start_date: "", expected_end_date: "", notes: "", cost_center_id: "" }); } });
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
            <SelectTrigger className="w-32"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ORDER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Ordem</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova Ordem Operacional</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label>
                    <Select value={form.order_type} onValueChange={v => setForm({ ...form, order_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ORDER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
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
                  <div><Label>Início</Label><DateBrInput value={form.start_date} onChange={e =/> setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>Previsão Conclusão</Label><DateBrInput value={form.expected_end_date} onChange={e =/> setForm({ ...form, expected_end_date: e.target.value })} /></div>
                </div>
                <div><Label>Centro de Custo</Label>
                  <Select value={form.cost_center_id} onValueChange={v => setForm({ ...form, cost_center_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{costCenters.map(cc => <SelectItem key={cc.value} value={cc.value}>{cc.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Observações</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <Button onClick={handleCreate} disabled={!form.title || createMut.isPending}>Criar Ordem</Button>
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
                  <TableHead>Centro Custo</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead className="text-right">Custo Real</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Nenhuma ordem</TableCell></TableRow>}
                {filtered.map((o: any) => {
                  const st = STATUS_MAP[o.status] || STATUS_MAP.pending;
                  const pr = PRIORITY_MAP[o.priority] || PRIORITY_MAP.normal;
                  const tp = ORDER_TYPES.find(t => t.value === o.order_type);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell className="font-medium">{o.title}</TableCell>
                      <TableCell><Badge variant="outline">{tp?.label || o.order_type}</Badge></TableCell>
                      <TableCell><Badge variant={pr.variant}>{pr.label}</Badge></TableCell>
                      <TableCell>{o.clients?.name || "—"}</TableCell>
                      <TableCell>{o.fin_cost_centers?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{o.start_date ? new Date(o.start_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-sm">{o.expected_end_date ? new Date(o.expected_end_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(o.actual_cost)}</TableCell>
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
