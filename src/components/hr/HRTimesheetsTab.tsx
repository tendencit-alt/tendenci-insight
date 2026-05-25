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
import { Plus, CheckCircle } from "lucide-react";
import { useHRTimesheets, useCreateTimesheet, useApproveTimesheet, useHREmployees } from "@/hooks/useHRData";

const now = new Date();
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export function HRTimesheetsTab() {
  const [month, setMonth] = useState(defaultMonth);
  const { data: timesheets = [], isLoading } = useHRTimesheets(month);
  const { data: employees = [] } = useHREmployees();
  const createMut = useCreateTimesheet();
  const approveMut = useApproveTimesheet();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ employee_id: "", work_date: "", planned_hours: 8, worked_hours: 0, overtime_hours: 0, absence_hours: 0, late_minutes: 0 });

  const handleCreate = () => {
    createMut.mutate({ ...form, planned_hours: Number(form.planned_hours), worked_hours: Number(form.worked_hours), overtime_hours: Number(form.overtime_hours), absence_hours: Number(form.absence_hours), late_minutes: Number(form.late_minutes) },
      { onSuccess: () => { setOpen(false); setForm({ employee_id: "", work_date: "", planned_hours: 8, worked_hours: 0, overtime_hours: 0, absence_hours: 0, late_minutes: 0 }); } });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">Jornadas e Ponto</CardTitle>
        <div className="flex gap-2 items-center">
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Registrar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Jornada</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Colaborador *</Label>
                  <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{employees.filter((e: any) => e.status === "active").map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data *</Label><DateBrInput value={form.work_date} onChange={(iso) => setForm({ ...form, work_date: iso })} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Previstas</Label><Input type="number" value={form.planned_hours} onChange={e => setForm({ ...form, planned_hours: e.target.value })} /></div>
                  <div><Label>Realizadas</Label><Input type="number" value={form.worked_hours} onChange={e => setForm({ ...form, worked_hours: e.target.value })} /></div>
                  <div><Label>Extras</Label><Input type="number" value={form.overtime_hours} onChange={e => setForm({ ...form, overtime_hours: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Faltas (h)</Label><Input type="number" value={form.absence_hours} onChange={e => setForm({ ...form, absence_hours: e.target.value })} /></div>
                  <div><Label>Atraso (min)</Label><Input type="number" value={form.late_minutes} onChange={e => setForm({ ...form, late_minutes: e.target.value })} /></div>
                </div>
                <Button onClick={handleCreate} disabled={!form.employee_id || !form.work_date || createMut.isPending}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Previstas</TableHead>
                <TableHead className="text-right">Realizadas</TableHead>
                <TableHead className="text-right">Extras</TableHead>
                <TableHead className="text-right">Faltas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheets.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>}
              {timesheets.map((ts: any) => (
                <TableRow key={ts.id}>
                  <TableCell>{ts.hr_employees?.name || "—"}</TableCell>
                  <TableCell>{new Date(ts.work_date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{ts.planned_hours}h</TableCell>
                  <TableCell className="text-right font-mono text-sm">{ts.worked_hours}h</TableCell>
                  <TableCell className="text-right font-mono text-sm">{ts.overtime_hours}h</TableCell>
                  <TableCell className="text-right font-mono text-sm">{ts.absence_hours}h</TableCell>
                  <TableCell><Badge variant={ts.status === "approved" ? "default" : "secondary"}>{ts.status === "approved" ? "Aprovado" : "Pendente"}</Badge></TableCell>
                  <TableCell>
                    {ts.status !== "approved" && (
                      <Button variant="ghost" size="icon" onClick={() => approveMut.mutate(ts.id)} title="Aprovar">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
