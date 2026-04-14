import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useHRLaborAllocations, useCreateLaborAllocation, useHREmployees } from "@/hooks/useHRData";
import { useCostCenters } from "@/hooks/useCostCenters";

const now = new Date();
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export function HRLaborCostsTab() {
  const [month, setMonth] = useState(defaultMonth);
  const { data: allocations = [], isLoading } = useHRLaborAllocations(month);
  const { data: employees = [] } = useHREmployees();
  const { costCenters } = useCostCenters();
  const createMut = useCreateLaborAllocation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ employee_id: "", allocated_hours: 0, cost_center_id: "" });

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const totalCost = allocations.reduce((s: number, a: any) => s + (a.allocated_cost || 0), 0);
  const totalHours = allocations.reduce((s: number, a: any) => s + (a.allocated_hours || 0), 0);

  const handleCreate = () => {
    const emp = employees.find((e: any) => e.id === form.employee_id);
    const hours = Number(form.allocated_hours);
    const cost = hours * (emp?.hourly_cost || 0);
    createMut.mutate({
      employee_id: form.employee_id,
      reference_month: `${month}-01`,
      allocated_hours: hours,
      allocated_cost: cost,
      cost_center_id: form.cost_center_id || null,
    }, { onSuccess: () => { setOpen(false); setForm({ employee_id: "", allocated_hours: 0, cost_center_id: "" }); } });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Custo Total MO</p><p className="text-xl font-bold font-mono">{fmt(totalCost)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Horas Alocadas</p><p className="text-xl font-bold font-mono">{totalHours}h</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Registros</p><p className="text-xl font-bold font-mono">{allocations.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">Rateio de Custos MO</CardTitle>
          <div className="flex gap-2 items-center">
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Alocar</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Alocar Custo MO</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Colaborador *</Label>
                    <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{employees.filter((e: any) => e.status === "active").map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name} — {fmt(e.hourly_cost)}/h</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Horas *</Label><Input type="number" value={form.allocated_hours} onChange={e => setForm({ ...form, allocated_hours: e.target.value })} /></div>
                  <div><Label>Centro de Custo</Label>
                    <Select value={form.cost_center_id} onValueChange={v => setForm({ ...form, cost_center_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{costCenters.map(cc => <SelectItem key={cc.value} value={cc.value}>{cc.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreate} disabled={!form.employee_id || createMut.isPending}>Salvar</Button>
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
                  <TableHead>Centro Custo</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum rateio</TableCell></TableRow>}
                {allocations.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.hr_employees?.name || "—"}</TableCell>
                    <TableCell>{a.fin_cost_centers?.name || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{a.allocated_hours}h</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(a.allocated_cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
