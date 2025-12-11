import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUp, ArrowDown, RefreshCw, History } from "lucide-react";

interface ProductMovementsProps {
  productId: string;
}

const movementTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  entrada: { label: "Entrada", icon: ArrowUp, color: "text-green-500" },
  saida: { label: "Saída", icon: ArrowDown, color: "text-red-500" },
  ajuste_positivo: { label: "Ajuste (+)", icon: ArrowUp, color: "text-blue-500" },
  ajuste_negativo: { label: "Ajuste (-)", icon: ArrowDown, color: "text-orange-500" },
  producao_consumo: { label: "Consumo Prod.", icon: ArrowDown, color: "text-purple-500" },
  producao_saida: { label: "Saída Prod.", icon: ArrowUp, color: "text-emerald-500" },
  transferencia: { label: "Transferência", icon: RefreshCw, color: "text-gray-500" }
};

export default function ProductMovements({ productId }: ProductMovementsProps) {
  const { data: movements = [] } = useQuery({
    queryKey: ["product-movements", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          *,
          created_by_profile:profiles(id, full_name)
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    }
  });

  if (movements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhuma movimentação</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {movements.map((mov: any) => {
        const config = movementTypeConfig[mov.movement_type] || { 
          label: mov.movement_type, 
          icon: RefreshCw, 
          color: "text-gray-500" 
        };
        const Icon = config.icon;

        return (
          <Card key={mov.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className={`flex items-center gap-2 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{config.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {mov.created_by_profile && ` • ${mov.created_by_profile.full_name}`}
                  </p>
                  {mov.notes && <p className="text-sm mt-1">{mov.notes}</p>}
                </div>
                <div className="text-right">
                  <p className={`font-medium ${config.color}`}>
                    {mov.movement_type.includes("saida") || mov.movement_type.includes("consumo") || mov.movement_type.includes("negativo") 
                      ? `-${mov.quantity}` 
                      : `+${mov.quantity}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mov.previous_stock} → {mov.new_stock}
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
