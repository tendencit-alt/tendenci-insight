import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExecutorProps {
  campaignId: string;
  campaignName: string;
  onComplete?: () => void;
}

interface ExecutionStatus {
  total: number;
  sent: number;
  failed: number;
  current: string;
  isRunning: boolean;
}

export function CampanhaExecutor({ campaignId, campaignName, onComplete }: ExecutorProps) {
  const [status, setStatus] = useState<ExecutionStatus>({
    total: 0,
    sent: 0,
    failed: 0,
    current: "",
    isRunning: false,
  });
  const [isPaused, setIsPaused] = useState(false);

  const executeMutation = useMutation({
    mutationFn: async () => {
      setStatus(prev => ({ ...prev, isRunning: true }));

      // 1. Buscar campanha
      const { data: campanha, error: campError } = await supabase
        .from('tendenci_prospec_arq_campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle();

      if (campError) throw new Error('Erro ao carregar campanha');
      if (!campanha) throw new Error('Campanha não encontrada');

      // 2. Buscar conexão WhatsApp
      const { data: whatsappConn, error: whatsappError } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('*')
        .eq('id', campanha.whatsapp_connection_id)
        .maybeSingle();
      if (whatsappError || !whatsappConn) {
        throw new Error('Nenhuma conexão WhatsApp configurada');
      }

      if (whatsappConn.status !== 'connected') {
        throw new Error('Conexão WhatsApp não está ativa');
      }

      // VALIDAÇÃO CRÍTICA: verificar se instance_id e instance_name existem
      if (!whatsappConn.instance_id || !whatsappConn.instance_name) {
        throw new Error(
          'Dados da instância WhatsApp ausentes. Por favor, delete e recrie esta campanha para incluir as informações da instância.'
        );
      }

      // 3. Buscar sequência
      const { data: sequencia, error: seqError } = await supabase
        .from('tendenci_prospec_arq_sequences')
        .select('*')
        .eq('id', campanha.sequencia_id)
        .maybeSingle();

      if (seqError || !sequencia) {
        throw new Error('Sequência não encontrada');
      }

      const mensagens = sequencia.mensagens as Array<{
        ordem: number;
        canal: string;
        template: string;
        intervalo_horas: number;
      }>;

      if (!mensagens?.length) {
        throw new Error('Sequência sem mensagens');
      }

      // 4. Buscar segmento
      const { data: segmento } = await supabase
        .from('tendenci_prospec_arq_segments')
        .select('*')
        .eq('id', campanha.segmento_id)
        .maybeSingle();

      // 5. Buscar arquitetos do segmento
      let query = supabase
        .from('architects')
        .select('id, name, phone, company, city')
        .eq('active', true)
        .not('phone', 'is', null);

      const filtros = (segmento?.filtros as any) || {};

      if (filtros.cidade?.length) {
        query = query.in('city', filtros.cidade);
      }
      if (filtros.tier?.length) {
        query = query.in('tier', filtros.tier);
      }
      if (filtros.categoria?.length) {
        query = query.in('categoria', filtros.categoria);
      }
      if (filtros.vendedor) {
        query = query.eq('vendedor_responsavel', filtros.vendedor);
      }
      if (filtros.status_funil?.length) {
        query = query.in('status_funil', filtros.status_funil);
      }

      const { data: arquitetos, error: arqError } = await query;

      if (arqError) throw new Error('Erro ao buscar arquitetos');
      if (!arquitetos?.length) throw new Error('Nenhum arquiteto encontrado no segmento');

      setStatus(prev => ({ ...prev, total: arquitetos.length }));

      // 6. Verificar se tem webhook configurado
      if (!campanha.webhook_n8n) {
        throw new Error('Webhook N8N não configurado para esta campanha');
      }

      // 7. Enviar mensagens
      let sent = 0;
      let failed = 0;

      for (const arq of arquitetos) {
        if (isPaused) {
          toast.info('Campanha pausada');
          break;
        }

        setStatus(prev => ({ ...prev, current: arq.name }));

        try {
          // Preparar payload para webhook n8n
          const payload = {
            campanha_id: campanha.id,
            arquiteto_id: arq.id,
            nome: arq.name,
            telefone: arq.phone,
            tipo_envio: campanha.tipo_envio,
            conteudo_texto: campanha.conteudo_texto || null,
            conteudo_imagem_url: campanha.conteudo_imagem_url || null,
            conteudo_audio_url: campanha.conteudo_audio_url || null,
            instance_name: whatsappConn.instance_name || '',
            instance_id: whatsappConn.instance_id || '',
            whatsapp_connection_id: campanha.whatsapp_connection_id || ''
          };

          console.log('📤 Enviando payload para n8n:', JSON.stringify(payload, null, 2));

          // Enviar via webhook n8n
          const response = await fetch(campanha.webhook_n8n, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            throw new Error(`Webhook retornou status ${response.status}`);
          }

          const result = await response.json();

          if (result.status === 'success' || response.status === 200) {
            sent++;
            
            // Registrar no relacionamento campanha-arquiteto
            await supabase
              .from('tendenci_prospec_arq_campaign_architects')
              .upsert({
                campanha_id: campanha.id,
                architect_id: arq.id,
                status: 'enviado',
                data_envio: new Date().toISOString(),
              });

          } else {
            failed++;
          }

        } catch (error) {
          failed++;
        }

        setStatus(prev => ({ ...prev, sent, failed }));

        // Aguardar entre mensagens (2-5 segundos aleatório)
        await new Promise(resolve => 
          setTimeout(resolve, 2000 + Math.random() * 3000)
        );
      }

      return { sent, failed, total: arquitetos.length };
    },
    onSuccess: (result) => {
      setStatus(prev => ({ ...prev, isRunning: false }));
      toast.success(
        `Campanha concluída! ${result.sent} enviadas, ${result.failed} falharam`
      );
      onComplete?.();
    },
    onError: (error: Error) => {
      setStatus(prev => ({ ...prev, isRunning: false }));
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleStart = () => {
    if (isPaused) {
      setIsPaused(false);
      return;
    }
    executeMutation.mutate();
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleReset = () => {
    setStatus({
      total: 0,
      sent: 0,
      failed: 0,
      current: "",
      isRunning: false,
    });
    setIsPaused(false);
  };

  const progress = status.total > 0 ? ((status.sent + status.failed) / status.total) * 100 : 0;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Executor de Campanha</h3>
          <p className="text-sm text-muted-foreground">{campaignName}</p>
        </div>
        <div className="flex gap-2">
          {!status.isRunning ? (
            <Button onClick={handleStart} disabled={executeMutation.isPending}>
              <Play className="w-4 h-4 mr-2" />
              {isPaused ? 'Continuar' : 'Iniciar'}
            </Button>
          ) : (
            <Button variant="destructive" onClick={handlePause}>
              <Pause className="w-4 h-4 mr-2" />
              Pausar
            </Button>
          )}
          <Button variant="outline" onClick={handleReset} disabled={status.isRunning}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {status.total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>
              {status.sent + status.failed} / {status.total}
            </span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {status.isRunning && status.current && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Enviando para: <strong>{status.current}</strong>
          </AlertDescription>
        </Alert>
      )}

      {status.total > 0 && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{status.sent}</div>
            <div className="text-sm text-muted-foreground">Enviadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{status.failed}</div>
            <div className="text-sm text-muted-foreground">Falharam</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{status.total - status.sent - status.failed}</div>
            <div className="text-sm text-muted-foreground">Pendentes</div>
          </div>
        </div>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Importante:</strong> O envio respeita intervalos de 2-5 segundos entre mensagens
          para evitar bloqueios do WhatsApp. Campanhas grandes podem levar alguns minutos.
        </AlertDescription>
      </Alert>
    </Card>
  );
}
