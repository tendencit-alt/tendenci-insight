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
    const { data: stagesData, error: stagesError } = await supabase
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

    // Fetch deals with related data
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
      .eq("status", "aberto")
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

  const getDealsByStage = (stageId: string) => {
    return deals.filter((deal) => deal.stage_id === stageId);
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

    // Update deal stage
    const { error } = await supabase
      .from("crm_deals")
      .update({
        stage_id: stageId,
        stage_entered_at: new Date().toISOString(),
      })
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
      description: "Negócio movido com sucesso!",
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
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          return (
            <Card 
              key={stage.id} 
              className="min-w-[320px] flex-shrink-0"
              onDragOver={handleDragOver}
              onDrop={handleDrop(stage.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{stage.name}</span>
                  <Badge variant="secondary">{stageDeals.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent 
                className="space-y-3 max-h-[600px] overflow-y-auto"
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
                    />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
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
