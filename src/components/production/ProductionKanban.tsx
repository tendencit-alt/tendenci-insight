import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useActiveTenant';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin, PointerSensor, useSensor, useSensors, TouchSensor, KeyboardSensor } from '@dnd-kit/core';
import { ProductionCardSimple } from './ProductionCardSimple';
import { OptimizedDroppableColumn } from './OptimizedDroppableColumn';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { subDays, startOfMonth } from 'date-fns';


interface ProductionKanbanProps {
  productionTypeId?: string;
  filters?: {
    status: string;
    priority: string;
    search: string;
    responsible: string;
    period?: string;
  };
  onOrderClick?: (orderId: string) => void;
}

export function ProductionKanban({ productionTypeId, filters, onOrderClick }: ProductionKanbanProps) {
  const queryClient = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  const [activeOrder, setActiveOrder] = useState<any>(null);


  // Sensores otimizados para melhor responsividade
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduzido para resposta mais rápida
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Delay menor para touch
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Buscar fases (templates) baseado no tipo selecionado
  const { data: phases = [], isLoading: phasesLoading } = useQuery({
    queryKey: ['production-phase-templates', productionTypeId],
    queryFn: async () => {
      let query = supabase
        .from('production_phase_templates')
        .select('*')
        .eq('active', true)
        .order('position');
      
      if (productionTypeId) {
        query = query.eq('production_type_id', productionTypeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 30000, // Cache por 30 segundos
  });

  // Buscar ordens de produção com suas fases atuais
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['production-orders', activeTenantId, productionTypeId, filters],
    enabled: !!activeTenantId,
    queryFn: async () => {
      // First get the base query
      let query = supabase
        .from('production_orders')
        .select(`
          *,
          production_type:production_types!production_orders_production_type_id_fkey(name, color, icon),
          current_phase:production_phases!production_orders_current_phase_id_fkey(
            id,
            started_at,
            estimated_hours,
            actual_hours,
            phase_template:production_phase_templates(id, name, color, position, sla_hours)
          ),
          responsible:profiles!production_orders_responsible_id_fkey(full_name),
          client:clients!production_orders_client_id_fkey(name),
          deal:crm_deals!production_orders_deal_id_fkey(id, title)
        `)
        .eq('tenant_id', activeTenantId!)
        .neq('status', 'cancelado');
      
      if (productionTypeId) {
        query = query.eq('production_type_id', productionTypeId);
      }


      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.responsible && filters.responsible !== 'all') {
        query = query.eq('responsible_id', filters.responsible);
      }

      // Filtro de período
      if (filters?.period && filters.period !== 'all') {
        let dateFrom: Date;
        const today = new Date();
        
        switch (filters.period) {
          case 'last7days':
            dateFrom = subDays(today, 7);
            break;
          case 'last30days':
            dateFrom = subDays(today, 30);
            break;
          case 'last60days':
            dateFrom = subDays(today, 60);
            break;
          case 'last90days':
            dateFrom = subDays(today, 90);
            break;
          case 'thisMonth':
            dateFrom = startOfMonth(today);
            break;
          default:
            dateFrom = new Date(0);
        }
        
        query = query.gte('created_at', dateFrom.toISOString());
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      // Filtrar por busca no cliente side para incluir nome do cliente e descrição
      if (filters?.search && filters.search.trim() !== '') {
        const searchLower = filters.search.toLowerCase().trim();
        return data.filter(order => {
          const titleMatch = order.title?.toLowerCase().includes(searchLower);
          const orderNumberMatch = order.order_number?.toString().includes(searchLower);
          const clientMatch = order.client?.name?.toLowerCase().includes(searchLower);
          const descriptionMatch = order.description?.toLowerCase().includes(searchLower);
          return titleMatch || orderNumberMatch || clientMatch || descriptionMatch;
        });
      }
      
      return data;
    },
    staleTime: 10000, // Cache por 10 segundos
  });

  // Buscar alertas de automação de forma separada e menos frequente
  const { data: automationAlerts } = useQuery({
    queryKey: ['production-automation-alerts'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('check_production_automations');
        if (error) throw error;
        
        // Converter para Map para acesso O(1)
        const alertsMap = new Map<string, any>();
        if (data) {
          data.forEach((alert: any) => {
            alertsMap.set(alert.order_id, alert);
          });
        }
        return alertsMap;
      } catch {
        return new Map();
      }
    },
    staleTime: 60000, // Cache por 1 minuto
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });

  // Realtime subscription com debounce
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
    const channel = supabase
      .channel('production-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_orders'
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['production-orders'] });
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_phases'
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['production-orders'] });
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Mutation para mover OP para uma fase específica
  const moveToPhase = useMutation({
    mutationFn: async ({ orderId, targetPhaseTemplateId, targetPhaseName, fromWaiting }: { 
      orderId: string; 
      targetPhaseTemplateId?: string;
      targetPhaseName?: string;
      fromWaiting?: boolean;
    }) => {
      // Buscar a ordem atual
      const { data: order } = await supabase
        .from('production_orders')
        .select('current_phase_id, production_type_id')
        .eq('id', orderId)
        .single();

      if (!order) throw new Error('OP não encontrada');

      // Determinar o phase_template_id correto baseado no tipo da OP
      let correctPhaseTemplateId = targetPhaseTemplateId;

      // Se recebemos targetPhaseName (aba "Todos"), precisamos buscar o template correto para o tipo da OP
      if (targetPhaseName && !targetPhaseTemplateId) {
        const { data: correctTemplate } = await supabase
          .from('production_phase_templates')
          .select('id')
          .eq('production_type_id', order.production_type_id)
          .eq('name', targetPhaseName)
          .eq('active', true)
          .single();

        if (!correctTemplate) {
          throw new Error(`Fase "${targetPhaseName}" não existe para este tipo de produção`);
        }
        correctPhaseTemplateId = correctTemplate.id;
      }

      if (!correctPhaseTemplateId) {
        throw new Error('Fase de destino não especificada');
      }

      // Se está vindo do "Aguardando" ou não tem fase atual
      if (fromWaiting || !order.current_phase_id) {
        // Buscar a fase alvo para esta OP
        const { data: targetPhase } = await supabase
          .from('production_phases')
          .select('id')
          .eq('production_order_id', orderId)
          .eq('phase_template_id', correctPhaseTemplateId)
          .single();

        // Verificar se a fase de destino é fase final (is_end_phase)
        const { data: targetTemplateInfo } = await supabase
          .from('production_phase_templates')
          .select('is_end_phase')
          .eq('id', correctPhaseTemplateId)
          .single();

        const isEndPhaseFromWaiting = targetTemplateInfo?.is_end_phase === true;
        const now = new Date().toISOString();

        if (!targetPhase) {
          // Fase não existe - criar automaticamente
          const { data: newPhase, error: createError } = await supabase
            .from('production_phases')
            .insert({
              production_order_id: orderId,
              phase_template_id: correctPhaseTemplateId,
              status: isEndPhaseFromWaiting ? 'concluido' : 'em_andamento',
              started_at: now,
              completed_at: isEndPhaseFromWaiting ? now : null
            })
            .select('id')
            .single();

          if (createError) throw new Error('Erro ao criar fase: ' + createError.message);

          // Atualizar a OP
          if (isEndPhaseFromWaiting) {
            const { data: updatedOP } = await supabase
              .from('production_orders')
              .update({ 
                current_phase_id: newPhase.id,
                status: 'concluido',
                actual_start_date: now,
                actual_end_date: now
              })
              .eq('id', orderId)
              .select('order_id')
              .single();

            // Atualizar pedido vinculado
            if (updatedOP?.order_id) {
              await supabase
                .from('orders')
                .update({ 
                  status: 'entregue',
                  data_entrega_realizada: now.split('T')[0]
                })
                .eq('id', updatedOP.order_id);
            }
          } else {
            await supabase
              .from('production_orders')
              .update({ 
                current_phase_id: newPhase.id,
                status: 'em_producao',
                actual_start_date: now
              })
              .eq('id', orderId);
          }

          return;
        }

        // Iniciar a fase existente
        await supabase
          .from('production_phases')
          .update({ 
            status: isEndPhaseFromWaiting ? 'concluido' : 'em_andamento',
            started_at: now,
            completed_at: isEndPhaseFromWaiting ? now : null
          })
          .eq('id', targetPhase.id);

        // Atualizar a OP
        if (isEndPhaseFromWaiting) {
          const { data: updatedOP } = await supabase
            .from('production_orders')
            .update({ 
              current_phase_id: targetPhase.id,
              status: 'concluido',
              actual_start_date: now,
              actual_end_date: now
            })
            .eq('id', orderId)
            .select('order_id')
            .single();

          // Atualizar pedido vinculado
          if (updatedOP?.order_id) {
            await supabase
              .from('orders')
              .update({ 
                status: 'entregue',
                data_entrega_realizada: now.split('T')[0]
              })
              .eq('id', updatedOP.order_id);
          }
        } else {
          await supabase
            .from('production_orders')
            .update({ 
              current_phase_id: targetPhase.id,
              status: 'em_producao',
              actual_start_date: now
            })
            .eq('id', orderId);
        }

        return;
      }

      // Verificar se a fase de destino é fase final (is_end_phase)
      const { data: targetTemplate } = await supabase
        .from('production_phase_templates')
        .select('is_end_phase')
        .eq('id', correctPhaseTemplateId)
        .single();

      const isEndPhase = targetTemplate?.is_end_phase === true;

      // Caso normal: movendo entre fases
      // Concluir fase atual
      await supabase
        .from('production_phases')
        .update({ 
          status: 'concluido',
          completed_at: new Date().toISOString()
        })
        .eq('id', order.current_phase_id);

      // Buscar a nova fase
      let { data: newPhase } = await supabase
        .from('production_phases')
        .select('id')
        .eq('production_order_id', orderId)
        .eq('phase_template_id', correctPhaseTemplateId)
        .single();

      const now = new Date().toISOString();

      if (!newPhase) {
        // Fase não existe - criar automaticamente
        const { data: createdPhase, error: createError } = await supabase
          .from('production_phases')
          .insert({
            production_order_id: orderId,
            phase_template_id: correctPhaseTemplateId,
            status: isEndPhase ? 'concluido' : 'em_andamento',
            started_at: now,
            completed_at: isEndPhase ? now : null
          })
          .select('id')
          .single();

        if (createError) throw new Error('Erro ao criar fase: ' + createError.message);
        newPhase = createdPhase;
      } else {
        // Atualizar fase existente - concluir se for fase final
        await supabase
          .from('production_phases')
          .update({ 
            status: isEndPhase ? 'concluido' : 'em_andamento',
            started_at: now,
            completed_at: isEndPhase ? now : null
          })
          .eq('id', newPhase.id);
      }

      // Atualizar a OP - se for fase final, marcar como concluído
      if (isEndPhase) {
        const { data: updatedOrder } = await supabase
          .from('production_orders')
          .update({ 
            current_phase_id: newPhase.id,
            status: 'concluido',
            actual_end_date: now
          })
          .eq('id', orderId)
          .select('order_id')
          .single();

        // Se a OP está vinculada a um pedido, atualizar o pedido também
        if (updatedOrder?.order_id) {
          await supabase
            .from('orders')
            .update({ 
              status: 'entregue',
              data_entrega_realizada: now.split('T')[0]
            })
            .eq('id', updatedOrder.order_id);
        }
      } else {
        await supabase
          .from('production_orders')
          .update({ current_phase_id: newPhase.id })
          .eq('id', orderId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('OP movida com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao mover OP:', error);
      toast.error(error.message || 'Erro ao mover OP');
    }
  });

  // OPs sem fase atual (fallback para primeira coluna)
  const ordersWithoutPhase = useMemo(() => {
    return orders.filter(order => !order.current_phase);
  }, [orders]);

  // Agrupar OPs por fase atual - memoizado
  const ordersByPhase = useMemo(() => {
    return phases.reduce((acc, phase) => {
      acc[phase.id] = orders.filter(order => {
        if (!order.current_phase) return false; // Serão mostrados na primeira coluna via fallback
        if (order.current_phase?.phase_template?.id === phase.id) return true;
        if (order.current_phase?.phase_template?.name === phase.name) return true;
        return false;
      });
      return acc;
    }, {} as Record<string, typeof orders>);
  }, [phases, orders]);

  const uniquePhases = useMemo(() => {
    return productionTypeId 
      ? phases 
      : phases.reduce((acc, phase) => {
          if (!acc.find(p => p.name === phase.name)) {
            acc.push(phase);
          }
          return acc;
        }, [] as typeof phases);
  }, [phases, productionTypeId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const order = orders.find(o => o.id === active.id);
    setActiveOrder(order);
  }, [orders]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const targetId = over.id as string;

    // Verificar se foi solto em uma coluna
    if (targetId.startsWith('column-')) {
      const phaseTemplateId = targetId.replace('column-', '');
      
      if (phaseTemplateId === 'waiting') return;

      const order = orders.find(o => o.id === orderId);
      const currentPhaseName = order?.current_phase?.phase_template?.name;

      // Encontrar a fase de destino para verificar o nome
      const targetPhase = phases.find(p => p.id === phaseTemplateId);
      
      // Se já está na mesma fase (por nome), não fazer nada
      if (currentPhaseName === targetPhase?.name) return;

      const fromWaiting = !order?.current_phase;

      if (!productionTypeId && targetPhase) {
        moveToPhase.mutate({ 
          orderId, 
          targetPhaseName: targetPhase.name, 
          fromWaiting 
        });
      } else {
        moveToPhase.mutate({ 
          orderId, 
          targetPhaseTemplateId: phaseTemplateId, 
          fromWaiting 
        });
      }
    }
  }, [orders, phases, productionTypeId, moveToPhase]);

  const handleCardClick = useCallback((orderId: string) => {
    onOrderClick?.(orderId);
  }, [onOrderClick]);

  if (phasesLoading || ordersLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-[300px]">
            <Skeleton className="h-10 w-full mb-3" />
            <Skeleton className="h-32 w-full mb-2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {uniquePhases.map((phase, index) => {
            // Para a primeira coluna, incluir também OPs sem fase atual (fallback)
            const isFirstColumn = index === 0;
            
            const phaseOrders = productionTypeId 
              ? [
                  ...(ordersByPhase[phase.id] || []),
                  ...(isFirstColumn ? ordersWithoutPhase : [])
                ]
              : [
                  ...orders.filter(order => order.current_phase?.phase_template?.name === phase.name),
                  ...(isFirstColumn ? ordersWithoutPhase : [])
                ];
            
            return (
              <OptimizedDroppableColumn
                key={phase.id}
                id={phase.id}
                title={phase.name}
                color={phase.color}
                orders={phaseOrders}
                onCardClick={handleCardClick}
                automationAlerts={automationAlerts}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay dropAnimation={null}>
        {activeOrder ? (
          <div className="opacity-90 rotate-3 scale-105">
            <ProductionCardSimple 
              order={activeOrder}
              onClick={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
