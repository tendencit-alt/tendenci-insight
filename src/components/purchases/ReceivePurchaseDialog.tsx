import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ReceivePurchaseDialogProps {
  order: any;
  items: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ReceivePurchaseDialog({ order, items, open, onOpenChange, onSuccess }: ReceivePurchaseDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (items.length > 0) {
      const initial: Record<string, number> = {};
      items.forEach(item => {
        initial[item.id] = item.quantity - (item.received_quantity || 0);
      });
      setReceivedQuantities(initial);
    }
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let allReceived = true;

      for (const item of items) {
        const qty = receivedQuantities[item.id] || 0;
        if (qty <= 0) continue;

        // Atualizar quantidade recebida do item
        const newReceivedQty = (item.received_quantity || 0) + qty;
        await supabase
          .from("purchase_order_items")
          .update({ received_quantity: newReceivedQty })
          .eq("id", item.id);

        // Verificar se ainda falta receber
        if (newReceivedQty < item.quantity) {
          allReceived = false;
        }

        // Criar movimentação de estoque
        await supabase.from("stock_movements").insert({
          product_id: item.product_id,
          movement_type: "entrada",
          quantity: qty,
          unit_cost: item.unit_price,
          reference_type: "purchase_order",
          reference_id: order.id,
          supplier_id: order.supplier_id,
          notes: `Recebimento do Pedido de Compra #${order.order_number}`,
          created_by: user?.id
        });
      }

      // Atualizar status do pedido
      const newStatus = allReceived ? "recebido_total" : "recebido_parcial";
      const updates: any = { status: newStatus };
      if (allReceived) {
        updates.received_date = new Date().toISOString();
      }

      await supabase
        .from("purchase_orders")
        .update(updates)
        .eq("id", order.id);

      // Cross-module invalidation
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["fin-payables"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });

      toast({ title: allReceived ? "Pedido totalmente recebido!" : "Recebimento parcial registrado" });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Erro ao registrar recebimento", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Recebimento - Pedido #{order?.order_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Pedido</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead className="text-right">Falta</TableHead>
                <TableHead className="text-right">Receber Agora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const pending = item.quantity - (item.received_quantity || 0);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.product?.name}</p>
                      <p className="text-xs text-muted-foreground">{item.product?.code}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.product?.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.received_quantity || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={pending > 0 ? "text-amber-600" : "text-green-600"}>
                        {pending}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        max={pending}
                        step="0.01"
                        className="w-24 ml-auto"
                        value={receivedQuantities[item.id] || 0}
                        onChange={(e) => setReceivedQuantities({
                          ...receivedQuantities,
                          [item.id]: Math.min(parseFloat(e.target.value) || 0, pending)
                        })}
                        disabled={pending <= 0}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Recebimento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
