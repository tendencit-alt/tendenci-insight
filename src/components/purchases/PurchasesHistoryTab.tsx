import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function PurchasesHistoryTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["compras-historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cross_module_events")
        .select("*")
        .or("source_module.eq.compras,target_module.eq.compras,source_module.eq.suprimentos,target_module.eq.suprimentos,source_entity.eq.purchase_order,source_entity.eq.purchase_request,source_entity.eq.purchase_receipt")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de eventos de Compras
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(!data || data.length === 0) ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum evento registrado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {data.map((ev: any) => (
              <div
                key={ev.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{ev.event_type}</span>
                    <Badge variant="outline" className="text-xs">
                      {ev.source_module} → {ev.target_module ?? "—"}
                    </Badge>
                    {ev.status && (
                      <Badge
                        variant={ev.status === "processed" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {ev.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ev.source_entity} {ev.source_entity_id?.slice(0, 8)}
                    {ev.target_entity && ` → ${ev.target_entity} ${ev.target_entity_id?.slice(0, 8)}`}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(ev.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
