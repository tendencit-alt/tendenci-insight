import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Timer,
  Zap,
  CalendarClock
} from 'lucide-react';

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

  if (isLoading) return null;
  if (totalAlerts === 0) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'alta': return 'bg-warning/10 text-warning border-warning/20';
      case 'normal': return 'bg-primary/10 text-primary border-primary/20';
      case 'baixa': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getAlertBorderColor = (alertType: string) => {
    switch (alertType) {
      case 'prazo_vencido': return 'border-l-destructive';
      case 'sla_estourado': return 'border-l-warning';
      case 'prazo_proximo': return 'border-l-primary';
      default: return 'border-l-muted-foreground';
    }
  };

  const formatHours = (hours: number) => {
    if (hours < 24) return `${Math.abs(hours).toFixed(0)}h`;
    return `${Math.abs(hours / 24).toFixed(1)}d`;
  };

  const AlertItem = ({ alert }: { alert: SLAAlert }) => (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg bg-muted/30 border-l-4 ${getAlertBorderColor(alert.alert_type)} hover:bg-muted/50 cursor-pointer transition-all`}
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
          <span className="text-primary font-medium">em {formatHours(alert.hours_overdue)}</span>
        ) : (
          <span className="text-destructive font-medium">+{formatHours(alert.hours_overdue)}</span>
        )}
      </div>
    </div>
  );

  const AutomationAlertItem = ({ alert }: { alert: AutomationAlert }) => (
    <div 
      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border-l-4 border-l-destructive hover:bg-muted/50 cursor-pointer transition-all"
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
        <Badge className="text-xs bg-destructive/10 text-destructive border border-destructive/20">
          +{alert.dias_excedidos} dias úteis
        </Badge>
      </div>
    </div>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border bg-card/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-warning/10">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
                <span className="font-medium">Alertas de Produção</span>
                <Badge variant="secondary" className="text-xs">
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
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* Prazo de Dias Úteis Excedido */}
            {automationAlerts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <div className="p-1 rounded bg-destructive/10">
                    <Zap className="h-3 w-3 text-destructive" />
                  </div>
                  <span className="text-destructive">Prazo de Dias Úteis Excedido</span>
                  <Badge variant="destructive" className="h-5 text-[10px]">
                    {automationAlerts.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {automationAlerts.map((alert) => (
                    <AutomationAlertItem key={alert.order_id} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* Prazo Vencido */}
            {prazoVencido.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <div className="p-1 rounded bg-destructive/10">
                    <AlertCircle className="h-3 w-3 text-destructive" />
                  </div>
                  <span className="text-destructive">Prazo Vencido</span>
                  <Badge variant="destructive" className="h-5 text-[10px]">
                    {prazoVencido.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {prazoVencido.map((alert) => (
                    <AlertItem key={`${alert.order_id}-${alert.alert_type}`} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* Prazo de Fase Excedido */}
            {slaEstourado.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <div className="p-1 rounded bg-warning/10">
                    <Timer className="h-3 w-3 text-warning" />
                  </div>
                  <span className="text-warning">Prazo de Fase Excedido</span>
                  <Badge className="h-5 text-[10px] bg-warning/10 text-warning border border-warning/20">
                    {slaEstourado.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {slaEstourado.map((alert) => (
                    <AlertItem key={`${alert.order_id}-${alert.alert_type}`} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* Prazo Próximo */}
            {prazoProximo.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <div className="p-1 rounded bg-primary/10">
                    <CalendarClock className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-primary">Prazo Próximo - 3 dias</span>
                  <Badge className="h-5 text-[10px] bg-primary/10 text-primary border border-primary/20">
                    {prazoProximo.length}
                  </Badge>
                </div>
                <div className="space-y-2">
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
