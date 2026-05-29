import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, AlertTriangle, CheckCircle2, Timer, CalendarClock, CalendarX } from "lucide-react";
import { differenceInCalendarDays, startOfDay, endOfDay, startOfMonth, addDays, subDays } from "date-fns";

export function DeliveryKPIs() {
  const { activeTenantId } = useActiveTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["delivery-kpis", activeTenantId],
    enabled: !!activeTenantId,
    staleTime: 15000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("delivery_orders" as any)
        .select("id,status,scheduled_date,delivered_date,created_at,production_order_id")
        .eq("tenant_id", activeTenantId!)
        .limit(3000);
      if (error) throw error;
      const all = (rows ?? []) as any[];
      const today = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const mStart = startOfMonth(new Date());
      const in7 = endOfDay(addDays(today, 7));
      const ago90 = subDays(today, 90);

      const ativos = all.filter((d) => !["entregue", "cancelada"].includes(d.status));
      const hoje = ativos.filter((d) => d.scheduled_date && new Date(d.scheduled_date) >= today && new Date(d.scheduled_date) <= todayEnd).length;
      const atrasadas = ativos.filter((d) => d.scheduled_date && new Date(d.scheduled_date) < today).length;
      const mes = all.filter((d) => d.status === "entregue" && d.delivered_date && new Date(d.delivered_date) >= mStart).length;

      const recentes = all.filter((d) => d.status === "entregue" && d.delivered_date && new Date(d.delivered_date) >= ago90 && d.production_order_id);
      const tempos: number[] = [];
      for (const d of recentes) {
        tempos.push(Math.max(0, differenceInCalendarDays(new Date(d.delivered_date), new Date(d.created_at))));
      }
      const tempoMedio = tempos.length ? Math.round(tempos.reduce((s, n) => s + n, 0) / tempos.length) : 0;

      const proximas7 = ativos.filter((d) => d.scheduled_date && new Date(d.scheduled_date) > todayEnd && new Date(d.scheduled_date) <= in7).length;
      const semAgenda = ativos.filter((d) => !d.scheduled_date).length;

      return { hoje, atrasadas, mes, tempoMedio, proximas7, semAgenda };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
      </div>
    );
  }

  const cards = [
    { icon: Truck, color: "text-blue-600", label: "A entregar hoje", value: data.hoje, hint: "Agendadas para hoje" },
    { icon: AlertTriangle, color: "text-red-600", label: "Atrasadas", value: data.atrasadas, hint: "Data já passou", bold: true },
    { icon: CheckCircle2, color: "text-emerald-600", label: "Entregues no mês", value: data.mes, hint: "Concluídas no período" },
    { icon: Timer, color: "text-purple-600", label: "Tempo médio Pronto→Entregue", value: `${data.tempoMedio}d`, hint: "Últimos 90 dias" },
    { icon: CalendarClock, color: "text-cyan-600", label: "Próximas 7 dias", value: data.proximas7, hint: "Agendadas" },
    { icon: CalendarX, color: "text-amber-600", label: "Sem agendamento", value: data.semAgenda, hint: "Aguardando data" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4 space-y-1">
            <div className={`flex items-center gap-2 ${c.color}`}>
              <c.icon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{c.label}</span>
            </div>
            <p className={`text-2xl font-bold ${c.bold ? c.color : ""}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
