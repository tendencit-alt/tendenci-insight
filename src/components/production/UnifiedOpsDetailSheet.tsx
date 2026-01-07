import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Package,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Unlink,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface UnifiedOpsDetailSheetProps {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderClick?: (orderId: string) => void;
}

export function UnifiedOpsDetailSheet({ groupId, open, onOpenChange, onOrderClick }: UnifiedOpsDetailSheetProps) {
  const queryClient = useQueryClient();

  // Buscar dados do grupo
  const { data: group } = useQuery({
    queryKey: ['production-order-group', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      
      const { data, error } = await supabase
        .from('production_order_groups')
        .select(`
          *,
          client:clients!production_order_groups_client_id_fkey(id, name),
          order:orders!production_order_groups_order_id_fkey(id, order_number)
        `)
        .eq('id', groupId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!groupId
  });

  // Buscar OPs do grupo
  const { data: groupOrders = [] } = useQuery({
    queryKey: ['group-orders', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('production_orders')
        .select(`
          *,
          current_phase:production_phases!production_orders_current_phase_id_fkey(
            id,
            started_at,
            completed_at,
            phase_template:production_phase_templates(id, name, color, position, sla_hours)
          ),
          production_type:production_types!production_orders_production_type_id_fkey(name, color),
          responsible:profiles!production_orders_responsible_id_fkey(full_name)
        `)
        .eq('group_id', groupId)
        .order('order_number');

      if (error) throw error;
      return data;
    },
    enabled: !!groupId
  });

  // Calcular estatísticas
  const stats = {
    total: groupOrders.length,
    completed: groupOrders.filter(o => o.status === 'concluido').length,
    inProgress: groupOrders.filter(o => o.status === 'em_producao').length,
    waiting: groupOrders.filter(o => o.status === 'aguardando').length,
    totalValue: groupOrders.reduce((sum, o) => sum + (o.value || 0), 0)
  };

  const progressPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  // Mutation para desagrupar uma OP
  const ungroupOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('production_orders')
        .update({ group_id: null })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-orders', groupId] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('OP removida do grupo');
    },
    onError: () => {
      toast.error('Erro ao remover OP do grupo');
    }
  });

  // Mutation para excluir grupo
  const deleteGroup = useMutation({
    mutationFn: async () => {
      // Primeiro remove o group_id de todas as OPs
      await supabase
        .from('production_orders')
        .update({ group_id: null })
        .eq('group_id', groupId);

      // Depois exclui o grupo
      const { error } = await supabase
        .from('production_order_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-order-groups'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      onOpenChange(false);
      toast.success('Grupo desfeito com sucesso');
    },
    onError: () => {
      toast.error('Erro ao desfazer grupo');
    }
  });

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      urgente: 'Urgente',
      alta: 'Alta',
      normal: 'Normal',
      baixa: 'Baixa'
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'alta': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'normal': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'baixa': return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Concluído</Badge>;
      case 'em_producao':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">Em Produção</Badge>;
      case 'aguardando':
        return <Badge variant="secondary">Aguardando</Badge>;
      case 'pausado':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Pausado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {group?.group_name || 'Grupo de OPs'}
            </SheetTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => deleteGroup.mutate()}
                  className="text-destructive"
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Desfazer Grupo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Info do cliente */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{group?.client?.name || 'Não definido'}</p>
              </div>
              {group?.order && (
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Pedido</p>
                  <p className="font-medium">#{group.order.order_number}</p>
                </div>
              )}
            </div>

            {/* Estatísticas */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Progresso Geral</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.completed} de {stats.total} concluídas
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">Em Produção</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-muted-foreground">{stats.waiting}</p>
                    <p className="text-xs text-muted-foreground">Aguardando</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor Total</span>
                  <span className="text-lg font-bold">
                    R$ {stats.totalValue.toLocaleString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Lista de OPs */}
            <div>
              <h3 className="text-sm font-medium mb-3">Ordens de Produção ({stats.total})</h3>
              <div className="space-y-3">
                {groupOrders.map((order) => {
                  const isCompleted = order.status === 'concluido';
                  const phaseName = order.current_phase?.phase_template?.name || 'Aguardando';
                  const phaseColor = order.current_phase?.phase_template?.color || '#6b7280';
                  
                  // Calcular dias na fase
                  let daysInPhase = 0;
                  if (order.current_phase?.started_at) {
                    daysInPhase = differenceInDays(new Date(), new Date(order.current_phase.started_at));
                  }
                  
                  // Verificar SLA
                  const slaHours = order.current_phase?.phase_template?.sla_hours;
                  const slaDays = slaHours ? Math.ceil(slaHours / 24) : null;
                  const isOverSLA = slaDays && daysInPhase > slaDays;

                  return (
                    <Card 
                      key={order.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        isOverSLA ? 'ring-1 ring-red-500/50' : ''
                      }`}
                      onClick={() => {
                        onOrderClick?.(order.id);
                        onOpenChange(false);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                OP-{String(order.order_number).padStart(4, '0')}
                              </span>
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : isOverSLA ? (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {order.title}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                variant="outline"
                                style={{
                                  backgroundColor: `${phaseColor}20`,
                                  color: phaseColor,
                                  borderColor: `${phaseColor}50`
                                }}
                              >
                                {isCompleted ? 'Concluído' : phaseName}
                              </Badge>
                              <Badge variant="outline" className={getPriorityColor(order.priority)}>
                                {getPriorityLabel(order.priority)}
                              </Badge>
                            </div>
                            {!isCompleted && daysInPhase > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{daysInPhase}d na fase</span>
                                {slaDays && (
                                  <span className={isOverSLA ? 'text-red-500' : ''}>
                                    (SLA: {slaDays}d)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            {order.value && (
                              <span className="text-sm font-medium">
                                R$ {order.value.toLocaleString('pt-BR')}
                              </span>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  onOrderClick?.(order.id);
                                  onOpenChange(false);
                                }}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    ungroupOrder.mutate(order.id);
                                  }}
                                  className="text-destructive"
                                >
                                  <Unlink className="h-4 w-4 mr-2" />
                                  Remover do Grupo
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
