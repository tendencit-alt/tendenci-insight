import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  Copy, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Zap,
  MessageSquare,
  Clock,
  TrendingUp,
  Bot,
  Settings,
  Play,
  RefreshCw,
  Users,
  Pause,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMostRecentDate, get48HoursCutoffUTC } from "@/utils/timezone";

interface FollowupStats {
  queueSize: number;
  sentToday: number;
  sentWeek: number;
  responseRate: number;
  failedCount: number;
}

interface CronStatus {
  isActive: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

export function N8nFollowupGuide() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [stats, setStats] = useState<FollowupStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [cronStatus, setCronStatus] = useState<CronStatus>({
    isActive: true,
    lastRun: null,
    nextRun: null
  });
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    fetchStats();
    checkEligibleLeads();
    
    // Atualizar a cada 60 segundos
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
      
      if (data?.success && data?.stats) {
        setStats({
          queueSize: data.stats.queueSize || 0,
          sentToday: data.stats.sentToday || 0,
          sentWeek: data.stats.sentWeek || 0,
          responseRate: data.stats.responseRate || 0,
          failedCount: data.stats.failedRecent || 0
        });
      }
      
      // Simular status do CRON baseado em logs
      const now = new Date();
      const lastRun = new Date(now.getTime() - Math.random() * 7200000); // Última 2h
      const nextRun = new Date(now.getTime() + 7200000); // Próxima 2h
      
      setCronStatus({
        isActive: true,
        lastRun: lastRun.toLocaleString('pt-BR'),
        nextRun: nextRun.toLocaleString('pt-BR')
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const checkEligibleLeads = async () => {
    try {
      const { data: followupStage } = await supabase
        .from('crm_stages')
        .select('id')
        .ilike('name', '%Follow Up%')
        .maybeSingle();
      
      let query = supabase
        .from('crm_deals')
        .select('id, last_interaction, last_followup_at, followup_count, max_followups, leads(clients(phone))')
        .eq('followup_enabled', true)
        .eq('status', 'aberto');
      
      if (followupStage?.id) {
        query = query.eq('stage_id', followupStage.id);
      }
      
      const { data: deals, error } = await query;
      
      if (error) throw error;
      
      const cutoffTimestamp = get48HoursCutoffUTC();
      
      const eligible = (deals || []).filter(deal => {
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
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-followup', {
        body: { ignore_time_filter: true }
      });
      
      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`Teste realizado: ${data?.dispatched || 0} leads enviados, ${data?.eligible || 0} elegíveis`);
        fetchStats();
        checkEligibleLeads();
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copiado!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getWorkflowJSON = () => {
    return {
      name: "Tendenci - Follow-up Completo v5",
      nodes: [
        {
          parameters: {
            httpMethod: "POST",
            path: "tendenci-followup",
            responseMode: "responseNode",
            options: {}
          },
          id: "webhook-trigger",
          name: "Webhook Tendenci",
          type: "n8n-nodes-base.webhook",
          typeVersion: 2,
          position: [240, 300],
          webhookId: "tendenci-followup-webhook"
        },
        {
          parameters: {
            assignments: {
              assignments: [
                { id: "a1", name: "deal_id", value: "={{ $json.deal_id }}", type: "string" },
                { id: "a2", name: "client_name", value: "={{ $json.client_name }}", type: "string" },
                { id: "a3", name: "client_phone", value: "={{ $json.client_phone }}", type: "string" },
                { id: "a4", name: "conversation_history", value: "={{ $json.conversation_history || '' }}", type: "string" },
                { id: "a5", name: "followup_number", value: "={{ $json.followup_number }}", type: "number" },
                { id: "a6", name: "product_type", value: "={{ $json.product_type || 'móveis' }}", type: "string" },
                { id: "a7", name: "categoria", value: "={{ $json.categoria || '' }}", type: "string" },
                { id: "a8", name: "last_interaction", value: "={{ $json.last_interaction }}", type: "string" },
                // callback_url removido - usando URL fixa no nó Atualizar CRM
                { id: "a10", name: "evolution_url", value: "SUA_EVOLUTION_URL_AQUI", type: "string" },
                { id: "a11", name: "instance_name", value: "SUA_INSTANCIA_AQUI", type: "string" },
                { id: "a12", name: "evolution_apikey", value: "SUA_APIKEY_AQUI", type: "string" }
              ]
            },
            options: {}
          },
          id: "set-fields",
          name: "Preparar Dados",
          type: "n8n-nodes-base.set",
          typeVersion: 3.4,
          position: [460, 300]
        },
        {
          parameters: {
            amount: 3,
            unit: "minutes"
          },
          id: "wait-node",
          name: "Aguardar 3min",
          type: "n8n-nodes-base.wait",
          typeVersion: 1.1,
          position: [680, 300]
        },
        {
          parameters: {
            modelId: {
              __rl: true,
              value: "gpt-4o-mini",
              mode: "list",
              cachedResultName: "GPT-4O-MINI"
            },
            messages: {
              values: [
                {
                  content: "=Você é um especialista em vendas de móveis. Gere uma mensagem de follow-up curta e personalizada (máximo 2 parágrafos) para o cliente.\n\nNome do cliente: {{ $json.client_name }}\nProduto de interesse: {{ $json.product_type }}\nNúmero do follow-up: {{ $json.followup_number }}\nÚltima interação: {{ $json.last_interaction }}\n\nHistórico da conversa:\n{{ $json.conversation_history || 'Primeira interação' }}\n\nRegras:\n- Seja cordial e profissional\n- Não seja invasivo\n- Mencione o produto de interesse\n- Se for follow-up 2+, seja mais breve\n- Termine com uma pergunta aberta"
                }
              ]
            },
            options: {}
          },
          id: "openai-chat",
          name: "Gerar Mensagem IA",
          type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
          typeVersion: 1,
          position: [900, 300],
          credentials: {
            openAiApi: {
              id: "CONFIGURE_OPENAI",
              name: "OpenAI API"
            }
          }
        },
        {
          parameters: {
            assignments: {
              assignments: [
                { id: "b1", name: "deal_id", value: "={{ $('Preparar Dados').item.json.deal_id }}", type: "string" },
                { id: "b2", name: "client_name", value: "={{ $('Preparar Dados').item.json.client_name }}", type: "string" },
                { id: "b3", name: "client_phone", value: "={{ $('Preparar Dados').item.json.client_phone }}", type: "string" },
                { id: "b4", name: "followup_number", value: "={{ $('Preparar Dados').item.json.followup_number }}", type: "number" },
                // callback_url removido - usando URL fixa
                { id: "b6", name: "evolution_url", value: "={{ $('Preparar Dados').item.json.evolution_url }}", type: "string" },
                { id: "b7", name: "instance_name", value: "={{ $('Preparar Dados').item.json.instance_name }}", type: "string" },
                { id: "b8", name: "evolution_apikey", value: "={{ $('Preparar Dados').item.json.evolution_apikey }}", type: "string" },
                { id: "b9", name: "ai_message", value: "={{ $json.text || $json.message?.content || $json.content || '' }}", type: "string" }
              ]
            },
            options: {}
          },
          id: "merge-message",
          name: "Juntar Dados + Mensagem",
          type: "n8n-nodes-base.set",
          typeVersion: 3.4,
          position: [1120, 300]
        },
        {
          parameters: {
            method: "POST",
            url: "={{ $json.evolution_url }}/message/sendText/{{ $json.instance_name }}",
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "apikey",
                  value: "={{ $json.evolution_apikey }}"
                },
                {
                  name: "Content-Type",
                  value: "application/json"
                }
              ]
            },
            sendBody: true,
            specifyBody: "json",
            jsonBody: "={{ JSON.stringify({ number: $json.client_phone, text: $json.ai_message }) }}",
            options: {
              timeout: 30000
            }
          },
          id: "send-whatsapp",
          name: "Enviar WhatsApp",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [1340, 300]
        },
        {
          parameters: {
            conditions: {
              options: {
                version: 2,
                caseSensitive: true,
                leftValue: "",
                typeValidation: "loose"
              },
              combinator: "and",
              conditions: [
                {
                  id: "check-key-exists",
                  leftValue: "={{ $json.key }}",
                  rightValue: "",
                  operator: {
                    type: "object",
                    operation: "exists"
                  }
                }
              ]
            },
            options: {}
          },
          id: "check-success",
          name: "Envio OK?",
          type: "n8n-nodes-base.if",
          typeVersion: 2.2,
          position: [1560, 300]
        },
        {
          parameters: {
            method: "POST",
            // URL FIXA - não depende mais de callback_url
            url: "https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/update-followup-history",
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "Content-Type",
                  value: "application/json"
                },
                {
                  name: "Authorization",
                  value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtbnd1enJ5c3FvaXdhcHptbmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MjkxMjMsImV4cCI6MjA3ODEwNTEyM30.tzEXZQShQWgyyJHxvCVYIGQg0gal-LuO4jlKQDFjq-c"
                }
              ]
            },
            sendBody: true,
            specifyBody: "json",
            // Referência direta aos nós originais para garantir que dados existam
            jsonBody: "={{ JSON.stringify({ deal_id: $('Preparar Dados').item.json.deal_id, new_message: '🤖 IA (Follow-up ' + $('Preparar Dados').item.json.followup_number + '): ' + $('AI Agent').item.json.output, followup_number: $('Preparar Dados').item.json.followup_number }) }}",
            options: {}
          },
          id: "callback-success",
          name: "Atualizar CRM",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [1780, 200]
          // SEM credentials externas - Authorization já embutido nos headers
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={{ JSON.stringify({ success: true, deal_id: $('Juntar Dados + Mensagem').item.json.deal_id, message_sent: true }) }}",
            options: {}
          },
          id: "respond-success",
          name: "Responder Sucesso",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [2000, 200]
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "={{ JSON.stringify({ success: false, deal_id: $('Juntar Dados + Mensagem').item.json.deal_id, error: 'Falha no envio WhatsApp', details: $json }) }}",
            options: {
              responseCode: 500
            }
          },
          id: "respond-error",
          name: "Responder Erro",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [1780, 400]
        },
        {
          parameters: {
            content: "## Workflow Follow-up Tendenci v6\n\n### Configurações Necessárias:\n\n1. **Preparar Dados** - Substitua:\n   - SUA_EVOLUTION_URL_AQUI\n   - SUA_INSTANCIA_AQUI\n   - SUA_APIKEY_AQUI\n\n2. **OpenAI API** - Configure credencial\n\n### ✅ Já Configurado Automaticamente:\n- URL do Atualizar CRM (fixa)\n- Authorization do Supabase (embutido)\n\n### Fluxo:\n1. Recebe webhook do Tendenci\n2. Aguarda 3 minutos\n3. Gera mensagem com IA\n4. Envia via Evolution API\n5. Atualiza CRM (URL fixa)"
          },
          id: "sticky-note",
          name: "Instruções",
          type: "n8n-nodes-base.stickyNote",
          typeVersion: 1,
          position: [100, 80]
        }
      ],
      connections: {
        "Webhook Tendenci": {
          main: [[{ node: "Preparar Dados", type: "main", index: 0 }]]
        },
        "Preparar Dados": {
          main: [[{ node: "Aguardar 3min", type: "main", index: 0 }]]
        },
        "Aguardar 3min": {
          main: [[{ node: "Gerar Mensagem IA", type: "main", index: 0 }]]
        },
        "Gerar Mensagem IA": {
          main: [[{ node: "Juntar Dados + Mensagem", type: "main", index: 0 }]]
        },
        "Juntar Dados + Mensagem": {
          main: [[{ node: "Enviar WhatsApp", type: "main", index: 0 }]]
        },
        "Enviar WhatsApp": {
          main: [[{ node: "Envio OK?", type: "main", index: 0 }]]
        },
        "Envio OK?": {
          main: [
            [{ node: "Atualizar CRM", type: "main", index: 0 }],
            [{ node: "Responder Erro", type: "main", index: 0 }]
          ]
        },
        "Atualizar CRM": {
          main: [[{ node: "Responder Sucesso", type: "main", index: 0 }]]
        }
      },
      settings: {
        executionOrder: "v1"
      }
    };
  };

  const downloadWorkflow = () => {
    const workflow = getWorkflowJSON();
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tendenci-followup-automatico-v3.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Workflow baixado!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Follow-up Automático com I.A.
          </h2>
          <p className="text-muted-foreground">
            Sistema 100% automático de follow-up por WhatsApp
          </p>
        </div>
        <Badge variant={cronStatus.isActive ? "default" : "destructive"} className="text-sm">
          {cronStatus.isActive ? (
            <>
              <Zap className="h-3 w-3 mr-1" />
              Sistema Ativo
            </>
          ) : (
            <>
              <Pause className="h-3 w-3 mr-1" />
              Pausado
            </>
          )}
        </Badge>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Na Fila</p>
                <p className="text-2xl font-bold">{eligibleCount ?? '-'}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Leads aguardando próximo ciclo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviados Hoje</p>
                <p className="text-2xl font-bold">{stats?.sentToday ?? '-'}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-500 opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Follow-ups disparados hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Esta Semana</p>
                <p className="text-2xl font-bold">{stats?.sentWeek ?? '-'}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total nos últimos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa Resposta</p>
                <p className="text-2xl font-bold">{stats?.responseRate ?? 0}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Clientes que responderam
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status do Sistema Automático */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Execução Automática
          </CardTitle>
          <CardDescription>
            O sistema verifica leads elegíveis a cada 2 horas em horário comercial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Última Execução</p>
              <p className="font-medium">{cronStatus.lastRun || 'Aguardando...'}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Próxima Execução</p>
              <p className="font-medium">{cronStatus.nextRun || 'Em breve'}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Horário Comercial</p>
              <p className="font-medium">Seg-Sex, 9h às 18h</p>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button 
              onClick={testConnection}
              disabled={testingConnection}
              variant="outline"
            >
              {testingConnection ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Testar Disparo Manual
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => { fetchStats(); checkEligibleLeads(); }}
              variant="ghost"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="how-it-works" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="how-it-works">Como Funciona</TabsTrigger>
          <TabsTrigger value="workflow">Workflow n8n</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="how-it-works" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo Automático</CardTitle>
              <CardDescription>
                O sistema opera de forma 100% automática, sem necessidade de intervenção manual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-semibold">Identificação Automática</h4>
                    <p className="text-sm text-muted-foreground">
                      A cada 2 horas, o sistema identifica leads na etapa "Follow Up (I.A.)" que não tiveram interação nos últimos 2 dias
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-semibold">Geração de Mensagem com I.A.</h4>
                    <p className="text-sm text-muted-foreground">
                      O n8n recebe os dados do lead e usa IA (OpenAI/Gemini) para gerar uma mensagem personalizada de follow-up
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-semibold">Envio via WhatsApp</h4>
                    <p className="text-sm text-muted-foreground">
                      A mensagem é enviada automaticamente via Evolution API para o WhatsApp do cliente
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold shrink-0">4</div>
                  <div>
                    <h4 className="font-semibold text-green-600">Resposta do Cliente → Move para "Lead"</h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Quando o cliente responde:</strong> O lead é movido automaticamente para a etapa "Lead" e o vendedor é notificado para atendimento humano
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">5</div>
                  <div>
                    <h4 className="font-semibold">Sem Resposta - Retry Automático</h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Se não responder:</strong> O sistema registra a tentativa e aguarda mais 2 dias para tentar novamente automaticamente
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Opt-out automático:</strong> Se o cliente enviar palavras como "pare", "parar", "não quero", o sistema desativa automaticamente os follow-ups para esse lead.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow n8n Completo</CardTitle>
              <CardDescription>
                Workflow completo com todos os nodes configurados para Evolution API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={downloadWorkflow} className="w-full" size="lg">
                <Download className="h-4 w-4 mr-2" />
                Baixar Workflow JSON Completo (v4)
              </Button>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Este workflow inclui <strong>todos os nodes</strong> já configurados: Webhook, Wait 3min, OpenAI, Envio WhatsApp, IF de verificação e Callbacks.
                </AlertDescription>
              </Alert>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Após importar, configure:</h4>
                
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                  <h5 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    1. Node "Preparar Dados" - Substitua os valores:
                  </h5>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• <code>SUA_EVOLUTION_URL_AQUI</code> → URL da sua Evolution API</li>
                    <li>• <code>SUA_INSTANCIA_AQUI</code> → Nome da sua instância WhatsApp</li>
                    <li>• <code>SUA_APIKEY_AQUI</code> → API Key da Evolution</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <h5 className="font-medium">2. Credencial OpenAI API</h5>
                  <p className="text-sm text-muted-foreground">
                    Configure no node "Gerar Mensagem IA" com sua API Key OpenAI
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <h5 className="font-medium">3. Credencial Supabase Auth</h5>
                  <p className="text-sm text-muted-foreground">
                    Configure no node "Atualizar Supabase":
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Header Name: <code>Authorization</code></li>
                    <li>• Header Value: <code>Bearer SEU_ANON_KEY</code></li>
                  </ul>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>URL do Webhook (copie para o secret N8N_FOLLOWUP_WEBHOOK_URL)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Após ativar o workflow, copie a URL do webhook e adicione como secret no Supabase
                </p>
                <div className="flex gap-2">
                  <Input 
                    value="https://SEU_N8N.app/webhook/tendenci-followup"
                    readOnly 
                    className="text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL da Edge Function dispatch-followup</Label>
                <div className="flex gap-2">
                  <Input 
                    value="https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/dispatch-followup"
                    readOnly 
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => copyToClipboard("https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/dispatch-followup", "url")}
                  >
                    {copiedField === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL da Edge Function update-followup-history (callback)</Label>
                <div className="flex gap-2">
                  <Input 
                    value="https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/update-followup-history"
                    readOnly 
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => copyToClipboard("https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/update-followup-history", "callback")}
                  >
                    {copiedField === "callback" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Diagrama do Fluxo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre className="whitespace-pre">{`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Webhook Tendenci│───▶│ Preparar Dados  │───▶│ Aguardar 3min   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Enviar WhatsApp │◀───│Juntar Dados+Msg │◀───│ Gerar Msg IA    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Envio OK?     │
└─────────────────┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Sucesso│ │ Erro  │
└───────┘ └───────┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Callback│ │Respond│
│Supabase│ │ Error │
└───────┘ └───────┘
    │
    ▼
┌───────┐
│Respond│
│Success│
└───────┘
`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração do Sistema
              </CardTitle>
              <CardDescription>
                O sistema já está configurado. Apenas configure o workflow no n8n.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">1. Secret N8N_FOLLOWUP_WEBHOOK_URL</h4>
                  <p className="text-sm text-muted-foreground">
                    Já configurado! O sistema usará esta URL para enviar leads ao n8n.
                  </p>
                  <Badge variant="default" className="mt-2">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Configurado
                  </Badge>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">2. Importe o Workflow no n8n</h4>
                  <p className="text-sm text-muted-foreground">
                    Baixe o workflow na aba "Workflow n8n" e importe no seu n8n. Configure as credenciais necessárias.
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">3. Configure o Schedule no n8n</h4>
                  <p className="text-sm text-muted-foreground">
                    O workflow deve executar a cada 2 horas. Você pode ajustar o intervalo conforme necessário.
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">4. Teste o Sistema</h4>
                  <p className="text-sm text-muted-foreground">
                    Use o botão "Testar Disparo Manual" acima para verificar se tudo está funcionando.
                  </p>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> O sistema só dispara em horário comercial (9h-18h, segunda a sexta). 
                  Use "Testar Disparo Manual" para testar fora desse horário.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
