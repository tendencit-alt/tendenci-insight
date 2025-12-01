import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  XCircle
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

export function N8nFollowupGuide() {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [stats, setStats] = useState<FollowupStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // atualiza a cada 30s
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
    a.download = "tendenci-followup-workflow.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Workflow JSON baixado!");
  };

  const getWorkflowJSON = () => {
    return {
      "name": "Tendenci - Follow-up Automático (48h)",
      "nodes": [
        {
          "parameters": {
            "rule": {
              "interval": [
                {
                  "field": "cronExpression",
                  "expression": "*/30 * * * *"
                }
              ]
            }
          },
          "name": "Schedule Trigger",
          "type": "n8n-nodes-base.scheduleTrigger",
          "typeVersion": 1.1,
          "position": [250, 300]
        },
        {
          "parameters": {
            "method": "POST",
            "url": `${projectUrl}/rest/v1/rpc/get_pending_followups`,
            "authentication": "genericCredentialType",
            "genericAuthType": "httpHeaderAuth",
            "sendHeaders": true,
            "headerParameters": {
              "parameters": [
                {
                  "name": "apikey",
                  "value": anonKey
                },
                {
                  "name": "Content-Type",
                  "value": "application/json"
                }
              ]
            },
            "sendBody": true,
            "bodyParameters": {
              "parameters": []
            },
            "options": {}
          },
          "name": "Buscar Leads Pendentes",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4.1,
          "position": [470, 300]
        },
        {
          "parameters": {
            "conditions": {
              "boolean": [
                {
                  "value1": "={{$json.body && $json.body.length > 0}}",
                  "value2": true
                }
              ]
            }
          },
          "name": "IF - Tem Leads?",
          "type": "n8n-nodes-base.if",
          "typeVersion": 2,
          "position": [690, 300]
        },
        {
          "parameters": {
            "batchSize": 1,
            "options": {}
          },
          "name": "Split In Batches",
          "type": "n8n-nodes-base.splitInBatches",
          "typeVersion": 3,
          "position": [910, 200]
        },
        {
          "parameters": {
            "promptType": "define",
            "text": "={{$json.conversation_history}}",
            "options": {
              "systemMessage": "Você é o Matheus da Tendenci Móveis. Envie uma mensagem de follow-up casual e amigável para reengajar o cliente que não respondeu há 2 dias. Use o histórico de conversa para personalizar. Seja breve (máximo 2 linhas). Não force venda, apenas demonstre interesse genuíno em ajudar."
            }
          },
          "name": "Gerar Mensagem IA",
          "type": "@n8n/n8n-nodes-langchain.agent",
          "typeVersion": 1.6,
          "position": [1130, 200]
        },
        {
          "parameters": {
            "method": "POST",
            "url": "={{$json.evolution_url}}/message/sendText/={{$json.instance_name}}",
            "sendHeaders": true,
            "headerParameters": {
              "parameters": [
                {
                  "name": "apikey",
                  "value": "={{$json.evolution_apikey}}"
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
          "position": [1350, 200]
        },
        {
          "parameters": {
            "method": "POST",
            "url": `${projectUrl}/functions/v1/update-followup-history`,
            "sendHeaders": true,
            "headerParameters": {
              "parameters": [
                {
                  "name": "Authorization",
                  "value": `Bearer ${anonKey}`
                },
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
          "position": [1570, 200]
        },
        {
          "parameters": {
            "amount": 3,
            "unit": "minutes"
          },
          "name": "Wait 3min",
          "type": "n8n-nodes-base.wait",
          "typeVersion": 1.1,
          "position": [1790, 200],
          "webhookId": "followup-delay"
        }
      ],
      "connections": {
        "Schedule Trigger": {
          "main": [[{ "node": "Buscar Leads Pendentes", "type": "main", "index": 0 }]]
        },
        "Buscar Leads Pendentes": {
          "main": [[{ "node": "IF - Tem Leads?", "type": "main", "index": 0 }]]
        },
        "IF - Tem Leads?": {
          "main": [[{ "node": "Split In Batches", "type": "main", "index": 0 }]]
        },
        "Split In Batches": {
          "main": [
            [{ "node": "Gerar Mensagem IA", "type": "main", "index": 0 }],
            [{ "node": "Split In Batches", "type": "main", "index": 0 }]
          ]
        },
        "Gerar Mensagem IA": {
          "main": [[{ "node": "Enviar WhatsApp", "type": "main", "index": 0 }]]
        },
        "Enviar WhatsApp": {
          "main": [[{ "node": "Atualizar Histórico CRM", "type": "main", "index": 0 }]]
        },
        "Atualizar Histórico CRM": {
          "main": [[{ "node": "Wait 3min", "type": "main", "index": 0 }]]
        }
      },
      "pinData": {}
    };
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Follow-up Automático - n8n</h2>
        <p className="text-muted-foreground">
          Sistema de follow-up automático a cada 48 horas para leads na etapa "Follow Up (I.A)"
        </p>
      </div>

      <Alert>
        <Zap className="h-4 w-4" />
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription>
          O n8n verifica a cada 30 minutos se há leads que não responderam há 48 horas. 
          Para cada lead elegível, a IA gera mensagem personalizada, envia via WhatsApp, 
          e atualiza o histórico no CRM. Máximo de 5 follow-ups por lead.
        </AlertDescription>
      </Alert>

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
        <h3 className="font-semibold text-lg mb-4">🔐 Credenciais</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">RPC Endpoint (Buscar Leads)</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-background p-2 rounded text-xs break-all">
                {projectUrl}/rest/v1/rpc/get_pending_followups
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(`${projectUrl}/rest/v1/rpc/get_pending_followups`, "RPC Endpoint")}
              >
                {copiedField === "RPC Endpoint" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Edge Function (Atualizar Histórico)</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-background p-2 rounded text-xs break-all">
                {projectUrl}/functions/v1/update-followup-history
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(`${projectUrl}/functions/v1/update-followup-history`, "Edge Function")}
              >
                {copiedField === "Edge Function" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">API Key (Supabase Anon)</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-background p-2 rounded text-xs break-all">
                {anonKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(anonKey, "API Key")}
              >
                {copiedField === "API Key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button 
            onClick={downloadWorkflowJSON} 
            variant="default" 
            className="w-full mt-4"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Workflow Completo (JSON)
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="json">JSON Workflow</TabsTrigger>
          <TabsTrigger value="reference">Referência</TabsTrigger>
        </TabsList>

        {/* Tab: Configuração */}
        <TabsContent value="config" className="space-y-4">
          
          {/* Passo 1 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
              <h3 className="font-semibold text-lg">Schedule Trigger</h3>
              <Badge variant="outline">Trigger</Badge>
            </div>
            <div className="space-y-3 ml-11">
              <p className="text-sm text-muted-foreground">Executa workflow a cada 30 minutos</p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><strong>Interval:</strong> A cada 30 minutos</p>
                <p><strong>Cron Expression:</strong> <code>*/30 * * * *</code></p>
                <p className="text-muted-foreground mt-2">Opcional: limitar horário comercial (9h-18h, dias úteis)</p>
              </div>
            </div>
          </Card>

          {/* Passo 2 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
              <h3 className="font-semibold text-lg">Buscar Leads Pendentes</h3>
              <Badge>POST</Badge>
            </div>
            <div className="space-y-3 ml-11">
              <div>
                <p className="text-sm font-medium mb-1">URL:</p>
                <code className="bg-muted p-2 rounded text-xs block break-all">
                  {projectUrl}/rest/v1/rpc/get_pending_followups
                </code>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Headers:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`apikey: ${anonKey}
Content-Type: application/json`}
                </pre>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Body:</p>
                <pre className="bg-muted p-3 rounded text-xs">{`{}`}</pre>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Retorna leads que: não responderam há 48h, follow-up ativo, não atingiram limite máximo (5)
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Passo 3 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
              <h3 className="font-semibold text-lg">IF - Tem Leads?</h3>
              <Badge variant="outline">Condicional</Badge>
            </div>
            <div className="space-y-2 ml-11">
              <p className="text-sm text-muted-foreground">Verifica se a resposta contém leads</p>
              <code className="bg-muted p-2 rounded text-xs block">
                {"={{$json.body && $json.body.length > 0}}"}
              </code>
            </div>
          </Card>

          {/* Passo 4 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
              <h3 className="font-semibold text-lg">Split In Batches</h3>
              <Badge variant="outline">Loop</Badge>
            </div>
            <div className="space-y-2 ml-11">
              <p className="text-sm text-muted-foreground">Processa 1 lead por vez</p>
              <div className="bg-muted p-3 rounded text-sm">
                <p><strong>Batch Size:</strong> 1</p>
              </div>
            </div>
          </Card>

          {/* Passo 5 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">5</div>
              <h3 className="font-semibold text-lg">Gerar Mensagem IA</h3>
              <Badge variant="secondary">AI Agent</Badge>
            </div>
            <div className="space-y-3 ml-11">
              <Alert>
                <MessageCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Use o mesmo agente de IA que já responde WhatsApp receptivo (OpenAI, Gemini, etc)
                </AlertDescription>
              </Alert>
              <div>
                <p className="text-sm font-medium mb-1">System Prompt:</p>
                <div className="bg-muted p-3 rounded text-xs">
                  Você é o Matheus da Tendenci Móveis. Envie uma mensagem de follow-up casual e amigável 
                  para reengajar o cliente que não respondeu há 2 dias. Use o histórico de conversa para personalizar. 
                  Seja breve (máximo 2 linhas). Não force venda, apenas demonstre interesse genuíno em ajudar.
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Input:</p>
                <code className="bg-muted p-2 rounded text-xs block">
                  {"={{$json.conversation_history}}"}
                </code>
              </div>
            </div>
          </Card>

          {/* Passo 6 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">6</div>
              <h3 className="font-semibold text-lg">Enviar WhatsApp</h3>
              <Badge>POST</Badge>
            </div>
            <div className="space-y-3 ml-11">
              <div>
                <p className="text-sm font-medium mb-1">URL:</p>
                <code className="bg-muted p-2 rounded text-xs block">
                  {"={{$json.evolution_url}}/message/sendText/={{$json.instance_name}}"}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Body:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "number": "{{$json.client_phone}}@s.whatsapp.net",
  "text": "{{$('Gerar Mensagem IA').output}}"
}`}
                </pre>
              </div>
            </div>
          </Card>

          {/* Passo 7 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">7</div>
              <h3 className="font-semibold text-lg">Atualizar Histórico CRM</h3>
              <Badge>POST</Badge>
            </div>
            <div className="space-y-3 ml-11">
              <div>
                <p className="text-sm font-medium mb-1">URL:</p>
                <code className="bg-muted p-2 rounded text-xs block break-all">
                  {projectUrl}/functions/v1/update-followup-history
                </code>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Headers:</p>
                <pre className="bg-muted p-3 rounded text-xs">
{`Authorization: Bearer ${anonKey}
Content-Type: application/json`}
                </pre>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Body:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "deal_id": "{{$json.deal_id}}",
  "new_message": "{{$('Gerar Mensagem IA').output}}"
}`}
                </pre>
              </div>
            </div>
          </Card>

          {/* Passo 8 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">8</div>
              <h3 className="font-semibold text-lg">Wait 3 minutos</h3>
              <Badge variant="outline">Delay</Badge>
            </div>
            <div className="space-y-2 ml-11">
              <p className="text-sm text-muted-foreground">Aguarda 3 minutos antes do próximo lead</p>
              <div className="bg-muted p-3 rounded text-sm">
                <p><strong>Amount:</strong> 3</p>
                <p><strong>Unit:</strong> minutes</p>
              </div>
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Este delay previne bloqueio da conta WhatsApp por spam
                </AlertDescription>
              </Alert>
            </div>
          </Card>

        </TabsContent>

        {/* Tab: JSON Workflow */}
        <TabsContent value="json" className="space-y-4">
          <Alert>
            <Download className="h-4 w-4" />
            <AlertTitle>Importar no n8n</AlertTitle>
            <AlertDescription>
              Copie o JSON abaixo ou baixe o arquivo, depois importe no n8n: 
              Menu → Workflows → Import from File/URL
            </AlertDescription>
          </Alert>

          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">Workflow Completo</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(JSON.stringify(getWorkflowJSON(), null, 2), "Workflow JSON")}
              >
                {copiedField === "Workflow JSON" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copiar JSON
              </Button>
            </div>
            <pre className="bg-muted p-4 rounded text-xs overflow-x-auto max-h-[500px]">
              {JSON.stringify(getWorkflowJSON(), null, 2)}
            </pre>
          </Card>
        </TabsContent>

        {/* Tab: Referência */}
        <TabsContent value="reference" className="space-y-4">
          
          <Card className="p-6">
            <h4 className="font-semibold mb-3">📋 Resposta da RPC get_pending_followups</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Retorna array de leads elegíveis para follow-up:
            </p>
            <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`[
  {
    "deal_id": "uuid-do-negocio",
    "lead_id": "uuid-do-lead",
    "client_name": "João Silva",
    "client_phone": "5534999999999",
    "conversation_history": "👤 Cliente: Olá...\\n🤖 IA: Oi João...",
    "followup_count": 0,
    "owner_id": "uuid-do-vendedor",
    "owner_name": "Maira",
    "instance_name": "tendenci-main",
    "instance_id": "instance-uuid",
    "whatsapp_connection_id": "connection-uuid",
    "evolution_url": "https://api.evolution...",
    "evolution_apikey": "key..."
  }
]`}
            </pre>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold mb-3">🔄 Body da Edge Function update-followup-history</h4>
            <pre className="bg-muted p-4 rounded text-xs">
{`{
  "deal_id": "uuid-do-negocio",
  "new_message": "Mensagem gerada pela IA"
}`}
            </pre>
            <p className="text-xs text-muted-foreground mt-3">
              Esta função incrementa followup_count, atualiza last_followup_at, e adiciona mensagem ao conversation_history
            </p>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold mb-3">⚙️ Variáveis disponíveis no n8n</h4>
            <div className="space-y-2 text-sm">
              <p><code className="bg-muted px-2 py-1 rounded">{"{{$json.deal_id}}"}</code> - ID do negócio</p>
              <p><code className="bg-muted px-2 py-1 rounded">{"{{$json.client_name}}"}</code> - Nome do cliente</p>
              <p><code className="bg-muted px-2 py-1 rounded">{"{{$json.client_phone}}"}</code> - Telefone (5534...)</p>
              <p><code className="bg-muted px-2 py-1 rounded">{"{{$json.conversation_history}}"}</code> - Histórico completo</p>
              <p><code className="bg-muted px-2 py-1 rounded">{"{{$json.followup_count}}"}</code> - Número do follow-up</p>
              <p><code className="bg-muted px-2 py-1 rounded">{"{{$json.instance_name}}"}</code> - Nome da instância Evolution</p>
              <p><code className="bg-muted px-2 py-1 rounded">{"{{$json.evolution_url}}"}</code> - URL da Evolution API</p>
              <p><code className="bg-muted px-2 py-1 rounded">{"{{$('Gerar Mensagem IA').output}}"}</code> - Output do nó de IA</p>
            </div>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Dicas de Troubleshooting</AlertTitle>
            <AlertDescription className="text-xs space-y-2 mt-2">
              <p><strong>1.</strong> Teste cada nó individualmente com "Execute Node"</p>
              <p><strong>2.</strong> Verifique se a RPC retorna dados: deve ser array, não objeto vazio</p>
              <p><strong>3.</strong> Confirme que Evolution API está acessível do servidor n8n</p>
              <p><strong>4.</strong> Monitore logs do n8n para erros de timeout ou autenticação</p>
              <p><strong>5.</strong> Verifique no CRM se followup_count está incrementando corretamente</p>
            </AlertDescription>
          </Alert>

        </TabsContent>
      </Tabs>

      {/* Resumo Final */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Resumo do Fluxo</AlertTitle>
        <AlertDescription className="mt-2 space-y-1 text-sm">
          <p><strong>1.</strong> A cada 30min, n8n busca leads sem resposta há 48h</p>
          <p><strong>2.</strong> Para cada lead, a IA gera mensagem personalizada</p>
          <p><strong>3.</strong> Envia via WhatsApp Evolution API</p>
          <p><strong>4.</strong> Atualiza contador no CRM (max 5 follow-ups)</p>
          <p><strong>5.</strong> Aguarda 3min antes do próximo</p>
          <p><strong>6.</strong> Quando cliente responde, contador reseta automaticamente</p>
        </AlertDescription>
      </Alert>

    </div>
  );
}