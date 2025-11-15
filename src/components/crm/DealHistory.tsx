import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, ArrowRight, Edit } from "lucide-react";

interface DealHistoryProps {
  dealId: string;
}

interface HistoryEntry {
  id: string;
  deal_id: string;
  action_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  moved_at: string;
  moved_by: string | null;
  from_stage: { name: string } | null;
  to_stage: { name: string } | null;
  moved_by_profile: { full_name: string | null; email: string } | null;
}

export function DealHistory({ dealId }: DealHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
    
    // Realtime subscription
    const channel = supabase
      .channel(`deal-history-${dealId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_deal_history',
          filter: `deal_id=eq.${dealId}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId]);

  const fetchHistory = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("crm_deal_history")
      .select(`
        *,
        from_stage:crm_stages!crm_deal_history_from_stage_id_fkey(name),
        to_stage:crm_stages!crm_deal_history_to_stage_id_fkey(name),
        moved_by_profile:profiles(full_name, email)
      `)
      .eq("deal_id", dealId)
      .order("moved_at", { ascending: false });

    if (!error && data) {
      setHistory(data as any);
    }
    
    setLoading(false);
  };

  const getActionIcon = (actionType: string) => {
    if (actionType === 'stage_change') {
      return <ArrowRight className="h-4 w-4" />;
    }
    return <Edit className="h-4 w-4" />;
  };

  const getActionColor = (actionType: string) => {
    if (actionType === 'stage_change') {
      return 'bg-blue-500';
    }
    return 'bg-purple-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Carregando histórico...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Nenhuma alteração registrada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Alterações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className={`h-10 w-10 rounded-full ${getActionColor(
                  entry.action_type
                )} flex items-center justify-center flex-shrink-0`}
              >
                <div className="text-white">
                  {getActionIcon(entry.action_type)}
                </div>
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {entry.moved_by_profile?.full_name ||
                        entry.moved_by_profile?.email ||
                        "Sistema"}
                    </span>
                    <Badge variant="outline">
                      {entry.action_type === 'stage_change'
                        ? 'Mudança de Etapa'
                        : 'Edição de Campo'}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(entry.moved_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>

                {entry.action_type === 'stage_change' ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {entry.from_stage?.name || 'Início'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {entry.to_stage?.name || 'Nova etapa'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {entry.description && (
                      <p className="text-sm text-muted-foreground">
                        {entry.description}
                      </p>
                    )}
                    {entry.field_name && (
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">De:</span>
                          <code className="px-2 py-1 bg-muted rounded text-xs">
                            {entry.old_value || '(vazio)'}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Para:</span>
                          <code className="px-2 py-1 bg-primary/10 rounded text-xs font-semibold">
                            {entry.new_value || '(vazio)'}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
