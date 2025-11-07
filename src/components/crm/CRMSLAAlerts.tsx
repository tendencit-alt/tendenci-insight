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
            <ShieldCheck className="h-6 w-6" />
            <p className="font-medium">Sem pendências de SLA 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          ⏰ Alertas de SLA (sem resposta / prazo estourando)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.deal_id}
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              <div className="flex-1">
                <p className="font-semibold">{alert.title}</p>
                <p className="text-sm text-muted-foreground">
                  Cliente: {alert.lead_name} • Estágio: {alert.stage_name} • Atraso: {alert.delay_h}h
                </p>
              </div>
              <Badge variant="outline">Resp: {alert.owner_name}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
