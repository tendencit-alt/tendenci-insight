import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Package, GripVertical, Clock, Timer, Link2, AlertTriangle, Hourglass, TrendingUp, Siren, Zap, Pencil } from 'lucide-react';
import { format, differenceInDays, differenceInHours, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { getTailwindColor } from '@/utils/tailwindColors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { memo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditPhasesSLADialog } from './EditPhasesSLADialog';

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
    prazo_customizado_dias?: number | null;
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
  prediction?: {
    previsao_atraso?: boolean;
    etapa_prevista_atraso?: string;
    horas_estimadas_extra?: number;
  } | null;
}

const priorityColors: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  normal: 'bg-primary/10 text-primary',
  alta: 'bg-warning/10 text-warning',
  urgente: 'bg-destructive/10 text-destructive'
};

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente'
};

function ProductionCardSimpleComponent({ order, onClick, isDragging, automationAlert, prediction }: ProductionCardSimpleProps) {
  const queryClient = useQueryClient();
  const [prazoDialogOpen, setPrazoDialogOpen] = useState(false);
  
  // Verificar se está na fase "Entregue" - não mostrar alertas de SLA
  const currentPhaseName = order.current_phase?.phase_template?.name;
  const isDeliveredPhase = currentPhaseName?.toLowerCase() === 'entregue';
  
  const isOverdue = order.planned_end_date && isPast(new Date(order.planned_end_date));
  const daysRemaining = order.planned_end_date 
    ? differenceInDays(new Date(order.planned_end_date), new Date())
    : null;

  // Verificar se é Móveis Planejados
  const isMoveisplanejados = order.production_type?.name === 'Móveis Planejados';

  // Mutation para toggle de urgência com registro no histórico
  const toggleUrgent = useMutation({
    mutationFn: async () => {
      const newPriority = order.priority === 'urgente' ? 'normal' : 'urgente';
      
      // 1. Atualizar prioridade
      const { error } = await supabase
        .from('production_orders')
        .update({ priority: newPriority })
        .eq('id', order.id);
      if (error) throw error;
      
      // 2. Registrar no histórico
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('production_logs')
        .insert({
          production_order_id: order.id,
          action_type: 'priority_change',
          description: newPriority === 'urgente' 
            ? 'Ordem marcada como URGENTE' 
            : 'Urgência removida - voltou para prioridade normal',
          from_status: order.priority,
          to_status: newPriority,
          created_by: user?.id
        });
      
      return newPriority;
    },
    onSuccess: (newPriority) => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['production-order-logs'] });
      toast.success(newPriority === 'urgente' ? 'Marcado como urgente!' : 'Urgência removida');
    },
    onError: () => {
      toast.error('Erro ao alterar prioridade');
    }
  });

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
  
  const slaExceededHours = slaHours && hoursInPhase ? Math.max(0, hoursInPhase - slaHours) : 0;

  // Dias totais desde criação
  const totalDays = order.created_at 
    ? differenceInDays(new Date(), new Date(order.created_at))
    : null;

  // Previsão preditiva
  const hasPredictiveDelay = prediction?.previsao_atraso === true;
  
  // Has automation SLA exceeded
  const hasAutomationAlert = automationAlert && automationAlert.dias_excedidos > 0;

  return (
    <TooltipProvider>
    <Card
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4",
        isDragging && "shadow-lg ring-2 ring-primary rotate-2",
        hasAutomationAlert && "ring-2 ring-destructive/50",
        isOverdue && "border-l-destructive",
        !isOverdue && order.priority === 'urgente' && "border-l-destructive",
        !isOverdue && order.priority === 'alta' && "border-l-warning",
        !isOverdue && order.priority === 'normal' && "border-l-primary",
        !isOverdue && order.priority === 'baixa' && "border-l-muted-foreground"
      )}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <CardContent className="p-2.5 space-y-1.5">
        {/* Automation Alert Badge - SLA em Dias Úteis - Não mostrar para entregues */}
        {hasAutomationAlert && !isDeliveredPhase && (
          <div className="p-1.5 rounded bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-1 text-destructive text-[10px] font-semibold">
              <Siren className="h-3 w-3" />
              <span>ATRASADO - {automationAlert.dias_excedidos}d úteis</span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5 pl-4">
              SLA: {automationAlert.prazo_dias_uteis}d | Na fase: {automationAlert.dias_uteis_na_fase}d
            </p>
          </div>
        )}

        {/* Header: OP Number, Title, Priority */}
        <div className="flex items-start gap-1.5">
          <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-mono text-muted-foreground">
                OP-{String(order.order_number).padStart(4, '0')}
              </span>
              <Badge className={cn("text-[10px] h-4 px-1.5", priorityColors[order.priority])}>
                {priorityLabels[order.priority] || order.priority}
              </Badge>
            </div>
            <p className="font-medium text-xs leading-tight line-clamp-2 mt-0.5">{order.title}</p>
          </div>
        </div>

        {/* Production Type & Client */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {order.production_type && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              <span 
                className="w-1.5 h-1.5 rounded-full mr-1" 
                style={{ backgroundColor: getTailwindColor(order.production_type.color) }}
              />
              {order.production_type.name}
            </Badge>
          )}
          {order.client && (
            <div className="flex items-center gap-1 text-[11px] text-foreground font-medium">
              <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate max-w-[120px]">{order.client.name}</span>
            </div>
          )}
        </div>

        {/* Info Grid: Responsible & Deal */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          {order.responsible && (
            <div className="flex items-center gap-1">
              <User className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{order.responsible.full_name}</span>
            </div>
          )}
          {order.deal && (
            <div className="flex items-center gap-1 text-primary">
              <Link2 className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{order.deal.title}</span>
            </div>
          )}
        </div>

        {/* Phase Time & SLA Section - Não mostrar para pedidos entregues */}
        {order.current_phase && !isDeliveredPhase && (
          <div className={cn(
            "rounded p-1.5 text-[10px] space-y-1",
            !order.current_phase.started_at && "bg-muted/50 border border-dashed border-muted-foreground/30",
            order.current_phase.started_at && slaStatus === 'exceeded' && "bg-destructive/10 border border-destructive/20",
            order.current_phase.started_at && slaStatus === 'warning' && "bg-warning/10 border border-warning/20",
            order.current_phase.started_at && slaStatus === 'ok' && "bg-emerald-500/10 border border-emerald-500/20",
            order.current_phase.started_at && !slaStatus && "bg-muted/50"
          )}>
            {order.current_phase.started_at ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Timer className="h-2.5 w-2.5" />
                    <span className="font-medium">
                      {daysInPhase === 0 ? 'Hoje' : `${daysInPhase}d na fase`}
                    </span>
                  </div>
                  {slaDays && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[9px] h-3.5 px-1",
                        slaStatus === 'exceeded' && "border-destructive text-destructive",
                        slaStatus === 'warning' && "border-warning text-warning",
                        slaStatus === 'ok' && "border-emerald-500 text-emerald-600"
                      )}
                    >
                      Prazo: {slaDays}d
                    </Badge>
                  )}
                </div>
                {slaStatus === 'exceeded' && slaExceededHours > 0 && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    <span>
                      {slaExceededHours >= 24 
                        ? `${Math.floor(slaExceededHours / 24)}d ${slaExceededHours % 24}h acima`
                        : `${slaExceededHours}h acima`
                      }
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Hourglass className="h-2.5 w-2.5" />
                  <span>Aguardando início</span>
                </div>
                {slaDays && (
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-muted-foreground/50 text-muted-foreground">
                    SLA: {slaDays}d
                  </Badge>
                )}
              </div>
            )}

            {/* Alerta Preditivo */}
            {hasPredictiveDelay && prediction?.etapa_prevista_atraso && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 p-1 rounded bg-warning/10 border border-warning/20 text-warning text-[10px]">
                      <TrendingUp className="h-2.5 w-2.5" />
                      <span className="truncate">Risco: {prediction.etapa_prevista_atraso}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Análise preditiva indica risco de atraso nesta etapa</p>
                    {prediction.horas_estimadas_extra && prediction.horas_estimadas_extra > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tempo extra estimado: {prediction.horas_estimadas_extra < 24 
                          ? `${prediction.horas_estimadas_extra.toFixed(0)}h`
                          : `${(prediction.horas_estimadas_extra / 24).toFixed(1)}d`
                        }
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Contador de Dias para Entrega Final */}
        <div className={cn(
          "rounded p-1.5",
          isDeliveredPhase && "bg-emerald-500/15 border border-emerald-500/30",
          !isDeliveredPhase && !order.planned_end_date && "bg-destructive/15 border border-destructive/30",
          !isDeliveredPhase && order.planned_end_date && isOverdue && "bg-destructive/15 border border-destructive/30",
          !isDeliveredPhase && order.planned_end_date && !isOverdue && daysRemaining !== null && daysRemaining <= 3 && "bg-warning/15 border border-warning/30",
          !isDeliveredPhase && order.planned_end_date && !isOverdue && daysRemaining !== null && daysRemaining > 3 && "bg-emerald-500/10 border border-emerald-500/20"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              <Calendar className="h-3 w-3" />
              {isDeliveredPhase ? (
                <span className="text-emerald-600">✓ Entregue</span>
              ) : !order.planned_end_date ? (
                <span className="text-destructive font-semibold">Sem prazo definido</span>
              ) : isOverdue ? (
                <span className="text-destructive">
                  Atrasado {Math.abs(daysRemaining || 0)}d
                </span>
              ) : daysRemaining === 0 ? (
                <span className="text-warning">
                  Entrega HOJE
                </span>
              ) : (
                <span className={cn(
                  daysRemaining !== null && daysRemaining <= 3 ? "text-warning" : "text-emerald-600"
                )}>
                  {daysRemaining}d para entrega
                </span>
              )}
            </div>
            
            {/* Botão editar prazo - apenas Móveis Planejados e não entregue */}
            {isMoveisplanejados && !isDeliveredPhase && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPrazoDialogOpen(true);
                }}
                className="p-1 rounded hover:bg-background/50 transition-colors"
                title="Editar prazo"
              >
                <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          
          {/* Info adicional do prazo - não mostrar para entregues */}
          {!isDeliveredPhase && (
            <div className="flex items-center justify-between mt-0.5">
              {order.planned_end_date && (
                <p className="text-[9px] text-muted-foreground">
                  Prazo: {format(new Date(order.planned_end_date), 'dd/MM/yyyy')}
                </p>
              )}
              {isMoveisplanejados && order.prazo_customizado_dias && (
                <p className="text-[9px] text-primary font-medium">
                  {order.prazo_customizado_dias}d úteis
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer: Value & Urgent Button */}
        <div className="flex flex-col gap-2 pt-1 border-t border-border">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Valor:</span>
            </div>
            {order.value && order.value > 0 ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-[11px] px-2">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-[10px]">Não informado</span>
            )}
          </div>
          
          {/* Botão de Urgente - Centralizado */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleUrgent.mutate();
            }}
            disabled={toggleUrgent.isPending}
            className={cn(
              "w-full h-7 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
              order.priority === 'urgente' 
                ? "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25" 
                : "bg-muted text-muted-foreground border border-border hover:bg-muted/80",
              toggleUrgent.isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            <Zap className={cn("h-3.5 w-3.5", toggleUrgent.isPending && "animate-pulse")} />
            {order.priority === 'urgente' ? '✓ Urgente' : 'Marcar Urgente'}
          </button>
        </div>
      </CardContent>
    </Card>
    
    {/* Dialog de editar SLA das etapas - Móveis Planejados */}
    {isMoveisplanejados && (
      <EditPhasesSLADialog
        open={prazoDialogOpen}
        onOpenChange={setPrazoDialogOpen}
        orderId={order.id}
        orderNumber={order.order_number}
        createdAt={order.created_at || null}
      />
    )}
    </TooltipProvider>
  );
}

export const ProductionCardSimple = memo(ProductionCardSimpleComponent);
