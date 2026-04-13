import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Clock, AlertTriangle, Loader2, Zap } from "lucide-react";
import { format } from "date-fns";

const EVENT_LABELS: Record<string, string> = {
  order_approved: "Pedido Aprovado",
  order_invoiced: "Pedido Faturado",
  payment_received: "Recebimento Cliente",
  payable_created: "Conta a Pagar Criada",
  supplier_paid: "Pagamento Fornecedor",
  recurring_generate: "Contrato Recorrente",
  loan_contracted: "Empréstimo Contratado",
  loan_installment_paid: "Parcela Empréstimo",
  payroll: "Folha de Pagamento",
  asset_purchased: "Compra de Ativo",
  depreciation_post: "Depreciação Lançada",
  reconciliation: "Conciliação",
  goal_created: "Meta Criada",
};

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  completed: { icon: CheckCircle, color: "text-green-600", label: "Concluído" },
  processing: { icon: Loader2, color: "text-blue-500", label: "Processando" },
  pending: { icon: Clock, color: "text-yellow-600", label: "Pendente" },
  failed: { icon: AlertTriangle, color: "text-destructive", label: "Falhou" },
};

export function BusinessEventsLog() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["fin-business-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_business_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const summary = events?.reduce(
    (acc, e) => {
      acc.total++;
      if (e.processing_status === "completed") acc.completed++;
      if (e.processing_status === "failed") acc.failed++;
      if (e.processing_status === "pending") acc.pending++;
      return acc;
    },
    { total: 0, completed: 0, failed: 0, pending: 0 }
  ) || { total: 0, completed: 0, failed: 0, pending: 0 };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Eventos de Negócio
          </CardTitle>
          <div className="flex gap-1.5">
            <Badge variant="outline" className="text-xs">{summary.total} total</Badge>
            {summary.completed > 0 && <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">{summary.completed} ok</Badge>}
            {summary.failed > 0 && <Badge variant="destructive" className="text-xs">{summary.failed} erro</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : !events?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento registrado</p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {events.map((evt: any) => {
                const cfg = STATUS_CONFIG[evt.processing_status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <div key={evt.id} className="flex items-start gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.color} ${evt.processing_status === "processing" ? "animate-spin" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {EVENT_LABELS[evt.event_type] || evt.event_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {evt.created_at ? format(new Date(evt.created_at), "dd/MM/yyyy HH:mm") : "—"}
                      </p>
                      {evt.error_message && (
                        <p className="text-xs text-destructive mt-0.5 truncate">{evt.error_message}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">{cfg.label}</Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
