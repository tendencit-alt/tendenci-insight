import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RelatorioProps {
  campanhaId: string;
}

interface DispatchStatus {
  id: string;
  architect_id: string;
  status: string;
  enviado_em: string | null;
  mensagem_erro: string | null;
  tentativas: number;
  architects: {
    name: string;
    phone: string;
  };
}

export function CampanhaRelatorio({ campanhaId }: RelatorioProps) {
  const { data: dispatches, isLoading } = useQuery({
    queryKey: ['campaign-report', campanhaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tendenci_prospec_arq_campaign_dispatches')
        .select(`
          *,
          architects:architect_id (
            name,
            phone
          )
        `)
        .eq('campanha_id', campanhaId)
        .order('enviado_em', { ascending: false });

      if (error) throw error;
      return data as DispatchStatus[];
    },
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando relatório...</div>;
  }

  const successCount = dispatches?.filter(d => d.status === 'sucesso').length || 0;
  const errorCount = dispatches?.filter(d => d.status === 'erro').length || 0;
  const pendingCount = dispatches?.filter(d => d.status === 'pendente').length || 0;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Falhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de envios */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes dos Envios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dispatches?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum envio registrado ainda
              </p>
            ) : (
              dispatches?.map((dispatch) => (
                <div
                  key={dispatch.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{dispatch.architects.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {dispatch.architects.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {dispatch.enviado_em && (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(dispatch.enviado_em), "dd/MM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    )}
                    
                    <Badge
                      variant={
                        dispatch.status === 'sucesso'
                          ? 'default'
                          : dispatch.status === 'erro'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {dispatch.status === 'sucesso' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {dispatch.status === 'erro' && <XCircle className="h-3 w-3 mr-1" />}
                      {dispatch.status === 'pendente' && <Clock className="h-3 w-3 mr-1" />}
                      {dispatch.status === 'sucesso' ? 'Enviado' : 
                       dispatch.status === 'erro' ? 'Falhou' : 'Pendente'}
                    </Badge>
                  </div>

                  {dispatch.mensagem_erro && (
                    <div className="text-xs text-red-500 mt-1">
                      {dispatch.mensagem_erro}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
