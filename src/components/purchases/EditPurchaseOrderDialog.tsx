import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface EditPurchaseOrderDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface OrderItem {
  id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function EditPurchaseOrderDialog({ order, open, onOpenChange, onSuccess }: EditPurchaseOrderDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "",
    expected_date: "",
    payment_terms: "",
    notes: ""
  });
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItem, setNewItem] = useState({ product_id: "", quantity: 1, unit_price: 0 });

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
        .select("id, name, code, cost_price, unit")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const { data: existingItems = [] } = useQuery({
    queryKey: ["purchase-order-items-edit", order?.id],
    queryFn: async () => {
      if (!order?.id) return [];
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select(`*, product:products(id, name, code)`)
        .eq("purchase_order_id", order.id)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id && open
  });

  useEffect(() => {
    if (order && open) {
      setForm({
        supplier_id: order.supplier_id || "",
        expected_date: order.expected_date?.split("T")[0] || "",
        payment_terms: order.payment_terms || "",
        notes: order.notes || ""
      });
    }
  }, [order, open]);

  useEffect(() => {
    if (existingItems.length > 0) {
      setItems(existingItems.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product?.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
      })));
    }
  }, [existingItems]);

  const addItem = () => {
    if (!newItem.product_id) {
      toast({ title: "Selecione um produto", variant: "destructive" });
      return;
    }
    const product = products.find((p: any) => p.id === newItem.product_id);
    const total = newItem.quantity * newItem.unit_price;
    setItems([...items, {
      product_id: newItem.product_id,
      product_name: product?.name,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      total
    }]);
    setNewItem({ product_id: "", quantity: 1, unit_price: 0 });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier_id) {
      toast({ title: "Selecione um fornecedor", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Adicione ao menos um item", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Update order
      const { error: orderError } = await supabase
        .from("purchase_orders")
        .update({
          supplier_id: form.supplier_id,
          expected_date: form.expected_date || null,
          payment_terms: form.payment_terms || null,
          notes: form.notes || null,
          total: calculateTotal()
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // Delete existing items
      await supabase
        .from("purchase_order_items")
        .delete()
        .eq("purchase_order_id", order.id);

      // Insert new items
      const itemsToInsert = items.map((item, index) => ({
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

      toast({ title: "Pedido atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro ao atualizar pedido", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pedido #{order.order_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
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
              <Label>Previsão de Entrega</Label>
              <Input
                type="date"
                value={form.expected_date}
                onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Condições de Pagamento</Label>
            <Input
              value={form.payment_terms}
              onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
              placeholder="Ex: 30/60/90 dias"
            />
          </div>

          <div className="space-y-2">
            <Label>Adicionar Item</Label>
            <div className="flex gap-2">
              <Select 
                value={newItem.product_id} 
                onValueChange={(v) => {
                  const product = products.find((p: any) => p.id === v);
                  setNewItem({ ...newItem, product_id: v, unit_price: product?.cost_price || 0 });
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code ? `${p.code} - ` : ""}{p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                className="w-24"
                placeholder="Qtd"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
              />
              <MoneyInput
                className="w-32"
                value={newItem.unit_price}
                onChange={(v) => setNewItem({ ...newItem, unit_price: v })}
              />
              <Button type="button" onClick={addItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Preço Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.product_name || products.find((p: any) => p.id === item.product_id)?.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">Total:</TableCell>
                  <TableCell className="text-right font-bold text-lg">{formatCurrency(calculateTotal())}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
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
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
