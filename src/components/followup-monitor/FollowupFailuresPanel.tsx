import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, XCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { describeError } from '@/lib/errorMessage';

interface FailedFollowup {
  id: string;
  dealId: string;
  dealTitle: string;
  errorMessage: string;
  followupNumber: number;
  createdAt: string;
  followupEnabled: boolean;
}

export function FollowupFailuresPanel() {
  const [failures, setFailures] = useState<FailedFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchFailures = async () => {
    try {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("followup_logs")
        .select(`
          id,
          deal_id,
          error_message,
          followup_number,
          created_at,
          crm_deals!inner(title, followup_enabled)
        `)
        .eq("status", "failed")
        .gte("created_at", twoDaysAgo)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const mappedFailures: FailedFollowup[] = (data || []).map((item: any) => ({
        id: item.id,
        dealId: item.deal_id,
        dealTitle: item.crm_deals?.title || "Deal desconhecido",
        errorMessage: item.error_message || "Erro desconhecido",
        followupNumber: item.followup_number,
        createdAt: item.created_at,
        followupEnabled: item.crm_deals?.followup_enabled || false,
      }));

      setFailures(mappedFailures);
    } catch (error) {
      console.error("Erro ao buscar falhas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailures();
  }, []);

  const handleReenableFollowup = async (failure: FailedFollowup) => {
    setProcessing(failure.id);
    try {
      const { error } = await supabase
        .from("crm_deals")
        .update({ followup_enabled: true })
        .eq("id", failure.dealId);

      if (error) throw error;

      toast({
        title: "Follow-up reabilitado",
        description: `Follow-up para "${failure.dealTitle}" foi reabilitado`,
      });

      // Atualizar lista
      setFailures((prev) =>
        prev.map((f) =>
          f.id === failure.id ? { ...f, followupEnabled: true } : f
        )
      );
    } catch (error) {
      console.error("Erro ao reabilitar follow-up:", error);
      toast({
        title: "Erro",
        description: describeError('Não foi possível reabilitar o follow-up', error),
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleDisableFollowup = async (failure: FailedFollowup) => {
    setProcessing(failure.id);
    try {
      const { error } = await supabase
        .from("crm_deals")
        .update({ followup_enabled: false })
        .eq("id", failure.dealId);

      if (error) throw error;

      toast({
        title: "Follow-up desabilitado",
        description: `Follow-up para "${failure.dealTitle}" foi desabilitado`,
      });

      // Atualizar lista
      setFailures((prev) =>
        prev.map((f) =>
          f.id === failure.id ? { ...f, followupEnabled: false } : f
        )
      );
    } catch (error) {
      console.error("Erro ao desabilitar follow-up:", error);
      toast({
        title: "Erro",
        description: describeError('Não foi possível desabilitar o follow-up', error),
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
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
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Falhas Recentes ({failures.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchFailures}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {failures.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Nenhuma falha nas últimas 48 horas
          </div>
        ) : (
          <div className="space-y-3">
            {failures.map((failure) => (
              <div
                key={failure.id}
                className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{failure.dealTitle}</span>
                    <Badge variant="outline" className="text-xs">
                      #{failure.followupNumber}
                    </Badge>
                    {!failure.followupEnabled && (
                      <Badge variant="secondary" className="text-xs">
                        Desabilitado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {failure.errorMessage}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(failure.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {failure.followupEnabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisableFollowup(failure)}
                      disabled={processing === failure.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Desabilitar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReenableFollowup(failure)}
                      disabled={processing === failure.id}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reabilitar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(`/crm?deal=${failure.dealId}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
