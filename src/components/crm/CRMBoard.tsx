import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DealCard } from "./DealCard";
import { DealDetailSheet } from "./DealDetailSheet";
import { DroppableColumn } from "./DroppableColumn";
import { useCRMStatePersistence } from "@/hooks/useCRMStatePersistence";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
// Debounce helper function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface CRMBoardProps {
  pipelineId: string;
  onRefresh: () => void;
  autoOpenDealId?: string | null;
  onDealOpened?: () => void;
  filters?: {
    owner: string;
    search: string;
    status: string;
    category?: string;
    showPlanned?: boolean;
    // Nota: dateFilter e customDateRange NÃO são passados ao Kanban
    // pois o Kanban deve sempre mostrar TODOS os cards, independente do período
    // Os filtros de data afetam apenas os KPIs
  };
}

export function CRMBoard({ pipelineId, onRefresh, autoOpenDealId, onDealOpened, filters }: CRMBoardProps) {
  const { toast } = useToast();
  const { saveOpenDeal, getOpenDeal, clearOpenDeal } = useCRMStatePersistence();
  const [stages, setStages] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState<any>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configurar sensores para drag-and-drop com @dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Previne cliques acidentais
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  // Memoizar filtros para evitar re-renders desnecessários
  const memoizedFilters = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    if (!pipelineId) return;
    
    // Verificar se há deal para restaurar ao carregar
    const savedState = getOpenDeal();
    if (savedState && !autoOpenDealId) {
      // Aguardar que deals sejam carregados para abrir o deal salvo
      setTimeout(() => {
        const dealToRestore = deals.find(d => d.id === savedState.dealId);
        if (dealToRestore) {
          setSelectedDeal(dealToRestore);
          setIsDetailOpen(true);
        }
      }, 1000);
    }
    
    fetchData();

    // Flag para evitar múltiplas atualizações simultâneas
    let isUpdating = false;
    
    // Debounced fetchData com 2000ms para evitar múltiplos refetches
    const debouncedFetchData = debounce(() => {
      if (isUpdating) return;
      isUpdating = true;
      setIsRefreshing(true);
      fetchData().finally(() => {
        isUpdating = false;
      });
    }, 2000);

    // Canal único consolidado para deals e tasks
    const unifiedChannel = supabase
      .channel(`crm-board-unified-${pipelineId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_deals',
          filter: `pipeline_id=eq.${pipelineId}`
        },
        debouncedFetchData
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_tasks'
        },
        debouncedFetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(unifiedChannel);
    };
  }, [pipelineId, memoizedFilters]);

  // Efeito para abrir automaticamente um deal quando autoOpenDealId está definido
  useEffect(() => {
    if (autoOpenDealId && deals.length > 0) {
      const dealToOpen = deals.find(d => d.id === autoOpenDealId);
      if (dealToOpen) {
        setSelectedDeal(dealToOpen);
        setIsDetailOpen(true);
        onDealOpened?.();
      }
    }
  }, [autoOpenDealId, deals]);

  const fetchData = async () => {
    // Durante refresh, não mostrar loading completo - apenas indicador sutil
    if (!isInitialLoading) {
      setIsRefreshing(true);
    }
    
    // Fetch stages
    let { data: stagesData, error: stagesError } = await supabase
      .from("crm_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("position", { ascending: true });

    if (stagesError) {
      toast({
        title: "Erro ao carregar etapas",
        description: stagesError.message,
        variant: "destructive",
      });
      return;
    }

    // Filtrar estágios para remover ganho/perdido (serão renderizados como colunas fixas)
    if (stagesData) {
      stagesData = stagesData.filter(s => {
        const name = s.name.toLowerCase();
        return !(name.includes('ganho') || name.includes('won') || name.startsWith('✅') ||
                 name.includes('perdido') || name.includes('lost') || name.startsWith('❌'));
      });
    }

    // Fetch deals with related data (including won and lost)
    let dealsQuery = supabase
      .from("crm_deals")
      .select(`
        *,
        lead:leads(
          id,
          client_id,
          temperature,
          source:lead_sources(id, name),
          client:clients(id, name, phone, email, city, state, notes)
        ),
        architect:architects(name),
        owner:profiles(id, full_name, email),
        stage:crm_stages(name)
      `)
      .eq("pipeline_id", pipelineId);

    // Aplicar filtros
    if (filters?.owner && filters.owner !== "all") {
      dealsQuery = dealsQuery.eq("owner_id", filters.owner);
    }

    // NOTA: Filtro de status NÃO é aplicado na query principal do Kanban
    // Isso garante que as colunas fixas "Ganho" e "Perdido" sempre apareçam
    // O filtro de status afeta apenas a visibilidade das colunas intermediárias

    // Filtro de categoria - aplicado mesmo se showPlanned estiver ativo
    if (filters?.category && filters.category !== "all") {
      dealsQuery = dealsQuery.eq("categoria", filters.category);
    }
    
    if (filters?.showPlanned) {
      dealsQuery = dealsQuery.not("scheduled_call", "is", null);
    }

    // NOTA: Filtro de período NÃO é aplicado ao Kanban
    // O Kanban sempre exibe TODOS os cards, independente do filtro de data selecionado
    // Os filtros de data afetam apenas os KPIs para cálculos de métricas

    const { data: dealsData, error: dealsError } = await dealsQuery.order("stage_position", { ascending: true });

    // Debug log para identificar problemas de visibilidade
    console.log('🔍 CRM Debug:', {
      pipelineId,
      filters,
      totalDeals: dealsData?.length || 0,
      categorias: dealsData?.reduce((acc: Record<string, number>, d: any) => {
        acc[d.categoria || 'null'] = (acc[d.categoria || 'null'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });

    if (dealsError) {
      toast({
        title: "Erro ao carregar negócios",
        description: dealsError.message,
        variant: "destructive",
      });
      return;
    }

    // Aplicar filtro de busca no cliente
    let filteredDeals = dealsData || [];
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredDeals = filteredDeals.filter(deal => {
        const title = deal.title?.toLowerCase() || "";
        const clientName = deal.lead?.client?.name?.toLowerCase() || "";
        const architectName = deal.architect?.name?.toLowerCase() || "";
        const clientPhone = deal.lead?.client?.phone?.toLowerCase() || "";
        const clientEmail = deal.lead?.client?.email?.toLowerCase() || "";
        
        return title.includes(searchLower) || 
               clientName.includes(searchLower) || 
               architectName.includes(searchLower) ||
               clientPhone.includes(searchLower) ||
               clientEmail.includes(searchLower);
      });
    }

    setStages(stagesData || []);
    setDeals(filteredDeals);
    setIsInitialLoading(false);
    setIsRefreshing(false);
  };

  // Memoizar getDealsByStage para evitar recálculos
  const dealsByStage = useMemo(() => {
    const result: Record<string, any[]> = {};
    stages.forEach(stage => {
      result[stage.id] = deals.filter((deal) => deal.stage_id === stage.id && deal.status === "aberto");
    });
    return result;
  }, [stages, deals]);

  const handleDealClick = useCallback((deal: any) => {
    setSelectedDeal(deal);
    setIsDetailOpen(true);
    // Salvar estado do deal aberto
    saveOpenDeal(deal.id, 'info');
  }, [saveOpenDeal]);

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm("Tem certeza que deseja excluir este negócio?")) {
      return;
    }

    const { error } = await supabase
      .from("crm_deals")
      .delete()
      .eq("id", dealId);

    if (error) {
      toast({
        title: "Erro ao excluir negócio",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Negócio excluído",
      description: "O negócio foi excluído com sucesso",
    });

    fetchData();
    onRefresh();
  };

  const getDealsByStage = (stageId: string) => {
    return dealsByStage[stageId] || [];
  };

  const getWonDeals = () => {
    return deals.filter((deal) => deal.status === "won");
  };

  const getLostDeals = () => {
    return deals.filter((deal) => deal.status === "lost");
  };

  const calculateStageValue = (stageDeals: any[]) => {
    const total = stageDeals.reduce((acc, deal) => acc + (deal.value || 0), 0);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(total);
  };

  const getTimeInStage = (deal: any) => {
    const hours = Math.floor(
      (new Date().getTime() - new Date(deal.stage_entered_at).getTime()) / (1000 * 60 * 60)
    );
    return hours;
  };

  // Handler para @dnd-kit drag start
  const handleDndDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id);
    setDraggedDeal(deal || null);
    setActiveId(event.active.id as string);
  };

  // Handler para @dnd-kit drag end
  const handleDndDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || !draggedDeal) {
      setDraggedDeal(null);
      return;
    }

    const overId = over.id as string;
    
    // Verificar se é drop em coluna de Won
    if (overId === 'column-won') {
      await handleMoveToWon();
      return;
    }
    
    // Verificar se é drop em coluna de Lost
    if (overId === 'column-lost') {
      await handleMoveToLost();
      return;
    }
    
    // Verificar se é uma coluna de estágio
    if (overId.startsWith('column-')) {
      const stageId = overId.replace('column-', '');
      await handleMoveToStage(stageId);
      return;
    }
    
    setDraggedDeal(null);
  };

  const handleMoveToStage = async (stageId: string) => {
    if (!draggedDeal || draggedDeal.stage_id === stageId) {
      setDraggedDeal(null);
      return;
    }

    // Verificar se está saindo de etapa Lead
    const sourceStage = stages.find(s => s.id === draggedDeal.stage_id);
    const isFromLead = sourceStage?.name.toLowerCase().includes('lead');

    // Se está saindo de Lead e não tem categoria, bloquear
    if (isFromLead && !draggedDeal.categoria) {
      toast({
        title: "Categorização necessária",
        description: "Antes de mover este lead, defina a categoria (Móveis Soltos ou Planejados) editando o negócio.",
        variant: "destructive",
      });
      setDraggedDeal(null);
      return;
    }

    // Encontrar a etapa de destino
    const targetStage = stages.find(s => s.id === stageId);
    
    // Verificar se a etapa de destino exige valor (APENAS Negociação)
    if (targetStage) {
      const targetName = targetStage.name.toLowerCase();
      const requiresValue = targetName.includes('negociação');
      
      if (requiresValue && (!draggedDeal.value || draggedDeal.value <= 0)) {
        toast({
          title: "Valor obrigatório",
          description: "Para mover para a etapa 'Negociação', o negócio precisa ter um valor (R$) definido.",
          variant: "destructive",
        });
        setDraggedDeal(null);
        return;
      }
    }

    const updateData: any = {
      stage_id: stageId,
      stage_entered_at: new Date().toISOString(),
    };

    if (draggedDeal.status !== "aberto") {
      updateData.status = "aberto";
      updateData.lost_reason = null;
      updateData.lost_note = null;
    }

    const { data, error } = await supabase
      .from("crm_deals")
      .update(updateData)
      .eq("id", draggedDeal.id)
      .select()
      .maybeSingle();

    if (error) {
      toast({
        title: "Erro ao mover negócio",
        description: error.message,
        variant: "destructive",
      });
    } else if (!data) {
      // RLS bloqueou - categoria não corresponde à especialização
      toast({
        title: "Sem permissão",
        description: `Este negócio é da categoria "${draggedDeal.categoria || 'não definida'}" e não corresponde à sua especialização.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: draggedDeal.status !== "aberto" 
          ? "Negócio reativado e movido com sucesso!" 
          : "Negócio movido com sucesso!",
      });
      fetchData();
      onRefresh();
    }
    
    setDraggedDeal(null);
  };

  const handleMoveToWon = async () => {
    if (!draggedDeal || draggedDeal.status === "won") {
      setDraggedDeal(null);
      return;
    }

    // Verificar se está saindo de etapa Lead
    const sourceStage = stages.find(s => s.id === draggedDeal.stage_id);
    const isFromLead = sourceStage?.name.toLowerCase().includes('lead');

    // Se está saindo de Lead e não tem categoria, bloquear
    if (isFromLead && !draggedDeal.categoria) {
      toast({
        title: "Categorização necessária",
        description: "Defina a categoria antes de marcar como ganho.",
        variant: "destructive",
      });
      setDraggedDeal(null);
      return;
    }

    const { data, error } = await supabase
      .from("crm_deals")
      .update({
        status: "won",
        stage_entered_at: new Date().toISOString(),
      })
      .eq("id", draggedDeal.id)
      .select()
      .maybeSingle();

    if (error) {
      toast({
        title: "Erro ao marcar como ganho",
        description: error.message,
        variant: "destructive",
      });
    } else if (!data) {
      toast({
        title: "Sem permissão",
        description: `Este negócio é da categoria "${draggedDeal.categoria || 'não definida'}" e não corresponde à sua especialização.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "🎉 Negócio ganho!",
        description: "O negócio foi marcado como ganho com sucesso!",
      });
      fetchData();
      onRefresh();
    }
    
    setDraggedDeal(null);
  };

  const handleMoveToLost = async () => {
    if (!draggedDeal || draggedDeal.status === "lost") {
      setDraggedDeal(null);
      return;
    }

    // Verificar se está saindo de etapa Lead
    const sourceStage = stages.find(s => s.id === draggedDeal.stage_id);
    const isFromLead = sourceStage?.name.toLowerCase().includes('lead');

    // Se está saindo de Lead e não tem categoria, bloquear
    if (isFromLead && !draggedDeal.categoria) {
      toast({
        title: "Categorização necessária",
        description: "Defina a categoria antes de marcar como perdido.",
        variant: "destructive",
      });
      setDraggedDeal(null);
      return;
    }

    const { data, error } = await supabase
      .from("crm_deals")
      .update({
        status: "lost",
        lost_reason: "other",
        stage_entered_at: new Date().toISOString(),
      })
      .eq("id", draggedDeal.id)
      .select()
      .maybeSingle();

    if (error) {
      toast({
        title: "Erro ao marcar como perdido",
        description: error.message,
        variant: "destructive",
      });
    } else if (!data) {
      toast({
        title: "Sem permissão",
        description: `Este negócio é da categoria "${draggedDeal.categoria || 'não definida'}" e não corresponde à sua especialização.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Negócio perdido",
        description: "O negócio foi marcado como perdido.",
      });
      fetchData();
      onRefresh();
    }
    
    setDraggedDeal(null);
  };

  // Manter handlers legados para compatibilidade
  const handleDragStart = (deal: any) => (e: React.DragEvent) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (stageId: string) => async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedDeal || draggedDeal.stage_id === stageId) {
      setDraggedDeal(null);
      return;
    }

    // Encontrar a etapa de origem e destino
    const targetStage = stages.find(s => s.id === stageId);
    
    // Verificar se a etapa de destino exige valor (APENAS Negociação)
    if (targetStage) {
      const targetName = targetStage.name.toLowerCase();
      const requiresValue = targetName.includes('negociação');
      
      // Só exige valor se for Negociação
      if (requiresValue && (!draggedDeal.value || draggedDeal.value <= 0)) {
        toast({
          title: "Valor obrigatório",
          description: "Para mover para a etapa 'Negociação', o negócio precisa ter um valor (R$) definido. Edite o negócio e adicione o valor antes de avançar.",
          variant: "destructive",
        });
        setDraggedDeal(null);
        return;
      }
    }

    const updateData: any = {
      stage_id: stageId,
      stage_entered_at: new Date().toISOString(),
    };

    // Se estava em Won ou Lost e está voltando para o funil, resetar para "aberto"
    if (draggedDeal.status !== "aberto") {
      updateData.status = "aberto";
      updateData.lost_reason = null;
      updateData.lost_note = null;
    }

    // Update deal stage
    const { error } = await supabase
      .from("crm_deals")
      .update(updateData)
      .eq("id", draggedDeal.id);

    if (error) {
      toast({
        title: "Erro ao mover negócio",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: draggedDeal.status !== "aberto" 
        ? "Negócio reativado e movido com sucesso!" 
        : "Negócio movido com sucesso!",
    });

    setDraggedDeal(null);
    fetchData();
    onRefresh();
  };

  // Handler para drop na coluna de Ganho
  const handleDropToWon = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedDeal || draggedDeal.status === "won") {
      setDraggedDeal(null);
      return;
    }

    const { error } = await supabase
      .from("crm_deals")
      .update({
        status: "won",
        stage_entered_at: new Date().toISOString(),
      })
      .eq("id", draggedDeal.id);

    if (error) {
      toast({
        title: "Erro ao marcar como ganho",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "🎉 Negócio ganho!",
      description: "O negócio foi marcado como ganho com sucesso!",
    });

    setDraggedDeal(null);
    fetchData();
    onRefresh();
  };

  // Handler para drop na coluna de Perdido
  const handleDropToLost = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedDeal || draggedDeal.status === "lost") {
      setDraggedDeal(null);
      return;
    }

    const { error } = await supabase
      .from("crm_deals")
      .update({
        status: "lost",
        lost_reason: "other",
        stage_entered_at: new Date().toISOString(),
      })
      .eq("id", draggedDeal.id);

    if (error) {
      toast({
        title: "Erro ao marcar como perdido",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Negócio perdido",
      description: "O negócio foi marcado como perdido. Você pode editar para adicionar mais detalhes.",
    });

    setDraggedDeal(null);
    fetchData();
    onRefresh();
  };

  // Obter todos os IDs dos deals para o SortableContext (DEVE vir antes de qualquer return condicional)
  const allDealIds = useMemo(() => deals.map(d => d.id), [deals]);

  if (isInitialLoading) {
    return <div className="text-center py-12 animate-fade-in">Carregando...</div>;
  }

  return (
    <>
      {/* Render board: container com colunas do kanban - scroll horizontal contido */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDndDragStart}
        onDragEnd={handleDndDragEnd}
      >
        <div className="overflow-x-auto pb-3">
          <div className="flex gap-2 min-w-min">
            <SortableContext items={allDealIds} strategy={rectSortingStrategy}>
              {stages.map((stage) => {
                const stageDeals = getDealsByStage(stage.id);
                return (
                  <DroppableColumn
                    key={stage.id}
                    id={stage.id}
                    title={stage.name}
                    count={stageDeals.length}
                    value={calculateStageValue(stageDeals)}
                  >
                    {stageDeals.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        Nenhum negócio nesta etapa
                      </p>
                    ) : (
                      stageDeals.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          timeInStage={getTimeInStage(deal)}
                          onClick={() => handleDealClick(deal)}
                          onDelete={handleDeleteDeal}
                        />
                      ))
                    )}
                  </DroppableColumn>
                );
              })}

              {/* Fixed Won column */}
              <DroppableColumn
                id="won"
                title="✅ Ganho"
                count={getWonDeals().length}
                value={calculateStageValue(getWonDeals())}
                variant="won"
              >
                {getWonDeals().length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-6 border-2 border-dashed border-success/20 rounded-lg">
                    <p>Nenhum negócio ganho</p>
                  </div>
                ) : (
                  getWonDeals().map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      timeInStage={getTimeInStage(deal)}
                      onClick={() => handleDealClick(deal)}
                      onDelete={handleDeleteDeal}
                    />
                  ))
                )}
              </DroppableColumn>

              {/* Fixed Lost column */}
              <DroppableColumn
                id="lost"
                title="❌ Perdido"
                count={getLostDeals().length}
                value={calculateStageValue(getLostDeals())}
                variant="lost"
              >
                {getLostDeals().length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-6 border-2 border-dashed border-destructive/20 rounded-lg">
                    <p>Nenhum negócio perdido</p>
                  </div>
                ) : (
                  getLostDeals().map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      timeInStage={getTimeInStage(deal)}
                      onClick={() => handleDealClick(deal)}
                      onDelete={handleDeleteDeal}
                    />
                  ))
                )}
              </DroppableColumn>
            </SortableContext>
          </div>
        </div>

        {/* DragOverlay para mostrar card sendo arrastado */}
        <DragOverlay>
          {activeId && draggedDeal ? (
            <DealCard
              deal={draggedDeal}
              timeInStage={getTimeInStage(draggedDeal)}
              onClick={() => {}}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <DealDetailSheet
        deal={selectedDeal}
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            // Limpar estado salvo quando fechar o sheet
            clearOpenDeal();
          }
        }}
        onSuccess={() => {
          fetchData();
          onRefresh();
        }}
      />
    </>
  );
}
