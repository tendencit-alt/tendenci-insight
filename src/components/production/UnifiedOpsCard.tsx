import { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Package, Calendar, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { format, differenceInDays, differenceInBusinessDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UnifiedOrder {
  id: string;
  order_number: number;
  title: string;
  status: string;
  priority: string;
  value: number | null;
  planned_end_date: string | null;
  current_phase?: {
    started_at: string | null;
    phase_template?: {
      name: string;
      color: string;
      position: number;
      sla_hours?: number;
    };
  };
  production_type?: {
    name: string;
  };
}

interface UnifiedOpsCardProps {
  group: {
    id: string;
    group_name: string;
    client_id: string | null;
    total_value: number;
    created_at: string;
  };
  orders: UnifiedOrder[];
  clientName: string;
  orderNumber?: string;
  onClick?: () => void;
}

function UnifiedOpsCardComponent({ group, orders, clientName, orderNumber, onClick }: UnifiedOpsCardProps) {
  // Calcular estatísticas do grupo
  const stats = useMemo(() => {
    const completed = orders.filter(o => o.status === 'concluido').length;
    const total = orders.length;
    
    // Encontrar a fase mais atrasada (menor position)
    let minPosition = Infinity;
    let currentPhase = null;
    
    orders.forEach(order => {
      if (order.status !== 'concluido' && order.current_phase?.phase_template) {
        const position = order.current_phase.phase_template.position;
        if (position < minPosition) {
          minPosition = position;
          currentPhase = order.current_phase.phase_template;
        }
      }
    });
    
    // Data de entrega mais próxima
    const endDates = orders
      .filter(o => o.planned_end_date && o.status !== 'concluido')
      .map(o => new Date(o.planned_end_date!));
    const nearestDeadline = endDates.length > 0 ? new Date(Math.min(...endDates.map(d => d.getTime()))) : null;
    
    // Verificar se há OPs atrasadas
    const hasOverdue = orders.some(order => {
      if (order.status === 'concluido') return false;
      if (!order.planned_end_date) return false;
      return differenceInDays(new Date(), new Date(order.planned_end_date)) > 0;
    });
    
    // Verificar SLA
    const hasSLABreach = orders.some(order => {
      if (order.status === 'concluido') return false;
      if (!order.current_phase?.started_at || !order.current_phase?.phase_template?.sla_hours) return false;
      const hoursInPhase = differenceInDays(new Date(), new Date(order.current_phase.started_at)) * 24;
      return hoursInPhase > order.current_phase.phase_template.sla_hours;
    });
    
    // Prioridade mais alta
    const priorities = ['urgente', 'alta', 'normal', 'baixa'];
    const highestPriority = priorities.find(p => orders.some(o => o.priority === p)) || 'normal';
    
    return {
      completed,
      total,
      currentPhase,
      nearestDeadline,
      hasOverdue,
      hasSLABreach,
      highestPriority
    };
  }, [orders]);

  // Agrupar OPs por fase
  const ordersByPhase = useMemo(() => {
    const phases = new Map<string, UnifiedOrder[]>();
    
    orders.forEach(order => {
      const phaseName = order.status === 'concluido' 
        ? 'Concluído' 
        : (order.current_phase?.phase_template?.name || 'Aguardando');
      
      if (!phases.has(phaseName)) {
        phases.set(phaseName, []);
      }
      phases.get(phaseName)!.push(order);
    });
    
    return phases;
  }, [orders]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'border-l-red-500';
      case 'alta': return 'border-l-orange-500';
      case 'normal': return 'border-l-blue-500';
      case 'baixa': return 'border-l-gray-500';
      default: return 'border-l-muted';
    }
  };

  // Limitar exibição a 4 OPs
  const displayedOrders = orders.slice(0, 4);
  const remainingCount = orders.length - 4;

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-all border-l-4 ${getPriorityColor(stats.highestPriority)} ${
        stats.hasOverdue || stats.hasSLABreach ? 'ring-2 ring-red-500/30' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold truncate max-w-[150px]">{clientName}</span>
          </div>
          {orderNumber && (
            <Badge variant="outline" className="text-xs">
              Pedido #{orderNumber}
            </Badge>
          )}
        </div>

        {/* Alertas */}
        {(stats.hasOverdue || stats.hasSLABreach) && (
          <div className="flex items-center gap-1 mb-3 text-red-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">
              {stats.hasOverdue ? 'OP(s) atrasada(s)' : 'SLA excedido'}
            </span>
          </div>
        )}

        {/* Mini cards de OPs */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {displayedOrders.map((order) => {
            const isCompleted = order.status === 'concluido';
            const phaseName = order.current_phase?.phase_template?.name || 'Aguardando';
            const phaseColor = order.current_phase?.phase_template?.color || '#6b7280';
            
            return (
              <TooltipProvider key={order.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`p-2 rounded-lg border text-xs ${
                        isCompleted ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {isCompleted ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <Package className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="font-medium truncate">{order.title}</span>
                      </div>
                      <div 
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                        style={{ 
                          backgroundColor: `${phaseColor}20`,
                          color: phaseColor
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phaseColor }} />
                        {isCompleted ? 'Concluído' : phaseName}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>OP-{String(order.order_number).padStart(4, '0')}</p>
                    <p className="text-muted-foreground">{order.title}</p>
                    {order.value && <p>R$ {order.value.toLocaleString('pt-BR')}</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Mais OPs */}
        {remainingCount > 0 && (
          <div className="text-center text-xs text-muted-foreground mb-3">
            +{remainingCount} ambiente{remainingCount > 1 ? 's' : ''}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              R$ {(group.total_value || 0).toLocaleString('pt-BR')}
            </span>
          </div>
          
          {stats.nearestDeadline && (
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              <span>{format(stats.nearestDeadline, 'dd/MM', { locale: ptBR })}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <Badge 
              variant={stats.completed === stats.total ? 'default' : 'secondary'}
              className="text-[10px] px-1.5"
            >
              {stats.completed}/{stats.total}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const UnifiedOpsCard = memo(UnifiedOpsCardComponent);
