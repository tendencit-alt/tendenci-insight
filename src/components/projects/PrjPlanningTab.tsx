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
import { Plus } from "lucide-react";
import { useProjects, useProjectPhases, useCreatePhase, useProjectPlannedResources, useCreatePlannedResource } from "@/hooks/useProjectData";

export function PrjPlanningTab() {
  const { data: projects = [] } = useProjects();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const { data: phases = [] } = useProjectPhases(selectedProject || undefined);
  const { data: resources = [] } = useProjectPlannedResources(selectedProject || undefined);
  const createPhase = useCreatePhase();
  const createResource = useCreatePlannedResource();

  const [phaseOpen, setPhaseOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [phaseForm, setPhaseForm] = useState<any>({ title: "", phase_type: "phase", planned_start: "", planned_end: "", estimated_hours: 0, estimated_cost: 0 });
  const [resForm, setResForm] = useState<any>({ resource_type: "labor", description: "", quantity: 0, unit: "h", unit_cost: 0 });

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  const totalPlannedCost = resources.reduce((s: number, r: any) => s + (r.total_cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
          <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>#{p.project_number} — {p.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!selectedProject ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione um projeto para planejar</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Etapas / Marcos</CardTitle>
              <Dialog open={phaseOpen} onOpenChange={setPhaseOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Etapa</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova Etapa</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div><Label>Título *</Label><Input value={phaseForm.title} onChange={e => setPhaseForm({ ...phaseForm, title: e.target.value })} /></div>
                    <div><Label>Tipo</Label>
                      <Select value={phaseForm.phase_type} onValueChange={v => setPhaseForm({ ...phaseForm, phase_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="phase">Etapa</SelectItem><SelectItem value="milestone">Marco</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Início Previsto</Label><DateBrInput value={phaseForm.planned_start} onChange={e =/> setPhaseForm({ ...phaseForm, planned_start: e.target.value })} /></div>
                      <div><Label>Fim Previsto</Label><DateBrInput value={phaseForm.planned_end} onChange={e =/> setPhaseForm({ ...phaseForm, planned_end: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Horas Est.</Label><Input type="number" value={phaseForm.estimated_hours} onChange={e => setPhaseForm({ ...phaseForm, estimated_hours: e.target.value })} /></div>
                      <div><Label>Custo Est.</Label><Input type="number" value={phaseForm.estimated_cost} onChange={e => setPhaseForm({ ...phaseForm, estimated_cost: e.target.value })} /></div>
                    </div>
                    <Button onClick={() => createPhase.mutate({ ...phaseForm, project_id: selectedProject, estimated_hours: Number(phaseForm.estimated_hours), estimated_cost: Number(phaseForm.estimated_cost) }, { onSuccess: () => { setPhaseOpen(false); setPhaseForm({ title: "", phase_type: "phase", planned_start: "", planned_end: "", estimated_hours: 0, estimated_cost: 0 }); } })} disabled={!phaseForm.title}>Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Tipo</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                <TableBody>
                  {phases.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma etapa</TableCell></TableRow>}
                  {phases.map((ph: any) => (
                    <TableRow key={ph.id}>
                      <TableCell className="font-medium">{ph.title}</TableCell>
                      <TableCell><Badge variant="outline">{ph.phase_type === "milestone" ? "Marco" : "Etapa"}</Badge></TableCell>
                      <TableCell className="text-sm">{ph.planned_start ? new Date(ph.planned_start + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-sm">{ph.planned_end ? new Date(ph.planned_end + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-right font-mono">{ph.completion_percent}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recursos Planejados</CardTitle>
              <Dialog open={resOpen} onOpenChange={setResOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Recurso</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Planejar Recurso</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div><Label>Tipo</Label>
                      <Select value={resForm.resource_type} onValueChange={v => setResForm({ ...resForm, resource_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="labor">Mão de Obra</SelectItem>
                          <SelectItem value="material">Material</SelectItem>
                          <SelectItem value="outsourcing">Terceirização</SelectItem>
                          <SelectItem value="logistics">Logística</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Descrição *</Label><Input value={resForm.description} onChange={e => setResForm({ ...resForm, description: e.target.value })} /></div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label>Qtd</Label><Input type="number" value={resForm.quantity} onChange={e => setResForm({ ...resForm, quantity: e.target.value })} /></div>
                      <div><Label>Unidade</Label><Input value={resForm.unit} onChange={e => setResForm({ ...resForm, unit: e.target.value })} /></div>
                      <div><Label>Custo Unit.</Label><Input type="number" value={resForm.unit_cost} onChange={e => setResForm({ ...resForm, unit_cost: e.target.value })} /></div>
                    </div>
                    <Button onClick={() => createResource.mutate({ ...resForm, project_id: selectedProject, quantity: Number(resForm.quantity), unit_cost: Number(resForm.unit_cost) }, { onSuccess: () => { setResOpen(false); setResForm({ resource_type: "labor", description: "", quantity: 0, unit: "h", unit_cost: 0 }); } })} disabled={!resForm.description}>Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Custo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {resources.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum recurso</TableCell></TableRow>}
                  {resources.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.description}</TableCell>
                      <TableCell><Badge variant="outline">{r.resource_type}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.quantity} {r.unit}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(r.total_cost)}</TableCell>
                    </TableRow>
                  ))}
                  {resources.length > 0 && (
                    <TableRow><TableCell colSpan={3} className="font-bold text-right">Total Planejado</TableCell><TableCell className="text-right font-mono font-bold">{fmt(totalPlannedCost)}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
