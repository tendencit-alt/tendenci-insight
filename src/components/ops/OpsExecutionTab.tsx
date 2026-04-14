import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useOpsOrders, useOpsActivities, useCreateOpsActivity } from "@/hooks/useOpsData";
import { useHREmployees } from "@/hooks/useHRData";

export function OpsExecutionTab() {
  const { data: orders = [] } = useOpsOrders({ status: "in_progress" });
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const { data: activities = [] } = useOpsActivities(selectedOrder || undefined);
  const { data: employees = [] } = useHREmployees();
  const createMut = useCreateOpsActivity();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ employee_id: "", activity_type: "execution", description: "", hours_spent: 0, hourly_cost: 0 });

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    const emp = employees.find((e: any) => e.id === form.employee_id);
    createMut.mutate({
      ops_order_id: selectedOrder,
      employee_id: form.employee_id || null,
      activity_type: form.activity_type,
      description: form.description,
      hours_spent: Number(form.hours_spent),
      hourly_cost: emp?.hourly_cost || Number(form.hourly_cost),
      status: "completed",
    }, { onSuccess: () => { setOpen(false); setForm({ employee_id: "", activity_type: "execution", description: "", hours_spent: 0, hourly_cost: 0 }); } });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">Execução Operacional</CardTitle>
          <div className="flex gap-2">
            <Select value={selectedOrder} onValueChange={setSelectedOrder}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Selecione uma ordem" /></SelectTrigger>
              <SelectContent>
                {orders.map((o: any) => <SelectItem key={o.id} value={o.id}>#{o.order_number} — {o.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedOrder && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Apontar</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Apontar Atividade</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div><Label>Colaborador</Label>
                      <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{employees.filter((e: any) => e.status === "active").map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Tipo</Label>
                      <Select value={form.activity_type} onValueChange={v => setForm({ ...form, activity_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="execution">Execução</SelectItem>
                          <SelectItem value="assembly">Montagem</SelectItem>
                          <SelectItem value="rework">Retrabalho</SelectItem>
                          <SelectItem value="logistics">Logística</SelectItem>
                          <SelectItem value="inspection">Inspeção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                    <div><Label>Horas Consumidas *</Label><Input type="number" step="0.5" value={form.hours_spent} onChange={e => setForm({ ...form, hours_spent: e.target.value })} /></div>
                    <Button onClick={handleCreate} disabled={!form.hours_spent || createMut.isPending}>Registrar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedOrder ? (
            <p className="text-muted-foreground text-sm text-center py-8">Selecione uma ordem em execução para apontar atividades</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Custo/h</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma atividade</TableCell></TableRow>}
                {activities.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.hr_employees?.name || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{a.activity_type}</Badge></TableCell>
                    <TableCell>{a.description || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{a.hours_spent}h</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(a.hourly_cost)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(a.total_cost)}</TableCell>
                    <TableCell><Badge variant={a.status === "completed" ? "default" : "secondary"}>{a.status === "completed" ? "Concluído" : "Em andamento"}</Badge></TableCell>
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
