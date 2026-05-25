import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface CreatePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function CreatePurchaseOrderDialog({ open, onOpenChange, onSuccess }: CreatePurchaseOrderDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "",
    expected_date: "",
    payment_terms: "",
    notes: ""
  });
  const [items, setItems] = useState<OrderItem[]>([{ product_id: "", quantity: 1, unit_price: 0, total: 0 }]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, code, cost_price")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalcular total do item
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    
    // Auto-preencher preço de custo ao selecionar produto
    if (field === "product_id") {
      const product = products.find((p: any) => p.id === value);
      if (product) {
        newItems[index].unit_price = product.cost_price || 0;
        newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
      }
    }
    
    setItems(newItems);
  };

  const orderTotal = items.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.supplier_id) {
      toast({ title: "Selecione um fornecedor", variant: "destructive" });
      return;
    }

    const validItems = items.filter(item => item.product_id && item.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "Adicione pelo menos um item", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Criar pedido
      const { data: order, error: orderError } = await supabase
        .from("purchase_orders")
        .insert({
          supplier_id: form.supplier_id,
          expected_date: form.expected_date || null,
          payment_terms: form.payment_terms || null,
          notes: form.notes || null,
          created_by: user?.id,
          subtotal: orderTotal,
          total: orderTotal
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Criar itens
      const itemsToInsert = validItems.map((item, index) => ({
        purchase_order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        position: index
      }));

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Cross-module invalidation: purchase creates payable + ledger via trigger
      queryClient.invalidateQueries({ queryKey: ["fin-payables"] });
      queryClient.invalidateQueries({ queryKey: ["fin-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });

      toast({ title: "Pedido de compra criado!" });
      onSuccess();
      onOpenChange(false);
      setForm({ supplier_id: "", expected_date: "", payment_terms: "", notes: "" });
      setItems([{ product_id: "", quantity: 1, unit_price: 0, total: 0 }]);
    } catch (error: any) {
      toast({ title: "Erro ao criar pedido", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Compra</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor *</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_date">Previsão de Entrega</Label>
              <DateBrInput
                id="expected_date"
                value={form.expected_date}
                onChange={(e) =/> setForm({ ...form, expected_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_terms">Condição de Pagamento</Label>
            <Input
              id="payment_terms"
              placeholder="Ex: 30/60/90 dias"
              value={form.payment_terms}
              onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            
            <div className="border rounded-lg divide-y">
              {items.map((item, index) => (
                <div key={index} className="p-3 grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs">Produto</Label>
                    <Select value={item.product_id} onValueChange={(v) => updateItem(index, "product_id", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code && `[${p.code}] `}{p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Valor Unit.</Label>
                    <MoneyInput
                      value={item.unit_price}
                      onChange={(v) => updateItem(index, "unit_price", v)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Total</Label>
                    <Input
                      value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.total)}
                      disabled
                    />
                  </div>
                  <div className="col-span-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end p-3 bg-muted rounded-lg">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total do Pedido</p>
              <p className="text-xl font-bold">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(orderTotal)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Pedido
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
