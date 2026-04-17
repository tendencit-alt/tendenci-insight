import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSubscriptionAction } from "@/hooks/useBillingOps";
import { usePlansWithDetails } from "@/hooks/useBillingData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenant: { tenant_id: string; tenant_name: string; subscription_id?: string } | null;
  initialAction?: string;
}

const ACTIONS = [
  { value: "activate", label: "Ativar empresa" },
  { value: "suspend", label: "Suspender empresa" },
  { value: "pause_billing", label: "Pausar cobrança" },
  { value: "change_plan", label: "Alterar plano" },
  { value: "apply_discount", label: "Aplicar desconto" },
  { value: "grant_temporary_access", label: "Liberar acesso temporário" },
];

export function BillingActionDialog({ open, onOpenChange, tenant, initialAction }: Props) {
  const [actionType, setActionType] = useState(initialAction ?? "activate");
  const [reason, setReason] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const { data: plans } = usePlansWithDetails();
  const action = useSubscriptionAction();

  const submit = async () => {
    if (!tenant) return;
    if (reason.trim().length < 5) return;
    await action.mutateAsync({
      tenant_id: tenant.tenant_id,
      subscription_id: tenant.subscription_id,
      action_type: actionType,
      reason: reason.trim(),
      new_plan_id: actionType === "change_plan" ? planId : undefined,
      discount: actionType === "apply_discount" ? { type: discountType, value: discountValue } : undefined,
    });
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ação em assinatura — {tenant?.tenant_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Ação</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {actionType === "change_plan" && (
            <div>
              <Label>Novo plano</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(plans ?? []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — R$ {Number(p.price).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {actionType === "apply_discount" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input type="number" value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} />
              </div>
            </div>
          )}

          <div>
            <Label>Motivo (obrigatório, mín 5 caracteres)</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Descreva o motivo desta ação para o log de auditoria"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={submit}
            disabled={action.isPending || reason.trim().length < 5 || (actionType === "change_plan" && !planId)}
          >
            {action.isPending ? "Executando..." : "Confirmar ação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
