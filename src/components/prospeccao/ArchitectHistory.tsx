import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Edit, UserPlus, ArrowRight, Trash } from "lucide-react";

interface ArchitectHistoryProps {
  architectId: string;
}

interface HistoryEntry {
  id: string;
  architect_id: string;
  event_type: string;
  description: string;
  created_at: string;
  created_by: string | null;
  created_by_profile: { full_name: string | null; email: string } | null;
}

export function ArchitectHistory({ architectId }: ArchitectHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
    
    // Realtime subscription
    const channel = supabase
      .channel(`architect-history-${architectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'architect_history',
          filter: `architect_id=eq.${architectId}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [architectId]);

  const fetchHistory = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("architect_history")
      .select(`
        *,
        created_by_profile:profiles!architect_history_created_by_fkey(full_name, email)
      `)
      .eq("architect_id", architectId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setHistory(data as any);
    }
    
    setLoading(false);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return <UserPlus className="h-4 w-4" />;
      case 'status_change':
        return <ArrowRight className="h-4 w-4" />;
      case 'updated':
        return <Edit className="h-4 w-4" />;
      case 'deleted':
        return <Trash className="h-4 w-4" />;
      default:
        return <Edit className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'bg-green-500';
      case 'status_change':
        return 'bg-blue-500';
      case 'updated':
        return 'bg-purple-500';
      case 'deleted':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'Criado';
      case 'status_change':
        return 'Mudança de Status';
      case 'updated':
        return 'Atualizado';
      case 'deleted':
        return 'Excluído';
      default:
        return eventType;
    }
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
              className="relative pl-8 pb-4 border-l-2 border-muted last:border-transparent last:pb-0"
            >
              <div
                className={`absolute -left-2.5 top-1 w-5 h-5 rounded-full ${getEventColor(entry.event_type)} flex items-center justify-center text-white`}
              >
                {getEventIcon(entry.event_type)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {getEventLabel(entry.event_type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>

                <p className="text-sm">{entry.description}</p>

                {entry.created_by_profile && (
                  <p className="text-xs text-muted-foreground">
                    Por: {entry.created_by_profile.full_name || entry.created_by_profile.email}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
