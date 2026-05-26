import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDelivery, useOrdersForFulfillment } from "@/hooks/useFulfillment";

export function CreateDeliveryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: orders = [] } = useOrdersForFulfillment();
  const create = useCreateDelivery();
  const [orderId, setOrderId] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [endereco, setEndereco] = useState("");
  const [obs, setObs] = useState("");

  const selected = orders.find((o: any) => o.id === orderId);
  const inferredAddress = selected
    ? [selected.entrega_logradouro, selected.entrega_numero, selected.entrega_bairro].filter(Boolean).join(", ")
    : "";

  async function submit() {
    if (!orderId) return;
    await create.mutateAsync({
      order_id: orderId,
      scheduled_date: scheduled || null,
      transportadora: transportadora || null,
      endereco: endereco || inferredAddress || null,
      observacoes: obs || null,
    });
    onOpenChange(false);
    setOrderId(""); setScheduled(""); setTransportadora(""); setEndereco(""); setObs("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova entrega</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Pedido</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger><SelectValue placeholder="Selecione o pedido" /></SelectTrigger>
              <SelectContent>
                {orders.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>
                    #{o.order_number} — {o.client?.name ?? "sem cliente"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Data prevista</Label>
              <Input type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
            </div>
            <div>
              <Label>Transportadora</Label>
              <Input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={endereco || inferredAddress} onChange={(e) => setEndereco(e.target.value)} placeholder="Puxado do pedido se vazio" />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!orderId || create.isPending}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
