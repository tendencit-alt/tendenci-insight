import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, MessageSquare, ArrowRight, Database, Bot, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const N8nConversationGuide = () => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const endpointUrl = "https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/update-deal-conversation";

  // Payload exemplo para resposta da IA
  const examplePayloadAI = `{
  "client_phone": "5534999999999",
  "new_message": "Oi, vamos seguir na sua mesa de 2,20 m com borda orgânica e base em metalon. Prefere a madeira do tampo mais clara ou mais escura?",
  "sender": "ai"
}`;

  // Payload exemplo para mensagem do cliente
  const examplePayloadClient = `{
  "client_phone": "5534999999999",
  "new_message": "Prefiro mais clara, tipo carvalho",
  "sender": "client"
}`;

  // JSON do nó HTTP Request para salvar mensagem do CLIENTE
  const n8nNodeClientJSON = `{
  "parameters": {
    "method": "POST",
    "url": "${endpointUrl}",
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
    "jsonBody": "={{ JSON.stringify({ client_phone: $json.telefone_limpo, new_message: $json.mensagem, sender: 'client' }) }}"
  },
  "name": "Salvar Mensagem Cliente no CRM",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [650, 300]
}`;

  // JSON do nó HTTP Request para salvar resposta da IA
  const n8nNodeAIJSON = `{
  "parameters": {
    "method": "POST",
    "url": "${endpointUrl}",
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
    "jsonBody": "={{ JSON.stringify({ client_phone: $json.telefone_limpo, new_message: $json.resposta_ia, sender: 'ai' }) }}"
  },
  "name": "Salvar Resposta IA no CRM",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [1050, 300]
}`;

  // Workflow completo para importar
  const n8nFullWorkflowJSON = `{
  "name": "Atualizar Conversa IA → CRM Tendenci",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "receber-mensagens",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300]
    },
    {
      "parameters": {
        "jsCode": "// Extrair dados da mensagem recebida\\nconst body = $input.first().json.body || $input.first().json;\\nconst mensagem = body.data?.message?.conversation || body.mensagem || '';\\nconst pushName = body.data?.pushName || body.pushName || 'Cliente';\\nlet telefone = body.data?.key?.remoteJid || body.telefone || '';\\n\\n// Limpar telefone (remover @s.whatsapp.net e caracteres especiais)\\ntelefone = telefone.replace('@s.whatsapp.net', '').replace(/\\\\D/g, '');\\n\\n// Garantir formato brasileiro (55 + DDD + número)\\nif (telefone.length === 11) {\\n  telefone = '55' + telefone;\\n}\\n\\nreturn [{\\n  json: {\\n    mensagem,\\n    pushName,\\n    telefone_limpo: telefone,\\n    timestamp: new Date().toISOString()\\n  }\\n}];"
      },
      "name": "Extrair Dados",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [450, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "${endpointUrl}",
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
        "jsonBody": "={{ JSON.stringify({ client_phone: $json.telefone_limpo, new_message: $json.mensagem, sender: 'client' }) }}"
      },
      "name": "Salvar Mensagem Cliente",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [650, 300]
    },
    {
      "parameters": {
        "resource": "chat",
        "operation": "message",
        "modelId": { "__rl": true, "value": "gpt-4o-mini", "mode": "list" },
        "messages": {
          "values": [
            {
              "role": "system",
              "content": "Você é Matheus, consultor comercial da Tendenci Brasil, especializada em móveis de alto padrão. Seja cordial, profissional e objetivo."
            },
            {
              "role": "user",
              "content": "={{ $json.mensagem }}"
            }
          ]
        },
        "options": {}
      },
      "name": "OpenAI Chat",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "typeVersion": 1.8,
      "position": [850, 300]
    },
    {
      "parameters": {
        "jsCode": "// Pegar resposta da IA e dados anteriores\\nconst resposta = $input.first().json.message?.content || $input.first().json.text || '';\\nconst dadosAnteriores = $('Extrair Dados').first().json;\\n\\nreturn [{\\n  json: {\\n    ...dadosAnteriores,\\n    resposta_ia: resposta\\n  }\\n}];"
      },
      "name": "Formatar Resposta",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1050, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "${endpointUrl}",
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
        "jsonBody": "={{ JSON.stringify({ client_phone: $json.telefone_limpo, new_message: $json.resposta_ia, sender: 'ai' }) }}"
      },
      "name": "Salvar Resposta IA",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1250, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://sua-evolution-api.com/message/sendText/NOME_INSTANCIA",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "SUA_API_KEY"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ number: $json.telefone_limpo, text: $json.resposta_ia }) }}"
      },
      "name": "Enviar via Evolution",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1450, 300]
    }
  ],
  "connections": {
    "Webhook Trigger": { "main": [[{ "node": "Extrair Dados", "type": "main", "index": 0 }]] },
    "Extrair Dados": { "main": [[{ "node": "Salvar Mensagem Cliente", "type": "main", "index": 0 }]] },
    "Salvar Mensagem Cliente": { "main": [[{ "node": "OpenAI Chat", "type": "main", "index": 0 }]] },
    "OpenAI Chat": { "main": [[{ "node": "Formatar Resposta", "type": "main", "index": 0 }]] },
    "Formatar Resposta": { "main": [[{ "node": "Salvar Resposta IA", "type": "main", "index": 0 }]] },
    "Salvar Resposta IA": { "main": [[{ "node": "Enviar via Evolution", "type": "main", "index": 0 }]] }
  }
}`;

  // Body expressions para copiar
  const bodyExpressionClient = `={{ JSON.stringify({ client_phone: $json.telefone_limpo, new_message: $json.mensagem, sender: 'client' }) }}`;
  const bodyExpressionAI = `={{ JSON.stringify({ client_phone: $json.telefone_limpo, new_message: $json.resposta_ia, sender: 'ai' }) }}`;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-5xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Atualização de Conversa IA → CRM</h1>
          <p className="text-muted-foreground">
            Configure o n8n para enviar atualizações de conversa após cada resposta da IA
          </p>
        </div>

        {/* Diagrama do Fluxo */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Fluxo Completo do Workflow
            </CardTitle>
            <CardDescription>
              Cada mensagem (cliente e IA) é salva no CRM automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-xs text-center">
              <div className="flex flex-col items-center gap-1">
                <Badge variant="outline" className="py-2 px-2 w-full">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Webhook
                </Badge>
                <span className="text-muted-foreground">Recebe msg</span>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Badge variant="outline" className="py-2 px-2 w-full">Extrair Dados</Badge>
                <span className="text-muted-foreground">Code node</span>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Badge className="py-2 px-2 w-full bg-blue-600">
                  <Database className="h-3 w-3 mr-1" />
                  Salvar Cliente
                </Badge>
                <span className="text-blue-600 font-medium">HTTP POST</span>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Badge variant="outline" className="py-2 px-2 w-full">
                  <Bot className="h-3 w-3 mr-1" />
                  OpenAI
                </Badge>
                <span className="text-muted-foreground">Gera resposta</span>
              </div>
            </div>
            
            <div className="flex justify-end mt-2">
              <div className="grid grid-cols-5 gap-2 text-xs text-center">
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Badge variant="outline" className="py-2 px-2 w-full">Formatar</Badge>
                  <span className="text-muted-foreground">Code node</span>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Badge className="py-2 px-2 w-full bg-green-600">
                    <Database className="h-3 w-3 mr-1" />
                    Salvar IA
                  </Badge>
                  <span className="text-green-600 font-medium">HTTP POST</span>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endpoint */}
        <Card>
          <CardHeader>
            <CardTitle>1. Endpoint da Edge Function</CardTitle>
            <CardDescription>
              Use esta URL nos nós HTTP Request do n8n
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-3 rounded text-sm break-all font-mono">
                {endpointUrl}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(endpointUrl, "URL")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-4 text-sm">
              <Badge variant="secondary">POST</Badge>
              <span className="text-muted-foreground">Content-Type: application/json</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs para diferentes configurações */}
        <Card>
          <CardHeader>
            <CardTitle>2. Configuração dos Nós HTTP Request</CardTitle>
            <CardDescription>
              Você precisará de 2 nós: um para salvar mensagem do cliente, outro para resposta da IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="client" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="client" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Mensagem Cliente
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Resposta IA
                </TabsTrigger>
              </TabsList>

              <TabsContent value="client" className="space-y-4 mt-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                    Nó: Salvar Mensagem Cliente no CRM
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Posicione este nó APÓS o nó "Extrair Dados" e ANTES do nó OpenAI
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-medium">Method:</span>
                    <Badge variant="outline" className="w-fit">POST</Badge>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-medium">URL:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs break-all">{endpointUrl}</code>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-medium">Body Type:</span>
                    <Badge variant="outline" className="w-fit">JSON</Badge>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-sm mb-2">Body (Expression):</p>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto font-mono">
                      {bodyExpressionClient}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(bodyExpressionClient, "Expression Cliente")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-sm mb-2">JSON do Nó (importar no n8n):</p>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-40 font-mono">
                      {n8nNodeClientJSON}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(n8nNodeClientJSON, "JSON Nó Cliente")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 mt-4">
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                    Nó: Salvar Resposta IA no CRM
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Posicione este nó APÓS o nó OpenAI (ou "Formatar Resposta") e ANTES de enviar ao Evolution
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-medium">Method:</span>
                    <Badge variant="outline" className="w-fit">POST</Badge>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-medium">URL:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs break-all">{endpointUrl}</code>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-medium">Body Type:</span>
                    <Badge variant="outline" className="w-fit">JSON</Badge>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-sm mb-2">Body (Expression):</p>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto font-mono">
                      {bodyExpressionAI}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(bodyExpressionAI, "Expression IA")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-sm mb-2">JSON do Nó (importar no n8n):</p>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-40 font-mono">
                      {n8nNodeAIJSON}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(n8nNodeAIJSON, "JSON Nó IA")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Workflow Completo */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              3. Workflow Completo (Importar)
            </CardTitle>
            <CardDescription>
              Copie e importe no n8n: Menu → Import from JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Atenção:</strong> Substitua <code className="bg-amber-200 dark:bg-amber-800 px-1 rounded">SUA_EVOLUTION_API</code> e <code className="bg-amber-200 dark:bg-amber-800 px-1 rounded">SUA_API_KEY</code> pelos valores reais
              </div>
            </div>

            <div className="relative">
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto max-h-96 font-mono">
                {n8nFullWorkflowJSON}
              </pre>
              <Button
                variant="default"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(n8nFullWorkflowJSON, "Workflow Completo")}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiar Workflow
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Variáveis Disponíveis */}
        <Card>
          <CardHeader>
            <CardTitle>4. Variáveis Disponíveis no Workflow</CardTitle>
            <CardDescription>
              Use estas expressões nos seus nós
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Após "Extrair Dados":</h4>
                <div className="bg-muted p-3 rounded space-y-1 text-xs font-mono">
                  <p><span className="text-blue-600">$json.telefone_limpo</span> → 5534999999999</p>
                  <p><span className="text-blue-600">$json.mensagem</span> → Texto do cliente</p>
                  <p><span className="text-blue-600">$json.pushName</span> → Nome do cliente</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Após "Formatar Resposta":</h4>
                <div className="bg-muted p-3 rounded space-y-1 text-xs font-mono">
                  <p><span className="text-green-600">$json.resposta_ia</span> → Resposta gerada</p>
                  <p><span className="text-green-600">$json.telefone_limpo</span> → Mantido</p>
                  <p><span className="text-green-600">$json.mensagem</span> → Msg original</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultado Esperado */}
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              5. Resultado no CRM
            </CardTitle>
            <CardDescription>
              Após configurar, o histórico exibirá a conversa completa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded space-y-2 text-sm font-mono">
              <p className="text-blue-600">[12/12/2025 10:04] 👤 Cliente: Oi</p>
              <p className="text-green-600">[12/12/2025 10:04] 🤖 IA: Oi, vamos seguir na sua mesa de 2,20 m com borda orgânica e base em metalon. Prefere a madeira do tampo mais clara ou mais escura?</p>
              <p className="text-blue-600">[12/12/2025 10:05] 👤 Cliente: Prefiro mais clara, tipo carvalho</p>
              <p className="text-green-600">[12/12/2025 10:05] 🤖 IA: Perfeito! O carvalho fica lindo nesse estilo. Vou preparar um orçamento...</p>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Erro 404 - Deal não encontrado
                </p>
                <p className="text-muted-foreground">
                  Verifique se o telefone está correto e se existe um deal com <code className="bg-muted px-1 rounded">from_ai=true</code>
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Erro 400 - Parâmetros inválidos
                </p>
                <p className="text-muted-foreground">
                  Certifique-se de enviar <code className="bg-muted px-1 rounded">new_message</code> e <code className="bg-muted px-1 rounded">client_phone</code>
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Histórico duplicado
                </p>
                <p className="text-muted-foreground">
                  Não envie a mesma mensagem duas vezes. Use apenas 1 nó para cliente e 1 para IA
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Verificar logs
                </p>
                <p className="text-muted-foreground">
                  Acesse Lovable Cloud → Edge Functions → update-deal-conversation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default N8nConversationGuide;
