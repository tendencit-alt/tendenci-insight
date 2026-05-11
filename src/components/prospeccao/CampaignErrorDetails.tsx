import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, RefreshCw, ExternalLink, PhoneOff, Ban } from "lucide-react";
import { toast } from "sonner";

interface CampaignErrorDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispatchId: string;
}

interface ErrorArchitect {
  architect_id: string;
  architect_name: string;
  phone: string;
  mensagem_erro: string | null;
  tentativas: number;
  tipo_erro: 'numero_inexistente' | 'erro_envio' | 'erro_formatacao' | string;
  whatsapp_valido: boolean | null;
}

export function CampaignErrorDetails({
  open,
  onOpenChange,
  dispatchId,
}: CampaignErrorDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [errorArchitects, setErrorArchitects] = useState<ErrorArchitect[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [markingInvalid, setMarkingInvalid] = useState<string | null>(null);

  useEffect(() => {
    if (open && dispatchId) {
      fetchErrorDetails();
    }
  }, [open, dispatchId]);

  const fetchErrorDetails = async () => {
    setLoading(true);
    
    // Primeiro, buscar a campanha_id do dispatch
    const { data: dispatchData, error: dispatchFetchError } = await supabase
      .from('tendenci_campaign_dispatches')
      .select('campanha_id')
      .eq('id', dispatchId)
      .single();

    if (dispatchFetchError || !dispatchData) {
      console.error('Erro ao buscar dispatch:', dispatchFetchError);
      toast.error('Erro ao carregar detalhes do dispatch');
      setLoading(false);
      return;
    }

    // Buscar logs de erro desta campanha
    const { data: errorLogs, error: logsError } = await supabase
      .from('tendenci_prospec_arq_logs')
      .select('architect_id, tipo, mensagem, metadata')
      .eq('campanha_id', dispatchData.campanha_id)
      .in('tipo', ['numero_inexistente', 'erro_envio', 'erro_formatacao']);

    if (logsError) {
      console.error('Erro ao buscar logs de erro:', logsError);
      toast.error('Erro ao carregar detalhes dos erros');
      setLoading(false);
      return;
    }

    // Agrupar por profissional parceiro e contar tentativas
    const architectErrors: Record<string, { count: number; tipo: string; mensagem: string | null }> = {};
    errorLogs?.forEach(log => {
      if (log.architect_id) {
        if (!architectErrors[log.architect_id]) {
          architectErrors[log.architect_id] = { count: 0, tipo: log.tipo, mensagem: log.mensagem };
        }
        architectErrors[log.architect_id].count++;
        // Priorizar tipo numero_inexistente
        if (log.tipo === 'numero_inexistente') {
          architectErrors[log.architect_id].tipo = 'numero_inexistente';
        }
      }
    });

    // Buscar detalhes dos profissionais parceiros
    const architectIds = Object.keys(architectErrors);
    if (architectIds.length > 0) {
      const { data: architects, error: architectsError } = await supabase
        .from('architects')
        .select('id, name, phone, whatsapp_valido')
        .in('id', architectIds);

      if (architectsError) {
        console.error('Erro ao buscar detalhes dos profissionais parceiros:', architectsError);
      }

      // Combinar dados
      const combined: ErrorArchitect[] = architectIds.map(architectId => {
        const architect = architects?.find(a => a.id === architectId);
        const errorInfo = architectErrors[architectId];
        return {
          architect_id: architectId,
          architect_name: architect?.name || 'Nome não encontrado',
          phone: architect?.phone || 'Telefone não cadastrado',
          mensagem_erro: errorInfo.mensagem,
          tentativas: errorInfo.count,
          tipo_erro: errorInfo.tipo,
          whatsapp_valido: architect?.whatsapp_valido ?? null,
        };
      });

      // Ordenar: primeiro números inexistentes, depois outros erros
      combined.sort((a, b) => {
        if (a.tipo_erro === 'numero_inexistente' && b.tipo_erro !== 'numero_inexistente') return -1;
        if (a.tipo_erro !== 'numero_inexistente' && b.tipo_erro === 'numero_inexistente') return 1;
        return b.tentativas - a.tentativas;
      });

      setErrorArchitects(combined);
    }

    setLoading(false);
  };

  const handleMarkInvalid = async (architectId: string) => {
    setMarkingInvalid(architectId);
    
    try {
      const { error } = await supabase
        .from('architects')
        .update({ whatsapp_valido: false })
        .eq('id', architectId);

      if (error) throw error;

      toast.success('Profissional Parceiro marcado como WhatsApp inválido');
      
      // Atualizar lista local
      setErrorArchitects(prev => prev.map(a => 
        a.architect_id === architectId ? { ...a, whatsapp_valido: false } : a
      ));
      
    } catch (error) {
      console.error('Erro ao marcar como inválido:', error);
      toast.error('Erro ao atualizar profissional parceiro');
    } finally {
      setMarkingInvalid(null);
    }
  };

  const handleRetryArchitect = async (architectId: string) => {
    setRetrying(architectId);
    
    try {
      // Buscar campanha_id do dispatch
      const { data: dispatchData } = await supabase
        .from('tendenci_campaign_dispatches')
        .select('campanha_id')
        .eq('id', dispatchId)
        .single();

      if (!dispatchData) {
        throw new Error('Dispatch não encontrado');
      }

      // Buscar informações da campanha original
      const { data: campaign } = await supabase
        .from('tendenci_prospec_arq_campaigns')
        .select('*')
        .eq('id', dispatchData.campanha_id)
        .single();

      if (!campaign) {
        throw new Error('Campanha não encontrada');
      }

      // Buscar detalhes do profissional parceiro
      const { data: architect } = await supabase
        .from('architects')
        .select('name, phone')
        .eq('id', architectId)
        .single();

      if (!architect) {
        throw new Error('Profissional Parceiro não encontrado');
      }

      // Buscar detalhes da instância WhatsApp
      const { data: whatsappConnection } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('instance_name, instance_id')
        .eq('id', campaign.whatsapp_connection_id)
        .single();

      // Chamar Edge Function diretamente
      const { data, error } = await supabase.functions.invoke('dispatch-campaign', {
        body: {
          campanha_id: campaign.id,
          dispatch_id: dispatchId,
          arquiteto_id: architectId,
          nome: architect.name,
          telefone: architect.phone,
          tipo_envio: campaign.tipo_envio,
          conteudo_texto: campaign.conteudo_texto,
          conteudo_imagem_url: campaign.conteudo_imagem_url,
          conteudo_audio_url: campaign.conteudo_audio_url,
          whatsapp_connection_id: campaign.whatsapp_connection_id,
          instance_name: whatsappConnection?.instance_name,
          instance_id: whatsappConnection?.instance_id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Mensagem reenviada com sucesso!');
        // Remover da lista de erros
        setErrorArchitects(prev => prev.filter(a => a.architect_id !== architectId));
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
      
    } catch (error) {
      console.error('Erro ao tentar reenviar:', error);
      toast.error('Erro ao reenviar mensagem', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      // Recarregar para atualizar status
      fetchErrorDetails();
    } finally {
      setRetrying(null);
    }
  };

  const getErrorBadge = (tipoErro: string, whatsappValido: boolean | null) => {
    if (tipoErro === 'numero_inexistente') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <PhoneOff className="w-3 h-3" />
          Número Inexistente
        </Badge>
      );
    }
    if (tipoErro === 'erro_formatacao') {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
          Formato Inválido
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-destructive text-destructive">
        Erro de Envio
      </Badge>
    );
  };

  const numerosInexistentes = errorArchitects.filter(a => a.tipo_erro === 'numero_inexistente').length;
  const outrosErros = errorArchitects.filter(a => a.tipo_erro !== 'numero_inexistente').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Detalhes dos Erros
          </SheetTitle>
          <SheetDescription>
            Lista de arquitetos que falharam no envio da campanha
          </SheetDescription>
        </SheetHeader>

        {/* Resumo dos erros */}
        {!loading && errorArchitects.length > 0 && (
          <div className="flex gap-3 mt-4">
            {numerosInexistentes > 0 && (
              <div className="flex-1 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                  <PhoneOff className="w-4 h-4" />
                  <span className="font-medium">{numerosInexistentes}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Números inexistentes</p>
              </div>
            )}
            {outrosErros > 0 && (
              <div className="flex-1 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">{outrosErros}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Outros erros</p>
              </div>
            )}
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-200px)] mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : errorArchitects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum erro encontrado para esta campanha</p>
            </div>
          ) : (
            <div className="space-y-3">
              {errorArchitects.map((error) => (
                <div
                  key={error.architect_id}
                  className={`border rounded-lg p-4 space-y-3 ${
                    error.tipo_erro === 'numero_inexistente' 
                      ? 'bg-destructive/5 border-destructive/20' 
                      : 'bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{error.architect_name}</p>
                        {getErrorBadge(error.tipo_erro, error.whatsapp_valido)}
                        {error.whatsapp_valido === false && (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            <Ban className="w-3 h-3 mr-1" />
                            Bloqueado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{error.phone}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {error.tentativas} tentativa(s)
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {error.mensagem_erro && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded border border-destructive/20">
                      <p className="font-medium mb-1">Erro:</p>
                      <p className="text-xs break-words">{error.mensagem_erro}</p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {/* Botão de marcar como inválido */}
                    {error.whatsapp_valido !== false && error.tipo_erro !== 'numero_inexistente' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkInvalid(error.architect_id)}
                        disabled={markingInvalid === error.architect_id}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        {markingInvalid === error.architect_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <PhoneOff className="w-4 h-4 mr-1" />
                            Marcar Inválido
                          </>
                        )}
                      </Button>
                    )}

                    {/* Botão de tentar novamente - apenas para erros que não são número inexistente */}
                    {error.tipo_erro !== 'numero_inexistente' && error.whatsapp_valido !== false && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryArchitect(error.architect_id)}
                        disabled={retrying === error.architect_id}
                      >
                        {retrying === error.architect_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Tentar Novamente
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/prospeccao?architect=${error.architect_id}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Ver Arquiteto
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
