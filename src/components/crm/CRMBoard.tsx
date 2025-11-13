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
}

export function CRMBoard({ pipelineId, onRefresh }: CRMBoardProps) {
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
  }, [pipelineId]);

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
    const { data: dealsData, error: dealsError } = await supabase
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
      .eq("pipeline_id", pipelineId)
      .order("stage_position", { ascending: true });

    if (dealsError) {
      toast({
        title: "Erro ao carregar negócios",
        description: dealsError.message,
        variant: "destructive",
      });
      return;
    }

    setStages(stagesData || []);
    setDeals(dealsData || []);
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
      <div className="w-full overflow-x-auto cursor-grab active:cursor-grabbing">
        <div className="flex gap-4 pb-4 min-w-max">
          {/* Regular pipeline stages */}
          {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          return (
            <Card 
              key={stage.id} 
              className="min-w-[320px] max-w-[320px] flex-shrink-0 hover:shadow-lg transition-shadow"
              onDragOver={handleDragOver}
              onDrop={handleDrop(stage.id)}
            >
              <CardHeader className="pb-3 px-4">
                <CardTitle className="flex items-center justify-between text-base gap-2">
                  <span className="truncate">{stage.name}</span>
                  <Badge variant="secondary" className="flex-shrink-0">{stageDeals.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent 
                className="space-y-3 max-h-[600px] overflow-y-auto px-4"
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
        <Card className="min-w-[320px] max-w-[320px] flex-shrink-0 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3 px-4">
            <CardTitle className="flex items-center justify-between text-base text-green-700 dark:text-green-300 gap-2">
              <span className="truncate">✅ Ganho</span>
              <Badge variant="default" className="bg-green-600 flex-shrink-0">{getWonDeals().length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto px-4">
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
        <Card className="min-w-[320px] max-w-[320px] flex-shrink-0 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <CardHeader className="pb-3 px-4">
            <CardTitle className="flex items-center justify-between text-base text-red-700 dark:text-red-300 gap-2">
              <span className="truncate">❌ Perdido</span>
              <Badge variant="destructive" className="flex-shrink-0">{getLostDeals().length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto px-4">
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
