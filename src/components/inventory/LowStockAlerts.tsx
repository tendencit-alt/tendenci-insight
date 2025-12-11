import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

export default function LowStockAlerts() {
  const [isOpen, setIsOpen] = useState(true);

  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ["low-stock-products"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("low_stock_products");
      if (error) throw error;
      return data;
    }
  });

  if (lowStockProducts.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="flex items-center justify-between text-amber-800 dark:text-amber-400">
          <span>Alerta de Estoque Baixo ({lowStockProducts.length} produto{lowStockProducts.length > 1 ? "s" : ""})</span>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </AlertTitle>
        <CollapsibleContent>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              {lowStockProducts.map((product: any) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-background rounded border">
                  <div>
                    <span className="font-medium">{product.name}</span>
                    {product.code && <span className="text-xs text-muted-foreground ml-2">[{product.code}]</span>}
                    {product.category_name && (
                      <Badge variant="outline" className="ml-2 text-xs">{product.category_name}</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 font-medium">{product.current_stock}</span>
                    <span className="text-muted-foreground text-sm"> / mín {product.min_stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </CollapsibleContent>
      </Alert>
    </Collapsible>
  );
}
