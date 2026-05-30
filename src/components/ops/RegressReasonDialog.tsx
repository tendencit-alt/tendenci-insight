import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fromLabel: string;
  toLabel: string;
  onConfirm: (reason: string) => Promise<void> | void;
  loading?: boolean;
}

export function RegressReasonDialog({ open, onOpenChange, fromLabel, toLabel, onConfirm, loading }: Props) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);

  const valid = reason.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Retrocesso de fase
          </DialogTitle>
          <DialogDescription>
            Você está retrocedendo de <strong>{fromLabel}</strong> para <strong>{toLabel}</strong>.
            Informe a justificativa (mínimo 10 caracteres).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Justificativa *</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: peça reprovada na inspeção, retorno para ajuste de medida..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">{reason.trim().length}/10 caracteres mínimos</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={!valid || loading}
            onClick={async () => { await onConfirm(reason.trim()); }}
          >
            {loading ? "Registrando..." : "Confirmar retrocesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
