import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InconsistentDeal {
  id: string;
  title: string;
  followup_count: number;
  historyDescription: string;
  movedAt: string;
  issue: string;
}

export function FollowupAuditPanel() {
  const [inconsistentDeals, setInconsistentDeals] = useState<InconsistentDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, withIssues: 0 });

  const fetchInconsistencies = async () => {
    setLoading(true);
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Buscar stages
      const { data: followupStage } = await supabase
        .from("crm_stages")
        .select("id, pipeline_id")
        .eq("name", "Follow Up (I.A)")
        .single();

      if (!followupStage) {
        setLoading(false);
        return;
      }

      const { data: leadStage } = await supabase
        .from("crm_stages")
        .select("id")
        .eq("name", "Lead")
        .eq("pipeline_id", followupStage.pipeline_id)
        .single();

      if (!leadStage) {
        setLoading(false);
        return;
      }

      // Buscar movimentações Follow Up -> Lead
      const { data: movements } = await supabase
        .from("crm_deal_history")
        .select(`
          id,
          deal_id,
          description,
          moved_at,
          crm_deals!inner(
            id,
            title,
            followup_count,
            last_followup_at
          )
        `)
        .eq("from_stage_id", followupStage.id)
        .eq("to_stage_id", leadStage.id)
        .eq("action_type", "stage_change")
        .gte("moved_at", weekAgo)
        .order("moved_at", { ascending: false });

      const issues: InconsistentDeal[] = [];

      (movements || []).forEach((move: any) => {
        const deal = move.crm_deals;
        const descriptionMentionsFollowup = move.description?.includes("respondeu ao follow-up");
        const hadRealFollowup = (deal.followup_count || 0) > 0;

        // Detectar inconsistência: descrição diz "respondeu ao follow-up" mas não houve follow-up
        if (descriptionMentionsFollowup && !hadRealFollowup) {
          issues.push({
            id: deal.id,
            title: deal.title || "Sem título",
            followup_count: deal.followup_count || 0,
            historyDescription: move.description || "",
            movedAt: move.moved_at,
            issue: "Marcado como 'respondeu ao follow-up' mas followup_count = 0"
          });
        }
      });

      setInconsistentDeals(issues);
      setStats({
        total: movements?.length || 0,
        withIssues: issues.length
      });
    } catch (error) {
      console.error("Erro ao buscar inconsistências:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInconsistencies();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Auditoria de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Auditoria de Dados (7 dias)
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchInconsistencies}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Movimentações: {stats.total}</span>
          {stats.withIssues > 0 ? (
            <Badge variant="destructive" className="text-xs">
              {stats.withIssues} inconsistência(s)
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Dados consistentes
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {inconsistentDeals.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">Nenhuma inconsistência detectada</p>
            <p className="text-xs">Todos os registros de follow-up estão corretos</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {inconsistentDeals.map((deal) => (
                <div 
                  key={deal.id} 
                  className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{deal.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(deal.movedAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => window.open(`/crm?deal=${deal.id}`, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {deal.issue}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Histórico: "{deal.historyDescription}"
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Follow-ups enviados: {deal.followup_count}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
