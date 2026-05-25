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
import { Plus, Star } from "lucide-react";
import { useSupplyQuotations, useCreateQuotation, useSupplyRequests } from "@/hooks/useSupplyData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function SupQuotationsTab() {
  const { data: quotations = [], isLoading } = useSupplyQuotations();
  const { data: requests = [] } = useSupplyRequests();
  const createMut = useCreateQuotation();
  const [open, setOpen] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id, name").order("name");
      return data ?? [];
    },
  });

  const [form, setForm] = useState<any>({
    request_id: "", supplier_id: "", delivery_days: 0, payment_terms: "", shipping_cost: 0, total: 0, notes: "", valid_until: "",
  });

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    createMut.mutate({
      ...form,
      delivery_days: Number(form.delivery_days),
      shipping_cost: Number(form.shipping_cost),
      total: Number(form.total),
      request_id: form.request_id || null,
      valid_until: form.valid_until || null,
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ request_id: "", supplier_id: "", delivery_days: 0, payment_terms: "", shipping_cost: 0, total: 0, notes: "", valid_until: "" });
      },
    });
  };

  // Group by request for comparison
  const byRequest = quotations.reduce((acc: Record<string, any[]>, q: any) => {
    const key = q.request_id || "sem_solicitacao";
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cotações de Compra</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Cotação</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Registrar Cotação</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Solicitação (opcional)</Label>
                <Select value={form.request_id} onValueChange={v => setForm({ ...form, request_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{requests.filter((r: any) => ["approved", "in_quotation"].includes(r.status)).map((r: any) => <SelectItem key={r.id} value={r.id}>#{r.request_number} — {r.description?.substring(0, 40)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Fornecedor *</Label>
                <Select value={form.supplier_id} onValueChange={v => setForm({ ...form, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prazo Entrega (dias)</Label><Input type="number" value={form.delivery_days} onChange={e => setForm({ ...form, delivery_days: e.target.value })} /></div>
                <div><Label>Condição Pagamento</Label><Input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Frete</Label><Input type="number" value={form.shipping_cost} onChange={e => setForm({ ...form, shipping_cost: e.target.value })} /></div>
                <div><Label>Total</Label><Input type="number" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} /></div>
              </div>
              <div><Label>Validade</Label><DateBrInput value={form.valid_until} onChange={(iso) => setForm({ ...form, valid_until: iso })} /></div>
              <Button onClick={handleCreate} disabled={!form.supplier_id || createMut.isPending}>Registrar Cotação</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        Object.entries(byRequest).map(([requestId, quots]) => {
          const req = requests.find((r: any) => r.id === requestId);
          const bestPrice = Math.min(...quots.map((q: any) => q.total || Infinity));
          return (
            <Card key={requestId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {req ? `Solicitação #${req.request_number} — ${req.description?.substring(0, 50)}` : "Cotações Avulsas"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Frete</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quots.map((q: any) => (
                      <TableRow key={q.id} className={q.selected ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium">{q.suppliers?.name || "—"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {fmt(q.total)}
                          {q.total === bestPrice && quots.length > 1 && <Star className="inline h-3 w-3 text-amber-500 ml-1" />}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(q.shipping_cost)}</TableCell>
                        <TableCell>{q.delivery_days} dias</TableCell>
                        <TableCell className="text-sm">{q.payment_terms || "—"}</TableCell>
                        <TableCell><Badge variant={q.selected ? "default" : "outline"}>{q.selected ? "Selecionada" : q.status}</Badge></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
      {!isLoading && quotations.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma cotação registrada</CardContent></Card>
      )}
    </div>
  );
}
