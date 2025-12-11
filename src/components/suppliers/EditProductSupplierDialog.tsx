import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface EditProductSupplierDialogProps {
  link: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditProductSupplierDialog({ 
  link, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditProductSupplierDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    cost_price: 0,
    lead_time_days: null as number | null,
    min_order_quantity: 1,
    supplier_code: "",
    is_preferred: false
  });

  useEffect(() => {
    if (link) {
      setForm({
        cost_price: link.cost_price || 0,
        lead_time_days: link.lead_time_days,
        min_order_quantity: link.min_order_quantity || 1,
        supplier_code: link.supplier_code || "",
        is_preferred: link.is_preferred || false
      });
    }
  }, [link]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      // If marking as preferred, unmark others
      if (form.is_preferred && !link.is_preferred) {
        await supabase
          .from("product_suppliers")
          .update({ is_preferred: false })
          .eq("product_id", link.product_id);
      }

      const { error } = await supabase
        .from("product_suppliers")
        .update({
          cost_price: form.cost_price,
          lead_time_days: form.lead_time_days,
          min_order_quantity: form.min_order_quantity,
          supplier_code: form.supplier_code || null,
          is_preferred: form.is_preferred
        })
        .eq("id", link.id);

      if (error) throw error;

      toast({ title: "Vínculo atualizado!" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!link) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Vínculo - {link.product?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço de Custo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Código no Fornecedor</Label>
              <Input
                value={form.supplier_code}
                onChange={(e) => setForm({ ...form, supplier_code: e.target.value })}
                placeholder="Código do produto no fornecedor"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lead Time (dias)</Label>
              <Input
                type="number"
                value={form.lead_time_days || ""}
                onChange={(e) => setForm({ ...form, lead_time_days: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Prazo de entrega"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade Mínima</Label>
              <Input
                type="number"
                min="1"
                value={form.min_order_quantity}
                onChange={(e) => setForm({ ...form, min_order_quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <Label htmlFor="is_preferred">Fornecedor Preferencial</Label>
            <Switch
              id="is_preferred"
              checked={form.is_preferred}
              onCheckedChange={(checked) => setForm({ ...form, is_preferred: checked })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
