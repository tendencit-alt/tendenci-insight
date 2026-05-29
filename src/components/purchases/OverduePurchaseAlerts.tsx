import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface OverduePurchaseAlertsProps {
  onSelectOrder?: (order: any) => void;
}

export default function OverduePurchaseAlerts({ onSelectOrder }: OverduePurchaseAlertsProps) {
  const [isOpen, setIsOpen] = useState(true);

  const { data: overdueOrders = [] } = useQuery({
    queryKey: ["overdue-purchase-orders"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .lt("expected_date", today)
        .in("status", ["enviado", "confirmado", "aprovado", "recebido_parcial", "parcial"])
        .order("expected_date");
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000
  });

  if (overdueOrders.length === 0) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Alert variant="destructive" className="mb-4">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="mb-0">
                {overdueOrders.length} Pedido{overdueOrders.length > 1 ? "s" : ""} de Compra Atrasado{overdueOrders.length > 1 ? "s" : ""}
              </AlertTitle>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <AlertDescription className="mt-4">
            <div className="space-y-2">
              {overdueOrders.map((order: any) => {
                const daysOverdue = differenceInDays(new Date(), new Date(order.expected_date));
                return (
                  <Card key={order.id} className="bg-background/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Pedido #{order.order_number}</span>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {daysOverdue} dia{daysOverdue > 1 ? "s" : ""} atrasado
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.supplier?.name} · Previsão: {format(new Date(order.expected_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(order.total || 0)}</p>
                          {onSelectOrder && (
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="h-auto p-0 text-xs"
                              onClick={() => onSelectOrder(order)}
                            >
                              Ver detalhes
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </AlertDescription>
        </CollapsibleContent>
      </Alert>
    </Collapsible>
  );
}
