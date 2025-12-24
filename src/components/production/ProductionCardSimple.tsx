import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Siren } from 'lucide-react';
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
  baixa: 'B',
  normal: 'N',
  alta: 'A',
  urgente: 'U'
};

function ProductionCardSimpleComponent({ order, onClick, isDragging, automationAlert }: ProductionCardSimpleProps) {
  const isOverdue = order.planned_end_date && isPast(new Date(order.planned_end_date));
  
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

  // Format value
  const formattedValue = order.value 
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(order.value)
    : null;

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
      <CardContent className="p-2 space-y-1">
        {/* Linha 1: Grip + Alerta + OP + Título + Prioridade */}
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {hasAutomationAlert && <Siren className="h-3.5 w-3.5 text-destructive shrink-0" />}
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            OP-{String(order.order_number).padStart(4, '0')}
          </span>
          <span className="text-xs font-medium truncate flex-1 min-w-0">{order.title}</span>
          <Badge className={cn("shrink-0 text-[10px] px-1 py-0 h-4", priorityColors[order.priority])}>
            {priorityLabels[order.priority] || order.priority.charAt(0).toUpperCase()}
          </Badge>
        </div>
        
        {/* Linha 2: Tipo + Cliente/Responsável + Data prazo */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {order.production_type && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
              <span 
                className="w-1.5 h-1.5 rounded-full mr-1" 
                style={{ backgroundColor: getTailwindColor(order.production_type.color) }}
              />
              <span className="max-w-[60px] truncate">{order.production_type.name}</span>
            </Badge>
          )}
          <span className="truncate flex-1 min-w-0">
            {order.client?.name || order.responsible?.full_name || '-'}
          </span>
          {order.planned_end_date && (
            <span className={cn(
              "shrink-0 text-[10px] font-medium",
              isOverdue && "text-destructive"
            )}>
              {format(new Date(order.planned_end_date), 'dd/MM')}
            </span>
          )}
        </div>
        
        {/* Linha 3: Valor + Tempo na fase + SLA */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-primary">
            {formattedValue || '-'}
          </span>
          <div className="flex items-center gap-1.5">
            {daysInPhase !== null && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                slaStatus === 'exceeded' && "bg-destructive/10 text-destructive",
                slaStatus === 'warning' && "bg-amber-500/10 text-amber-600",
                slaStatus === 'ok' && "bg-emerald-500/10 text-emerald-600",
                !slaStatus && "bg-muted text-muted-foreground"
              )}>
                {daysInPhase === 0 ? 'Hoje' : `${daysInPhase}d`}
                {slaDays && ` / ${slaDays}d`}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const ProductionCardSimple = memo(ProductionCardSimpleComponent);
