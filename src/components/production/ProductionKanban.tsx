import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ProductionCard } from './ProductionCard';
import { DroppableColumn } from './DroppableColumn';
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
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
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
    }
  });

  // Buscar ordens de produção com suas fases atuais
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['production-orders', productionTypeId, filters],
    queryFn: async () => {
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

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,order_number.eq.${parseInt(filters.search) || 0}`);
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
      return data;
    }
  });

  // Realtime subscription
  useEffect(() => {
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
          queryClient.invalidateQueries({ queryKey: ['production-orders'] });
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
          queryClient.invalidateQueries({ queryKey: ['production-orders'] });
        }
      )
      .subscribe();

    return () => {
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

        if (!targetPhase) {
          // Fase não existe - criar automaticamente
          const { data: newPhase, error: createError } = await supabase
            .from('production_phases')
            .insert({
              production_order_id: orderId,
              phase_template_id: correctPhaseTemplateId,
              status: 'em_andamento',
              started_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (createError) throw new Error('Erro ao criar fase: ' + createError.message);

          // Atualizar a OP
          await supabase
            .from('production_orders')
            .update({ 
              current_phase_id: newPhase.id,
              status: 'em_andamento',
              actual_start_date: new Date().toISOString()
            })
            .eq('id', orderId);

          return;
        }

        // Iniciar a fase existente
        await supabase
          .from('production_phases')
          .update({ 
            status: 'em_andamento',
            started_at: new Date().toISOString()
          })
          .eq('id', targetPhase.id);

        // Atualizar a OP
        await supabase
          .from('production_orders')
          .update({ 
            current_phase_id: targetPhase.id,
            status: 'em_andamento',
            actual_start_date: new Date().toISOString()
          })
          .eq('id', orderId);

        return;
      }

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

      if (!newPhase) {
        // Fase não existe - criar automaticamente
        const { data: createdPhase, error: createError } = await supabase
          .from('production_phases')
          .insert({
            production_order_id: orderId,
            phase_template_id: correctPhaseTemplateId,
            status: 'em_andamento',
            started_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createError) throw new Error('Erro ao criar fase: ' + createError.message);
        newPhase = createdPhase;
      } else {
        // Iniciar fase existente
        await supabase
          .from('production_phases')
          .update({ 
            status: 'em_andamento',
            started_at: new Date().toISOString()
          })
          .eq('id', newPhase.id);
      }

      // Atualizar a OP
      await supabase
        .from('production_orders')
        .update({ current_phase_id: newPhase.id })
        .eq('id', orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('OP movida com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao mover OP:', error);
      toast.error(error.message || 'Erro ao mover OP');
    }
  });

  // Agrupar OPs por fase atual - usar match por nome para compatibilidade
  const ordersByPhase = useMemo(() => {
    return phases.reduce((acc, phase) => {
      acc[phase.id] = orders.filter(order => {
        // Match por ID exato primeiro
        if (order.current_phase?.phase_template?.id === phase.id) return true;
        // Match por nome da fase (para compatibilidade entre tipos)
        if (order.current_phase?.phase_template?.name === phase.name) return true;
        return false;
      });
      return acc;
    }, {} as Record<string, typeof orders>);
  }, [phases, orders]);

  // OPs sem fase (aguardando início)
  const ordersWithoutPhase = useMemo(() => {
    return orders.filter(order => !order.current_phase);
  }, [orders]);

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders.find(o => o.id === active.id);
    setActiveOrder(order);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const targetId = over.id as string;

    // Verificar se foi solto em uma coluna
    if (targetId.startsWith('column-')) {
      const phaseTemplateId = targetId.replace('column-', '');
      
      if (phaseTemplateId === 'waiting') return; // Não pode voltar para aguardando

      const order = orders.find(o => o.id === orderId);
      const currentPhaseName = order?.current_phase?.phase_template?.name;

      // Encontrar a fase de destino para verificar o nome
      const targetPhase = phases.find(p => p.id === phaseTemplateId);
      
      // Se já está na mesma fase (por nome), não fazer nada
      if (currentPhaseName === targetPhase?.name) return;

      const fromWaiting = !order?.current_phase;

      // Na aba "Todos" (sem productionTypeId), usar nome da fase ao invés de ID
      // Isso garante que o sistema encontre a fase correta para o tipo de produção da OP
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
  };

  const handleCardClick = (orderId: string) => {
    onOrderClick?.(orderId);
  };

  if (phasesLoading || ordersLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-[280px]">
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
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {/* Coluna de OPs sem fase atribuída */}
          <DroppableColumn
            id="waiting"
            title="Nova OP"
            color="#6b7280"
            orders={ordersWithoutPhase}
            onCardClick={handleCardClick}
          />

          {/* Colunas por fase */}
          {uniquePhases.map((phase) => {
            const phaseOrders = productionTypeId 
              ? ordersByPhase[phase.id] || []
              : orders.filter(order => order.current_phase?.phase_template?.name === phase.name);
            
            return (
              <DroppableColumn
                key={phase.id}
                id={phase.id}
                title={phase.name}
                color={phase.color}
                orders={phaseOrders}
                onCardClick={handleCardClick}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeOrder ? (
          <ProductionCard 
            order={activeOrder}
            onClick={() => {}}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
