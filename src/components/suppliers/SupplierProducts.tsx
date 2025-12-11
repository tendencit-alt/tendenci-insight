import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Star, Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddProductSupplierDialog from "./AddProductSupplierDialog";
import EditProductSupplierDialog from "./EditProductSupplierDialog";

interface SupplierProductsProps {
  supplierId: string;
}

export default function SupplierProducts({ supplierId }: SupplierProductsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);

  const { data: products = [], refetch } = useQuery({
    queryKey: ["supplier-products", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_suppliers")
        .select(`
          *,
          product:products(id, name, code, current_stock, unit)
        `)
        .eq("supplier_id", supplierId)
        .order("is_preferred", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("product_suppliers")
        .delete()
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Vínculo removido!" });
      queryClient.invalidateQueries({ queryKey: ["supplier-products", supplierId] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao remover vínculo", description: error.message, variant: "destructive" });
    }
  });

  const existingProductIds = products.map((p: any) => p.product_id);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Vincular Produto
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum produto vinculado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.product?.name}</span>
                      {item.is_preferred && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Preferencial
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Código: {item.product?.code || "-"} | Cód. Fornecedor: {item.supplier_code || "-"}
                    </p>
                    <div className="flex gap-4 mt-1 text-sm">
                      <span>
                        Custo: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.cost_price || 0)}
                      </span>
                      {item.lead_time_days && (
                        <span className="text-muted-foreground">
                          Prazo: {item.lead_time_days} dias
                        </span>
                      )}
                      {item.min_order_quantity > 1 && (
                        <span className="text-muted-foreground">
                          Mín: {item.min_order_quantity} {item.product?.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <p className="text-sm font-medium">{item.product?.current_stock || 0}</p>
                      <p className="text-xs text-muted-foreground">{item.product?.unit}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setEditingLink(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover Vínculo</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja remover o vínculo com "{item.product?.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(item.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddProductSupplierDialog
        supplierId={supplierId}
        existingProductIds={existingProductIds}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={refetch}
      />

      {editingLink && (
        <EditProductSupplierDialog
          link={editingLink}
          open={!!editingLink}
          onOpenChange={(open) => !open && setEditingLink(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
