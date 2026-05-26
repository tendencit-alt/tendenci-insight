import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DELIVERY_STATUSES, DeliveryStatusBadge } from "./StatusBadge";
import type { DeliveryOrder } from "@/hooks/useFulfillment";
import { useUpdateDelivery } from "@/hooks/useFulfillment";
import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export function DeliveryDetailSheet({
  delivery, open, onOpenChange,
}: { delivery: DeliveryOrder | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const update = useUpdateDelivery();
  const [form, setForm] = useState<Partial<DeliveryOrder>>({});

  useEffect(() => { setForm(delivery ?? {}); }, [delivery]);
  if (!delivery) return null;

  const save = () => update.mutate({ id: delivery.id, patch: form });
  const markDelivered = () =>
    update.mutate({
      id: delivery.id,
      patch: { status: "entregue", delivered_date: new Date().toISOString() } as any,
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Entrega — Pedido #{delivery.order?.order_number}
            <DeliveryStatusBadge status={delivery.status} />
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Status</Label>
              <Select value={form.status ?? delivery.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DELIVERY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data prevista</Label>
              <Input
                type="datetime-local"
                value={form.scheduled_date ? form.scheduled_date.slice(0, 16) : ""}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value || null }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Transportadora</Label><Input value={form.transportadora ?? ""} onChange={(e) => setForm((f) => ({ ...f, transportadora: e.target.value }))} /></div>
            <div><Label>Veículo</Label><Input value={form.veiculo ?? ""} onChange={(e) => setForm((f) => ({ ...f, veiculo: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Motorista</Label><Input value={form.motorista ?? ""} onChange={(e) => setForm((f) => ({ ...f, motorista: e.target.value }))} /></div>
            <div><Label>Recebido por</Label><Input value={form.recebido_por ?? ""} onChange={(e) => setForm((f) => ({ ...f, recebido_por: e.target.value }))} /></div>
          </div>
          <div><Label>Endereço</Label><Input value={form.endereco ?? ""} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} /></div>
          <div><Label>Comprovante (URL)</Label><Input value={form.proof_file_url ?? ""} onChange={(e) => setForm((f) => ({ ...f, proof_file_url: e.target.value }))} placeholder="Cole a URL do comprovante" /></div>
          <div><Label>Observações</Label><Textarea rows={3} value={form.observacoes ?? ""} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} /></div>

          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={update.isPending}>Salvar</Button>
            {delivery.status !== "entregue" && (
              <Button variant="default" onClick={markDelivered} disabled={update.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar como entregue
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
