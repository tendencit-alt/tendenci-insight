import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useStockReservations, useCreateReservation, useUpdateReservation } from "@/hooks/useInventoryData";
import { useProjects } from "@/hooks/useProjectData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  reservado: { label: "Reservado", variant: "default" },
  consumido: { label: "Consumido", variant: "outline" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export default function InvReservationsTab() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: reservations = [], isLoading } = useStockReservations({ status: statusFilter });
  const { data: projects = [] } = useProjects();
  const createMut = useCreateReservation();
  const updateMut = useUpdateReservation();
  const [open, setOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["products-select"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, code, unit, current_stock").eq("active", true).order("name");
      return data ?? [];
    },
  });

  const [form, setForm] = useState<any>({ product_id: "", project_id: "", quantity: 0, needed_by: "", notes: "" });

  const handleCreate = () => {
    createMut.mutate({
      product_id: form.product_id,
      project_id: form.project_id || null,
      quantity: Number(form.quantity),
      needed_by: form.needed_by || null,
      notes: form.notes,
      reserved_by: user?.id,
    }, {
      onSuccess: () => { setOpen(false); setForm({ product_id: "", project_id: "", quantity: 0, needed_by: "", notes: "" }); },
    });
  };

  const totalReserved = reservations.filter((r: any) => r.status === "reservado").reduce((s: number, r: any) => s + (r.quantity || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
              <SelectItem value="consumido">Consumido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">{reservations.filter((r: any) => r.status === "reservado").length} reservas ativas</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Reserva</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Reservar Material</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Produto *</Label>
                <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name} (est: {p.current_stock})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Projeto (opcional)</Label>
                <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantidade</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>Data Necessidade</Label><DateBrInput value={form.needed_by} onChange={(iso) => setForm({ ...form, needed_by: iso })} /></div>
              </div>
              <div><Label>Observações</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleCreate} disabled={!form.product_id || !form.quantity || createMut.isPending}>Reservar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Reservas de Estoque</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead className="text-right">Qtd Reservada</TableHead>
                    <TableHead className="text-right">Consumido</TableHead>
                    <TableHead>Necessidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma reserva</TableCell></TableRow>}
                  {reservations.map((r: any) => {
                    const st = STATUS_MAP[r.status] || STATUS_MAP.reservado;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium">{r.products?.name}</p>
                          <p className="text-xs text-muted-foreground">{r.products?.code}</p>
                        </TableCell>
                        <TableCell className="text-sm">{r.prj_projects?.title || "—"}</TableCell>
                        <TableCell className="text-sm">{r.ops_orders?.title || "—"}</TableCell>
                        <TableCell className="text-right font-mono">{r.quantity} {r.products?.unit}</TableCell>
                        <TableCell className="text-right font-mono">{r.consumed_quantity || 0}</TableCell>
                        <TableCell className="text-sm">{r.needed_by ? new Date(r.needed_by + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell>
                          {r.status === "reservado" && (
                            <Button size="sm" variant="ghost" onClick={() => updateMut.mutate({ id: r.id, status: "cancelado" })}>Cancelar</Button>
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
    </div>
  );
}
