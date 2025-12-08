import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldCheck, ChevronDown, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CRMSLAAlertsProps {
  pipelineId: string;
  categoryFilter?: string;
  ownerFilter?: string;
}

const getUrgencyConfig = (delayHours: number) => {
  if (delayHours > 168) { // > 7 dias
    return { 
      variant: "destructive" as const, 
      label: "Crítico",
      className: "bg-destructive text-destructive-foreground"
    };
  } else if (delayHours > 72) { // 3-7 dias
    return { 
      variant: "default" as const, 
      label: "Alto",
      className: "bg-yellow-500 text-white"
    };
  } else { // < 3 dias
    return { 
      variant: "secondary" as const, 
      label: "Médio",
      className: "bg-orange-400 text-white"
    };
  }
};

export function CRMSLAAlerts({ pipelineId, categoryFilter, ownerFilter }: CRMSLAAlertsProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showRecentOnly, setShowRecentOnly] = useState(true);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!pipelineId) return;
    
    // Buscar com todos os filtros aplicados diretamente na RPC
    const { data, error } = await supabase.rpc("crm_sla_alerts", {
      p_pipeline_id: pipelineId,
      p_max_delay_days: showRecentOnly ? 7 : null,
      p_category: categoryFilter && categoryFilter !== "all" ? categoryFilter : null,
      p_owner_id: ownerFilter && ownerFilter !== "all" ? ownerFilter : null,
    });

    // Buscar total sem filtro de dias para mostrar contador
    const { data: allData } = await supabase.rpc("crm_sla_alerts", {
      p_pipeline_id: pipelineId,
      p_max_delay_days: null,
      p_category: categoryFilter && categoryFilter !== "all" ? categoryFilter : null,
      p_owner_id: ownerFilter && ownerFilter !== "all" ? ownerFilter : null,
    });

    if (!error && data) {
      setAlerts(data);
      setTotalAlerts(allData?.length || 0);
    }
    setLoading(false);
  }, [pipelineId, categoryFilter, ownerFilter, showRecentOnly]);

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
  }, [pipelineId, categoryFilter, ownerFilter, fetchAlerts, showRecentOnly]);

  if (loading) return null;

  const hiddenCount = totalAlerts - alerts.length;

  if (alerts.length === 0 && totalAlerts === 0) {
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
              {hiddenCount > 0 && (
                <span className="text-[10px] font-normal text-muted-foreground ml-1">
                  +{hiddenCount} antigos
                </span>
              )}
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
            {/* Filtro de alertas recentes */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <Checkbox 
                id="recent-only" 
                checked={showRecentOnly}
                onCheckedChange={(checked) => setShowRecentOnly(checked === true)}
              />
              <Label htmlFor="recent-only" className="text-[10px] text-muted-foreground cursor-pointer">
                Mostrar apenas alertas recentes (&lt; 7 dias)
              </Label>
            </div>

            <div className="space-y-2">
              {alerts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhum alerta nos últimos 7 dias
                </p>
              ) : (
                alerts.map((alert) => {
                  const urgency = getUrgencyConfig(alert.delay_h);
                  return (
                    <div
                      key={alert.deal_id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-background rounded-lg border hover:border-primary/30 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs truncate">{alert.title}</p>
                          <Badge className={`${urgency.className} text-[8px] h-3.5 px-1`}>
                            {urgency.label}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          Cliente: {alert.lead_name} • Estágio: {alert.stage_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="flex-shrink-0 text-[10px] w-fit font-medium h-4 px-1.5">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          {alert.delay_h}h
                        </Badge>
                        <Badge variant="outline" className="flex-shrink-0 text-[10px] w-fit font-medium h-4 px-1.5">
                          {alert.owner_name}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
