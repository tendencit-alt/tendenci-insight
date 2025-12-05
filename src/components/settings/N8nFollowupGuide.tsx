import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  MessageCircle, 
  Zap, 
  CheckCircle, 
  Copy, 
  Check, 
  Download,
  AlertTriangle,
  Info,
  Users,
  TrendingUp,
  XCircle,
  Send,
  Play,
  Settings,
  RefreshCw,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FollowupStats {
  queueSize: number;
  sentToday: number;
  sentWeek: number;
  responseRate: number;
  failedRecent: number;
}

interface DispatchProgress {
  total: number;
  sent: number;
  failed: number;
  current: string;
  status: 'idle' | 'running' | 'completed' | 'error';
}

export function N8nFollowupGuide() {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [stats, setStats] = useState<FollowupStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Webhook config
  const [webhookUrl, setWebhookUrl] = useState(() => 
    localStorage.getItem('followup_webhook_url') || ''
  );
  const [testingWebhook, setTestingWebhook] = useState(false);
  
  // Dispatch state
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState<DispatchProgress>({
    total: 0,
    sent: 0,
    failed: 0,
    current: '',
    status: 'idle'
  });

  useEffect(() => {
    fetchStats();
    checkEligibleLeads();
    const interval = setInterval(() => {
      fetchStats();
      checkEligibleLeads();
    }, 60000); // atualiza a cada 60s
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-followup-stats');
      if (error) throw error;
      if (data?.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const checkEligibleLeads = async () => {
    setLoadingEligible(true);
    try {
      // Buscar leads elegíveis diretamente
      const now48hAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('crm_deals')
        .select(`
          id,
          last_interaction,
          last_followup_at,
          leads!inner(
            clients!inner(phone)
          )
        `)
        .eq('followup_enabled', true)
        .eq('status', 'aberto')
        .not('leads.clients.phone', 'is', null);

      if (error) throw error;

      // Filtrar por última interação > 48h
      const eligible = (data || []).filter(deal => {
        const lastInteraction = deal.last_interaction || deal.last_followup_at;
        return !lastInteraction || lastInteraction < now48hAgo;
      });

      setEligibleCount(eligible.length);
    } catch (error) {
      console.error('Erro ao verificar leads elegíveis:', error);
    } finally {
      setLoadingEligible(false);
    }
  };

  const saveWebhookUrl = () => {
    localStorage.setItem('followup_webhook_url', webhookUrl);
    toast.success('URL do webhook salva!');
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      toast.error('Configure a URL do webhook primeiro');
      return;
    }

    setTestingWebhook(true);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          deal_id: 'test-123',
          client_name: 'Teste Tendenci',
          client_phone: '5534999999999',
          conversation_history: 'Esta é uma mensagem de teste do sistema Tendenci.',
          followup_count: 0,
          product_type: 'Sofá',
          categoria: 'Móveis Soltos',
          callback_url: `${projectUrl}/functions/v1/update-followup-history`
        })
      });

      if (response.ok) {
        toast.success('Webhook funcionando! Teste enviado com sucesso.');
      } else {
        toast.error(`Erro no webhook: ${response.status}`);
      }
    } catch (error: any) {
      toast.error(`Erro ao testar: ${error.message}`);
    } finally {
      setTestingWebhook(false);
    }
  };

  const dispatchFollowups = async () => {
    if (!webhookUrl) {
      toast.error('Configure a URL do webhook primeiro');
      return;
    }

    if (eligibleCount === 0) {
      toast.info('Nenhum lead elegível para follow-up no momento');
      return;
    }

    const confirmMessage = `Disparar follow-ups para ${eligibleCount} lead(s)?\n\nTempo estimado: ${Math.ceil((eligibleCount || 0) * 3)} minutos`;
    if (!confirm(confirmMessage)) return;

    setDispatching(true);
    setDispatchProgress({
      total: eligibleCount || 0,
      sent: 0,
      failed: 0,
      current: 'Iniciando...',
      status: 'running'
    });

    try {
      const { data, error } = await supabase.functions.invoke('dispatch-followup', {
        body: {
          webhook_url: webhookUrl,
          ignore_time_filter: true // Permitir teste fora do horário comercial
        }
      });

      if (error) throw error;

      setDispatchProgress(prev => ({
        ...prev,
        sent: data.dispatched || 0,
        failed: data.failed || 0,
        current: 'Concluído',
        status: 'completed'
      }));

      if (data.dispatched > 0) {
        toast.success(`✅ ${data.dispatched} follow-up(s) enviado(s) para n8n!`);
      } else if (data.failed > 0) {
        toast.error(`❌ ${data.failed} falha(s) no envio`);
      } else {
        toast.info(data.message || 'Nenhum follow-up enviado');
      }

      // Recarregar contagem
      checkEligibleLeads();
      fetchStats();

    } catch (error: any) {
      console.error('Erro no disparo:', error);
      toast.error(`Erro: ${error.message}`);
      setDispatchProgress(prev => ({
        ...prev,
        current: 'Erro',
        status: 'error'
      }));
    } finally {
      setDispatching(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copiado!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const downloadWorkflowJSON = () => {
    const workflow = getWorkflowJSON();
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tendenci-followup-webhook.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Workflow JSON baixado!");
  };

  const getWorkflowJSON = () => {
    return {
      "name": "Tendenci - Follow-up Ativo (Webhook)",
      "nodes": [
        {
          "parameters": {
            "httpMethod": "POST",
            "path": "tendenci-followup",
            "responseMode": "responseNode",
            "options": {}
          },
          "name": "Webhook Trigger",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 1.1,
          "position": [250, 300],
          "webhookId": "tendenci-followup"
        },
        {
          "parameters": {
            "promptType": "define",
            "text": "={{$json.conversation_history}}\n\nCliente: {{$json.client_name}}\nProduto de interesse: {{$json.product_type}}\nCategoria: {{$json.categoria}}\nFollow-up número: {{$json.followup_count + 1}}",
            "options": {
              "systemMessage": "Você é o Matheus da Tendenci Móveis. Envie uma mensagem de follow-up casual e amigável para reengajar o cliente que não respondeu há 2 dias. Use o histórico de conversa para personalizar. Seja breve (máximo 2 linhas). Não force venda, apenas demonstre interesse genuíno em ajudar. Varie as abordagens a cada follow-up."
            }
          },
          "name": "Gerar Mensagem IA",
          "type": "@n8n/n8n-nodes-langchain.agent",
          "typeVersion": 1.6,
          "position": [470, 300],
          "note": "Configure suas credenciais de IA aqui (OpenAI, Gemini, etc)"
        },
        {
          "parameters": {
            "method": "POST",
            "url": "={{$credentials.evolutionUrl}}/message/sendText/={{$credentials.evolutionInstance}}",
            "sendHeaders": true,
            "headerParameters": {
              "parameters": [
                {
                  "name": "apikey",
                  "value": "={{$credentials.evolutionApiKey}}"
                },
                {
                  "name": "Content-Type",
                  "value": "application/json"
                }
              ]
            },
            "sendBody": true,
            "specifyBody": "json",
            "jsonBody": "={\n  \"number\": \"{{$json.client_phone}}@s.whatsapp.net\",\n  \"text\": \"{{$('Gerar Mensagem IA').output}}\"\n}",
            "options": {}
          },
          "name": "Enviar WhatsApp",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4.1,
          "position": [690, 300],
          "note": "Configure Evolution API via Credentials do n8n"
        },
        {
          "parameters": {
            "method": "POST",
            "url": "={{$json.callback_url}}",
            "sendHeaders": true,
            "headerParameters": {
              "parameters": [
                {
                  "name": "Content-Type",
                  "value": "application/json"
                }
              ]
            },
            "sendBody": true,
            "specifyBody": "json",
            "jsonBody": "={\n  \"deal_id\": \"{{$json.deal_id}}\",\n  \"new_message\": \"{{$('Gerar Mensagem IA').output}}\"\n}",
            "options": {}
          },
          "name": "Atualizar Histórico CRM",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4.1,
          "position": [910, 300]
        },
        {
          "parameters": {
            "respondWith": "json",
            "responseBody": "={\"success\": true, \"message\": \"Follow-up enviado\"}"
          },
          "name": "Respond",
          "type": "n8n-nodes-base.respondToWebhook",
          "typeVersion": 1,
          "position": [1130, 300]
        }
      ],
      "connections": {
        "Webhook Trigger": {
          "main": [[{ "node": "Gerar Mensagem IA", "type": "main", "index": 0 }]]
        },
        "Gerar Mensagem IA": {
          "main": [[{ "node": "Enviar WhatsApp", "type": "main", "index": 0 }]]
        },
        "Enviar WhatsApp": {
          "main": [[{ "node": "Atualizar Histórico CRM", "type": "main", "index": 0 }]]
        },
        "Atualizar Histórico CRM": {
          "main": [[{ "node": "Respond", "type": "main", "index": 0 }]]
        }
      },
      "pinData": {}
    };
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Follow-up Automático via Webhook</h2>
        <p className="text-muted-foreground">
          Sistema de follow-up automático de 2 em 2 dias - Tendenci envia dados para n8n processar
        </p>
      </div>

      <Alert>
        <Zap className="h-4 w-4" />
        <AlertTitle>Nova Arquitetura - Webhook Push</AlertTitle>
        <AlertDescription>
          O Tendenci envia os dados do lead diretamente para o n8n via webhook POST. 
          A IA do n8n (configurada com suas credenciais) gera a mensagem e envia via WhatsApp Evolution API.
          <strong> Sem limite de follow-ups</strong> - continua até o cliente pedir para parar ou responder.
        </AlertDescription>
      </Alert>

      {/* Configuração do Webhook */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração do Webhook n8n
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL do Webhook n8n (Follow-up Ativo)</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                placeholder="https://seu-n8n.com/webhook/tendenci-followup"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={saveWebhookUrl} variant="outline">
                Salvar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole aqui a URL do webhook do seu fluxo n8n de follow-up
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testWebhook} 
              variant="outline"
              disabled={!webhookUrl || testingWebhook}
            >
              {testingWebhook ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Painel de Disparo */}
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-600" />
            Disparar Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Leads elegíveis para follow-up</p>
              <p className="text-sm text-muted-foreground">
                Última interação há mais de 48 horas
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-green-600">
                {loadingEligible ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  eligibleCount ?? '-'
                )}
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={checkEligibleLeads}
                disabled={loadingEligible}
              >
                <RefreshCw className={`h-4 w-4 ${loadingEligible ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {dispatchProgress.status !== 'idle' && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>{dispatchProgress.current}</span>
                <span>{dispatchProgress.sent + dispatchProgress.failed} / {dispatchProgress.total}</span>
              </div>
              <Progress 
                value={((dispatchProgress.sent + dispatchProgress.failed) / dispatchProgress.total) * 100} 
              />
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">✅ {dispatchProgress.sent} enviados</span>
                {dispatchProgress.failed > 0 && (
                  <span className="text-red-600">❌ {dispatchProgress.failed} falhas</span>
                )}
              </div>
            </div>
          )}

          <Button 
            onClick={dispatchFollowups}
            disabled={!webhookUrl || dispatching || eligibleCount === 0}
            className="w-full"
            size="lg"
          >
            {dispatching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Disparando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Disparar Follow-ups Agora
              </>
            )}
          </Button>

          <Alert variant="destructive" className="bg-orange-500/10 border-orange-500/50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Cada lead será enviado para o n8n que processará e enviará via WhatsApp. 
              <strong> Intervalo de 3 segundos entre envios</strong> para evitar bloqueio.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Dashboard de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na Fila</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? "..." : stats?.queueSize || 0}
            </div>
            <p className="text-xs text-muted-foreground">Aguardando follow-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados Hoje</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? "..." : stats?.sentToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">Últimas 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? "..." : `${stats?.responseRate || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">Última semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas Recentes</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? "..." : stats?.failedRecent || 0}
            </div>
            <p className="text-xs text-muted-foreground">Última semana</p>
          </CardContent>
        </Card>
      </div>

      {/* Credenciais */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold text-lg mb-4">🔐 Endpoints do Tendenci</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Edge Function - Disparar Follow-ups</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-background p-2 rounded text-xs break-all">
                {projectUrl}/functions/v1/dispatch-followup
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(`${projectUrl}/functions/v1/dispatch-followup`, "Dispatch URL")}
              >
                {copiedField === "Dispatch URL" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Edge Function - Atualizar Histórico (Callback)</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-background p-2 rounded text-xs break-all">
                {projectUrl}/functions/v1/update-followup-history
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(`${projectUrl}/functions/v1/update-followup-history`, "Callback URL")}
              >
                {copiedField === "Callback URL" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button 
            onClick={downloadWorkflowJSON} 
            variant="default" 
            className="w-full mt-4"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Workflow n8n (JSON)
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Fluxo n8n</TabsTrigger>
          <TabsTrigger value="json">JSON Workflow</TabsTrigger>
          <TabsTrigger value="reference">Referência</TabsTrigger>
        </TabsList>

        {/* Tab: Configuração do Fluxo */}
        <TabsContent value="config" className="space-y-4">
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Arquitetura: Tendenci → n8n</AlertTitle>
            <AlertDescription>
              O Tendenci envia dados via webhook POST para o n8n. O n8n usa suas próprias credenciais 
              da Evolution API para enviar as mensagens. Após envio, n8n chama o callback para atualizar 
              o histórico no CRM.
            </AlertDescription>
          </Alert>

          {/* Passo 1 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
              <h3 className="font-semibold text-lg">Webhook Trigger</h3>
              <Badge variant="outline">Trigger</Badge>
            </div>
            <div className="space-y-3 ml-11">
              <p className="text-sm text-muted-foreground">
                Recebe dados do lead enviados pelo Tendenci
              </p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><strong>Method:</strong> POST</p>
                <p><strong>Path:</strong> /tendenci-followup</p>
                <p><strong>Response:</strong> Using "Respond to Webhook" node</p>
              </div>
            </div>
          </Card>

          {/* Passo 2 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
              <h3 className="font-semibold text-lg">Gerar Mensagem IA</h3>
              <Badge>AI Agent</Badge>
            </div>
            <div className="space-y-3 ml-11">
              <p className="text-sm text-muted-foreground">
                Usa o histórico de conversa para gerar mensagem personalizada
              </p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><strong>Input:</strong> <code>{"{{$json.conversation_history}}"}</code></p>
                <p><strong>System Prompt:</strong> Instrução para gerar follow-up casual</p>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Configure suas credenciais de IA (OpenAI, Gemini, etc) nas Credentials do n8n
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Passo 3 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
              <h3 className="font-semibold text-lg">Enviar WhatsApp</h3>
              <Badge>HTTP Request</Badge>
            </div>
            <div className="space-y-3 ml-11">
              <p className="text-sm text-muted-foreground">
                Envia mensagem via Evolution API usando credenciais do n8n
              </p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><strong>URL:</strong> <code>{"={{$credentials.evolutionUrl}}/message/sendText/={{$credentials.evolutionInstance}}"}</code></p>
                <p><strong>API Key:</strong> <code>{"={{$credentials.evolutionApiKey}}"}</code></p>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Crie uma Credential "HTTP Header Auth" no n8n com: evolutionUrl, evolutionApiKey, evolutionInstance
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Passo 4 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
              <h3 className="font-semibold text-lg">Atualizar Histórico CRM</h3>
              <Badge>HTTP Request</Badge>
            </div>
            <div className="space-y-3 ml-11">
              <p className="text-sm text-muted-foreground">
                Chama callback do Tendenci para registrar mensagem enviada
              </p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><strong>URL:</strong> <code>{"={{$json.callback_url}}"}</code></p>
                <p><strong>Body:</strong></p>
                <pre className="bg-background p-2 rounded text-xs mt-1">
{`{
  "deal_id": "{{$json.deal_id}}",
  "new_message": "{{$('Gerar Mensagem IA').output}}"
}`}
                </pre>
              </div>
            </div>
          </Card>

        </TabsContent>

        {/* Tab: JSON Workflow */}
        <TabsContent value="json" className="space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Workflow JSON Completo</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(JSON.stringify(getWorkflowJSON(), null, 2), "JSON")}
                >
                  {copiedField === "JSON" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  Copiar
                </Button>
                <Button size="sm" onClick={downloadWorkflowJSON}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
              {JSON.stringify(getWorkflowJSON(), null, 2)}
            </pre>
          </Card>
        </TabsContent>

        {/* Tab: Referência */}
        <TabsContent value="reference" className="space-y-4">
          
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Payload enviado pelo Tendenci</h3>
            <p className="text-sm text-muted-foreground mb-3">
              O Tendenci envia POST para seu webhook com este formato:
            </p>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
{`{
  "deal_id": "uuid-do-negocio",
  "client_name": "Nome do Cliente",
  "client_phone": "5534999999999",
  "conversation_history": "Histórico completo da conversa IA...",
  "followup_count": 0,
  "product_type": "Sofá",
  "categoria": "Móveis Soltos",
  "last_interaction": "2025-12-03T10:30:00Z",
  "callback_url": "${projectUrl}/functions/v1/update-followup-history"
}`}
            </pre>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Callback - Atualizar Histórico</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Após enviar a mensagem, n8n deve chamar o callback:
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm mb-3">
              <p><strong>POST:</strong> <code>{projectUrl}/functions/v1/update-followup-history</code></p>
            </div>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
{`{
  "deal_id": "uuid-do-negocio",
  "new_message": "Mensagem gerada pela IA e enviada"
}`}
            </pre>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Detecção de Opt-out</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Quando o cliente responde com palavras de opt-out, o sistema automaticamente:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>Desativa follow-ups para aquele negócio</li>
              <li>Registra na timeline do CRM</li>
              <li>Notifica o vendedor responsável</li>
            </ul>
            <div className="mt-3 p-3 bg-red-500/10 rounded-lg">
              <p className="text-sm font-medium text-red-700">Palavras detectadas:</p>
              <p className="text-xs text-red-600 mt-1">
                pare, parar, não quero, sair, cancelar, desinscrever, stop
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Variáveis Disponíveis no n8n</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Variável</th>
                    <th className="p-2 text-left">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="p-2"><code>{"{{$json.deal_id}}"}</code></td><td className="p-2">ID do negócio</td></tr>
                  <tr><td className="p-2"><code>{"{{$json.client_name}}"}</code></td><td className="p-2">Nome do cliente</td></tr>
                  <tr><td className="p-2"><code>{"{{$json.client_phone}}"}</code></td><td className="p-2">Telefone formatado</td></tr>
                  <tr><td className="p-2"><code>{"{{$json.conversation_history}}"}</code></td><td className="p-2">Histórico completo</td></tr>
                  <tr><td className="p-2"><code>{"{{$json.followup_count}}"}</code></td><td className="p-2">Número do follow-up</td></tr>
                  <tr><td className="p-2"><code>{"{{$json.product_type}}"}</code></td><td className="p-2">Tipo de produto</td></tr>
                  <tr><td className="p-2"><code>{"{{$json.categoria}}"}</code></td><td className="p-2">Categoria</td></tr>
                  <tr><td className="p-2"><code>{"{{$json.callback_url}}"}</code></td><td className="p-2">URL do callback</td></tr>
                </tbody>
              </table>
            </div>
          </Card>

        </TabsContent>
      </Tabs>

      {/* Resumo Final */}
      <Alert className="bg-green-500/10 border-green-500/50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle>Resumo do Fluxo</AlertTitle>
        <AlertDescription className="text-sm">
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Configure a URL do webhook n8n acima</li>
            <li>Importe o workflow JSON no seu n8n</li>
            <li>Configure credenciais da Evolution API no n8n</li>
            <li>Clique em "Disparar Follow-ups" para enviar leads elegíveis</li>
            <li>n8n gera mensagem com IA e envia via WhatsApp</li>
            <li>Histórico é atualizado automaticamente no CRM</li>
            <li>Cliente pode pedir para parar a qualquer momento</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}
