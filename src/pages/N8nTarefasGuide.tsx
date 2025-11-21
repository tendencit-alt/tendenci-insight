import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Code, Webhook, Clock, MessageSquare } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function N8nTarefasGuide() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Integração n8n - Tarefas Automatizadas</h1>
          <p className="text-lg text-muted-foreground">
            Documentação completa para configurar o envio automático de mensagens WhatsApp via n8n baseado em tarefas agendadas no CRM
          </p>
        </div>

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
                    Usuário cria uma tarefa no CRM com tipo "Tarefa Automatizada", definindo data/hora, número WhatsApp e mensagem
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-1">2</Badge>
                <div>
                  <p className="font-medium">Armazenamento no Banco</p>
                  <p className="text-sm text-muted-foreground">
                    Tarefa é salva na tabela <code className="text-xs bg-muted px-1 py-0.5 rounded">crm_tasks</code> com status "open" e tipo_tarefa "automatizada"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-1">3</Badge>
                <div>
                  <p className="font-medium">Detecção pelo n8n</p>
                  <p className="text-sm text-muted-foreground">
                    Workflow n8n consulta periodicamente o banco buscando tarefas automatizadas com due_at próximo ou vencido
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-1">4</Badge>
                <div>
                  <p className="font-medium">Disparo Automático</p>
                  <p className="text-sm text-muted-foreground">
                    Na data/hora programada, n8n envia a mensagem via Evolution API WhatsApp
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-1">5</Badge>
                <div>
                  <p className="font-medium">Atualização de Status</p>
                  <p className="text-sm text-muted-foreground">
                    Após envio bem-sucedido, n8n atualiza o status da tarefa para "done" no banco
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
              Estrutura da Tabela crm_tasks
            </CardTitle>
            <CardDescription>Campos relevantes para tarefas automatizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
              <div><span className="text-primary">id</span> <span className="text-muted-foreground">UUID</span> - Identificador único da tarefa</div>
              <div><span className="text-primary">deal_id</span> <span className="text-muted-foreground">UUID</span> - Referência ao negócio no CRM</div>
              <div><span className="text-primary">title</span> <span className="text-muted-foreground">TEXT</span> - Título da tarefa</div>
              <div><span className="text-primary">note</span> <span className="text-muted-foreground">TEXT</span> - Mensagem que será enviada</div>
              <div><span className="text-primary">due_at</span> <span className="text-muted-foreground">TIMESTAMP</span> - Data e hora para envio</div>
              <div><span className="text-primary">status</span> <span className="text-muted-foreground">TEXT</span> - Status: "open" ou "done"</div>
              <div><span className="text-primary">tipo_tarefa</span> <span className="text-muted-foreground">TEXT</span> - "interna" ou "automatizada"</div>
              <div><span className="text-primary">whatsapp_number</span> <span className="text-muted-foreground">TEXT</span> - Número do destinatário</div>
              <div><span className="text-primary">origem_modulo</span> <span className="text-muted-foreground">TEXT</span> - "crm" ou "prospeccao"</div>
            </div>
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
                <h3 className="font-semibold mb-2">2. Supabase Node (Query)</h3>
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <p className="text-sm font-medium">Configuração:</p>
                  <div className="bg-background p-3 rounded text-xs font-mono space-y-1">
                    <div><span className="text-muted-foreground">Operation:</span> Execute Query</div>
                    <div><span className="text-muted-foreground">Query Type:</span> Custom SQL</div>
                  </div>
                  
                  <p className="text-sm font-medium mt-3">Query SQL:</p>
                  <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`SELECT 
  t.id,
  t.deal_id,
  t.title,
  t.note as mensagem,
  t.whatsapp_number,
  t.due_at,
  t.created_by,
  t.origem_modulo,
  wc.instance_name,
  wc.instance_id,
  wc.id as whatsapp_connection_id
FROM crm_tasks t
INNER JOIN profiles p ON t.created_by = p.id
INNER JOIN tendenci_whatsapp_connections wc 
  ON wc.user_id = p.id 
  AND wc.status = 'connected'
WHERE t.tipo_tarefa = 'automatizada'
  AND t.status = 'open'
  AND t.due_at <= NOW()
ORDER BY t.due_at ASC`}
                  </pre>
                  
                  <Alert className="mt-3">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>✨ Isolamento por Vendedor:</strong> O JOIN garante que apenas tarefas de vendedores com instância WhatsApp conectada sejam processadas. Cada tarefa usa automaticamente a instância específica do vendedor que a criou, evitando duplicidade.
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
                    <div><span className="text-muted-foreground">URL:</span> {'{{ $env.EVOLUTION_API_URL }}/message/sendText/{{ $json.instance_name }}'}</div>
                    <div><span className="text-muted-foreground">Authentication:</span> Header Auth</div>
                    <div><span className="text-muted-foreground">Header Name:</span> apikey</div>
                    <div><span className="text-muted-foreground">Header Value:</span> {'{{ $env.EVOLUTION_API_KEY }}'}</div>
                  </div>
                  
                  <p className="text-sm font-medium mt-3">Body (JSON):</p>
                  <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "number": "{{ $json.whatsapp_number }}",
  "text": "{{ $json.mensagem }}"
}`}
                  </pre>

                  <Alert className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>✨ Instância Dinâmica:</strong> A URL usa <code>instance_name</code> da query, garantindo que cada mensagem seja enviada pela instância WhatsApp do vendedor que criou a tarefa. Configure no n8n:
                      <ul className="list-disc ml-4 mt-2 space-y-1">
                        <li>EVOLUTION_API_URL - URL da sua Evolution API</li>
                        <li>EVOLUTION_API_KEY - Chave de API da Evolution</li>
                      </ul>
                      ⚠️ Não precisa mais de EVOLUTION_INSTANCE fixo!
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">6. Supabase Node (Update)</h3>
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <p className="text-sm mb-2">Atualize o status da tarefa após envio bem-sucedido:</p>
                  
                  <div className="bg-background p-3 rounded text-xs font-mono space-y-1">
                    <div><span className="text-muted-foreground">Operation:</span> Update</div>
                    <div><span className="text-muted-foreground">Table:</span> crm_tasks</div>
                    <div><span className="text-muted-foreground">Filter:</span> id = {'{{ $("Loop Over Items").item.json.id }}'}</div>
                  </div>

                  <p className="text-sm font-medium mt-3">Campos a Atualizar:</p>
                  <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "status": "done",
  "updated_at": "{{ $now.toISO() }}"
}`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">7. Error Handler (Opcional)</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm mb-3">Configure tratamento de erros caso o envio falhe:</p>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Se o envio falhar, você pode:
                      <ul className="list-disc ml-4 mt-2 space-y-1">
                        <li>Registrar o erro em uma tabela de logs</li>
                        <li>Enviar notificação para a equipe</li>
                        <li>Manter o status "open" para nova tentativa</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
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
                  <Badge variant="outline">2</Badge>
                  <span>Supabase Query (Buscar tarefas pendentes)</span>
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
                  <Badge variant="outline">5</Badge>
                  <span>HTTP Request (Enviar via Evolution API)</span>
                </div>
                <div className="ml-6 text-muted-foreground">↓</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">6</Badge>
                  <span>Supabase Update (Marcar como concluída)</span>
                </div>
                <div className="ml-6 text-muted-foreground">↓</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">7</Badge>
                  <span>Error Handler (Se falhar)</span>
                </div>
              </div>
            </div>
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
              <h3 className="font-semibold mb-2 text-sm">Dados da Query Supabase:</h3>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "deal_id": "d4e5f6g7-h8i9-0123-4567-89abcdef0123",
  "title": "Follow-up Cliente João",
  "mensagem": "Olá João! Tudo bem? Passando para saber se você já teve tempo de avaliar nossa proposta. Estou à disposição para esclarecer dúvidas. Abraço!",
  "due_at": "2025-01-21T14:30:00Z",
  "whatsapp_number": "5511999999999",
  "created_by": "f9e8d7c6-b5a4-3210-9876-543210fedcba",
  "origem_modulo": "crm",
  "instance_name": "vendedor_maira",
  "instance_id": "12AB34CD56EF",
  "whatsapp_connection_id": "c6d7e8f9-a0b1-2345-6789-0abcdef12345"
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm">Payload para Evolution API:</h3>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "number": "5511999999999",
  "text": "Olá João! Tudo bem? Passando para saber se você já teve tempo de avaliar nossa proposta. Estou à disposição para esclarecer dúvidas. Abraço!"
}`}
              </pre>
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
                  <p className="text-xs text-muted-foreground">URL do projeto, Anon Key, Service Role Key</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Variáveis de ambiente da Evolution API configuradas</p>
                  <p className="text-xs text-muted-foreground">EVOLUTION_API_URL, EVOLUTION_API_KEY</p>
                  <p className="text-xs font-semibold text-muted-foreground mt-1">⚠️ Não precisa de EVOLUTION_INSTANCE fixo - cada tarefa usa a instância do vendedor automaticamente</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Schedule Trigger configurado para executar a cada minuto</p>
                  <p className="text-xs text-muted-foreground">Cron: * * * * *</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Query Supabase filtrando corretamente tarefas automatizadas</p>
                  <p className="text-xs text-muted-foreground">tipo_tarefa = 'automatizada' AND status = 'open'</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">HTTP Request para Evolution API configurado</p>
                  <p className="text-xs text-muted-foreground">POST /message/sendText com headers corretos</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Update do Supabase após envio bem-sucedido</p>
                  <p className="text-xs text-muted-foreground">Atualizar status para "done"</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Tratamento de erros configurado</p>
                  <p className="text-xs text-muted-foreground">Error Handler para falhas no envio</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Workflow ativado no n8n</p>
                  <p className="text-xs text-muted-foreground">Status: Active</p>
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