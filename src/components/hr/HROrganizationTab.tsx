import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useHRDepartments, useCreateDepartment, useHRTeams, useCreateTeam, useHRPositions, useCreatePosition } from "@/hooks/useHRData";
import { useCostCenters } from "@/hooks/useCostCenters";

export function HROrganizationTab() {
  const { data: depts = [] } = useHRDepartments();
  const { data: teams = [] } = useHRTeams();
  const { data: positions = [] } = useHRPositions();
  const { costCenters } = useCostCenters();
  const createDept = useCreateDepartment();
  const createTeam = useCreateTeam();
  const createPos = useCreatePosition();

  const [deptOpen, setDeptOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", cost_center_id: "" });
  const [teamForm, setTeamForm] = useState({ name: "", department_id: "" });
  const [posForm, setPosForm] = useState({ title: "", min_salary: 0, max_salary: 0 });

  return (
    <Tabs defaultValue="departamentos" className="space-y-4">
      <TabsList>
        <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
        <TabsTrigger value="equipes">Equipes</TabsTrigger>
        <TabsTrigger value="cargos">Cargos</TabsTrigger>
      </TabsList>

      <TabsContent value="departamentos">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Departamentos</CardTitle>
            <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Departamento</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Nome *</Label><Input value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} /></div>
                  <div><Label>Centro de Custo</Label>
                    <Select value={deptForm.cost_center_id} onValueChange={v => setDeptForm({ ...deptForm, cost_center_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{costCenters.map(cc => <SelectItem key={cc.value} value={cc.value}>{cc.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => createDept.mutate({ name: deptForm.name, cost_center_id: deptForm.cost_center_id || null }, { onSuccess: () => { setDeptOpen(false); setDeptForm({ name: "", cost_center_id: "" }); } })} disabled={!deptForm.name}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Centro de Custo</TableHead></TableRow></TableHeader>
              <TableBody>
                {depts.map((d: any) => <TableRow key={d.id}><TableCell>{d.name}</TableCell><TableCell>{d.fin_cost_centers?.name || "—"}</TableCell></TableRow>)}
                {depts.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum departamento</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="equipes">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Equipes</CardTitle>
            <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Equipe</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Nome *</Label><Input value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} /></div>
                  <div><Label>Departamento</Label>
                    <Select value={teamForm.department_id} onValueChange={v => setTeamForm({ ...teamForm, department_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{depts.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => createTeam.mutate({ name: teamForm.name, department_id: teamForm.department_id || null }, { onSuccess: () => { setTeamOpen(false); setTeamForm({ name: "", department_id: "" }); } })} disabled={!teamForm.name}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Departamento</TableHead></TableRow></TableHeader>
              <TableBody>
                {teams.map((t: any) => <TableRow key={t.id}><TableCell>{t.name}</TableCell><TableCell>{t.hr_departments?.name || "—"}</TableCell></TableRow>)}
                {teams.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Nenhuma equipe</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cargos">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Cargos</CardTitle>
            <Dialog open={posOpen} onOpenChange={setPosOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Cargo</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Título *</Label><Input value={posForm.title} onChange={e => setPosForm({ ...posForm, title: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Salário Mínimo</Label><Input type="number" value={posForm.min_salary} onChange={e => setPosForm({ ...posForm, min_salary: Number(e.target.value) })} /></div>
                    <div><Label>Salário Máximo</Label><Input type="number" value={posForm.max_salary} onChange={e => setPosForm({ ...posForm, max_salary: Number(e.target.value) })} /></div>
                  </div>
                  <Button onClick={() => createPos.mutate(posForm, { onSuccess: () => { setPosOpen(false); setPosForm({ title: "", min_salary: 0, max_salary: 0 }); } })} disabled={!posForm.title}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Título</TableHead><TableHead className="text-right">Faixa Salarial</TableHead></TableRow></TableHeader>
              <TableBody>
                {positions.map((p: any) => {
                  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
                  return <TableRow key={p.id}><TableCell>{p.title}</TableCell><TableCell className="text-right font-mono text-sm">{fmt(p.min_salary)} – {fmt(p.max_salary)}</TableCell></TableRow>;
                })}
                {positions.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum cargo</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
