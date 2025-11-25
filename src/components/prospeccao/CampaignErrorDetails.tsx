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
import { Loader2, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
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
}

export function CampaignErrorDetails({
  open,
  onOpenChange,
  dispatchId,
}: CampaignErrorDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [errorArchitects, setErrorArchitects] = useState<ErrorArchitect[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);

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

    // Buscar dispatches com erro desta campanha
    const { data: campaignDispatches, error: dispatchError } = await supabase
      .from('tendenci_prospec_arq_campaign_dispatches')
      .select('architect_id, status, mensagem_erro, tentativas')
      .eq('campanha_id', dispatchData.campanha_id)
      .eq('status', 'erro');

    if (dispatchError) {
      console.error('Erro ao buscar dispatches com erro:', dispatchError);
      toast.error('Erro ao carregar detalhes dos erros');
      setLoading(false);
      return;
    }

    // Buscar detalhes dos arquitetos
    if (campaignDispatches && campaignDispatches.length > 0) {
      const architectIds = campaignDispatches.map(cd => cd.architect_id);
      
      const { data: architects, error: architectsError } = await supabase
        .from('architects')
        .select('id, name, phone')
        .in('id', architectIds);

      if (architectsError) {
        console.error('Erro ao buscar detalhes dos arquitetos:', architectsError);
      }

      // Combinar dados
      const combined: ErrorArchitect[] = campaignDispatches.map(cd => {
        const architect = architects?.find(a => a.id === cd.architect_id);
        return {
          architect_id: cd.architect_id,
          architect_name: architect?.name || 'Nome não encontrado',
          phone: architect?.phone || 'Telefone não cadastrado',
          mensagem_erro: cd.mensagem_erro,
          tentativas: cd.tentativas || 1,
        };
      });

      setErrorArchitects(combined);
    }

    setLoading(false);
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

      // Buscar detalhes do arquiteto
      const { data: architect } = await supabase
        .from('architects')
        .select('name, phone')
        .eq('id', architectId)
        .single();

      if (!architect) {
        throw new Error('Arquiteto não encontrado');
      }

      // Buscar detalhes da instância WhatsApp
      const { data: whatsappConnection } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('instance_name, instance_id')
        .eq('id', campaign.whatsapp_connection_id)
        .single();

      // Disparar novamente via webhook
      const payload = {
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
      };

      const response = await fetch(campaign.webhook_n8n || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      // Atualizar status na tabela
      await supabase
        .from('tendenci_prospec_arq_campaign_dispatches')
        .update({ 
          status: 'sucesso',
          mensagem_erro: null,
        })
        .eq('campanha_id', campaign.id)
        .eq('architect_id', architectId);

      toast.success('Mensagem reenviada com sucesso!');
      
      // Recarregar lista de erros
      fetchErrorDetails();
      
    } catch (error) {
      console.error('Erro ao tentar reenviar:', error);
      toast.error('Erro ao reenviar mensagem', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setRetrying(null);
    }
  };

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

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
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
                  className="border rounded-lg p-4 space-y-3 bg-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">{error.architect_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{error.phone}</span>
                        <Badge variant="outline" className="text-xs">
                          {error.tentativas} tentativa(s)
                        </Badge>
                      </div>
                    </div>
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
                  </div>

                  {error.mensagem_erro && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded border border-destructive/20">
                      <p className="font-medium mb-1">Erro:</p>
                      <p className="text-xs">{error.mensagem_erro}</p>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/prospeccao?architect=${error.architect_id}`, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver Arquiteto
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
