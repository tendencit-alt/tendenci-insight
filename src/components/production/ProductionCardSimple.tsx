import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Package, GripVertical, Clock, Timer, Link2, AlertTriangle, Siren } from 'lucide-react';
import { format, differenceInDays, differenceInHours, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { getTailwindColor } from '@/utils/tailwindColors';
import { memo } from 'react';

interface ProductionCardSimpleProps {
  order: {
    id: string;
    order_number: number;
    title: string;
    status: string;
    priority: string;
    planned_end_date?: string | null;
    planned_start_date?: string | null;
    created_at?: string | null;
    production_type?: { name: string; color: string; icon?: string } | null;
    responsible?: { full_name: string } | null;
    client?: { name: string } | null;
    deal?: { id: string; title: string } | null;
    value?: number | null;
    current_phase?: {
      id: string;
      started_at?: string | null;
      estimated_hours?: number | null;
      actual_hours?: number | null;
      phase_template?: { 
        id: string;
        name: string; 
        color: string;
        position: number;
        sla_hours?: number | null;
      } | null;
    } | null;
  };
  onClick: () => void;
  isDragging?: boolean;
  automationAlert?: {
    automation_nome: string;
    dias_uteis_na_fase: number;
    prazo_dias_uteis: number;
    dias_excedidos: number;
  } | null;
}

const priorityColors: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  urgente: 'bg-destructive/20 text-destructive'
};

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente'
};

function ProductionCardSimpleComponent({ order, onClick, isDragging, automationAlert }: ProductionCardSimpleProps) {
  const isOverdue = order.planned_end_date && isPast(new Date(order.planned_end_date));
  const daysRemaining = order.planned_end_date 
    ? differenceInDays(new Date(order.planned_end_date), new Date())
    : null;

  // Cálculos de tempo na fase
  const daysInPhase = order.current_phase?.started_at 
    ? differenceInDays(new Date(), new Date(order.current_phase.started_at))
    : null;
  
  const hoursInPhase = order.current_phase?.started_at 
    ? differenceInHours(new Date(), new Date(order.current_phase.started_at))
    : null;

  // SLA da fase
  const slaHours = order.current_phase?.phase_template?.sla_hours;
  const slaDays = slaHours ? Math.ceil(slaHours / 24) : null;
  
  // Status do SLA
  const getSlaStatus = () => {
    if (!slaHours || hoursInPhase === null) return null;
    if (hoursInPhase > slaHours) return 'exceeded';
    if (hoursInPhase > slaHours * 0.8) return 'warning';
    return 'ok';
  };
  const slaStatus = getSlaStatus();
  
  const hasAutomationAlert = automationAlert && automationAlert.dias_excedidos > 0;

  return (
    <Card 
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4",
        isDragging && "shadow-lg ring-2 ring-primary rotate-2",
        hasAutomationAlert && "ring-2 ring-destructive/50",
        isOverdue && "border-l-destructive",
        !isOverdue && order.priority === 'urgente' && "border-l-destructive",
        !isOverdue && order.priority === 'alta' && "border-l-orange-500",
        !isOverdue && order.priority === 'normal' && "border-l-blue-500",
        !isOverdue && order.priority === 'baixa' && "border-l-muted-foreground"
      )}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <CardContent className="p-3 space-y-2">
        {/* Automation Alert Badge */}
        {hasAutomationAlert && (
          <div className="p-1.5 rounded-md bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-1.5 text-destructive text-xs font-semibold">
              <Siren className="h-3 w-3" />
              <span>ATRASADO - {automationAlert.dias_excedidos}d útil(eis)</span>
            </div>
          </div>
        )}

        {/* Header: OP Number, Title, Priority */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-mono text-muted-foreground block">
                OP-{String(order.order_number).padStart(4, '0')}
              </span>
              <p className="font-medium text-sm truncate">{order.title}</p>
            </div>
          </div>
          <Badge className={cn("shrink-0 text-xs", priorityColors[order.priority])}>
            {priorityLabels[order.priority] || order.priority}
          </Badge>
        </div>

        {/* Production Type Badge */}
        {order.production_type && (
          <Badge variant="outline" className="text-xs">
            <span 
              className="w-1.5 h-1.5 rounded-full mr-1" 
              style={{ backgroundColor: getTailwindColor(order.production_type.color) }}
            />
            {order.production_type.name}
          </Badge>
        )}

        {/* Info Section */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {order.client && (
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3 shrink-0" />
              <span className="truncate">{order.client.name}</span>
            </div>
          )}

          {order.responsible && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{order.responsible.full_name}</span>
            </div>
          )}

          {order.deal && (
            <div className="flex items-center gap-1 text-primary">
              <Link2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{order.deal.title}</span>
            </div>
          )}
        </div>

        {/* Phase Time & SLA Section - Simplified */}
        {order.current_phase?.started_at && (
          <div className={cn(
            "rounded-md p-1.5 text-xs flex items-center justify-between",
            slaStatus === 'exceeded' && "bg-destructive/10",
            slaStatus === 'warning' && "bg-amber-500/10",
            slaStatus === 'ok' && "bg-emerald-500/10",
            !slaStatus && "bg-muted/50"
          )}>
            <div className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              <span className="font-medium">
                {daysInPhase === 0 ? 'Hoje' : `${daysInPhase}d`}
              </span>
            </div>
            {slaDays && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1 py-0",
                  slaStatus === 'exceeded' && "border-destructive text-destructive",
                  slaStatus === 'warning' && "border-amber-500 text-amber-600",
                  slaStatus === 'ok' && "border-emerald-500 text-emerald-600"
                )}
              >
                SLA: {slaDays}d
              </Badge>
            )}
          </div>
        )}

        {/* Deadline */}
        {order.planned_end_date && (
          <div className={cn(
            "flex items-center justify-between text-xs pt-1 border-t",
            isOverdue && "text-destructive font-medium",
            daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0 && "text-amber-600 font-medium"
          )}>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(order.planned_end_date), 'dd/MM')}</span>
            </div>
            {daysRemaining !== null && (
              <span className="text-xs">
                {isOverdue 
                  ? `${Math.abs(daysRemaining)}d atrasado` 
                  : daysRemaining === 0 
                  ? 'Hoje'
                  : `${daysRemaining}d`
                }
              </span>
            )}
          </div>
        )}

        {/* Value */}
        {order.value && order.value > 0 && (
          <div className="text-sm font-semibold text-primary pt-1 border-t">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(order.value)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Memoize to prevent unnecessary re-renders
export const ProductionCardSimple = memo(ProductionCardSimpleComponent);
