import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductionCard } from './ProductionCard';
import { ProductionOrderDetailSheet } from './ProductionOrderDetailSheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ProductionKanbanProps {
  productionTypeId?: string;
  filters: {
    status: string;
    priority: string;
    search: string;
    responsible: string;
  };
}

export function ProductionKanban({ productionTypeId, filters }: ProductionKanbanProps) {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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
          production_type:production_types(name, color, icon),
          current_phase:production_phases!production_orders_current_phase_id_fkey(
            id,
            phase_template:production_phase_templates(id, name, color, position)
          ),
          responsible:profiles!production_orders_responsible_id_fkey(full_name),
          client:clients(name)
        `)
        .neq('status', 'cancelado');
      
      if (productionTypeId) {
        query = query.eq('production_type_id', productionTypeId);
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      if (filters.responsible !== 'all') {
        query = query.eq('responsible_id', filters.responsible);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,order_number.eq.${parseInt(filters.search) || 0}`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Mutation para mover OP para próxima fase
  const moveToPhase = useMutation({
    mutationFn: async ({ orderId, phaseId }: { orderId: string; phaseId: string }) => {
      // Buscar a fase atual da OP
      const { data: order } = await supabase
        .from('production_orders')
        .select('current_phase_id')
        .eq('id', orderId)
        .single();

      // Atualizar a fase atual para concluída
      if (order?.current_phase_id) {
        await supabase
          .from('production_phases')
          .update({ 
            status: 'concluido',
            completed_at: new Date().toISOString()
          })
          .eq('id', order.current_phase_id);
      }

      // Buscar a instância da nova fase para esta OP
      const { data: newPhase } = await supabase
        .from('production_phases')
        .select('id')
        .eq('production_order_id', orderId)
        .eq('phase_template_id', phaseId)
        .single();

      if (!newPhase) throw new Error('Fase não encontrada');

      // Atualizar a nova fase para em_andamento
      await supabase
        .from('production_phases')
        .update({ 
          status: 'em_andamento',
          started_at: new Date().toISOString()
        })
        .eq('id', newPhase.id);

      // Atualizar a OP com a nova fase atual
      const { error } = await supabase
        .from('production_orders')
        .update({ current_phase_id: newPhase.id })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('OP movida para nova fase');
    },
    onError: (error) => {
      console.error('Erro ao mover OP:', error);
      toast.error('Erro ao mover OP');
    }
  });

  // Agrupar OPs por fase atual
  const ordersByPhase = phases.reduce((acc, phase) => {
    acc[phase.id] = orders.filter(order => 
      order.current_phase?.phase_template?.id === phase.id
    );
    return acc;
  }, {} as Record<string, typeof orders>);

  // OPs sem fase (aguardando início)
  const ordersWithoutPhase = orders.filter(order => !order.current_phase);

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

  const uniquePhases = productionTypeId 
    ? phases 
    : phases.reduce((acc, phase) => {
        if (!acc.find(p => p.name === phase.name)) {
          acc.push(phase);
        }
        return acc;
      }, [] as typeof phases);

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {/* Coluna de Aguardando */}
          <div className="flex-shrink-0 w-[280px]">
            <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="font-medium text-sm">Aguardando</span>
              </div>
              <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
                {ordersWithoutPhase.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {ordersWithoutPhase.map((order) => (
                <ProductionCard 
                  key={order.id} 
                  order={order}
                  onClick={() => setSelectedOrderId(order.id)}
                />
              ))}
            </div>
          </div>

          {/* Colunas por fase */}
          {uniquePhases.map((phase) => {
            const phaseOrders = productionTypeId 
              ? ordersByPhase[phase.id] || []
              : orders.filter(order => order.current_phase?.phase_template?.name === phase.name);
            
            return (
              <div key={phase.id} className="flex-shrink-0 w-[280px]">
                <div 
                  className="flex items-center justify-between mb-3 p-2 rounded-lg"
                  style={{ backgroundColor: `${phase.color}20` || '#f3f4f6' }}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: phase.color || '#6b7280' }}
                    />
                    <span className="font-medium text-sm">{phase.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
                    {phaseOrders.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {phaseOrders.map((order) => (
                    <ProductionCard 
                      key={order.id} 
                      order={order}
                      onClick={() => setSelectedOrderId(order.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Sheet de detalhes */}
      <ProductionOrderDetailSheet
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      />
    </>
  );
}
