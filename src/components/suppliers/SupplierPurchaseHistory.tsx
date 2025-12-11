import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ShoppingCart } from "lucide-react";

interface SupplierPurchaseHistoryProps {
  supplierId: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  enviado: { label: "Enviado", variant: "outline" },
  confirmado: { label: "Confirmado", variant: "default" },
  parcial: { label: "Parcial", variant: "outline" },
  recebido: { label: "Recebido", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" }
};

export default function SupplierPurchaseHistory({ supplierId }: SupplierPurchaseHistoryProps) {
  const { data: orders = [] } = useQuery({
    queryKey: ["supplier-purchase-history", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    }
  });

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum pedido de compra</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order: any) => {
        const status = statusConfig[order.status] || { label: order.status, variant: "secondary" as const };
        
        return (
          <Card key={order.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Pedido #{order.order_number}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                  {order.expected_date && (
                    <p className="text-xs text-muted-foreground">
                      Previsão: {format(new Date(order.expected_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.total || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
