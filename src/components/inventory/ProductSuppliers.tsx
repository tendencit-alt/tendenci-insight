import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Star } from "lucide-react";

interface ProductSuppliersProps {
  productId: string;
}

export default function ProductSuppliers({ productId }: ProductSuppliersProps) {
  const { data: suppliers = [] } = useQuery({
    queryKey: ["product-suppliers", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_suppliers")
        .select(`
          *,
          supplier:suppliers(id, name, phone, email)
        `)
        .eq("product_id", productId)
        .order("is_preferred", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum fornecedor vinculado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suppliers.map((item: any) => (
        <Card key={item.id}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.supplier?.name}</span>
                  {item.is_preferred && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Preferencial
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cód: {item.supplier_code || "-"}
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
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
