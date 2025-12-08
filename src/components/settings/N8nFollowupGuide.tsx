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
  Loader2,
  ArrowRight,
  Timer,
  Bot,
  Smartphone,
  Database,
  FileJson
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMostRecentDate, get48HoursCutoffUTC } from "@/utils/timezone";

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
    }, 60000);
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
      const { data: followupStage, error: stageError } = await supabase
        .from('crm_stages')
        .select('id')
        .ilike('name', '%Follow Up%')
        .maybeSingle();

      if (stageError) {
        console.warn('Erro ao buscar etapa Follow Up:', stageError);
      }

      let query = supabase
        .from('crm_deals')
        .select(`
          id,
          last_interaction,
          last_followup_at,
          followup_count,
          max_followups,
          leads(
            clients(phone)
          )
        `)
        .eq('followup_enabled', true)
        .eq('status', 'aberto');

      if (followupStage?.id) {
        query = query.eq('stage_id', followupStage.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const cutoffTimestamp = get48HoursCutoffUTC();

      const eligible = (data || []).filter(deal => {
        const currentCount = deal.followup_count || 0;
        const maxFollowups = deal.max_followups || 999;
        if (currentCount >= maxFollowups) return false;
        
        const mostRecentDate = getMostRecentDate(deal.last_interaction, deal.last_followup_at);
        
        if (!mostRecentDate) return true;
        
        const hasValidTime = mostRecentDate.getTime() < cutoffTimestamp;
        
        const leadsData = deal.leads;
        const clientPhone = Array.isArray(leadsData) 
          ? leadsData[0]?.clients?.phone 
          : (leadsData as any)?.clients?.phone;
        const hasPhone = clientPhone && clientPhone.replace(/\D/g, '').length >= 10;
        
        return hasValidTime && hasPhone;
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
          followup_number: 1,
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

    const confirmMessage = `Disparar follow-ups para ${eligibleCount} lead(s)?\n\nNOTA: Os leads serão enviados para n8n, que controlará o intervalo de 3 minutos entre envios.`;
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
          ignore_time_filter: true
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
    a.download = "tendenci-followup-completo-v2.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Workflow JSON baixado!");
  };

  // ===== WORKFLOW n8n COMPLETO E FUNCIONAL =====
  const getWorkflowJSON = () => {
    return {
      "name": "Tendenci Follow-up Automático v2 - Completo",
      "nodes": [
        // 1. WEBHOOK TRIGGER
        {
          "parameters": {
            "httpMethod": "POST",
            "path": "tendenci-followup",
            "responseMode": "responseNode",
            "options": {}
          },
          "id": "webhook-trigger",
          "name": "Webhook Tendenci",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 2,
          "position": [100, 300],
          "webhookId": "tendenci-followup"
        },
        // 2. WAIT - 3 MINUTOS (anti-spam WhatsApp)
        {
          "parameters": {
            "amount": 3,
            "unit": "minutes"
          },
          "id": "wait-3min",
          "name": "Aguardar 3min",
          "type": "n8n-nodes-base.wait",
          "typeVersion": 1.1,
          "position": [320, 300]
        },
        // 3. OPENAI - GERAR MENSAGEM
        {
          "parameters": {
            "resource": "chat",
            "model": "gpt-4o-mini",
            "messages": {
              "values": [
                {
                  "content": "=Você é o Matheus da Tendenci Móveis. Sua tarefa é enviar uma mensagem de follow-up casual e amigável para reengajar um cliente que não respondeu há 2 dias.\n\nREGRAS:\n- Máximo 2 linhas\n- Não force venda\n- Demonstre interesse genuíno em ajudar\n- Varie a abordagem conforme o número do follow-up\n- Use o histórico para personalizar\n\nFollow-up número: {{ $json.followup_number }}\nNome do cliente: {{ $json.client_name }}\nProduto de interesse: {{ $json.product_type }}\nCategoria: {{ $json.categoria }}",
                  "role": "system"
                },
                {
                  "content": "=Histórico da conversa:\n{{ $json.conversation_history }}\n\n---\nGere a mensagem de follow-up {{ $json.followup_number }} para {{ $json.client_name }}:",
                  "role": "user"
                }
              ]
            },
            "options": {
              "temperature": 0.8,
              "maxTokens": 150
            }
          },
          "id": "openai-chat",
          "name": "Gerar Mensagem IA",
          "type": "n8n-nodes-base.openAi",
          "typeVersion": 1.8,
          "position": [540, 300],
          "credentials": {
            "openAiApi": {
              "id": "CONFIGURE_SUA_CREDENCIAL_OPENAI",
              "name": "OpenAI API"
            }
          }
        },
        // 4. SET - Preparar dados para envio
        {
          "parameters": {
            "mode": "manual",
            "duplicateItem": false,
            "assignments": {
              "assignments": [
                {
                  "id": "msg",
                  "name": "mensagem_gerada",
                  "value": "={{ $json.message.content }}",
                  "type": "string"
                },
                {
                  "id": "phone",
                  "name": "telefone_formatado",
                  "value": "={{ $('Webhook Tendenci').item.json.client_phone }}@s.whatsapp.net",
                  "type": "string"
                },
                {
                  "id": "deal",
                  "name": "deal_id",
                  "value": "={{ $('Webhook Tendenci').item.json.deal_id }}",
                  "type": "string"
                },
                {
                  "id": "callback",
                  "name": "callback_url",
                  "value": "={{ $('Webhook Tendenci').item.json.callback_url }}",
                  "type": "string"
                },
                {
                  "id": "followup_num",
                  "name": "followup_number",
                  "value": "={{ $('Webhook Tendenci').item.json.followup_number }}",
                  "type": "number"
                }
              ]
            }
          },
          "id": "set-data",
          "name": "Preparar Dados",
          "type": "n8n-nodes-base.set",
          "typeVersion": 3.4,
          "position": [760, 300]
        },
        // 5. HTTP REQUEST - ENVIAR WHATSAPP via Evolution API
        {
          "parameters": {
            "method": "POST",
            "url": "=https://SUA-EVOLUTION-API.com/message/sendText/SUA-INSTANCIA",
            "sendHeaders": true,
            "headerParameters": {
              "parameters": [
                {
                  "name": "apikey",
                  "value": "SUA_API_KEY_EVOLUTION"
                },
                {
                  "name": "Content-Type",
                  "value": "application/json"
                }
              ]
            },
            "sendBody": true,
            "specifyBody": "json",
            "jsonBody": "={\n  \"number\": \"{{ $json.telefone_formatado }}\",\n  \"text\": \"{{ $json.mensagem_gerada }}\"\n}",
            "options": {
              "timeout": 30000
            }
          },
          "id": "send-whatsapp",
          "name": "Enviar WhatsApp",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4.2,
          "position": [980, 300],
          "continueOnFail": true
        },
        // 6. IF - Verificar se envio foi sucesso
        {
          "parameters": {
            "conditions": {
              "options": {
                "caseSensitive": true,
                "leftValue": "",
                "typeValidation": "strict"
              },
              "conditions": [
                {
                  "id": "check-status",
                  "leftValue": "={{ $json.key || $json.status }}",
                  "rightValue": "",
                  "operator": {
                    "type": "string",
                    "operation": "exists",
                    "singleValue": true
                  }
                }
              ],
              "combinator": "and"
            }
          },
          "id": "if-success",
          "name": "Envio OK?",
          "type": "n8n-nodes-base.if",
          "typeVersion": 2,
          "position": [1200, 300]
        },
        // 7A. HTTP REQUEST - CALLBACK TENDENCI (SUCESSO)
        {
          "parameters": {
            "method": "POST",
            "url": "={{ $('Preparar Dados').item.json.callback_url }}",
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
            "jsonBody": "={\n  \"deal_id\": \"{{ $('Preparar Dados').item.json.deal_id }}\",\n  \"new_message\": \"{{ $('Preparar Dados').item.json.mensagem_gerada }}\",\n  \"followup_number\": {{ $('Preparar Dados').item.json.followup_number }}\n}",
            "options": {}
          },
          "id": "callback-success",
          "name": "Atualizar CRM",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4.2,
          "position": [1420, 200]
        },
        // 7B. RESPOND SUCCESS
        {
          "parameters": {
            "respondWith": "json",
            "responseBody": "={\n  \"success\": true,\n  \"deal_id\": \"{{ $('Preparar Dados').item.json.deal_id }}\",\n  \"message\": \"Follow-up {{ $('Preparar Dados').item.json.followup_number }} enviado com sucesso\"\n}"
          },
          "id": "respond-success",
          "name": "Responder Sucesso",
          "type": "n8n-nodes-base.respondToWebhook",
          "typeVersion": 1.1,
          "position": [1640, 200]
        },
        // 8A. RESPOND ERROR
        {
          "parameters": {
            "respondWith": "json",
            "responseBody": "={\n  \"success\": false,\n  \"deal_id\": \"{{ $('Preparar Dados').item.json.deal_id }}\",\n  \"error\": \"Falha ao enviar WhatsApp\",\n  \"details\": {{ JSON.stringify($json) }}\n}",
            "options": {
              "responseCode": 500
            }
          },
          "id": "respond-error",
          "name": "Responder Erro",
          "type": "n8n-nodes-base.respondToWebhook",
          "typeVersion": 1.1,
          "position": [1420, 420]
        }
      ],
      "connections": {
        "Webhook Tendenci": {
          "main": [[{ "node": "Aguardar 3min", "type": "main", "index": 0 }]]
        },
        "Aguardar 3min": {
          "main": [[{ "node": "Gerar Mensagem IA", "type": "main", "index": 0 }]]
        },
        "Gerar Mensagem IA": {
          "main": [[{ "node": "Preparar Dados", "type": "main", "index": 0 }]]
        },
        "Preparar Dados": {
          "main": [[{ "node": "Enviar WhatsApp", "type": "main", "index": 0 }]]
        },
        "Enviar WhatsApp": {
          "main": [[{ "node": "Envio OK?", "type": "main", "index": 0 }]]
        },
        "Envio OK?": {
          "main": [
            [{ "node": "Atualizar CRM", "type": "main", "index": 0 }],
            [{ "node": "Responder Erro", "type": "main", "index": 0 }]
          ]
        },
        "Atualizar CRM": {
          "main": [[{ "node": "Responder Sucesso", "type": "main", "index": 0 }]]
        }
      },
      "pinData": {},
      "settings": {
        "executionOrder": "v1"
      },
      "staticData": null,
      "tags": [],
      "triggerCount": 0,
      "updatedAt": new Date().toISOString(),
      "versionId": "v2-completo"
    };
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Follow-up Automático via n8n</h2>
        <p className="text-muted-foreground">
          Workflow completo e funcional - Baixe o JSON e importe no n8n
        </p>
      </div>

      {/* Visual do Fluxo */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Arquitetura do Fluxo
        </h3>
        <div className="flex items-center justify-center gap-2 flex-wrap text-sm">
          <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border">
            <Zap className="h-4 w-4 text-orange-500" />
            <span>Webhook</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border">
            <Timer className="h-4 w-4 text-blue-500" />
            <span>Wait 3min</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border">
            <Bot className="h-4 w-4 text-purple-500" />
            <span>OpenAI</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border">
            <Smartphone className="h-4 w-4 text-green-500" />
            <span>WhatsApp</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border">
            <Database className="h-4 w-4 text-cyan-500" />
            <span>Callback</span>
          </div>
        </div>
      </Card>

      {/* Download do Workflow */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Workflow n8n Completo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Pronto para usar!</AlertTitle>
            <AlertDescription className="text-sm">
              O JSON inclui todos os nós configurados: Webhook, Wait 3min, OpenAI, Envio WhatsApp, 
              verificação de sucesso com IF, callback para CRM, e respostas de sucesso/erro.
            </AlertDescription>
          </Alert>

          <Button onClick={downloadWorkflowJSON} size="lg" className="w-full">
            <Download className="h-5 w-5 mr-2" />
            Baixar Workflow JSON (Importar no n8n)
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-2xl font-bold text-primary">8</div>
              <div className="text-xs text-muted-foreground">Nós configurados</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-2xl font-bold text-primary">3min</div>
              <div className="text-xs text-muted-foreground">Delay anti-spam</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-2xl font-bold text-primary">✓</div>
              <div className="text-xs text-muted-foreground">Error handling</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração do Webhook */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração do Webhook n8n
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL do Webhook n8n (após importar o workflow)</Label>
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
            disabled={!webhookUrl || dispatching}
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
                Disparar Follow-ups Agora {eligibleCount !== null && eligibleCount > 0 && `(${eligibleCount})`}
              </>
            )}
          </Button>

          {!webhookUrl && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Configure a URL do webhook acima para habilitar o disparo.
              </AlertDescription>
            </Alert>
          )}
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

      {/* Tabs */}
      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">Setup Rápido</TabsTrigger>
          <TabsTrigger value="credentials">Credenciais</TabsTrigger>
          <TabsTrigger value="json">JSON Workflow</TabsTrigger>
          <TabsTrigger value="reference">Referência</TabsTrigger>
        </TabsList>

        {/* Tab: Setup Rápido */}
        <TabsContent value="setup" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">🚀 Setup em 5 Passos</h3>
            
            <div className="space-y-4">
              <div className="flex gap-3 items-start p-3 bg-muted rounded-lg">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div>
                  <p className="font-medium">Baixar workflow JSON</p>
                  <p className="text-sm text-muted-foreground">Clique no botão acima para baixar o arquivo</p>
                </div>
              </div>

              <div className="flex gap-3 items-start p-3 bg-muted rounded-lg">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div>
                  <p className="font-medium">Importar no n8n</p>
                  <p className="text-sm text-muted-foreground">No n8n: Menu → Import from File → selecione o JSON</p>
                </div>
              </div>

              <div className="flex gap-3 items-start p-3 bg-muted rounded-lg">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <div>
                  <p className="font-medium">Configurar credencial OpenAI</p>
                  <p className="text-sm text-muted-foreground">Clique no nó "Gerar Mensagem IA" → Credential → Create New</p>
                </div>
              </div>

              <div className="flex gap-3 items-start p-3 bg-muted rounded-lg">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div>
                <div>
                  <p className="font-medium">Configurar Evolution API</p>
                  <p className="text-sm text-muted-foreground">
                    No nó "Enviar WhatsApp", substitua:<br/>
                    • <code className="bg-background px-1 rounded text-xs">SUA-EVOLUTION-API.com</code> pela URL da sua Evolution<br/>
                    • <code className="bg-background px-1 rounded text-xs">SUA-INSTANCIA</code> pelo nome da instância<br/>
                    • <code className="bg-background px-1 rounded text-xs">SUA_API_KEY_EVOLUTION</code> pela sua API key
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start p-3 bg-muted rounded-lg">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">5</div>
                <div>
                  <p className="font-medium">Ativar e testar</p>
                  <p className="text-sm text-muted-foreground">
                    Ative o workflow no n8n, copie a URL do webhook e cole no campo acima. 
                    Clique em "Testar Conexão".
                  </p>
                </div>
              </div>
            </div>

            <Alert className="mt-4 bg-orange-500/10 border-orange-500/50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm">
                <strong>Importante:</strong> O Wait de 3 minutos é obrigatório para evitar bloqueio da conta WhatsApp.
                Não remova este nó!
              </AlertDescription>
            </Alert>
          </Card>
        </TabsContent>

        {/* Tab: Credenciais */}
        <TabsContent value="credentials" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">🔐 Configuração de Credenciais no n8n</h3>

            <div className="space-y-6">
              {/* OpenAI */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Bot className="h-4 w-4 text-purple-500" />
                  Credencial OpenAI
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>No n8n, clique no nó "Gerar Mensagem IA"</li>
                  <li>Em "Credential to connect with", clique em "Create New"</li>
                  <li>Selecione "OpenAI API"</li>
                  <li>Cole sua API Key da OpenAI</li>
                  <li>Salve a credencial</li>
                </ol>
                <div className="mt-3 p-3 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">
                    💡 Obtenha sua API Key em: <a href="https://platform.openai.com/api-keys" target="_blank" className="text-primary hover:underline">platform.openai.com/api-keys</a>
                  </p>
                </div>
              </div>

              {/* Evolution API */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Smartphone className="h-4 w-4 text-green-500" />
                  Evolution API (WhatsApp)
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  No nó "Enviar WhatsApp", edite diretamente os valores:
                </p>
                <div className="space-y-2 font-mono text-xs bg-muted p-3 rounded">
                  <div className="flex justify-between items-center">
                    <span>URL:</span>
                    <code className="bg-background px-2 py-1 rounded">https://sua-evolution.com</code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Instância:</span>
                    <code className="bg-background px-2 py-1 rounded">nome-da-instancia</code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>API Key:</span>
                    <code className="bg-background px-2 py-1 rounded">sua-api-key-aqui</code>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Endpoints Tendenci */}
          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold text-lg mb-4">🔗 Endpoints do Tendenci</h3>
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
                <p className="text-sm font-medium mb-1">Edge Function - Callback (atualizar histórico)</p>
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
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[500px]">
              {JSON.stringify(getWorkflowJSON(), null, 2)}
            </pre>
          </Card>
        </TabsContent>

        {/* Tab: Referência */}
        <TabsContent value="reference" className="space-y-4">
          
          <Card className="p-6">
            <h3 className="font-semibold mb-4">📤 Payload enviado pelo Tendenci</h3>
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
  "followup_number": 1,
  "product_type": "Sofá",
  "categoria": "Móveis Soltos",
  "last_interaction": "2025-12-03T10:30:00Z",
  "callback_url": "${projectUrl}/functions/v1/update-followup-history"
}`}
            </pre>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">📥 Callback - Atualizar Histórico</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Após enviar a mensagem, n8n deve chamar o callback:
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm mb-3">
              <p><strong>POST:</strong> <code>{projectUrl}/functions/v1/update-followup-history</code></p>
            </div>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
{`{
  "deal_id": "uuid-do-negocio",
  "new_message": "Mensagem gerada pela IA e enviada",
  "followup_number": 1
}`}
            </pre>
            <Alert className="mt-3">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                O <code>followup_number</code> é importante para registrar corretamente qual número de follow-up foi enviado.
              </AlertDescription>
            </Alert>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">📋 Variáveis Disponíveis no n8n</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Variável</th>
                    <th className="p-2 text-left">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="p-2"><code>{"{{ $json.deal_id }}"}</code></td><td className="p-2">ID do negócio</td></tr>
                  <tr><td className="p-2"><code>{"{{ $json.client_name }}"}</code></td><td className="p-2">Nome do cliente</td></tr>
                  <tr><td className="p-2"><code>{"{{ $json.client_phone }}"}</code></td><td className="p-2">Telefone formatado</td></tr>
                  <tr><td className="p-2"><code>{"{{ $json.conversation_history }}"}</code></td><td className="p-2">Histórico completo</td></tr>
                  <tr><td className="p-2"><code>{"{{ $json.followup_count }}"}</code></td><td className="p-2">Contador atual</td></tr>
                  <tr><td className="p-2"><code>{"{{ $json.followup_number }}"}</code></td><td className="p-2">Número do follow-up</td></tr>
                  <tr><td className="p-2"><code>{"{{ $json.product_type }}"}</code></td><td className="p-2">Tipo de produto</td></tr>
                  <tr><td className="p-2"><code>{"{{ $json.categoria }}"}</code></td><td className="p-2">Categoria</td></tr>
                  <tr><td className="p-2"><code>{"{{ $json.callback_url }}"}</code></td><td className="p-2">URL do callback</td></tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">🛑 Detecção de Opt-out</h3>
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

        </TabsContent>
      </Tabs>

      {/* Resumo Final */}
      <Alert className="bg-green-500/10 border-green-500/50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle>Workflow Pronto!</AlertTitle>
        <AlertDescription className="text-sm">
          Baixe o JSON, importe no n8n, configure suas credenciais (OpenAI + Evolution API), e comece a disparar follow-ups automáticos.
          O workflow inclui delay de 3 minutos entre envios para proteção da conta WhatsApp.
        </AlertDescription>
      </Alert>
    </div>
  );
}
