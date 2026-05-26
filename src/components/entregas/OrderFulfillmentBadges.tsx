import { Badge } from "@/components/ui/badge";
import { Truck, Wrench } from "lucide-react";
import { useFulfillmentForOrder } from "@/hooks/useFulfillment";

export function OrderFulfillmentBadges({ orderId }: { orderId: string }) {
  const { data } = useFulfillmentForOrder(orderId);
  const delivered = data?.deliveries?.some((d) => d.status === "entregue");
  const installed = data?.installations?.some((i) => i.status === "concluida");
  if (!delivered && !installed) return null;
  return (
    <div className="flex gap-1">
      {delivered && (
        <Badge variant="outline" className="border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] h-5">
          <Truck className="h-3 w-3 mr-1" /> Entregue
        </Badge>
      )}
      {installed && (
        <Badge variant="outline" className="border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] h-5">
          <Wrench className="h-3 w-3 mr-1" /> Montado
        </Badge>
      )}
    </div>
  );
}
