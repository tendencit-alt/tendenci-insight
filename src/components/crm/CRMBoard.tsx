import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DealCard } from "./DealCard";
import { DealDetailSheet } from "./DealDetailSheet";
import { useCRMStatePersistence } from "@/hooks/useCRMStatePersistence";

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
    dateFilter?: string;
    customDateRange?: { from: Date | undefined; to: Date | undefined };
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

    // Debounced fetchData com 1500ms para evitar múltiplos refetches
    const debouncedFetchData = debounce(() => {
      setIsRefreshing(true);
      fetchData();
    }, 1500);

    // Setup realtime subscription for deals updates
    const dealsChannel = supabase
      .channel('crm-deals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_deals',
          filter: `pipeline_id=eq.${pipelineId}`
        },
        () => {
          debouncedFetchData();
        }
      )
      .subscribe();

    // Setup realtime subscription for tasks updates
    const tasksChannel = supabase
      .channel('crm-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_tasks'
        },
        () => {
          debouncedFetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dealsChannel);
      supabase.removeChannel(tasksChannel);
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
          temperature,
          source:lead_sources(id, name),
          client:clients(name, phone, email, city, state)
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

    if (filters?.status && filters.status !== "all") {
      dealsQuery = dealsQuery.eq("status", filters.status);
    }

    // Filtro de categoria - aplicado mesmo se showPlanned estiver ativo
    if (filters?.category && filters.category !== "all") {
      dealsQuery = dealsQuery.eq("categoria", filters.category);
    }
    
    if (filters?.showPlanned) {
      dealsQuery = dealsQuery.not("scheduled_call", "is", null);
    }

    // Filtro de período
    if (filters?.dateFilter && filters.dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filters.dateFilter) {
        case "today":
          dealsQuery = dealsQuery.gte("created_at", today.toISOString());
          break;
        case "yesterday":
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dealsQuery = dealsQuery.gte("created_at", yesterday.toISOString()).lt("created_at", today.toISOString());
          break;
        case "last7days":
          const last7days = new Date(today);
          last7days.setDate(last7days.getDate() - 7);
          dealsQuery = dealsQuery.gte("created_at", last7days.toISOString());
          break;
        case "thisMonth":
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          dealsQuery = dealsQuery.gte("created_at", firstDayOfMonth.toISOString());
          break;
        case "last30days":
          const last30days = new Date(today);
          last30days.setDate(last30days.getDate() - 30);
          dealsQuery = dealsQuery.gte("created_at", last30days.toISOString());
          break;
        case "custom":
          if (filters.customDateRange?.from) {
            const fromDate = new Date(filters.customDateRange.from);
            fromDate.setHours(0, 0, 0, 0);
            dealsQuery = dealsQuery.gte("created_at", fromDate.toISOString());
          }
          if (filters.customDateRange?.to) {
            const toDate = new Date(filters.customDateRange.to);
            toDate.setHours(23, 59, 59, 999);
            dealsQuery = dealsQuery.lte("created_at", toDate.toISOString());
          }
          break;
      }
    }

    const { data: dealsData, error: dealsError } = await dealsQuery.order("stage_position", { ascending: true });

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(total);
  };

  const getTimeInStage = (deal: any) => {
    const hours = Math.floor(
      (new Date().getTime() - new Date(deal.stage_entered_at).getTime()) / (1000 * 60 * 60)
    );
    return hours;
  };

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
    const sourceStage = stages.find(s => s.id === draggedDeal.stage_id);
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

  if (isInitialLoading) {
    return <div className="text-center py-12 animate-fade-in">Carregando...</div>;
  }

  return (
    <>
      {/* Render board: container com colunas do kanban - scroll horizontal contido */}
      <div className="overflow-x-auto pb-3">
        <div className="flex gap-2 min-w-min">
          {stages.map((stage) => {
            const stageDeals = getDealsByStage(stage.id);
            return (
              <Card 
                key={stage.id} 
                className="flex-shrink-0 hover:shadow-md transition-all duration-300 border-border/50 animate-fade-in w-[220px]"
                onDragOver={handleDragOver}
                onDrop={handleDrop(stage.id)}
              >
                <CardHeader className="pb-1.5 px-2 pt-2">
                  <CardTitle className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="truncate font-semibold text-xs">{stage.name}</span>
                      <Badge variant="secondary" className="flex-shrink-0 font-medium text-[10px] h-4">{stageDeals.length}</Badge>
                    </div>
                    <span className="text-[10px] font-semibold text-primary">
                      {calculateStageValue(stageDeals)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent 
                  className="space-y-1.5 px-2 pb-2 overflow-y-auto"
                  style={{ maxHeight: '320px' }}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(stage.id)}
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
                        onDragStart={handleDragStart(deal)}
                        onDelete={handleDeleteDeal}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Fixed Won column */}
          <Card 
            className="flex-shrink-0 bg-gradient-to-br from-success/5 to-success/10 border-success/30 hover:shadow-lg hover:border-success/50 transition-all duration-300 animate-fade-in w-[220px]"
          >
            <CardHeader className="pb-1.5 px-2 pt-2 space-y-0">
              <CardTitle className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="truncate font-semibold text-xs text-success">✅ Ganho</span>
                  <Badge className="bg-success hover:bg-success/90 flex-shrink-0 font-bold text-[10px] h-4 px-1.5">
                    {getWonDeals().length}
                  </Badge>
                </div>
                {getWonDeals().length > 0 && (
                  <span className="text-[10px] font-bold text-success">
                    💰 {calculateStageValue(getWonDeals())}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-2 pb-2 overflow-y-auto" style={{ maxHeight: '320px' }}>
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
                    onDragStart={handleDragStart(deal)}
                    onDelete={handleDeleteDeal}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Fixed Lost column */}
          <Card 
            className="flex-shrink-0 bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/30 hover:shadow-lg hover:border-destructive/50 transition-all duration-300 animate-fade-in w-[220px]"
          >
            <CardHeader className="pb-1.5 px-2 pt-2 space-y-0">
              <CardTitle className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="truncate font-semibold text-xs text-destructive">❌ Perdido</span>
                  <Badge className="bg-destructive hover:bg-destructive/90 flex-shrink-0 font-bold text-[10px] h-4 px-1.5">
                    {getLostDeals().length}
                  </Badge>
                </div>
                {getLostDeals().length > 0 && (
                  <span className="text-[10px] font-bold text-destructive">
                    💸 {calculateStageValue(getLostDeals())}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-2 pb-2 overflow-y-auto" style={{ maxHeight: '320px' }}>
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
                    onDragStart={handleDragStart(deal)}
                    onDelete={handleDeleteDeal}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
