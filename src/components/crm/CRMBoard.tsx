import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DealCard } from "./DealCard";
import { DealDetailSheet } from "./DealDetailSheet";

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
  const [stages, setStages] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState<any>(null);

  useEffect(() => {
    if (!pipelineId) return;
    fetchData();

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
        (payload) => {
          console.log('Deal change detected:', payload);
          fetchData(); // Refresh all deals when any deal changes
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
        (payload) => {
          console.log('Task change detected:', payload);
          fetchData(); // Refresh all deals when tasks change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dealsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [pipelineId, filters]);

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
    setLoading(true);
    
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

    if (filters?.showPlanned) {
      dealsQuery = dealsQuery.not("scheduled_call", "is", null);
    } else if (filters?.category && filters.category !== "all") {
      dealsQuery = dealsQuery.eq("categoria", filters.category);
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

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
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
    setLoading(false);
  };

  const handleDealClick = (deal: any) => {
    setSelectedDeal(deal);
    setIsDetailOpen(true);
  };

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
    return deals.filter((deal) => deal.stage_id === stageId && deal.status === "aberto");
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
    
    // Verificar se está tentando mover para além de Qualificação sem valor
    // Permite mover de Lead para Qualificação sem valor
    // Apenas exige valor para etapas APÓS Qualificação
    if (targetStage) {
      const targetName = targetStage.name.toLowerCase();
      const isLeadStage = targetName.includes('lead');
      const isQualificacaoStage = targetName.includes('qualif');
      
      // Só exige valor se NÃO for Lead nem Qualificação
      if (!isLeadStage && !isQualificacaoStage && (!draggedDeal.value || draggedDeal.value <= 0)) {
        toast({
          title: "Valor obrigatório",
          description: "Para mover para esta etapa, o negócio precisa ter um valor (R$) definido. Edite o negócio e adicione o valor antes de avançar.",
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

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <>
      <div className="w-full overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
          {/* Regular pipeline stages */}
          {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          return (
            <Card 
              key={stage.id} 
              className="flex-shrink-0 hover:shadow-md transition-all duration-200 border-border/50"
              style={{ minWidth: '320px', width: '320px' }}
              onDragOver={handleDragOver}
              onDrop={handleDrop(stage.id)}
            >
              <CardHeader className="pb-3 px-5 pt-4">
                <CardTitle className="flex flex-col gap-2 text-base">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-semibold">{stage.name}</span>
                    <Badge variant="secondary" className="flex-shrink-0 font-medium">{stageDeals.length}</Badge>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {calculateStageValue(stageDeals)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent 
                className="space-y-3 px-5 pb-4"
                style={{ maxHeight: '600px', overflowY: 'auto' }}
                onDragOver={handleDragOver}
                onDrop={handleDrop(stage.id)}
              >
                {stageDeals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
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
          className="flex-shrink-0 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 hover:shadow-md transition-all duration-200"
          style={{ minWidth: '320px', width: '320px' }}
        >
          <CardHeader className="pb-3 px-5 pt-4">
            <CardTitle className="flex flex-col gap-2 text-base text-green-700 dark:text-green-300">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-semibold">✅ Ganho</span>
                <Badge variant="default" className="bg-green-600 hover:bg-green-700 flex-shrink-0 font-medium">{getWonDeals().length}</Badge>
              </div>
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                {calculateStageValue(getWonDeals())}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {getWonDeals().length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum negócio ganho ainda
              </p>
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
          className="flex-shrink-0 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 hover:shadow-md transition-all duration-200"
          style={{ minWidth: '320px', width: '320px' }}
        >
          <CardHeader className="pb-3 px-5 pt-4">
            <CardTitle className="flex flex-col gap-2 text-base text-red-700 dark:text-red-300">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-semibold">❌ Perdido</span>
                <Badge variant="destructive" className="hover:bg-destructive/90 flex-shrink-0 font-medium">{getLostDeals().length}</Badge>
              </div>
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {calculateStageValue(getLostDeals())}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {getLostDeals().length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum negócio perdido
              </p>
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
        onOpenChange={setIsDetailOpen}
        onSuccess={() => {
          fetchData();
          onRefresh();
        }}
      />
    </>
  );
}
