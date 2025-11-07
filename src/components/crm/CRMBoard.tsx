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
        lead:leads(id, client:clients(name, phone)),
        architect:architects(name),
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

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          return (
            <Card key={stage.id} className="min-w-[320px] flex-shrink-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{stage.name}</span>
                  <Badge variant="secondary">{stageDeals.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {stageDeals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum negócio nesta etapa
                  </p>
                ) : (
                  stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      timeInStage={getTimeInStage(deal)}
                      onClick={() => handleDealClick(deal)}
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
