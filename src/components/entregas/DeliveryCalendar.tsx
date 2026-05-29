import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDeliveries, type DeliveryOrder } from "@/hooks/useFulfillment";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
  format, isSameMonth, isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { DeliveryDetailSheet } from "./DeliveryDetailSheet";

const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  agendada: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  em_transito: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  entregue: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  cancelada: "bg-muted text-muted-foreground border-border",
};

export function DeliveryCalendar() {
  const { data: deliveries = [] } = useDeliveries();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<DeliveryOrder | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const arr: Date[] = [];
    let d = start;
    while (d <= end) { arr.push(d); d = addDays(d, 1); }
    return arr;
  }, [cursor]);

  const byDay = useMemo(() => {
    const m = new Map<string, DeliveryOrder[]>();
    deliveries.forEach((d) => {
      if (!d.scheduled_date) return;
      const key = format(new Date(d.scheduled_date), "yyyy-MM-dd");
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(d);
    });
    return m;
  }, [deliveries]);

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">
          {format(cursor, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setCursor(addMonths(cursor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Hoje</Button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="px-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const items = byDay.get(format(d, "yyyy-MM-dd")) ?? [];
          const muted = !isSameMonth(d, cursor);
          const isToday = isSameDay(d, new Date());
          return (
            <div
              key={d.toISOString()}
              className={`min-h-[88px] rounded border p-1 text-xs ${muted ? "opacity-40" : ""} ${isToday ? "border-primary" : "border-border"}`}
            >
              <div className="text-[10px] font-medium mb-1">{format(d, "d")}</div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((it) => (
                  <button
                    key={it.id}
                    onClick={() => setSelected(it)}
                    className={`w-full text-left truncate px-1 py-0.5 rounded border text-[10px] ${STATUS_COLOR[it.status] ?? ""}`}
                    title={`Pedido #${it.order?.order_number ?? "—"}`}
                  >
                    #{it.order?.order_number ?? "—"} · {it.status}
                  </button>
                ))}
                {items.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{items.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DeliveryDetailSheet
        delivery={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </Card>
  );
}
