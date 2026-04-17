import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { useAdminAction } from "@/hooks/useSaasAdmin";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  action: string;
  title: string;
  description: string;
  target_tenant_id?: string;
  target_user_id?: string;
  payload?: Record<string, unknown>;
  onSuccess?: () => void;
}

export function AdminActionDialog({ open, onOpenChange, action, title, description, target_tenant_id, target_user_id, payload, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const mutation = useAdminAction();

  const handleConfirm = async () => {
    if (reason.trim().length < 5) return;
    await mutation.mutateAsync({ action, target_tenant_id, target_user_id, reason, payload });
    setReason("");
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reason">Motivo (obrigatório, mín. 5 caracteres)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Cliente solicitou suspensão temporária por 30 dias"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Esta ação será registrada no log de auditoria com seu nome, data/hora e o motivo informado.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={reason.trim().length < 5 || mutation.isPending}
          >
            {mutation.isPending ? "Executando..." : "Confirmar e registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
