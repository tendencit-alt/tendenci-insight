import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Timer,
  Zap,
  CalendarClock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProductionSLAAlertsProps {
  productionTypeId?: string;
  onOrderClick?: (orderId: string) => void;
}

interface SLAAlert {
  order_id: string;
  order_number: number;
  title: string;
  priority: string;
  alert_type: string;
  phase_name: string | null;
  hours_overdue: number;
  planned_end_date: string | null;
}

interface AutomationAlert {
  order_id: string;
  order_number: number;
  title: string;
  priority: string;
  automation_nome: string;
  fase_nome: string;
  dias_uteis_na_fase: number;
  prazo_dias_uteis: number;
  dias_excedidos: number;
  production_type_name: string;
}

export function ProductionSLAAlerts({ productionTypeId, onOrderClick }: ProductionSLAAlertsProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Fetch standard SLA alerts
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['production-sla-alerts', productionTypeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('production_sla_alerts', {
        p_type_id: productionTypeId || null
      });
      if (error) throw error;
      return data as SLAAlert[];
    }
  });

  // Fetch automation-based alerts (SLA em dias úteis)
  const { data: automationAlerts = [] } = useQuery({
    queryKey: ['production-automation-alerts', productionTypeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_production_automations', {
        p_type_id: productionTypeId || null
      });
      if (error) throw error;
      return data as AutomationAlert[];
    }
  });

  const prazoVencido = alerts.filter(a => a.alert_type === 'prazo_vencido');
  const slaEstourado = alerts.filter(a => a.alert_type === 'sla_estourado');
  const prazoProximo = alerts.filter(a => a.alert_type === 'prazo_proximo');

  const totalAlerts = alerts.length + automationAlerts.length;

  if (isLoading) {
    return null;
  }

  if (totalAlerts === 0) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-red-100 text-red-700 border-red-200';
      case 'alta': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'baixa': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatHours = (hours: number) => {
    if (hours < 24) return `${Math.abs(hours).toFixed(0)}h`;
    return `${Math.abs(hours / 24).toFixed(1)}d`;
  };

  const AlertItem = ({ alert }: { alert: SLAAlert }) => (
    <div 
      className="flex items-center justify-between p-2 rounded-md bg-background hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onOrderClick?.(alert.order_id)}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-mono text-muted-foreground">
          #{alert.order_number}
        </span>
        <span className="text-sm truncate font-medium">
          {alert.title}
        </span>
        <Badge variant="outline" className={`text-xs ${getPriorityColor(alert.priority)}`}>
          {alert.priority}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        {alert.phase_name && (
          <span className="hidden sm:inline">{alert.phase_name}</span>
        )}
        {alert.alert_type === 'prazo_proximo' ? (
          <span className="text-amber-600">em {formatHours(alert.hours_overdue)}</span>
        ) : (
          <span className="text-red-600">+{formatHours(alert.hours_overdue)}</span>
        )}
      </div>
    </div>
  );

  const AutomationAlertItem = ({ alert }: { alert: AutomationAlert }) => (
    <div 
      className="flex items-center justify-between p-2 rounded-md bg-background hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onOrderClick?.(alert.order_id)}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-mono text-muted-foreground">
          #{alert.order_number}
        </span>
        <span className="text-sm truncate font-medium">
          {alert.title}
        </span>
        <Badge variant="outline" className={`text-xs ${getPriorityColor(alert.priority)}`}>
          {alert.priority}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-xs shrink-0">
        <span className="hidden sm:inline text-muted-foreground">{alert.fase_nome}</span>
        <Badge variant="destructive" className="text-xs">
          +{alert.dias_excedidos} dias úteis
        </Badge>
      </div>
    </div>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-amber-200 bg-amber-50/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 cursor-pointer hover:bg-amber-100/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-amber-800">
                  Alertas de Produção
                </span>
                <Badge variant="secondary" className="bg-amber-200 text-amber-800">
                  {totalAlerts}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 space-y-3">
            {/* Automação SLA em Dias Úteis Excedido */}
            {automationAlerts.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                  <Zap className="h-3.5 w-3.5" />
                  🚨 SLA Dias Úteis Excedido ({automationAlerts.length})
                </div>
                <div className="space-y-1 pl-5">
                  {automationAlerts.map((alert) => (
                    <AutomationAlertItem key={alert.order_id} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* Prazo Vencido */}
            {prazoVencido.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-red-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Prazo Vencido ({prazoVencido.length})
                </div>
                <div className="space-y-1 pl-5">
                  {prazoVencido.map((alert) => (
                    <AlertItem key={`${alert.order_id}-${alert.alert_type}`} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* SLA Estourado */}
            {slaEstourado.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-orange-700">
                  <Timer className="h-3.5 w-3.5" />
                  SLA da Fase Excedido ({slaEstourado.length})
                </div>
                <div className="space-y-1 pl-5">
                  {slaEstourado.map((alert) => (
                    <AlertItem key={`${alert.order_id}-${alert.alert_type}`} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* Prazo Próximo */}
            {prazoProximo.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Prazo Próximo - 3 dias ({prazoProximo.length})
                </div>
                <div className="space-y-1 pl-5">
                  {prazoProximo.map((alert) => (
                    <AlertItem key={`${alert.order_id}-${alert.alert_type}`} alert={alert} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
