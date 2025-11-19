import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldCheck, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface CRMSLAAlertsProps {
  pipelineId: string;
}

export function CRMSLAAlerts({ pipelineId }: CRMSLAAlertsProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!pipelineId) return;
    fetchAlerts();
  }, [pipelineId]);

  const fetchAlerts = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("crm_sla_alerts", {
      p_pipeline_id: pipelineId,
    });

    if (!error && data) {
      setAlerts(data);
    }
    setLoading(false);
  };

  if (loading) return null;

  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20 border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <p className="font-medium text-xs">Sem pendências de SLA 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20 border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-yellow-700 dark:text-yellow-300 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Alertas de SLA ({alerts.length})
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-7 h-7 p-0">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.deal_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-background rounded-lg border border-border/50 hover:border-border transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs truncate">{alert.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                      Cliente: {alert.lead_name} • Estágio: {alert.stage_name} • Atraso: {alert.delay_h}h
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0 text-[10px] w-fit font-medium h-5">
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
