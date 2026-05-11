import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Code, Webhook, Clock, MessageSquare, Download, Copy } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { toast } from "sonner";

export default function N8nTarefasGuide() {
  const apiUrl = "https://emnwuzrysqoiwapzmnbv.supabase.co";
  const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtbnd1enJ5c3FvaXdhcHptbmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MjkxMjMsImV4cCI6MjA3ODEwNTEyM30.tzEXZQShQWgyyJHxvCVYIGQg0gal-LuO4jlKQDFjq-c";
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const downloadWorkflowJSON = () => {
    const workflowJSON = {
      "name": "Tarefas Automatizadas WhatsApp (CRM + Profissionais Parceiros)",
      "nodes": [
        {
          "parameters": {
            "rule": {
              "interval": [
                {
                  "field": "minutes",
                  "minutesInterval": 1
                }
              ]
            }
          },
          "name": "Schedule Trigger",
          "type": "n8n-nodes-base.scheduleTrigger",
          "typeVersion": 1,
          "position": [250, 300]
        },
        {
          "parameters": {
            "operation": "executeQuery",
            "query": "SELECT * FROM get_pending_automated_tasks()"
          },
          "name": "Buscar Tarefas (RPC Unificada)",
          "type": "n8n-nodes-base.supabase",
          "typeVersion": 1,
          "position": [450, 300],
          "credentials": {
            "supabaseApi": {
              "id": "1",
              "name": "Supabase account"
            }
          }
        },
        {
          "parameters": {
            "conditions": {
              "number": [
                {
                  "value1": "={{$json.tarefa_id ? 1 : 0}}",
                  "operation": "larger",
                  "value2": 0
                }
              ]
            }
          },
          "name": "Verificar Tarefas",
          "type": "n8n-nodes-base.if",
          "typeVersion": 1,
          "position": [650, 300]
        },
        {
          "parameters": {
            "batchSize": 1,
            "options": {}
          },
          "name": "Loop Over Items",
          "type": "n8n-nodes-base.splitInBatches",
          "typeVersion": 1,
          "position": [850, 200]
        },
        {
          "parameters": {
            "method": "POST",
            "url": `${apiUrl}/functions/v1/process-automated-task`,
            "authentication": "genericCredentialType",
            "genericAuthType": "httpHeaderAuth",
            "sendHeaders": true,
            "headerParameters": {
              "parameters": [
                {
                  "name": "apikey",
                  "value": apiKey
                },
                {
                  "name": "Authorization",
                  "value": `Bearer ${apiKey}`
                },
                {
                  "name": "Content-Type",
                  "value": "application/json"
                }
              ]
            },
            "sendBody": true,
            "specifyBody": "json",
            "jsonBody": `{
  "taskId": "{{ $json.tarefa_id }}",
  "origem_modulo": "{{ $json.origem_modulo }}"
}`,
            "options": {}
          },
          "name": "Processar Tarefa (Edge Function)",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4,
          "position": [1050, 200]
        },
        {
          "parameters": {
            "amount": 3,
            "unit": "seconds"
          },
          "name": "Aguardar 3s",
          "type": "n8n-nodes-base.wait",
          "typeVersion": 1,
          "position": [1250, 200]
        }
      ],
      "connections": {
        "Schedule Trigger": {
          "main": [
            [
              {
                "node": "Buscar Tarefas (RPC Unificada)",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Buscar Tarefas (RPC Unificada)": {
          "main": [
            [
              {
                "node": "Verificar Tarefas",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Verificar Tarefas": {
          "main": [
            [
              {
                "node": "Loop Over Items",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Loop Over Items": {
          "main": [
            [
              {
                "node": "Processar Tarefa (Edge Function)",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Processar Tarefa (Edge Function)": {
          "main": [
            [
              {
                "node": "Aguardar 3s",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Aguardar 3s": {
          "main": [
            [
              {
                "node": "Loop Over Items",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      },
      "settings": {
        "executionOrder": "v1"
      },
      "staticData": null,
      "tags": [],
      "triggerCount": 0,
      "updatedAt": "2025-01-21T00:00:00.000Z",
      "versionId": "2"
    };

    const blob = new Blob([JSON.stringify(workflowJSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'n8n-tarefas-automatizadas-workflow.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Workflow JSON baixado com sucesso!");
  };
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Integração n8n - Tarefas Automatizadas</h1>
          <p className="text-lg text-muted-foreground">
            Documentação completa para configurar o envio automático de mensagens WhatsApp via n8n baseado em tarefas agendadas no CRM e módulo de Arquitetos
          </p>
        </div>

        {/* Módulos Suportados */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Módulos Suportados
            </CardTitle>
            <CardDescription>O sistema suporta tarefas automatizadas de dois módulos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">CRM</Badge>
                  <span className="font-medium">Tarefas de Clientes</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tarefas criadas em negócios do CRM. Tabela: <code className="text-xs bg-muted px-1 py-0.5 rounded">crm_tasks</code>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  origem_modulo: <code className="bg-muted px-1 py-0.5 rounded">"crm"</code>
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Prospecção</Badge>
                  <span className="font-medium">Tarefas de Profissionais Parceiros</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tarefas criadas para arquitetos no módulo de prospecção. Tabela: <code className="text-xs bg-muted px-1 py-0.5 rounded">tendenci_prospec_arq_agendamentos</code>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  origem_modulo: <code className="bg-muted px-1 py-0.5 rounded">"prospeccao"</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visão Geral */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Visão Geral do Fluxo
            </CardTitle>
            <CardDescription>Como funciona a automação de tarefas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <Badge className="mt-1">1</Badge>
                <div>
                  <p className="font-medium">Criação da Tarefa Automatizada</p>
                  <p className="text-sm text-muted-foreground">
                    Usuário cria uma tarefa com tipo "Tarefa Automatizada" no CRM (negócios) ou no módulo de Arquitetos, definindo data/hora, número WhatsApp e mensagem
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-1">2</Badge>
                <div>
                  <p className="font-medium">Armazenamento no Banco</p>
                  <p className="text-sm text-muted-foreground">
                    Tarefa é salva na tabela correspondente: <code className="text-xs bg-muted px-1 py-0.5 rounded">crm_tasks</code> (CRM) ou <code className="text-xs bg-muted px-1 py-0.5 rounded">tendenci_prospec_arq_agendamentos</code> (Arquitetos)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-1">3</Badge>
                <div>
                  <p className="font-medium">Detecção pelo n8n via RPC Unificada</p>
                  <p className="text-sm text-muted-foreground">
                    Workflow n8n consulta a RPC <code className="text-xs bg-muted px-1 py-0.5 rounded">get_pending_automated_tasks</code> que retorna tarefas de AMBOS os módulos
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-1">4</Badge>
                <div>
                  <p className="font-medium">Processamento pela Edge Function</p>
                  <p className="text-sm text-muted-foreground">
                    Edge Function <code className="text-xs bg-muted px-1 py-0.5 rounded">process-automated-task</code> detecta o módulo de origem e processa adequadamente
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-1">5</Badge>
                <div>
                  <p className="font-medium">Disparo e Atualização</p>
                  <p className="text-sm text-muted-foreground">
                    Mensagem enviada via Evolution API WhatsApp, status atualizado e log registrado na timeline do arquiteto (se aplicável)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estrutura do Banco de Dados */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Estrutura das Tabelas
            </CardTitle>
            <CardDescription>Campos relevantes para tarefas automatizadas em cada módulo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge>CRM</Badge> crm_tasks
              </h4>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
                <div><span className="text-primary">id</span> <span className="text-muted-foreground">UUID</span> - Identificador único da tarefa</div>
                <div><span className="text-primary">deal_id</span> <span className="text-muted-foreground">UUID</span> - Referência ao negócio no CRM</div>
                <div><span className="text-primary">title</span> <span className="text-muted-foreground">TEXT</span> - Título da tarefa</div>
                <div><span className="text-primary">note</span> <span className="text-muted-foreground">TEXT</span> - Mensagem que será enviada</div>
                <div><span className="text-primary">due_at</span> <span className="text-muted-foreground">TIMESTAMP</span> - Data e hora para envio</div>
                <div><span className="text-primary">status</span> <span className="text-muted-foreground">TEXT</span> - Status: "open" ou "done"</div>
                <div><span className="text-primary">tipo_tarefa</span> <span className="text-muted-foreground">TEXT</span> - "interna" ou "automatizada"</div>
                <div><span className="text-primary">whatsapp_number</span> <span className="text-muted-foreground">TEXT</span> - Número do destinatário</div>
                <div><span className="text-primary">processed_at</span> <span className="text-muted-foreground">TIMESTAMP</span> - Data/hora do processamento (evita duplicatas)</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="secondary">Prospecção</Badge> tendenci_prospec_arq_agendamentos
              </h4>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
                <div><span className="text-primary">id</span> <span className="text-muted-foreground">UUID</span> - Identificador único da tarefa</div>
                <div><span className="text-primary">architect_id</span> <span className="text-muted-foreground">UUID</span> - Referência ao profissional parceiro</div>
                <div><span className="text-primary">observacoes</span> <span className="text-muted-foreground">JSONB</span> - JSON com título e nota (mensagem)</div>
                <div><span className="text-primary">data_agendamento</span> <span className="text-muted-foreground">TIMESTAMP</span> - Data e hora para envio</div>
                <div><span className="text-primary">status</span> <span className="text-muted-foreground">TEXT</span> - Status: "pendente" ou "concluida"</div>
                <div><span className="text-primary">tipo_tarefa</span> <span className="text-muted-foreground">TEXT</span> - "retorno" ou "automatizada"</div>
                <div><span className="text-primary">whatsapp_number</span> <span className="text-muted-foreground">TEXT</span> - Número do destinatário</div>
                <div><span className="text-primary">vendedor_id</span> <span className="text-muted-foreground">UUID</span> - Vendedor responsável</div>
                <div><span className="text-primary">processed_at</span> <span className="text-muted-foreground">TIMESTAMP</span> - Data/hora do processamento (evita duplicatas)</div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Diferenças de Status:</strong> CRM usa "open"/"done", Arquitetos usa "pendente"/"concluida". A RPC unifica isso automaticamente.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Configuração do n8n - Parte 1: Consulta de Tarefas */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Parte 1: Workflow de Consulta de Tarefas
            </CardTitle>
            <CardDescription>Configure o workflow no n8n para buscar tarefas pendentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este workflow deve rodar a cada 1 minuto para verificar tarefas que precisam ser executadas
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1. Schedule Trigger (Cron)</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm mb-2">Configure para executar a cada minuto:</p>
                  <code className="text-xs block bg-background p-2 rounded">
                    Modo: Every Minute<br/>
                    Expressão Cron: * * * * *
                  </code>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2. HTTP Request Node</h3>
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>📋 Por que HTTP Request?</strong><br/>
                      O Supabase node do n8n NÃO suporta executar queries SQL diretamente.<br/>
                      Por isso, criamos uma função RPC no Supabase que você chama via HTTP Request.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-primary/10 border border-primary/30 p-3 rounded space-y-3">
                    <p className="text-sm font-semibold text-primary mb-2">⚙️ Configuração Passo a Passo:</p>
                    
                    <div className="space-y-2">
                      <div className="bg-background/50 p-2 rounded">
                        <p className="text-xs font-semibold mb-1">1. Method:</p>
                        <code className="text-xs">POST</code>
                      </div>

                      <div className="bg-background/50 p-2 rounded">
                        <p className="text-xs font-semibold mb-1">2. URL (copie completa):</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs break-all flex-1">{apiUrl}/rest/v1/rpc/get_pending_automated_tasks</code>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(`${apiUrl}/rest/v1/rpc/get_pending_automated_tasks`, "URL")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="bg-background/50 p-2 rounded">
                        <p className="text-xs font-semibold mb-1">3. Authentication:</p>
                        <ul className="text-xs space-y-1 ml-3">
                          <li>• <strong>Generic Credential Type</strong></li>
                          <li>• <strong>Generic Auth Type:</strong> Header Auth</li>
                        </ul>
                      </div>

                      <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-400 p-3 rounded">
                        <p className="text-xs font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                          4. ⚠️ ATIVE "Send Headers" e adicione 2 headers:
                        </p>
                        <div className="space-y-2 text-xs">
                          <div className="bg-background/80 p-2 rounded">
                            <p className="font-semibold mb-1">Header 1:</p>
                            <p><strong>Name:</strong> <code>apikey</code></p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="break-all flex-1"><strong>Value:</strong> <code>{apiKey.substring(0, 30)}...</code></p>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyToClipboard(apiKey, "API Key")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="bg-background/80 p-2 rounded">
                            <p className="font-semibold mb-1">Header 2:</p>
                            <p><strong>Name:</strong> <code>Authorization</code></p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="break-all flex-1"><strong>Value:</strong> <code>Bearer {apiKey.substring(0, 20)}...</code></p>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyToClipboard(`Bearer ${apiKey}`, "Authorization")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-background/50 p-2 rounded">
                        <p className="text-xs font-semibold mb-1">5. Outras configurações:</p>
                        <ul className="text-xs space-y-1 ml-3">
                          <li>• <strong>Send Query Parameters:</strong> OFF (desligado)</li>
                          <li>• <strong>Send Body:</strong> OFF (desligado)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-destructive/10 border border-destructive/30 p-3 rounded">
                    <p className="text-sm font-semibold text-destructive">⚠️ ATENÇÃO:</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      NÃO use o Supabase node! Use HTTP Request node conforme configuração acima.
                    </p>
                  </div>
                  
                  <p className="text-sm font-medium mt-3">Exemplo de resposta (JSON que o n8n receberá):</p>
                  <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`[
  {
    "id": "uuid-tarefa-crm...",
    "whatsapp_number": "5511999999999",
    "mensagem": "Olá! Sua mensagem automática...",
    "instance_name": "tendenci-prod",
    "instance_id": "12345",
    "due_at": "2025-01-15T10:00:00Z",
    "created_by": "uuid-vendedor...",
    "origem_modulo": "crm"
  },
  {
    "id": "uuid-tarefa-arquiteto...",
    "whatsapp_number": "5521988888888",
    "mensagem": "Olá Profissional Parceiro! Mensagem...",
    "instance_name": "tendenci-vendedor2",
    "instance_id": "67890",
    "due_at": "2025-01-15T11:00:00Z",
    "created_by": "uuid-vendedor2...",
    "origem_modulo": "prospeccao"
  }
]`}
                  </pre>
                  
                  <Alert className="mt-3">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>✨ RPC Unificada:</strong> A função <code>get_pending_automated_tasks</code> usa UNION ALL para retornar tarefas de AMBOS os módulos (CRM e Profissionais Parceiros), com o campo <code>origem_modulo</code> para identificação. Cada tarefa usa automaticamente a instância WhatsApp específica do vendedor que a criou.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3. IF Node (Verificação)</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm mb-2">Verifique se existem tarefas pendentes:</p>
                  <code className="text-xs block bg-background p-2 rounded">
                    Condição: {'{{ $json.length > 0 }}'}<br/>
                    Se TRUE: Continue para o próximo nó<br/>
                    Se FALSE: Encerre o workflow
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuração do n8n - Parte 2: Envio via WhatsApp */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Parte 2: Envio via Evolution API
            </CardTitle>
            <CardDescription>Configure o envio de mensagens WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">4. Loop Over Items (Split in Batches)</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm mb-2">Processe cada tarefa individualmente:</p>
                  <code className="text-xs block bg-background p-2 rounded">
                    Batch Size: 1<br/>
                    {'{{ $json.length }}'} tarefas serão processadas uma por vez
                  </code>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5. HTTP Request - Evolution API</h3>
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <p className="text-sm font-medium">Configuração da Requisição:</p>
                  <div className="bg-background p-3 rounded text-xs font-mono space-y-1">
                    <div><span className="text-muted-foreground">Method:</span> POST</div>
                    <div><span className="text-muted-foreground">URL:</span> {'{{ $env.EVOLUTION_API_URL }}/message/sendText/{{ $("Loop Over Items").item.json.instance_name }}'}</div>
                    <div><span className="text-muted-foreground">Authentication:</span> Header Auth</div>
                    <div><span className="text-muted-foreground">Header Name:</span> apikey</div>
                    <div><span className="text-muted-foreground">Header Value:</span> {'{{ $env.EVOLUTION_API_KEY }}'}</div>
                  </div>
                  
                  <p className="text-sm font-medium mt-3">Body (JSON):</p>
                  <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "number": "{{ $("Loop Over Items").item.json.whatsapp_number }}",
  "text": "{{ $("Loop Over Items").item.json.mensagem }}"
}`}
                  </pre>

                  <Alert className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>✨ Instância Dinâmica:</strong> A URL usa <code>instance_name</code> da query através do loop, garantindo que cada mensagem seja enviada pela instância WhatsApp do vendedor que criou a tarefa. Configure no n8n:
                      <ul className="list-disc ml-4 mt-2 space-y-1">
                        <li><strong>EVOLUTION_API_URL</strong> - URL base da sua Evolution API (ex: https://evolution.seudominio.com)</li>
                        <li><strong>EVOLUTION_API_KEY</strong> - Chave de API global da Evolution</li>
                      </ul>
                      ⚠️ <strong>Importante:</strong> Não use instância fixa - o sistema identifica automaticamente a instância do vendedor!
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">6. HTTP Request - Edge Function (Recomendado)</h3>
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <Alert className="mb-3">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>✨ Método Recomendado:</strong> Use a Edge Function <code>process-automated-task</code> que processa automaticamente tarefas de AMBOS os módulos (CRM e Arquitetos).
                    </AlertDescription>
                  </Alert>

                  <div className="bg-background p-3 rounded text-xs font-mono space-y-1">
                    <div><span className="text-muted-foreground">Method:</span> POST</div>
                    <div><span className="text-muted-foreground">URL:</span> {apiUrl}/functions/v1/process-automated-task</div>
                    <div><span className="text-muted-foreground">Headers:</span> Authorization: Bearer {'{'}apiKey{'}'}</div>
                  </div>

                  <p className="text-sm font-medium mt-3">Body (JSON) - <span className="text-primary font-bold">IMPORTANTE:</span></p>
                  <pre className="bg-background p-3 rounded text-xs overflow-x-auto border-2 border-primary/50">
{`{
  "taskId": "{{ $("Loop Over Items").item.json.tarefa_id }}",
  "origem_modulo": "{{ $("Loop Over Items").item.json.origem_modulo }}"
}`}
                  </pre>

                  <Alert className="mt-3 border-destructive bg-destructive/10">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-xs">
                      <strong className="text-destructive">⚠️ CRÍTICO:</strong> O campo <code>origem_modulo</code> é <strong>OBRIGATÓRIO</strong> para tarefas de arquitetos!
                      <ul className="list-disc ml-4 mt-2 space-y-1">
                        <li><code>tarefa_id</code> - ID da tarefa (campo unificado da RPC)</li>
                        <li><code>origem_modulo</code> - "crm" ou "prospeccao" (identifica o módulo)</li>
                      </ul>
                      Sem <code>origem_modulo</code>, tarefas de profissionais parceiros serão processadas incorretamente como CRM e falharão com <code>architect_id = null</code>.
                    </AlertDescription>
                  </Alert>

                  <Alert className="mt-3">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>A Edge Function faz tudo automaticamente:</strong>
                      <ul className="list-disc ml-4 mt-2 space-y-1">
                        <li>Detecta se é tarefa CRM ou Profissional Parceiro via <code>origem_modulo</code></li>
                        <li>Busca dados do cliente/arquiteto</li>
                        <li>Identifica instância WhatsApp do vendedor</li>
                        <li>Envia mensagem via Evolution API</li>
                        <li>Atualiza status para "done" ou "concluida"</li>
                        <li>Registra log na timeline (profissionais parceiros)</li>
                      </ul>
                      <strong className="mt-2 block">Fallback:</strong> Se <code>origem_modulo</code> não for enviado, a função tenta detectar automaticamente verificando em qual tabela a tarefa existe.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">7. Error Handler (Opcional)</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm mb-3">Configure tratamento de erros caso o envio falhe:</p>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Se o envio falhar, a Edge Function:
                      <ul className="list-disc ml-4 mt-2 space-y-1">
                        <li>Mantém status original para nova tentativa automática</li>
                        <li>Cria notificação para o vendedor responsável</li>
                        <li>Retorna erro 500 com detalhes para o n8n</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Download do Workflow JSON */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download do Workflow Completo
            </CardTitle>
            <CardDescription>Baixe o JSON pronto para importar no n8n</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Workflow Pré-Configurado:</strong> Este arquivo JSON contém o workflow completo com todos os nós configurados. Basta importar no n8n e ajustar suas credenciais do Supabase e Evolution API.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                O arquivo inclui:
              </p>
              <ul className="list-disc ml-6 text-sm space-y-1 text-muted-foreground">
                <li>Schedule Trigger configurado para executar a cada minuto</li>
                <li><strong className="text-primary">RPC Unificada</strong> - Busca tarefas de CRM e Profissionais Parceiros em uma única query</li>
                <li>Loop para processar tarefas individualmente</li>
                <li><strong className="text-primary">Edge Function</strong> - Processa envio, atualiza status e registra logs automaticamente</li>
                <li>Delay de 3 segundos entre tarefas para evitar rate limiting</li>
              </ul>

              <div className="pt-4">
                <Button 
                  onClick={downloadWorkflowJSON}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Workflow JSON
                </Button>
              </div>

              <Alert className="mt-4 border-primary bg-primary/5">
                <CheckCircle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  <strong>Após importar:</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>Configure suas credenciais do Supabase no nó "Buscar Tarefas (RPC Unificada)"</li>
                    <li>O workflow já vem pré-configurado com URL e API Key do Supabase</li>
                    <li>Ative o workflow e teste com uma tarefa automatizada</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Vantagens da Edge Function:</strong>
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li>Detecta automaticamente se é tarefa CRM ou Profissional Parceiro</li>
                    <li>Busca instância WhatsApp do vendedor responsável</li>
                    <li>Atualiza status na tabela correta (crm_tasks ou tendenci_prospec_arq_agendamentos)</li>
                    <li>Registra logs na timeline do negócio/arquiteto</li>
                    <li>Não precisa configurar Evolution API no n8n</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Fluxo Visual */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Fluxo Visual do Workflow n8n</CardTitle>
            <CardDescription>Estrutura completa do workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-6 rounded-lg">
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">1</Badge>
                  <span>Schedule Trigger (Every Minute)</span>
                </div>
                <div className="ml-6 text-muted-foreground">↓</div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-primary">2</Badge>
                  <span className="font-bold">Supabase RPC: get_pending_automated_tasks()</span>
                </div>
                <div className="ml-6 text-muted-foreground">↓</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">3</Badge>
                  <span>IF (Verificar se existem tarefas)</span>
                </div>
                <div className="ml-6 text-muted-foreground">↓ (TRUE)</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">4</Badge>
                  <span>Loop Over Items (Processar cada tarefa)</span>
                </div>
                <div className="ml-6 text-muted-foreground">↓</div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-primary">5</Badge>
                  <span className="font-bold">HTTP POST: Edge Function process-automated-task</span>
                </div>
                <div className="ml-6 text-muted-foreground">↓</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">6</Badge>
                  <span>Wait 3s (Evitar rate limiting)</span>
                </div>
                <div className="ml-6 text-muted-foreground">↓ Loop</div>
              </div>
            </div>

            <Alert className="mt-4 border-primary/30 bg-primary/5">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                <strong>A Edge Function faz TUDO automaticamente:</strong> busca dados, formata telefone, identifica instância WhatsApp do vendedor, envia mensagem, atualiza status, registra logs na timeline. Você só precisa configurar o Supabase no n8n!
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Exemplo de Payload */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exemplo de Dados Processados</CardTitle>
            <CardDescription>Como os dados fluem pelo workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-sm">Dados da RPC get_pending_automated_tasks() - <Badge variant="default">CRM</Badge>:</h3>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "tarefa_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "deal_id": "d4e5f6g7-h8i9-0123-4567-89abcdef0123",
  "arquiteto_id": null,
  "titulo": "Follow-up Cliente João",
  "observacoes": "Olá João! Tudo bem? Passando para verificar...",
  "data_agendamento": "2025-01-21T14:30:00Z",
  "telefone": "5511999999999",
  "nome": "João Silva",
  "vendedor_id": "f9e8d7c6-b5a4-3210-9876-543210fedcba",
  "origem_modulo": "crm",
  "instance_name": "vendedor_maira",
  "instance_id": "12AB34CD56EF"
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm">Dados da RPC - <Badge variant="secondary">Profissional Parceiro</Badge>:</h3>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "tarefa_id": "b2c3d4e5-f6g7-8901-bcde-f12345678901",
  "deal_id": null,
  "arquiteto_id": "c3d4e5f6-g7h8-9012-cdef-123456789012",
  "titulo": "Follow-up Profissional Parceiro Maria",
  "observacoes": "Olá Maria! Você viu nosso catálogo novo?",
  "data_agendamento": "2025-01-21T15:00:00Z",
  "telefone": "5511988888888",
  "nome": "Maria Arquiteta",
  "vendedor_id": "f9e8d7c6-b5a4-3210-9876-543210fedcba",
  "origem_modulo": "prospeccao",
  "instance_name": "vendedor_maira",
  "instance_id": "12AB34CD56EF"
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm">Payload enviado para Edge Function:</h3>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto border-2 border-primary/30">
{`{
  "taskId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "origem_modulo": "crm"
}`}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                A Edge Function faz todo o resto: busca dados, formata telefone, envia WhatsApp, atualiza status, registra logs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Checklist de Configuração */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Checklist de Configuração
            </CardTitle>
            <CardDescription>Verifique todos os passos antes de ativar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Credenciais Supabase configuradas no n8n</p>
                  <p className="text-xs text-muted-foreground">URL do projeto, Anon Key ou Service Role Key</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Nó Supabase usando RPC correta</p>
                  <p className="text-xs text-muted-foreground">Query: <code className="bg-muted px-1 py-0.5 rounded">SELECT * FROM get_pending_automated_tasks()</code></p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">HTTP Request chamando Edge Function</p>
                  <p className="text-xs text-muted-foreground">URL: <code className="bg-muted px-1 py-0.5 rounded">{apiUrl}/functions/v1/process-automated-task</code></p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Payload com taskId e origem_modulo</p>
                  <p className="text-xs text-muted-foreground">Body: <code className="bg-muted px-1 py-0.5 rounded">{`{"taskId": "{{ $json.tarefa_id }}", "origem_modulo": "{{ $json.origem_modulo }}"}`}</code></p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Schedule Trigger configurado</p>
                  <p className="text-xs text-muted-foreground">Executar a cada 1 minuto</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Wait node de 3 segundos entre iterações</p>
                  <p className="text-xs text-muted-foreground">Evita rate limiting da Evolution API</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testes e Validação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Testando o Fluxo</CardTitle>
            <CardDescription>Como validar que tudo está funcionando</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Criar Tarefa de Teste</h3>
              <p className="text-sm text-muted-foreground mb-2">
                No CRM, crie uma tarefa automatizada com data/hora para daqui a 2-3 minutos:
              </p>
              <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
                <li>Tipo: Tarefa Automatizada</li>
                <li>Título: "Teste de envio automático"</li>
                <li>WhatsApp: Seu número de teste</li>
                <li>Mensagem: "Esta é uma mensagem de teste do sistema automatizado"</li>
                <li>Data/Hora: Daqui a 2-3 minutos</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Monitorar Execuções no n8n</h3>
              <p className="text-sm text-muted-foreground">
                Vá para "Executions" no n8n e acompanhe as execuções do workflow a cada minuto
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Verificar Envio</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Quando a data/hora programada chegar:
              </p>
              <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
                <li>A mensagem deve ser enviada para o WhatsApp</li>
                <li>O status da tarefa deve mudar para "done" no banco</li>
                <li>A execução do n8n deve mostrar sucesso</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Validar Status</h3>
              <p className="text-sm text-muted-foreground">
                No painel de tarefas do CRM, a tarefa deve aparecer como concluída (✓ Concluída)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resolução de Problemas</CardTitle>
            <CardDescription>Problemas comuns e soluções</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-sm">❌ Mensagem não é enviada</h3>
              <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
                <li>Verifique se o workflow está ATIVO no n8n</li>
                <li>Confirme que as credenciais da Evolution API estão corretas</li>
                <li>Valide se o número de WhatsApp está no formato correto (com DDI e DDD)</li>
                <li>Confira os logs de execução no n8n para identificar erros</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm">❌ Tarefa não é detectada pelo n8n</h3>
              <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
                <li>Confirme que tipo_tarefa = "automatizada"</li>
                <li>Verifique se status = "open"</li>
                <li>Valide se due_at está no passado ou presente</li>
                <li>Teste a query SQL diretamente no Supabase</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm">❌ Status não é atualizado após envio</h3>
              <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
                <li>Verifique se o nó Supabase Update está configurado corretamente</li>
                <li>Confirme que está usando o ID correto da tarefa</li>
                <li>Valide as permissões RLS no Supabase</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm">❌ Workflow executa mas não processa tarefas</h3>
              <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
                <li>Verifique o nó IF - pode estar retornando FALSE</li>
                <li>Confirme que a query retorna resultados</li>
                <li>Valide a conexão com o banco Supabase</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Boas Práticas */}
        <Card>
          <CardHeader>
            <CardTitle>Boas Práticas</CardTitle>
            <CardDescription>Recomendações para manter o sistema saudável</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Monitore as execuções regularmente</p>
                  <p className="text-xs text-muted-foreground">Verifique os logs do n8n diariamente para identificar erros</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Configure alertas de falha</p>
                  <p className="text-xs text-muted-foreground">Use webhooks para notificar a equipe em caso de erros</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Faça backup das configurações</p>
                  <p className="text-xs text-muted-foreground">Exporte o workflow do n8n regularmente</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Teste antes de usar em produção</p>
                  <p className="text-xs text-muted-foreground">Sempre teste com números de telefone da equipe primeiro</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Mantenha credenciais seguras</p>
                  <p className="text-xs text-muted-foreground">Use variáveis de ambiente, nunca hardcode tokens</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">✨ Isolamento automático por vendedor</p>
                  <p className="text-xs text-muted-foreground">Cada vendedor usa sua própria instância WhatsApp - sem risco de duplicidade de mensagens</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Isolamento por Vendedor */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔒 Isolamento por Vendedor
            </CardTitle>
            <CardDescription>Como funciona a separação de instâncias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O sistema garante que cada vendedor use apenas sua própria instância WhatsApp conectada, evitando completamente duplicidade de mensagens.
            </p>
            
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                <p className="text-sm">Vendedor conecta sua instância WhatsApp no sistema (cada vendedor tem sua própria conexão)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                <p className="text-sm">Vendedor cria tarefa automatizada no CRM - sistema registra <code className="text-xs bg-background px-1 py-0.5 rounded">created_by</code> com o ID do vendedor</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                <p className="text-sm">n8n busca tarefas com <strong>JOIN automático</strong> para pegar a instância WhatsApp do vendedor que criou a tarefa</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</div>
                <p className="text-sm">Mensagem é enviada via <strong>instância específica do vendedor</strong> - nunca por outra instância</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">5</div>
                <p className="text-sm"><strong>Zero duplicidade:</strong> Cliente recebe apenas 1 mensagem, da instância correta</p>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Importante:</strong> Não é necessário adicionar campos extras nas tarefas. O sistema identifica automaticamente qual instância usar através do relacionamento <code className="text-xs bg-muted px-1 py-0.5 rounded">created_by → profiles → whatsapp_connections</code>.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}