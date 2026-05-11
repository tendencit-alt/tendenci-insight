import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DeadlineAlert {
  id: string;
  name: string;
  client_name: string;
  architect_name: string;
  deadline: string;
  days_remaining: number;
  status: string;
  stage: string;
}

interface DeadlineAlertsProps {
  refreshKey: number;
  onProjectClick?: (projectId: string) => void;
}

export function DeadlineAlerts({ refreshKey, onProjectClick }: DeadlineAlertsProps) {
  const [alerts, setAlerts] = useState<DeadlineAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, [refreshKey]);

  const fetchAlerts = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('project_deadline_alerts_detailed');
    
    if (!error && data) {
      setAlerts(data as DeadlineAlert[]);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'vencido':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'proximo':
        return <Clock className="w-5 h-5 text-orange-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getStatusBadge = (status: string, days: number) => {
    if (status === 'vencido') {
      return <Badge variant="destructive">Vencido ({Math.abs(days)} dias atrás)</Badge>;
    }
    if (status === 'proximo') {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Vence em {days} dias</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhum projeto com prazo próximo ou vencido 🎉</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-6 h-6 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">⏰ Avisos de Prazos</h3>
          <p className="text-sm text-muted-foreground">
            Projetos com prazo próximo ou vencido que precisam de atenção
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            className="p-4 hover:shadow-lg transition-all cursor-pointer border-l-4"
            style={{
              borderLeftColor: alert.status === 'vencido' ? '#DC2626' : '#F97316'
            }}
            onClick={() => onProjectClick?.(alert.id)}
          >
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {getStatusIcon(alert.status)}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-base">{alert.name}</h4>
                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                      <p>Cliente: <span className="font-medium">{alert.client_name || 'Não informado'}</span></p>
                      <p>Parceiro Profissional: <span className="font-medium">{alert.architect_name || 'Não informado'}</span></p>
                      <p>Prazo: <span className="font-medium">
                        {format(new Date(alert.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span></p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {getStatusBadge(alert.status, alert.days_remaining)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}
