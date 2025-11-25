import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Ban, Clock } from "lucide-react";
import { toast } from "sonner";

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
  tendenci_prospec_arq_campaigns?: {
    nome: string;
  };
}

export function CampaignProgressMonitor() {
  const [dispatches, setDispatches] = useState<CampaignDispatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDispatches = async () => {
    const { data, error } = await supabase
      .from('tendenci_campaign_dispatches')
      .select(`
        *,
        tendenci_prospec_arq_campaigns (
          nome
        )
      `)
      .in('status', ['pendente', 'em_andamento'])
      .order('iniciado_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar dispatches:', error);
      return;
    }

    setDispatches((data || []) as CampaignDispatch[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchDispatches();

    // Realtime subscription
    const channel = supabase
      .channel('campaign_dispatches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tendenci_campaign_dispatches'
        },
        () => {
          fetchDispatches();
        }
      )
      .subscribe();

    // Poll a cada 10 segundos para atualizações
    const interval = setInterval(fetchDispatches, 10000);

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

  const getStatusBadge = (status: CampaignDispatch['status']) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'em_andamento':
        return <Badge variant="default" className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Em Andamento</Badge>;
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

  if (dispatches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campanhas em Execução</CardTitle>
          <CardDescription>Nenhuma campanha em execução no momento</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
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
            <div className="grid grid-cols-3 gap-4 text-sm">
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
            </div>

            {/* Tempo */}
            <div className="text-xs text-muted-foreground">
              Iniciado em: {new Date(dispatch.iniciado_em).toLocaleString('pt-BR')}
            </div>

            {/* Erro Message */}
            {dispatch.erro_mensagem && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {dispatch.erro_mensagem}
              </div>
            )}

            {/* Botão Cancelar */}
            {dispatch.status === 'em_andamento' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleCancelDispatch(dispatch.id)}
                className="w-full"
              >
                <Ban className="w-4 h-4 mr-2" />
                Cancelar Campanha
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
