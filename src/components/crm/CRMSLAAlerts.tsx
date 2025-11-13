import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface CRMSLAAlertsProps {
  pipelineId: string;
}

export function CRMSLAAlerts({ pipelineId }: CRMSLAAlertsProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 text-green-600">
          <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
          <p className="font-medium text-sm sm:text-base">Sem pendências de SLA 🎉</p>
        </div>
      </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
          <span className="truncate">⏰ Alertas de SLA (sem resposta / prazo estourando)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.deal_id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{alert.title}</p>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                  Cliente: {alert.lead_name} • Estágio: {alert.stage_name} • Atraso: {alert.delay_h}h
                </p>
              </div>
              <Badge variant="outline" className="flex-shrink-0 text-xs sm:text-sm w-fit">Resp: {alert.owner_name}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
