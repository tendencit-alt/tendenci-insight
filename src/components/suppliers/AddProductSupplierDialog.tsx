import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddProductSupplierDialogProps {
  supplierId: string;
  existingProductIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddProductSupplierDialog({ 
  supplierId, 
  existingProductIds,
  open, 
  onOpenChange, 
  onSuccess 
}: AddProductSupplierDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    product_id: "",
    cost_price: 0,
    lead_time_days: null as number | null,
    min_order_quantity: 1,
    supplier_code: "",
    is_preferred: false
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-for-supplier", existingProductIds],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, code, cost_price, unit")
        .eq("active", true)
        .order("name");

      if (existingProductIds.length > 0) {
        query = query.not("id", "in", `(${existingProductIds.join(",")})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const handleProductChange = (productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    setForm({
      ...form,
      product_id: productId,
      cost_price: product?.cost_price || 0
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id) {
      toast({ title: "Selecione um produto", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // If marking as preferred, unmark others
      if (form.is_preferred) {
        await supabase
          .from("product_suppliers")
          .update({ is_preferred: false })
          .eq("product_id", form.product_id);
      }

      const { error } = await supabase.from("product_suppliers").insert({
        supplier_id: supplierId,
        product_id: form.product_id,
        cost_price: form.cost_price,
        lead_time_days: form.lead_time_days,
        min_order_quantity: form.min_order_quantity,
        supplier_code: form.supplier_code || null,
        is_preferred: form.is_preferred
      });

      if (error) throw error;

      toast({ title: "Produto vinculado com sucesso!" });
      onSuccess();
      onOpenChange(false);
      setForm({
        product_id: "",
        cost_price: 0,
        lead_time_days: null,
        min_order_quantity: 1,
        supplier_code: "",
        is_preferred: false
      });
    } catch (error: any) {
      toast({ title: "Erro ao vincular produto", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular Produto ao Fornecedor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Produto *</Label>
            <Select value={form.product_id} onValueChange={handleProductChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code ? `${p.code} - ` : ""}{p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              Vincular Produto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
