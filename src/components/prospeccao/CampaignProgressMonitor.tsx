import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Ban, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { CampaignErrorDetails } from "./CampaignErrorDetails";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CampaignDispatch {
  id: string;
  campanha_id: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado' | 'erro';
  total_arquitetos: number;
  enviados_sucesso: number;
  enviados_erro: number;
  arquiteto_atual: string | null;
  progresso_percentual: number;
  iniciado_em: string;
  concluido_em: string | null;
  erro_mensagem: string | null;
  updated_at: string | null;
  tendenci_prospec_arq_campaigns?: {
    nome: string;
  };
}

export function CampaignProgressMonitor() {
  const [dispatches, setDispatches] = useState<CampaignDispatch[]>([]);
  const [recentDispatches, setRecentDispatches] = useState<CampaignDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecent, setExpandedRecent] = useState(false);
  const [errorDetailsOpen, setErrorDetailsOpen] = useState(false);
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDispatches = async () => {
    // Buscar campanhas em andamento
    const { data: activeData, error: activeError } = await supabase
      .from('tendenci_campaign_dispatches')
      .select(`
        *,
        tendenci_prospec_arq_campaigns (
          nome
        )
      `)
      .in('status', ['pendente', 'em_andamento'])
      .order('iniciado_em', { ascending: false });

    if (activeError) {
      console.error('Erro ao buscar dispatches ativos:', activeError);
    } else {
      setDispatches((activeData || []) as CampaignDispatch[]);
    }

    // Buscar campanhas concluídas/erro das últimas 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentData, error: recentError } = await supabase
      .from('tendenci_campaign_dispatches')
      .select(`
        *,
        tendenci_prospec_arq_campaigns (
          nome
        )
      `)
      .in('status', ['concluido', 'erro', 'cancelado'])
      .gte('concluido_em', twentyFourHoursAgo)
      .order('concluido_em', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Erro ao buscar dispatches recentes:', recentError);
    } else {
      setRecentDispatches((recentData || []) as CampaignDispatch[]);
    }

    setLoading(false);
  };

  // 🔄 PROCESSAMENTO AUTOMÁTICO VIA CRON
  // O pg_cron processa a fila automaticamente a cada 3 minutos no backend
  // Frontend apenas monitora e exibe progresso - NÃO controla mais o processamento

  useEffect(() => {
    fetchDispatches();

    // Realtime subscription para atualização imediata dos contadores
    const channel = supabase
      .channel('campaign_dispatches')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tendenci_campaign_dispatches'
        },
        (payload) => {
          console.log('📊 Realtime update recebido:', payload.new);
          const newDispatch = payload.new as CampaignDispatch;
          
          // Atualizar estado imediatamente
          setDispatches(prev => 
            prev.map(d => d.id === newDispatch.id ? { ...d, ...newDispatch } : d)
          );
          
          // Toast quando campanha concluir com sucesso
          if (newDispatch.status === 'concluido' && payload.old.status !== 'concluido') {
            toast.success('Campanha Concluída!', {
              description: `${newDispatch.total_arquitetos} mensagens processadas. ${newDispatch.enviados_sucesso} sucesso, ${newDispatch.enviados_erro} erro(s).`,
            });
          }
          
          // Toast quando campanha tiver erros
          if ((newDispatch.status === 'erro' || newDispatch.enviados_erro > 0) && 
              (payload.old.status !== 'erro' || payload.old.enviados_erro === 0)) {
            toast.error('Campanha com Erros', {
              description: `${newDispatch.enviados_erro} falha(s) no envio. Clique para ver detalhes.`,
              action: {
                label: 'Ver Erros',
                onClick: () => {
                  setSelectedDispatchId(newDispatch.id);
                  setErrorDetailsOpen(true);
                }
              }
            });
          }
        }
      )
      .subscribe();

    // Poll a cada 5 segundos para sincronização
    const interval = setInterval(fetchDispatches, 5000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleCancelDispatch = async (dispatchId: string) => {
    const { error } = await supabase
      .from('tendenci_campaign_dispatches')
      .update({ status: 'cancelado' })
      .eq('id', dispatchId);

    if (error) {
      toast.error('Erro ao cancelar dispatch');
      return;
    }

    toast.success('Dispatch cancelado! O processamento será interrompido.');
  };

  const handleResumeQueue = async (dispatchId: string) => {
    setIsProcessing(true);
    try {
      console.log('▶️ [FRONTEND] Retomando fila manualmente...');
      
      const { data, error } = await supabase.functions.invoke('execute-campaign-background', {
        body: { process_next: true }
      });

      if (error) {
        console.error('❌ [FRONTEND] Erro ao retomar:', error);
        toast.error('Erro ao retomar campanha');
      } else {
        console.log('✅ [FRONTEND] Fila retomada:', data);
        toast.success('Processamento retomado!');
      }
    } catch (err) {
      console.error('💥 [FRONTEND] Exceção ao retomar:', err);
      toast.error('Erro ao retomar campanha');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: CampaignDispatch['status']) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'em_andamento':
        return (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Em Andamento</Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Auto (CRON)
            </Badge>
          </div>
        );
      case 'concluido':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Concluído</Badge>;
      case 'cancelado':
        return <Badge variant="outline"><Ban className="w-3 h-3 mr-1" />Cancelado</Badge>;
      case 'erro':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campanhas em Execução</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Campanhas em Execução */}
      {dispatches.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Campanhas em Execução</h3>
          {dispatches.map((dispatch) => (
        <Card key={dispatch.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">
                  {dispatch.tendenci_prospec_arq_campaigns?.nome || 'Campanha'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {dispatch.arquiteto_atual ? (
                    <>Enviando para: <strong>{dispatch.arquiteto_atual}</strong></>
                  ) : (
                    'Preparando envio...'
                  )}
                </CardDescription>
              </div>
              {getStatusBadge(dispatch.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Barra de Progresso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{dispatch.progresso_percentual}%</span>
              </div>
              <Progress value={dispatch.progresso_percentual} className="h-2" />
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{dispatch.total_arquitetos}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sucesso</p>
                <p className="text-lg font-semibold text-green-600">{dispatch.enviados_sucesso}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Erros</p>
                <p className="text-lg font-semibold text-red-600">{dispatch.enviados_erro}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Restantes</p>
                <p className="text-lg font-semibold text-blue-600">
                  {dispatch.total_arquitetos - dispatch.enviados_sucesso - dispatch.enviados_erro}
                </p>
              </div>
            </div>

            {/* Informações de Tempo */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Iniciado em:</span>
                <span className="font-medium">{new Date(dispatch.iniciado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
              </div>
              {dispatch.updated_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Última atualização:</span>
                  <span className="font-medium">{new Date(dispatch.updated_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                </div>
              )}
              {(() => {
                const lastUpdate = dispatch.updated_at ? new Date(dispatch.updated_at) : new Date(dispatch.iniciado_em);
                const now = new Date();
                const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000 / 60);
                const isStuck = diffMinutes > 5;
                
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tempo desde última atualização:</span>
                    <span className={`font-medium ${isStuck ? 'text-red-600' : 'text-green-600'}`}>
                      {diffMinutes < 1 ? 'Agora mesmo' : `${diffMinutes} min atrás`}
                      {isStuck && ' ⚠️'}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Alerta de Campanha Travada - agora 5 minutos */}
            {(() => {
              const lastUpdate = dispatch.updated_at ? new Date(dispatch.updated_at) : new Date(dispatch.iniciado_em);
              const now = new Date();
              const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000 / 60);
              
              if (diffMinutes > 5 && dispatch.status === 'em_andamento') {
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">
                          Processamento pode estar lento
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Sem atualizações há {diffMinutes} minutos. O CRON processa a cada 3 min. Se persistir, use "Retomar Fila".
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Erro Message */}
            {dispatch.erro_mensagem && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {dispatch.erro_mensagem}
              </div>
            )}

            {/* Botões de Controle */}
            {dispatch.status === 'em_andamento' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResumeQueue(dispatch.id)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4 mr-2" />
                  )}
                  Retomar Fila
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancelDispatch(dispatch.id)}
                  className="flex-1"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            )}

            {/* Botão Ver Erros */}
            {dispatch.enviados_erro > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDispatchId(dispatch.id);
                  setErrorDetailsOpen(true);
                }}
                className="w-full mt-2"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Ver Detalhes dos Erros
              </Button>
            )}
          </CardContent>
        </Card>
          ))}
        </div>
      )}

      {/* Campanhas Recentes (últimas 24h) */}
      {recentDispatches.length > 0 && (
        <Collapsible open={expandedRecent} onOpenChange={setExpandedRecent}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Campanhas Recentes (24h)</CardTitle>
                    <CardDescription>
                      {recentDispatches.length} campanha(s) concluída(s) ou com erro
                    </CardDescription>
                  </div>
                  {expandedRecent ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                {recentDispatches.map((dispatch) => (
                  <Card key={dispatch.id} className="border-l-4" style={{
                    borderLeftColor: dispatch.status === 'concluido' ? 'hsl(var(--success))' : 
                                    dispatch.status === 'erro' ? 'hsl(var(--destructive))' : 
                                    'hsl(var(--muted))'
                  }}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {dispatch.tendenci_prospec_arq_campaigns?.nome || 'Campanha'}
                        </p>
                        {getStatusBadge(dispatch.status)}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-semibold">{dispatch.total_arquitetos}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sucesso</p>
                          <p className="font-semibold text-green-600">{dispatch.enviados_sucesso}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Erros</p>
                          <p className="font-semibold text-red-600">{dispatch.enviados_erro}</p>
                        </div>
                      </div>

                      {dispatch.concluido_em && (
                        <p className="text-xs text-muted-foreground">
                          Concluído em: {new Date(dispatch.concluido_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                        </p>
                      )}

                      {dispatch.erro_mensagem && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2">
                          {dispatch.erro_mensagem}
                        </div>
                      )}

                      {dispatch.enviados_erro > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDispatchId(dispatch.id);
                            setErrorDetailsOpen(true);
                          }}
                          className="w-full mt-2"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Ver Detalhes dos Erros ({dispatch.enviados_erro})
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Dialog de Detalhes de Erros */}
      {selectedDispatchId && (
        <CampaignErrorDetails
          open={errorDetailsOpen}
          onOpenChange={setErrorDetailsOpen}
          dispatchId={selectedDispatchId}
        />
      )}

      {/* Mensagem quando não há campanhas */}
      {dispatches.length === 0 && recentDispatches.length === 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma Campanha</CardTitle>
            <CardDescription>Não há campanhas em execução ou recentes</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
