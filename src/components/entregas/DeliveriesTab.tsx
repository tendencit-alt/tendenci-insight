import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, List, Columns3 } from "lucide-react";
import { useDeliveries, type DeliveryOrder } from "@/hooks/useFulfillment";
import { DeliveryStatusBadge, DELIVERY_STATUSES } from "./StatusBadge";
import { DeliveryDetailSheet } from "./DeliveryDetailSheet";
import { CreateDeliveryDialog } from "./CreateDeliveryDialog";
import { useCan } from "@/hooks/useCan";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DeliveriesTab() {
  const { data: deliveries = [], isLoading } = useDeliveries();
  const canCreate = useCan("operacional", "create");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DeliveryOrder | null>(null);

  const byStatus = useMemo(() => {
    const m: Record<string, DeliveryOrder[]> = {};
    DELIVERY_STATUSES.forEach((s) => (m[s] = []));
    deliveries.forEach((d) => { (m[d.status] ??= []).push(d); });
    return m;
  }, [deliveries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{deliveries.length} entrega(s)</p>
        <Button size="sm" disabled={!canCreate} onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova entrega
        </Button>
      </div>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista"><List className="h-4 w-4 mr-1" />Lista</TabsTrigger>
          <TabsTrigger value="kanban"><Columns3 className="h-4 w-4 mr-1" />Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <Card className="divide-y">
            {isLoading && <div className="p-4 text-sm text-muted-foreground">Carregando…</div>}
            {!isLoading && deliveries.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma entrega cadastrada.</div>
            )}
            {deliveries.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/40 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <DeliveryStatusBadge status={d.status} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Pedido #{d.order?.order_number ?? "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.transportadora ?? "Sem transportadora"} • {d.endereco ?? "Sem endereço"}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {d.scheduled_date ? format(new Date(d.scheduled_date), "dd/MM HH:mm", { locale: ptBR }) : "Sem data"}
                </div>
              </button>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="kanban">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {DELIVERY_STATUSES.map((s) => (
              <Card key={s} className="p-2">
                <div className="flex items-center justify-between mb-2 px-1">
                  <DeliveryStatusBadge status={s} />
                  <span className="text-[10px] text-muted-foreground">{byStatus[s]?.length ?? 0}</span>
                </div>
                <div className="space-y-2">
                  {byStatus[s]?.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelected(d)}
                      className="w-full text-left p-2 rounded border bg-background hover:bg-muted/40 transition"
                    >
                      <div className="text-xs font-medium">Pedido #{d.order?.order_number}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{d.transportadora ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {d.scheduled_date ? format(new Date(d.scheduled_date), "dd/MM", { locale: ptBR }) : ""}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <CreateDeliveryDialog open={open} onOpenChange={setOpen} />
      <DeliveryDetailSheet delivery={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}
