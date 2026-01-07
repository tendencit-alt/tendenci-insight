import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickMinStockDialogProps {
  product: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function QuickMinStockDialog({ product, open, onOpenChange, onSuccess }: QuickMinStockDialogProps) {
  const [minStock, setMinStock] = useState(product?.min_stock || 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({ min_stock: minStock })
      .eq("id", product.id);

    if (error) {
      toast.error("Erro ao atualizar estoque mínimo");
    } else {
      toast.success("Estoque mínimo atualizado");
      onSuccess();
      onOpenChange(false);
    }
    setSaving(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Editar Estoque Mínimo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-muted-foreground">Produto</Label>
            <p className="font-medium">{product.name}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Código</Label>
            <p className="font-mono text-sm">{product.code || "-"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Estoque Atual</Label>
            <p>{product.current_stock} {product.unit}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="min_stock">Estoque Mínimo</Label>
            <Input
              id="min_stock"
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(Number(e.target.value))}
              min={0}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
