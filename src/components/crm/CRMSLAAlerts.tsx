import { useEffect, useState, useCallback, useRef } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!pipelineId) return;
    
    const { data, error } = await supabase.rpc("crm_sla_alerts", {
      p_pipeline_id: pipelineId,
    });

    if (!error && data) {
      let filteredAlerts = data;
      if (categoryFilter && categoryFilter !== "all") {
        const dealIds = data.map((alert: any) => alert.deal_id);
        if (dealIds.length > 0) {
          const { data: dealsData } = await supabase
            .from("crm_deals")
            .select("id, categoria")
            .in("id", dealIds);
          
          const dealCategories = new Map(dealsData?.map(d => [d.id, d.categoria]));
          filteredAlerts = data.filter((alert: any) => 
            dealCategories.get(alert.deal_id) === categoryFilter
          );
        }
      }
      setAlerts(filteredAlerts);
    }
    setLoading(false);
  }, [pipelineId, categoryFilter]);

  useEffect(() => {
    if (!pipelineId) return;
    
    // Fetch inicial
    fetchAlerts();

    // Debounced fetch para realtime
    const debouncedFetch = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        fetchAlerts();
      }, 1500);
    };

    // Realtime subscription para crm_deals
    const channel = supabase
      .channel(`sla-alerts-${pipelineId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_deals',
          filter: `pipeline_id=eq.${pipelineId}`
        },
        () => {
          debouncedFetch();
        }
      )
      .subscribe();

    // Polling a cada 60s para atualizar cálculo de horas de atraso
    const pollingInterval = setInterval(() => {
      fetchAlerts();
    }, 60000);

    // Cleanup
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
    };
  }, [pipelineId, categoryFilter, fetchAlerts]);

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
      <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-yellow-700 dark:text-yellow-300 text-sm font-bold">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Alertas de SLA ({alerts.length})
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="px-3 pb-2">
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.deal_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-background rounded-lg border hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs truncate">{alert.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      Cliente: {alert.lead_name} • Estágio: {alert.stage_name} • Atraso: {alert.delay_h}h
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0 text-[10px] w-fit font-medium h-4 px-1.5">
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
