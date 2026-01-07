import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Package, AlertTriangle } from "lucide-react";

interface CreateMaterialRequestDialogProps {
  product: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateMaterialRequestDialog({ product, open, onOpenChange, onSuccess }: CreateMaterialRequestDialogProps) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!quantity || quantity <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }
    if (!reason.trim()) {
      toast.error("Informe o motivo da requisição");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("material_requests")
      .insert({
        product_id: product.id,
        quantity,
        reason: reason.trim(),
        requested_by: user?.id,
        status: "pendente"
      });

    if (error) {
      toast.error("Erro ao criar requisição");
      console.error(error);
    } else {
      toast.success("Requisição de material criada com sucesso!");
      setQuantity(1);
      setReason("");
      onSuccess();
      onOpenChange(false);
    }
    setSaving(false);
  };

  if (!product) return null;

  const isLowStock = product.min_stock > 0 && product.current_stock <= product.min_stock;
  const suggestedQty = isLowStock ? Math.max(product.min_stock * 2 - product.current_stock, 1) : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Requisição de Compra
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Código</Label>
                <p className="font-mono text-sm">{product.code || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Unidade</Label>
                <p className="text-sm">{product.unit}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs">Item</Label>
                <p className="font-medium">{product.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Estoque Atual</Label>
                <div className="flex items-center gap-2">
                  {isLowStock && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  <span className={isLowStock ? "text-amber-500 font-medium" : ""}>
                    {product.current_stock} {product.unit}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Estoque Mínimo</Label>
                <p>{product.min_stock || 0} {product.unit}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade Desejada *</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={1}
              placeholder={`Sugestão: ${suggestedQty}`}
            />
            {isLowStock && (
              <p className="text-xs text-muted-foreground">
                Sugestão baseada no estoque mínimo: {suggestedQty} {product.unit}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Compra *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da requisição de compra..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Enviando..." : "Enviar Requisição"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
