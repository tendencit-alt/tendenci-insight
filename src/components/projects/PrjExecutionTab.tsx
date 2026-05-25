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
import { useProjects, useProjectExecutionLogs, useCreateExecutionLog } from "@/hooks/useProjectData";
import { useHREmployees } from "@/hooks/useHRData";

export function PrjExecutionTab() {
  const { data: projects = [] } = useProjects();
  const { data: employees = [] } = useHREmployees();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const { data: logs = [] } = useProjectExecutionLogs(selectedProject || undefined);
  const createLog = useCreateExecutionLog();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ employee_id: "", log_type: "hours", description: "", hours: 0, cost: 0, work_date: "" });

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    const emp = employees.find((e: any) => e.id === form.employee_id);
    const hours = Number(form.hours);
    const cost = form.log_type === "hours" ? hours * (emp?.hourly_cost || 0) : Number(form.cost);
    createLog.mutate({
      project_id: selectedProject,
      employee_id: form.employee_id || null,
      log_type: form.log_type,
      description: form.description,
      hours,
      cost,
      work_date: form.work_date || null,
    }, { onSuccess: () => { setOpen(false); setForm({ employee_id: "", log_type: "hours", description: "", hours: 0, cost: 0, work_date: "" }); } });
  };

  const totalHours = logs.reduce((s: number, l: any) => s + (l.hours || 0), 0);
  const totalCost = logs.reduce((s: number, l: any) => s + (l.cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
          <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>#{p.project_number} — {p.title}</SelectItem>)}</SelectContent>
        </Select>
        {selectedProject && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Registrar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Execução</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Tipo</Label>
                  <Select value={form.log_type} onValueChange={v => setForm({ ...form, log_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="outsourcing">Terceirização</SelectItem>
                      <SelectItem value="logistics">Logística</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Colaborador</Label>
                  <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{employees.filter((e: any) => e.status === "active").map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Horas</Label><Input type="number" step="0.5" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} /></div>
                  <div><Label>Data</Label><DateBrInput value={form.work_date} onChange={(iso) => setForm({ ...form, work_date: iso })} /></div>
                </div>
                {form.log_type !== "hours" && <div><Label>Custo</Label><Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></div>}
                <Button onClick={handleCreate} disabled={createLog.isPending}>Registrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!selectedProject ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione um projeto para ver execução</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Horas Executadas</p><p className="text-xl font-bold font-mono">{totalHours}h</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Custo Acumulado</p><p className="text-xl font-bold font-mono">{fmt(totalCost)}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Registros de Execução</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Colaborador</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Horas</TableHead><TableHead className="text-right">Custo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {logs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>}
                  {logs.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{l.work_date ? new Date(l.work_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell>{l.hr_employees?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{l.log_type}</Badge></TableCell>
                      <TableCell>{l.description || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{l.hours}h</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(l.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
