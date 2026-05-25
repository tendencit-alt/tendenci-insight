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
import { Plus, Search, Trash2, Edit } from "lucide-react";
import { useHREmployees, useCreateEmployee, useDeleteEmployee, useHRDepartments, useHRPositions, useHRTeams } from "@/hooks/useHRData";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Ativo", variant: "default" },
  inactive: { label: "Inativo", variant: "secondary" },
  terminated: { label: "Desligado", variant: "destructive" },
};

export function HREmployeesTab() {
  const { data: employees = [], isLoading } = useHREmployees();
  const { data: departments = [] } = useHRDepartments();
  const { data: positions = [] } = useHRPositions();
  const { data: teams = [] } = useHRTeams();
  const createMut = useCreateEmployee();
  const deleteMut = useDeleteEmployee();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", cpf: "", registration_number: "", base_salary: 0, benefits_percent: 70, monthly_hours: 220, status: "active", admission_date: "" });

  const filtered = employees.filter((e: any) => e.name?.toLowerCase().includes(search.toLowerCase()));

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    createMut.mutate({
      ...form,
      base_salary: Number(form.base_salary),
      benefits_percent: Number(form.benefits_percent),
      monthly_hours: Number(form.monthly_hours),
      position_id: form.position_id || null,
      department_id: form.department_id || null,
      team_id: form.team_id || null,
    }, { onSuccess: () => { setOpen(false); setForm({ name: "", cpf: "", registration_number: "", base_salary: 0, benefits_percent: 70, monthly_hours: 220, status: "active", admission_date: "" }); } });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">Colaboradores</CardTitle>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-56" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Colaborador</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} /></div>
                  <div><Label>Matrícula</Label><Input value={form.registration_number} onChange={e => setForm({ ...form, registration_number: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Departamento</Label>
                    <Select value={form.department_id} onValueChange={v => setForm({ ...form, department_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Cargo</Label>
                    <Select value={form.position_id} onValueChange={v => setForm({ ...form, position_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{positions.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Equipe</Label>
                  <Select value={form.team_id} onValueChange={v => setForm({ ...form, team_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Salário Base</Label><Input type="number" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} /></div>
                  <div><Label>% Encargos</Label><Input type="number" value={form.benefits_percent} onChange={e => setForm({ ...form, benefits_percent: e.target.value })} /></div>
                  <div><Label>Horas/Mês</Label><Input type="number" value={form.monthly_hours} onChange={e => setForm({ ...form, monthly_hours: e.target.value })} /></div>
                </div>
                <div><Label>Data Admissão</Label><DateBrInput value={form.admission_date} onChange={(iso) => setForm({ ...form, admission_date: iso })} /></div>
                <Button onClick={handleCreate} disabled={!form.name || createMut.isPending}>Salvar</Button>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead className="text-right">Salário</TableHead>
                  <TableHead className="text-right">Custo Mensal</TableHead>
                  <TableHead className="text-right">Custo/Hora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhum colaborador</TableCell></TableRow>}
                {filtered.map((emp: any) => {
                  const st = STATUS_MAP[emp.status] || STATUS_MAP.active;
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.hr_positions?.title || "—"}</TableCell>
                      <TableCell>{emp.hr_departments?.name || "—"}</TableCell>
                      <TableCell>{emp.hr_teams?.name || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(emp.base_salary)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(emp.monthly_cost)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(emp.hourly_cost)}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(emp.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
