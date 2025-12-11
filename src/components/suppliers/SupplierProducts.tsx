import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Star } from "lucide-react";

interface SupplierProductsProps {
  supplierId: string;
}

export default function SupplierProducts({ supplierId }: SupplierProductsProps) {
  const { data: products = [] } = useQuery({
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

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum produto vinculado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((item: any) => (
        <Card key={item.id}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
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
              <div className="text-right">
                <p className="text-sm font-medium">{item.product?.current_stock || 0}</p>
                <p className="text-xs text-muted-foreground">{item.product?.unit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
