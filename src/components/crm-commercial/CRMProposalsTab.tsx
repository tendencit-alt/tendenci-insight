import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText } from "lucide-react";
import { useCRMProposals, useCreateProposal, useUpdateProposal } from "@/hooks/useCRMCommercial";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  enviada: { label: "Enviada", variant: "default" },
  negociacao: { label: "Negociação", variant: "outline" },
  aceita: { label: "Aceita", variant: "default" },
  recusada: { label: "Recusada", variant: "destructive" },
};

export default function CRMProposalsTab() {
  const { user } = useAuth();
  const { data: proposals = [], isLoading } = useCRMProposals();
  const createMut = useCreateProposal();
  const updateMut = useUpdateProposal();
  const [open, setOpen] = useState(false);

  const { data: deals = [] } = useQuery({
    queryKey: ["crm-deals-select"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_deals").select("id, title, value").eq("status", "open").order("title");
      return data ?? [];
    },
  });

  const [form, setForm] = useState<any>({ deal_id: "", value: 0, payment_condition: "", delivery_days: 0, notes: "" });
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    createMut.mutate({ ...form, value: Number(form.value), delivery_days: Number(form.delivery_days), created_by: user?.id }, {
      onSuccess: () => { setOpen(false); setForm({ deal_id: "", value: 0, payment_condition: "", delivery_days: 0, notes: "" }); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Propostas Comerciais</h3>
          <Badge variant="outline">{proposals.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Proposta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Proposta</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Negócio *</Label>
                <Select value={form.deal_id} onValueChange={v => setForm({ ...form, deal_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{deals.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.title} ({fmt(d.value)})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor</Label><Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
                <div><Label>Prazo Entrega (dias)</Label><Input type="number" value={form.delivery_days} onChange={e => setForm({ ...form, delivery_days: e.target.value })} /></div>
              </div>
              <div><Label>Condição Pagamento</Label><Input value={form.payment_condition} onChange={e => setForm({ ...form, payment_condition: e.target.value })} /></div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleCreate} disabled={!form.deal_id || createMut.isPending}>Criar Proposta</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Condição</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma proposta</TableCell></TableRow>}
                {proposals.map((p: any) => {
                  const st = STATUS_MAP[p.status] || STATUS_MAP.rascunho;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.crm_deals?.title || "—"}</TableCell>
                      <TableCell>v{p.version_number}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(p.value)}</TableCell>
                      <TableCell className="text-sm">{p.payment_condition || "—"}</TableCell>
                      <TableCell className="text-sm">{p.delivery_days ? `${p.delivery_days}d` : "—"}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {p.status === "rascunho" && <Button size="sm" variant="ghost" onClick={() => updateMut.mutate({ id: p.id, status: "enviada" })}>Enviar</Button>}
                          {p.status === "enviada" && <Button size="sm" variant="ghost" onClick={() => updateMut.mutate({ id: p.id, status: "aceita" })}>Aceitar</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
