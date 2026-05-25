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
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/useProjectData";
import { useCostCenters } from "@/hooks/useCostCenters";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planning: { label: "Planejamento", variant: "secondary" },
  in_progress: { label: "Em Execução", variant: "default" },
  completed: { label: "Concluído", variant: "outline" },
  on_hold: { label: "Pausado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const PROJECT_TYPES = [
  { value: "standard", label: "Padrão" },
  { value: "obra", label: "Obra" },
  { value: "reforma", label: "Reforma" },
  { value: "instalacao", label: "Instalação" },
  { value: "manutencao", label: "Manutenção" },
];

export function PrjCadastroTab() {
  const { data: projects = [], isLoading } = useProjects();
  const createMut = useCreateProject();
  const deleteMut = useDeleteProject();
  const { costCenters } = useCostCenters();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    title: "", project_type: "standard", status: "planning", start_date: "", expected_end_date: "", sold_value: 0, estimated_cost: 0, cost_center_id: "",
  });

  const filtered = projects.filter((p: any) => p.title?.toLowerCase().includes(search.toLowerCase()));
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    createMut.mutate({
      ...form,
      sold_value: Number(form.sold_value),
      estimated_cost: Number(form.estimated_cost),
      cost_center_id: form.cost_center_id || null,
    }, { onSuccess: () => { setOpen(false); setForm({ title: "", project_type: "standard", status: "planning", start_date: "", expected_end_date: "", sold_value: 0, estimated_cost: 0, cost_center_id: "" }); } });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-lg">Projetos</CardTitle>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-48" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Projeto</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label>
                    <Select value={form.project_type} onValueChange={v => setForm({ ...form, project_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Centro de Custo</Label>
                    <Select value={form.cost_center_id} onValueChange={v => setForm({ ...form, cost_center_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{costCenters.map(cc => <SelectItem key={cc.value} value={cc.value}>{cc.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Início</Label><DateBrInput value={form.start_date} onChange={e =/> setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>Previsão Entrega</Label><DateBrInput value={form.expected_end_date} onChange={e =/> setForm({ ...form, expected_end_date: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor Vendido</Label><Input type="number" value={form.sold_value} onChange={e => setForm({ ...form, sold_value: e.target.value })} /></div>
                  <div><Label>Custo Estimado</Label><Input type="number" value={form.estimated_cost} onChange={e => setForm({ ...form, estimated_cost: e.target.value })} /></div>
                </div>
                <Button onClick={handleCreate} disabled={!form.title || createMut.isPending}>Criar Projeto</Button>
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
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-right">Custo Est.</TableHead>
                  <TableHead className="text-right">Custo Real</TableHead>
                  <TableHead className="text-right">Margem Est.</TableHead>
                  <TableHead className="text-right">Margem Real</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Nenhum projeto</TableCell></TableRow>}
                {filtered.map((p: any) => {
                  const st = STATUS_MAP[p.status] || STATUS_MAP.planning;
                  const tp = PROJECT_TYPES.find(t => t.value === p.project_type);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.project_number}</TableCell>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell><Badge variant="outline">{tp?.label || p.project_type}</Badge></TableCell>
                      <TableCell>{p.clients?.name || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(p.sold_value)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(p.estimated_cost)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(p.actual_cost)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{p.estimated_margin?.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.actual_margin >= 0 ? "default" : "destructive"}>{p.actual_margin?.toFixed(1)}%</Badge>
                      </TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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
