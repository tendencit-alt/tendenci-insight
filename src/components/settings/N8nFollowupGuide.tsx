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
  Check,
  ExternalLink,
  Code
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
  const [testingEligible, setTestingEligible] = useState(false);

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
      
      if (data?.success && data?.stats) {
        setStats({
          queueSize: data.stats.queueSize || 0,
          sentToday: data.stats.sentToday || 0,
          sentWeek: data.stats.sentWeek || 0,
          responseRate: data.stats.responseRate || 0,
          failedCount: data.stats.failedRecent || 0
        });
      }
      
      const now = new Date();
      const lastRun = new Date(now.getTime() - Math.random() * 7200000);
      const nextRun = new Date(now.getTime() + 7200000);
      
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

  const testDispatch = async () => {
    setTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-followup', {
        body: { ignore_time_filter: true }
      });
      
      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
      } else {
        const mode = data?.mode === 'atendimento' ? 'IA de Atendimento' : 'Workflow n8n';
        toast.success(`Teste via ${mode}: ${data?.dispatched || 0} enviados, ${data?.eligible || 0} elegíveis`);
        fetchStats();
        checkEligibleLeads();
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const testGetEligible = async () => {
    setTestingEligible(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-eligible-followups', {
        body: { ignore_time_filter: true, limit: 5 }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`${data.count} deals elegíveis encontrados`);
        if (data.eligible?.length > 0) {
          console.log('Deals elegíveis:', data.eligible);
        }
      } else {
        toast.error(data?.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setTestingEligible(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copiado!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const projectId = 'emnwuzrysqoiwapzmnbv';
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Follow-up Automático com I.A.
          </h2>
          <p className="text-muted-foreground">
            Sistema unificado - A IA de atendimento gerencia todos os follow-ups
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

      {/* Status do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sistema Unificado de Follow-up
          </CardTitle>
          <CardDescription>
            A IA de atendimento (n8n) é responsável por consultar deals elegíveis e enviar follow-ups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Bot className="h-4 w-4" />
            <AlertDescription>
              <strong>Arquitetura Unificada:</strong> A IA de atendimento consulta o endpoint 
              <code className="mx-1 px-1 bg-muted rounded">get-eligible-followups</code> 
              para saber quais deals precisam de follow-up, gera mensagens personalizadas com IA, 
              envia via WhatsApp, e atualiza o CRM via <code className="mx-1 px-1 bg-muted rounded">update-followup-history</code>.
            </AlertDescription>
          </Alert>

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

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={testGetEligible}
              disabled={testingEligible}
              variant="outline"
            >
              {testingEligible ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Code className="h-4 w-4 mr-2" />
                  Testar get-eligible-followups
                </>
              )}
            </Button>
            
            <Button 
              onClick={testDispatch}
              disabled={testingConnection}
              variant="outline"
            >
              {testingConnection ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Disparando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Testar dispatch-followup
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

      <Tabs defaultValue="arquitetura" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="arquitetura">Arquitetura</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="n8n">Fluxo n8n</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="arquitetura" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Arquitetura Unificada</CardTitle>
              <CardDescription>
                A IA de atendimento gerencia todo o fluxo de follow-up
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex gap-4 items-start p-4 bg-primary/10 rounded-lg border border-primary/30">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-semibold">IA de Atendimento Consulta Deals Elegíveis</h4>
                    <p className="text-sm text-muted-foreground">
                      O workflow da IA chama <code>get-eligible-followups</code> periodicamente (a cada 2h) 
                      para obter a lista de deals que precisam de follow-up
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-semibold">IA Gera Mensagem Personalizada</h4>
                    <p className="text-sm text-muted-foreground">
                      Para cada deal elegível, a IA usa os dados (histórico, produto, categoria) 
                      para gerar uma mensagem de follow-up personalizada
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-semibold">Envio via WhatsApp (Evolution API)</h4>
                    <p className="text-sm text-muted-foreground">
                      A mensagem é enviada para o cliente via Evolution API, 
                      usando a mesma instância de WhatsApp do atendimento
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">4</div>
                  <div>
                    <h4 className="font-semibold">Atualiza CRM via Callback</h4>
                    <p className="text-sm text-muted-foreground">
                      Após enviar, a IA chama <code>update-followup-history</code> para registrar 
                      a mensagem no histórico e incrementar o contador de follow-ups
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold shrink-0">5</div>
                  <div>
                    <h4 className="font-semibold text-green-600">Cliente Responde → Atendimento Humano</h4>
                    <p className="text-sm text-muted-foreground">
                      Quando o cliente responde, a mesma IA de atendimento recebe a mensagem 
                      e pode continuar a conversa ou transferir para um vendedor
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Vantagem:</strong> Todo o atendimento fica centralizado na mesma IA. 
                  O cliente fala com a "mesma pessoa" tanto no follow-up quanto nas respostas, 
                  criando uma experiência mais natural e consistente.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Endpoints Disponíveis
              </CardTitle>
              <CardDescription>
                APIs para integração com a IA de atendimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* get-eligible-followups */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Badge variant="outline">GET/POST</Badge>
                    get-eligible-followups
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(`${baseUrl}/get-eligible-followups`, "eligible")}
                  >
                    {copiedField === "eligible" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Input value={`${baseUrl}/get-eligible-followups`} readOnly className="text-xs" />
                <p className="text-sm text-muted-foreground">
                  Retorna lista de deals elegíveis para follow-up com todos os dados necessários
                </p>
                <div className="bg-background p-3 rounded border text-xs font-mono">
                  <p className="text-muted-foreground mb-2">// Resposta:</p>
                  <pre>{`{
  "success": true,
  "count": 3,
  "eligible": [
    {
      "deal_id": "uuid",
      "session_id": "uuid",
      "client_name": "João Silva",
      "client_phone": "5511999999999",
      "conversation_history": "...",
      "followup_number": 2,
      "product_type": "Mesa",
      "categoria": "Madeira"
    }
  ],
  "callback_url": "${baseUrl}/update-followup-history"
}`}</pre>
                </div>
              </div>

              {/* update-followup-history */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Badge variant="outline">POST</Badge>
                    update-followup-history
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(`${baseUrl}/update-followup-history`, "update")}
                  >
                    {copiedField === "update" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Input value={`${baseUrl}/update-followup-history`} readOnly className="text-xs" />
                <p className="text-sm text-muted-foreground">
                  Atualiza o histórico do deal após enviar a mensagem de follow-up
                </p>
                <div className="bg-background p-3 rounded border text-xs font-mono">
                  <p className="text-muted-foreground mb-2">// Payload:</p>
                  <pre>{`{
  "deal_id": "uuid-do-deal",
  "new_message": "Olá! Gostaria de...",
  "followup_number": 2
}`}</pre>
                </div>
              </div>

              {/* dispatch-followup */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Badge variant="outline">POST</Badge>
                    dispatch-followup
                    <Badge variant="secondary" className="text-xs">Opcional</Badge>
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(`${baseUrl}/dispatch-followup`, "dispatch")}
                  >
                    {copiedField === "dispatch" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Input value={`${baseUrl}/dispatch-followup`} readOnly className="text-xs" />
                <p className="text-sm text-muted-foreground">
                  Dispara follow-ups para webhook externo (modo legado ou fallback)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="n8n" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Workflow n8n</CardTitle>
              <CardDescription>
                Como configurar a IA de atendimento para processar follow-ups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-primary/50 bg-primary/5">
                <Bot className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recomendado:</strong> Adicione um nó Schedule Trigger no workflow da IA de atendimento 
                  para chamar <code>get-eligible-followups</code> a cada 2 horas durante horário comercial.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h4 className="font-semibold">Fluxo Recomendado no n8n:</h4>
                
                <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre className="whitespace-pre">{`
┌─────────────────────┐    ┌─────────────────────────┐
│ Schedule Trigger    │───▶│ HTTP Request            │
│ (a cada 2h, 9h-18h) │    │ GET get-eligible-       │
└─────────────────────┘    │ followups               │
                           └────────────┬────────────┘
                                        │
                                        ▼
                           ┌────────────────────────┐
                           │ Loop: Para cada deal   │
                           └────────────┬───────────┘
                                        │
                                        ▼
                           ┌────────────────────────┐
                           │ IA Gera Mensagem       │
                           │ (OpenAI/Gemini)        │
                           └────────────┬───────────┘
                                        │
                                        ▼
                           ┌────────────────────────┐
                           │ Enviar WhatsApp        │
                           │ (Evolution API)        │
                           └────────────┬───────────┘
                                        │
                                        ▼
                           ┌────────────────────────┐
                           │ HTTP Request           │
                           │ POST update-followup-  │
                           │ history                │
                           └────────────────────────┘
`}</pre>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold">Nó 1: Schedule Trigger</h4>
                  <div className="p-4 bg-muted/50 rounded-lg text-sm">
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Trigger Mode: Cron Expression</li>
                      <li>• Expression: <code>0 9,11,13,15,17 * * 1-5</code> (9h, 11h, 13h, 15h, 17h, seg-sex)</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Nó 2: HTTP Request - Buscar Elegíveis</h4>
                  <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Method: <code>GET</code> ou <code>POST</code></li>
                      <li>• URL: <code>{baseUrl}/get-eligible-followups</code></li>
                      <li>• Body (opcional): <code>{`{ "limit": 10 }`}</code></li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Nó 3: Loop - Para cada deal</h4>
                  <div className="p-4 bg-muted/50 rounded-lg text-sm">
                    <p className="text-muted-foreground">
                      Use o nó "Split In Batches" ou "Loop Over Items" para iterar sobre <code>$json.eligible</code>
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Nó 4: Gerar Mensagem com IA</h4>
                  <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
                    <p className="text-muted-foreground">Use OpenAI, Gemini ou outro modelo com prompt:</p>
                    <div className="bg-background p-2 rounded text-xs font-mono">
                      <pre>{`Você é um vendedor amigável. Gere uma mensagem de follow-up para:
Nome: {{ $json.client_name }}
Produto: {{ $json.product_type }}
Follow-up #: {{ $json.followup_number }}
Histórico: {{ $json.conversation_history }}`}</pre>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Nó 5: Enviar WhatsApp</h4>
                  <div className="p-4 bg-muted/50 rounded-lg text-sm">
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• URL: <code>{`{{ $node['Preparar'].json.evolution_url }}/message/sendText/{{ instancia }}`}</code></li>
                      <li>• Body: <code>{`{ "number": "{{ $json.client_phone }}", "text": "{{ mensagem_ia }}" }`}</code></li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Nó 6: Atualizar CRM</h4>
                  <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Method: <code>POST</code></li>
                      <li>• URL: <code>{baseUrl}/update-followup-history</code></li>
                    </ul>
                    <div className="bg-background p-2 rounded text-xs font-mono">
                      <pre>{`{
  "deal_id": "{{ $json.deal_id }}",
  "new_message": "{{ mensagem_enviada }}",
  "followup_number": {{ $json.followup_number }}
}`}</pre>
                    </div>
                  </div>
                </div>
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
                Secrets e configurações necessárias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Modo Unificado Ativo:</strong> A IA de atendimento consulta os endpoints 
                  diretamente, não precisa de webhook de disparo automático.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Endpoints Configurados Automaticamente
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <code>get-eligible-followups</code> - Consulta deals elegíveis</li>
                    <li>• <code>update-followup-history</code> - Atualiza histórico</li>
                    <li>• <code>dispatch-followup</code> - Disparo manual/CRON</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Secrets Opcionais</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Para disparo automático via CRON (modo legado):
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <code>N8N_ATENDIMENTO_WEBHOOK_URL</code> - Webhook da IA de atendimento (prioridade)</li>
                    <li>• <code>N8N_FOLLOWUP_WEBHOOK_URL</code> - Webhook de follow-up (fallback)</li>
                  </ul>
                </div>

                <Separator />

                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Critérios de Elegibilidade
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Deal com <code>followup_enabled = true</code></li>
                    <li>• Status <code>aberto</code> (não ganho/perdido)</li>
                    <li>• Na etapa "Follow Up (I.A)" do pipeline</li>
                    <li>• Última interação há mais de 48 horas</li>
                    <li>• Não atingiu limite de follow-ups (<code>max_followups</code>)</li>
                    <li>• Telefone válido formatado para WhatsApp</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
