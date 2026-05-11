import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, ArrowRight, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DealHistoryProps {
  dealId: string;
}

// Componente para resolver valores assíncronos (UUIDs -> Nomes)
function ResolvedValue({ fieldName, value }: { fieldName: string | null; value: string | null }) {
  const [resolvedValue, setResolvedValue] = useState<string>(value || '(vazio)');
  
  useEffect(() => {
    const resolve = async () => {
      if (!value || !fieldName) {
        setResolvedValue(value || '(vazio)');
        return;
      }
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(value);
      
      if (!isUUID) {
        setResolvedValue(value);
        return;
      }
      
      // Resolver owner_id (responsáveis)
      if (fieldName === 'owner_id') {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', value).maybeSingle();
        if (data?.full_name) {
          setResolvedValue(data.full_name);
        } else {
          setResolvedValue('(usuário removido)');
        }
        return;
      }
      
      // Resolver architect_id (profissionais parceiros)
      if (fieldName === 'architect_id') {
        const { data } = await supabase.from('architects').select('name').eq('id', value).maybeSingle();
        if (data?.name) {
          setResolvedValue(data.name);
        } else {
          setResolvedValue('(profissional parceiro removido)');
        }
        return;
      }
      
      setResolvedValue(value);
    };
    
    resolve();
  }, [fieldName, value]);
  
  return <>{resolvedValue}</>;
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
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

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

  const toggleNoteExpansion = (entryId: string) => {
    setExpandedNotes(prev => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
                ) : entry.action_type === 'task_completed' ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-600">
                      ✓ {entry.description}
                    </p>
                  </div>
                ) : entry.field_name === 'note' ? (
                  <div className="space-y-2">
                    {entry.old_value && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground">Observação Anterior:</span>
                        <div className="px-3 py-2 bg-muted/50 rounded text-sm border-l-2 border-muted">
                          {expandedNotes[entry.id] || entry.old_value.length <= 150 ? (
                            <p className="whitespace-pre-wrap">{entry.old_value}</p>
                          ) : (
                            <p className="whitespace-pre-wrap">{truncateText(entry.old_value)}</p>
                          )}
                          {entry.old_value.length > 150 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleNoteExpansion(entry.id)}
                              className="mt-1 h-6 text-xs"
                            >
                              {expandedNotes[entry.id] ? (
                                <>Ver menos <ChevronUp className="ml-1 h-3 w-3" /></>
                              ) : (
                                <>Ver mais <ChevronDown className="ml-1 h-3 w-3" /></>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {entry.new_value && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-primary">Nova Observação:</span>
                        <div className="px-3 py-2 bg-primary/5 rounded text-sm border-l-2 border-primary">
                          {expandedNotes[`${entry.id}-new`] || entry.new_value.length <= 150 ? (
                            <p className="whitespace-pre-wrap">{entry.new_value}</p>
                          ) : (
                            <p className="whitespace-pre-wrap">{truncateText(entry.new_value)}</p>
                          )}
                          {entry.new_value.length > 150 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleNoteExpansion(`${entry.id}-new`)}
                              className="mt-1 h-6 text-xs"
                            >
                              {expandedNotes[`${entry.id}-new`] ? (
                                <>Ver menos <ChevronUp className="ml-1 h-3 w-3" /></>
                              ) : (
                                <>Ver mais <ChevronDown className="ml-1 h-3 w-3" /></>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {!entry.old_value && !entry.new_value && (
                      <p className="text-sm text-muted-foreground italic">
                        Observações foram atualizadas
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {entry.description && (
                      <p className="text-sm text-muted-foreground">
                        {entry.description}
                      </p>
                    )}
                    {entry.field_name && (
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">De:</span>
                          <code className="px-2 py-1 bg-muted rounded text-xs text-foreground">
                            <ResolvedValue fieldName={entry.field_name} value={entry.old_value} />
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">Para:</span>
                          <code className="px-2 py-1 bg-primary/10 rounded text-xs font-semibold text-foreground">
                            <ResolvedValue fieldName={entry.field_name} value={entry.new_value} />
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
