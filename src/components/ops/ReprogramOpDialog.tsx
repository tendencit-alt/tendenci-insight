import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { useReprogramOp } from "@/hooks/useProductionPhaseMove";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opId: string;
  orderNumber: number | string;
  currentDueDate: string | null;
}

export function ReprogramOpDialog({ open, onOpenChange, opId, orderNumber, currentDueDate }: Props) {
  const reprogram = useReprogramOp();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setDate(currentDueDate ? new Date(currentDueDate).toISOString().slice(0, 10) : "");
      setReason("");
    }
  }, [open, currentDueDate]);

  const valid = !!date && reason.trim().length >= 10;

  const submit = async () => {
    try {
      await reprogram.mutateAsync({
        op_id: opId,
        new_due_date: new Date(date + "T23:59:59").toISOString(),
        reason: reason.trim(),
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao reprogramar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Reprogramar OP #{orderNumber}
          </DialogTitle>
          <DialogDescription>
            O prazo de entrega é imutável após criação. Para alterá-lo, informe nova data e justificativa.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-due">Nova previsão de entrega *</Label>
            <Input id="new-due" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {currentDueDate && (
              <p className="text-xs text-muted-foreground">
                Atual: {new Date(currentDueDate).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Justificativa * (mín. 10 caracteres)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Ex: cliente solicitou postergação por reforma do espaço..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reprogram.isPending}>Cancelar</Button>
          <Button onClick={submit} disabled={!valid || reprogram.isPending}>
            {reprogram.isPending ? "Salvando..." : "Reprogramar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
