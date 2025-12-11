import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, AlertTriangle, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PurchaseSuggestion {
  product_id: string;
  product_name: string;
  product_code: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  suggested_quantity: number;
  preferred_supplier_id: string | null;
  preferred_supplier_name: string | null;
  last_cost: number;
  estimated_total: number;
  urgency: string;
}

export default function PurchaseSuggestions() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["purchase-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("suggest_purchase_orders");
      if (error) throw error;
      return (data || []) as PurchaseSuggestion[];
    },
  });

  const createPurchaseOrder = useMutation({
    mutationFn: async (supplierId: string) => {
      const itemsForSupplier = suggestions.filter(
        (s) => s.preferred_supplier_id === supplierId && selectedItems.includes(s.product_id)
      );

      if (itemsForSupplier.length === 0) {
        throw new Error("Nenhum item selecionado para este fornecedor");
      }

      const subtotal = itemsForSupplier.reduce((sum, item) => sum + item.estimated_total, 0);

      const { data: order, error: orderError } = await supabase
        .from("purchase_orders")
        .insert({
          supplier_id: supplierId,
          subtotal,
          total: subtotal,
          status: "rascunho",
          notes: "Pedido gerado automaticamente por sugestão de reposição",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const items = itemsForSupplier.map((item) => ({
        purchase_order_id: order.id,
        product_id: item.product_id,
        quantity: item.suggested_quantity,
        unit_price: item.last_cost,
        total: item.estimated_total,
      }));

      const { error: itemsError } = await supabase.from("purchase_order_items").insert(items);
      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      toast.success("Pedido de compra criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setSelectedItems([]);
    },
    onError: (error: any) => {
      toast.error("Erro ao criar pedido: " + error.message);
    },
  });

  const toggleItem = (productId: string) => {
    setSelectedItems((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const toggleAll = () => {
    if (selectedItems.length === suggestions.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(suggestions.map((s) => s.product_id));
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      critico: { variant: "destructive", label: "Crítico" },
      urgente: { variant: "destructive", label: "Urgente" },
      normal: { variant: "secondary", label: "Normal" },
      baixa: { variant: "outline", label: "Baixa" },
    };
    const config = variants[urgency] || variants.baixa;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const groupedBySupplier = suggestions.reduce((acc, item) => {
    const supplierId = item.preferred_supplier_id || "sem_fornecedor";
    if (!acc[supplierId]) {
      acc[supplierId] = {
        supplierName: item.preferred_supplier_name || "Sem Fornecedor Preferencial",
        items: [],
      };
    }
    acc[supplierId].items.push(item);
    return acc;
  }, {} as Record<string, { supplierName: string; items: PurchaseSuggestion[] }>);

  const selectedTotal = suggestions
    .filter((s) => selectedItems.includes(s.product_id))
    .reduce((sum, item) => sum + item.estimated_total, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum produto necessita reposição no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Sugestão de Compras ({suggestions.length} produtos)
        </CardTitle>
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedItems.length} selecionados | Total:{" "}
              <strong>
                {selectedTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </strong>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedBySupplier).map(([supplierId, group]) => {
            const supplierSelected = group.items.filter((i) => selectedItems.includes(i.product_id));
            const supplierTotal = supplierSelected.reduce((sum, i) => sum + i.estimated_total, 0);

            return (
              <div key={supplierId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{group.supplierName}</h4>
                  {supplierSelected.length > 0 && supplierId !== "sem_fornecedor" && (
                    <Button
                      size="sm"
                      onClick={() => createPurchaseOrder.mutate(supplierId)}
                      disabled={createPurchaseOrder.isPending}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Gerar Pedido ({supplierTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
                    </Button>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={group.items.every((i) => selectedItems.includes(i.product_id))}
                          onCheckedChange={() => {
                            const allSelected = group.items.every((i) => selectedItems.includes(i.product_id));
                            if (allSelected) {
                              setSelectedItems((prev) => prev.filter((id) => !group.items.find((i) => i.product_id === id)));
                            } else {
                              setSelectedItems((prev) => [...new Set([...prev, ...group.items.map((i) => i.product_id)])]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Estoque</TableHead>
                      <TableHead className="text-center">Ponto Reposição</TableHead>
                      <TableHead className="text-center">Qtd. Sugerida</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Urgência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(item.product_id)}
                            onCheckedChange={() => toggleItem(item.product_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            {item.product_code && (
                              <p className="text-xs text-muted-foreground">{item.product_code}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={item.available_stock <= 0 ? "text-destructive font-medium" : ""}>
                            {item.available_stock}
                          </span>
                          {item.reserved_stock > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">({item.reserved_stock} res.)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{item.reorder_point}</TableCell>
                        <TableCell className="text-center font-medium">{item.suggested_quantity}</TableCell>
                        <TableCell className="text-right">
                          {item.last_cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.estimated_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell className="text-center">{getUrgencyBadge(item.urgency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
