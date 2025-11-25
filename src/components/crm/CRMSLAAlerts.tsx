import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldCheck, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface CRMSLAAlertsProps {
  pipelineId: string;
  categoryFilter?: string;
}

export function CRMSLAAlerts({ pipelineId, categoryFilter }: CRMSLAAlertsProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true); // Aberto por padrão para visibilidade

  useEffect(() => {
    if (!pipelineId) return;
    fetchAlerts();
  }, [pipelineId, categoryFilter]);

  const fetchAlerts = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("crm_sla_alerts", {
      p_pipeline_id: pipelineId,
    });

    if (!error && data) {
      // Filtrar alertas client-side baseado na categoria
      let filteredAlerts = data;
      if (categoryFilter && categoryFilter !== "all") {
        // Buscar categoria dos deals para filtrar
        const dealIds = data.map((alert: any) => alert.deal_id);
        const { data: dealsData } = await supabase
          .from("crm_deals")
          .select("id, categoria")
          .in("id", dealIds);
        
        const dealCategories = new Map(dealsData?.map(d => [d.id, d.categoria]));
        filteredAlerts = data.filter((alert: any) => 
          dealCategories.get(alert.deal_id) === categoryFilter
        );
      }
      setAlerts(filteredAlerts);
    }
    setLoading(false);
  };

  if (loading) return null;

  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <ShieldCheck className="h-5 w-5 flex-shrink-0" />
            <p className="font-semibold text-sm">Sem pendências de SLA 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-base font-bold">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              Alertas de SLA ({alerts.length})
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.deal_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-background rounded-lg border hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      Cliente: {alert.lead_name} • Estágio: {alert.stage_name} • Atraso: {alert.delay_h}h
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0 text-xs w-fit font-medium h-6 px-2">
                    Resp: {alert.owner_name}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
