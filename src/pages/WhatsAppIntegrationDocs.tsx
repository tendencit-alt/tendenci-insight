import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Smartphone, 
  Webhook, 
  CheckCircle2, 
  AlertCircle, 
  Code2, 
  Database,
  ExternalLink,
  Settings,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WhatsAppIntegrationDocs() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Smartphone className="h-8 w-8 text-primary" />
              Documentação de Integração WhatsApp
            </h1>
            <p className="text-muted-foreground mt-2">
              Guia completo para configurar campanhas automatizadas via n8n e Evolution API
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            v1.0.0
          </Badge>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Visão Geral do Fluxo
            </CardTitle>
            <CardDescription>
              Entenda como as campanhas são processadas do início ao fim
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">1. Lovable CRM (Frontend)</p>
                  <p className="text-sm text-muted-foreground">Disparo da campanha com dados dos profissionais parceiros</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded">
                  <Webhook className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">2. Webhook n8n</p>
                  <p className="text-sm text-muted-foreground">Processa payload e prepara envio</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">3. Evolution API (WhatsApp)</p>
                  <p className="text-sm text-muted-foreground">Envia mensagem via WhatsApp Business</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">4. Profissional Parceiro (Cliente)</p>
                  <p className="text-sm text-muted-foreground">Recebe a mensagem no WhatsApp</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="payload" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="payload">Payload JSON</TabsTrigger>
            <TabsTrigger value="n8n">Configuração n8n</TabsTrigger>
            <TabsTrigger value="evolution">Evolution API</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          </TabsList>

          {/* Payload JSON Tab */}
          <TabsContent value="payload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Estrutura do Payload Enviado
                </CardTitle>
                <CardDescription>
                  JSON completo enviado do Lovable CRM para o webhook n8n
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Cada arquiteto selecionado na campanha recebe um POST individual com este payload
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <p className="font-semibold mb-2">Payload Completo:</p>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "campanha_id": "uuid-da-campanha",
  "profissional parceiro_id": "uuid-do-profissional parceiro",
  "nome": "Nome do Profissional Parceiro",
  "telefone": "5511999999999",
  "tipo_envio": "texto",
  "conteudo_texto": "Mensagem em texto...",
  "conteudo_imagem_url": "https://url-imagem.jpg",
  "conteudo_audio_url": "https://url-audio.mp3"
}`}
                    </pre>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Campanha de Texto</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`{
  "tipo_envio": "texto",
  "conteudo_texto": "Olá! 🏡",
  "conteudo_imagem_url": null,
  "conteudo_audio_url": null
}`}
                        </pre>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Campanha de Imagem</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`{
  "tipo_envio": "imagem",
  "conteudo_texto": "Legenda",
  "conteudo_imagem_url": "...",
  "conteudo_audio_url": null
}`}
                        </pre>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Campanha de Áudio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`{
  "tipo_envio": "audio",
  "conteudo_texto": null,
  "conteudo_imagem_url": null,
  "conteudo_audio_url": "..."
}`}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Descrição dos Campos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded">
                    <Badge>UUID</Badge>
                    <div className="flex-1">
                      <p className="font-medium">campanha_id</p>
                      <p className="text-sm text-muted-foreground">ID único da campanha no banco de dados</p>
                    </div>
                    <Badge variant="outline">Obrigatório</Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded">
                    <Badge>UUID</Badge>
                    <div className="flex-1">
                      <p className="font-medium">profissional parceiro_id</p>
                      <p className="text-sm text-muted-foreground">ID único do profissional parceiro destinatário</p>
                    </div>
                    <Badge variant="outline">Obrigatório</Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded">
                    <Badge>String</Badge>
                    <div className="flex-1">
                      <p className="font-medium">nome</p>
                      <p className="text-sm text-muted-foreground">Nome do profissional parceiro</p>
                    </div>
                    <Badge variant="outline">Obrigatório</Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded">
                    <Badge>String</Badge>
                    <div className="flex-1">
                      <p className="font-medium">telefone</p>
                      <p className="text-sm text-muted-foreground">Telefone no formato 5511999999999</p>
                    </div>
                    <Badge variant="outline">Obrigatório</Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded">
                    <Badge>Enum</Badge>
                    <div className="flex-1">
                      <p className="font-medium">tipo_envio</p>
                      <p className="text-sm text-muted-foreground">Valores: "texto", "imagem" ou "audio"</p>
                    </div>
                    <Badge variant="outline">Obrigatório</Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded">
                    <Badge>String</Badge>
                    <div className="flex-1">
                      <p className="font-medium">conteudo_texto</p>
                      <p className="text-sm text-muted-foreground">Texto da mensagem (obrigatório se tipo_envio = "texto")</p>
                    </div>
                    <Badge variant="secondary">Condicional</Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded">
                    <Badge>URL</Badge>
                    <div className="flex-1">
                      <p className="font-medium">conteudo_imagem_url</p>
                      <p className="text-sm text-muted-foreground">URL da imagem (obrigatório se tipo_envio = "imagem")</p>
                    </div>
                    <Badge variant="secondary">Condicional</Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded">
                    <Badge>URL</Badge>
                    <div className="flex-1">
                      <p className="font-medium">conteudo_audio_url</p>
                      <p className="text-sm text-muted-foreground">URL do áudio (obrigatório se tipo_envio = "audio")</p>
                    </div>
                    <Badge variant="secondary">Condicional</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* n8n Configuration Tab */}
          <TabsContent value="n8n" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuração Passo a Passo no n8n
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold text-lg mb-2">Passo 1: Criar Webhook Trigger</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Adicione um node <Badge variant="outline">Webhook</Badge></li>
                      <li>Configure HTTP Method: <code className="bg-muted px-2 py-1 rounded">POST</code></li>
                      <li>Path: <code className="bg-muted px-2 py-1 rounded">/campanha-whatsapp</code></li>
                      <li>Response Mode: <code className="bg-muted px-2 py-1 rounded">On Received</code></li>
                      <li>Response Code: <code className="bg-muted px-2 py-1 rounded">200</code></li>
                    </ol>
                    <Alert className="mt-3">
                      <AlertDescription>
                        A URL gerada será algo como: <code className="text-xs">https://seu-n8n.app.n8n.cloud/webhook/campanha-whatsapp</code>
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold text-lg mb-2">Passo 2: Processar Dados</h3>
                    <p className="text-sm mb-2">Adicione um node <Badge variant="outline">Code</Badge> com:</p>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`// Extrair dados do webhook
const payload = $input.item.json.body;

const campanhaId = payload.campanha_id;
const profissional parceiroId = payload.profissional parceiro_id;
const nome = payload.nome;
const telefone = payload.telefone;
const tipoEnvio = payload.tipo_envio;
const conteudoTexto = payload.conteudo_texto;
const conteudoImagemUrl = payload.conteudo_imagem_url;
const conteudoAudioUrl = payload.conteudo_audio_url;

// Formatar número para Evolution API
const numeroFormatado = telefone.includes('@') 
  ? telefone 
  : \`\${telefone}@s.whatsapp.net\`;

return {
  json: {
    campanha_id: campanhaId,
    profissional parceiro_id: profissional parceiroId,
    nome: nome,
    numero: numeroFormatado,
    tipo_envio: tipoEnvio,
    conteudo_texto: conteudoTexto,
    conteudo_imagem_url: conteudoImagemUrl,
    conteudo_audio_url: conteudoAudioUrl
  }
};`}
                    </pre>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold text-lg mb-2">Passo 3: Enviar via Evolution API</h3>
                    <p className="text-sm mb-2">Adicione um node <Badge variant="outline">HTTP Request</Badge>:</p>
                    
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded">
                        <p className="font-medium text-sm mb-1">Para Mensagens de Texto:</p>
                        <pre className="text-xs overflow-x-auto">
{`Method: POST
URL: {{$env.EVOLUTION_API_URL}}/message/sendText/{{$env.INSTANCE_NAME}}
Headers:
  - apikey: {{$env.EVOLUTION_API_KEY}}
  - Content-Type: application/json

Body:
{
  "number": "{{$json.numero}}",
  "text": "{{$json.conteudo_texto}}",
  "delay": 1000
}`}
                        </pre>
                      </div>

                      <div className="bg-muted p-3 rounded">
                        <p className="font-medium text-sm mb-1">Para Mensagens com Imagem:</p>
                        <pre className="text-xs overflow-x-auto">
{`Method: POST
URL: {{$env.EVOLUTION_API_URL}}/message/sendMedia/{{$env.INSTANCE_NAME}}
Headers:
  - apikey: {{$env.EVOLUTION_API_KEY}}
  - Content-Type: application/json

Body:
{
  "number": "{{$json.numero}}",
  "mediatype": "image",
  "media": "{{$json.conteudo_imagem_url}}",
  "caption": "{{$json.conteudo_texto}}",
  "delay": 1000
}`}
                        </pre>
                      </div>

                      <div className="bg-muted p-3 rounded">
                        <p className="font-medium text-sm mb-1">Para Mensagens com Áudio:</p>
                        <pre className="text-xs overflow-x-auto">
{`Method: POST
URL: {{$env.EVOLUTION_API_URL}}/message/sendMedia/{{$env.INSTANCE_NAME}}
Headers:
  - apikey: {{$env.EVOLUTION_API_KEY}}
  - Content-Type: application/json

Body:
{
  "number": "{{$json.numero}}",
  "mediatype": "audio",
  "media": "{{$json.conteudo_audio_url}}",
  "delay": 1000
}`}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold text-lg mb-2">Passo 4: Retornar Sucesso</h3>
                    <p className="text-sm mb-2">Adicione um node <Badge variant="outline">Respond to Webhook</Badge>:</p>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "success": true,
  "message": "Mensagem enviada com sucesso",
  "timestamp": "{{new Date().toISOString()}}"
}`}
                    </pre>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Variáveis de Ambiente Necessárias:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li><code>EVOLUTION_API_URL</code> - URL base da Evolution API</li>
                      <li><code>EVOLUTION_API_KEY</code> - Chave de autenticação</li>
                      <li><code>INSTANCE_NAME</code> - Nome da instância WhatsApp conectada</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evolution API Tab */}
          <TabsContent value="evolution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Integração com Evolution API
                </CardTitle>
                <CardDescription>
                  Como o sistema se conecta com o WhatsApp Business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    O sistema já possui uma Edge Function pronta para facilitar o envio via Evolution API
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Edge Function do Lovable (Recomendado)</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Use esta função para simplificar o envio via n8n
                    </p>
                    <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`URL: https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/whatsapp-send-message
Method: POST
Headers:
  - Content-Type: application/json
  - apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  - Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Body:
{
  "instanceName": "nome-da-instancia",
  "phoneNumber": "{{$json.numero}}",
  "message": "{{$json.conteudo_texto}}",
  "campaignId": "{{$json.campanha_id}}",
  "architectId": "{{$json.profissional parceiro_id}}"
}`}
                    </pre>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Verificar Conexão</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Vá em <strong>Prospecção → WhatsApp API</strong> para verificar:
                        </p>
                        <ul className="text-sm space-y-1">
                          <li>• Status da instância</li>
                          <li>• Número conectado</li>
                          <li>• QR Code (se necessário)</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Formato do Telefone</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Aceita dois formatos:
                        </p>
                        <ul className="text-sm space-y-1">
                          <li>• <code>5511999999999</code></li>
                          <li>• <code>5511999999999@s.whatsapp.net</code></li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2">
                          A conversão é automática
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Monitoramento e Logs
                </CardTitle>
                <CardDescription>
                  Acompanhe o status dos envios e identifique problemas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold mb-2">Logs de Histórico</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Tabela: <code className="bg-muted px-2 py-1 rounded">tendenci_prospec_arq_logs</code>
                    </p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`SELECT 
  pal.created_at,
  a.name as profissional parceiro,
  c.nome as campanha,
  pal.mensagem
FROM tendenci_prospec_arq_logs pal
JOIN architects a ON a.id = pal.architect_id
LEFT JOIN tendenci_prospec_arq_campaigns c ON c.id = pal.campanha_id
WHERE pal.tipo = 'campanha'
ORDER BY pal.created_at DESC
LIMIT 20;`}
                    </pre>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold mb-2">Logs de Dispatch</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Tabela: <code className="bg-muted px-2 py-1 rounded">tendenci_prospec_arq_campaign_dispatches</code>
                    </p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`SELECT 
  d.enviado_em,
  a.name as profissional parceiro,
  a.phone,
  d.status,
  d.mensagem_erro
FROM tendenci_prospec_arq_campaign_dispatches d
JOIN architects a ON a.id = d.architect_id
WHERE d.campanha_id = 'UUID-DA-CAMPANHA'
ORDER BY d.enviado_em DESC;`}
                    </pre>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-semibold mb-2">Status dos Profissionais Parceiros</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Após envio bem-sucedido, arquitetos são automaticamente movidos para:
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge>status_funil</Badge>
                      <span className="text-sm">=</span>
                      <code className="bg-muted px-2 py-1 rounded text-sm">contato_iniciado</code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Além disso, <code>data_primeiro_contato</code> e <code>data_ultimo_contato</code> são atualizados
                    </p>
                  </div>
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Indicadores de Sucesso:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Status da campanha: "enviado"</li>
                      <li>Status do dispatch: "sucesso"</li>
                      <li>Registro criado em tendenci_prospec_arq_logs</li>
                      <li>Profissional Parceiro movido para "contato_iniciado"</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Troubleshooting Tab */}
          <TabsContent value="troubleshooting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Resolução de Problemas
                </CardTitle>
                <CardDescription>
                  Soluções para os erros mais comuns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border border-destructive/20 rounded-lg p-4">
                    <h3 className="font-semibold text-destructive mb-2">❌ Erro: "Webhook não responde"</h3>
                    <p className="text-sm mb-2"><strong>Causa:</strong> n8n não está recebendo a requisição</p>
                    <p className="text-sm"><strong>Solução:</strong></p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li>Verifique se o workflow está <strong>ativado</strong> no n8n</li>
                      <li>Confirme que a URL do webhook está correta na campanha</li>
                      <li>Teste o webhook com Postman ou cURL</li>
                    </ul>
                  </div>

                  <div className="border border-destructive/20 rounded-lg p-4">
                    <h3 className="font-semibold text-destructive mb-2">❌ Erro: "Evolution API não está configurada"</h3>
                    <p className="text-sm mb-2"><strong>Causa:</strong> Variáveis de ambiente ausentes no n8n</p>
                    <p className="text-sm"><strong>Solução:</strong></p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li>Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e INSTANCE_NAME</li>
                      <li>Reinicie o workflow após configurar as variáveis</li>
                    </ul>
                  </div>

                  <div className="border border-destructive/20 rounded-lg p-4">
                    <h3 className="font-semibold text-destructive mb-2">❌ Erro: "Instância não está conectada"</h3>
                    <p className="text-sm mb-2"><strong>Causa:</strong> WhatsApp Evolution desconectado</p>
                    <p className="text-sm"><strong>Solução:</strong></p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li>Vá em <strong>Prospecção → Aba WhatsApp API</strong></li>
                      <li>Verifique o status da conexão</li>
                      <li>Se necessário, gere novo QR Code e escaneie novamente</li>
                    </ul>
                  </div>

                  <div className="border border-destructive/20 rounded-lg p-4">
                    <h3 className="font-semibold text-destructive mb-2">❌ Erro: "Mensagem não chega no WhatsApp"</h3>
                    <p className="text-sm mb-2"><strong>Causa:</strong> Número incorreto ou bloqueado</p>
                    <p className="text-sm"><strong>Solução:</strong></p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                      <li>Verifique o formato do telefone: <code>5511999999999</code></li>
                      <li>Teste com seu próprio número primeiro</li>
                      <li>Verifique se o número não está bloqueado no WhatsApp Business</li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Dica:</strong> Sempre teste suas campanhas com um ou dois arquitetos antes de disparar para toda a lista
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Checklist de Configuração</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>WhatsApp Evolution API configurada e conectada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Instância WhatsApp com QR Code escaneado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Status da conexão: "Conectado" (verde)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Workflow n8n criado e ativado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Variáveis de ambiente configuradas no n8n</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>URL do webhook copiada e colada na campanha</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Teste realizado e mensagem recebida</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Links Úteis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button variant="outline" className="justify-start" asChild>
                <a href="/prospeccao" target="_blank">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Módulo de Prospecção
                </a>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <a href="/settings" target="_blank">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações do Sistema
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
