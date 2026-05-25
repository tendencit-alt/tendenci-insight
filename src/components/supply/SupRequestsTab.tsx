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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search } from "lucide-react";
import { useSupplyRequests, useCreateSupplyRequest, useUpdateSupplyRequest } from "@/hooks/useSupplyData";
import { useProjects } from "@/hooks/useProjectData";
import { useCostCenters } from "@/hooks/useCostCenters";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  approved: { label: "Aprovada", variant: "default" },
  in_quotation: { label: "Em Cotação", variant: "outline" },
  ordered: { label: "Pedido Gerado", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

const ORIGINS = [
  { value: "manual", label: "Manual" },
  { value: "producao", label: "Produção" },
  { value: "projetos", label: "Projetos" },
  { value: "estoque_minimo", label: "Estoque Mínimo" },
  { value: "financeiro", label: "Financeiro" },
];

const PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

export function SupRequestsTab() {
  const { user } = useAuth();
  const { data: requests = [], isLoading } = useSupplyRequests();
  const { data: projects = [] } = useProjects();
  const { costCenters } = useCostCenters();
  const createMut = useCreateSupplyRequest();
  const updateMut = useUpdateSupplyRequest();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    description: "", origin: "manual", priority: "normal", needed_by: "", estimated_value: 0,
    cost_center_id: "", project_id: "", notes: "",
  });

  const filtered = requests.filter((r: any) => r.description?.toLowerCase().includes(search.toLowerCase()));
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    createMut.mutate({
      ...form,
      estimated_value: Number(form.estimated_value),
      requester_id: user?.id,
      cost_center_id: form.cost_center_id || null,
      project_id: form.project_id || null,
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ description: "", origin: "manual", priority: "normal", needed_by: "", estimated_value: 0, cost_center_id: "", project_id: "", notes: "" });
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-lg">Solicitações de Compra</CardTitle>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-48" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Solicitação</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova Solicitação de Compra</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Descrição *</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Origem</Label>
                    <Select value={form.origin} onValueChange={v => setForm({ ...form, origin: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ORIGINS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data Necessidade</Label><DateBrInput value={form.needed_by} onChange={(iso) => setForm({ ...form, needed_by: iso })} /></div>
                  <div><Label>Valor Estimado</Label><Input type="number" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Centro de Custo</Label>
                    <Select value={form.cost_center_id} onValueChange={v => setForm({ ...form, cost_center_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{costCenters.map(cc => <SelectItem key={cc.value} value={cc.value}>{cc.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Projeto</Label>
                    <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <Button onClick={handleCreate} disabled={!form.description || createMut.isPending}>Criar Solicitação</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Necessidade</TableHead>
                  <TableHead className="text-right">Valor Est.</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhuma solicitação</TableCell></TableRow>}
                {filtered.map((r: any) => {
                  const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
                  const pr = PRIORITIES.find(p => p.value === r.priority);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.request_number}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{r.description}</TableCell>
                      <TableCell><Badge variant="outline">{ORIGINS.find(o => o.value === r.origin)?.label || r.origin}</Badge></TableCell>
                      <TableCell><Badge variant={r.priority === "urgent" ? "destructive" : r.priority === "high" ? "default" : "secondary"}>{pr?.label}</Badge></TableCell>
                      <TableCell className="text-sm">{r.needed_by ? new Date(r.needed_by + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(r.estimated_value)}</TableCell>
                      <TableCell className="text-sm">{r.prj_projects?.title || "—"}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell>
                        {r.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ id: r.id, status: "approved" })}>Aprovar</Button>
                        )}
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
