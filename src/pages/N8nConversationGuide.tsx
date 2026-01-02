import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, MessageSquare, ArrowRight, Database, Bot, CheckCircle, AlertCircle, Search, Package, BookOpen, Wrench } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

  // Endpoint do Prompt Master
  const promptMasterEndpoint = "https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/generate-master-prompt";
  
  // Novos endpoints de busca
  const searchProductsEndpoint = "https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/search-products";
  const searchKnowledgeEndpoint = "https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/search-knowledge";
  const getIADataEndpoint = "https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/get-ia-data";

  // JSON do nó para buscar prompt master
  const n8nNodePromptMasterJSON = `{
  "parameters": {
    "method": "GET",
    "url": "${promptMasterEndpoint}",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    }
  },
  "name": "Buscar Prompt Master",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [550, 300]
}`;

  // Tool: Buscar Produtos
  const toolBuscarProdutosJSON = `{
  "parameters": {
    "name": "buscar_produtos",
    "description": "Busca produtos no catálogo da empresa. Use quando o cliente perguntar sobre produtos, preços, materiais ou especificações.",
    "method": "GET",
    "url": "${searchProductsEndpoint}",
    "sendQuery": true,
    "specifyQuery": "keypair",
    "queryParameters": {
      "parameters": [
        {
          "name": "q",
          "value": "{search_term}",
          "description": "Termo de busca do produto"
        },
        {
          "name": "categoria",
          "value": "{category}",
          "description": "Categoria opcional para filtrar"
        }
      ]
    },
    "placeholderDefinitions": {
      "values": [
        {
          "name": "search_term",
          "description": "Nome ou descrição do produto que o cliente está buscando",
          "type": "string"
        },
        {
          "name": "category",
          "description": "Categoria do produto (opcional)",
          "type": "string"
        }
      ]
    }
  },
  "name": "Buscar Produtos",
  "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
  "typeVersion": 1.1
}`;

  // Tool: Buscar Conhecimento
  const toolBuscarConhecimentoJSON = `{
  "parameters": {
    "name": "buscar_conhecimento",
    "description": "Busca informações na base de conhecimento da empresa. Use para FAQs, políticas, garantias, processos e dúvidas gerais.",
    "method": "GET",
    "url": "${searchKnowledgeEndpoint}",
    "sendQuery": true,
    "specifyQuery": "keypair",
    "queryParameters": {
      "parameters": [
        {
          "name": "q",
          "value": "{search_term}",
          "description": "Termo de busca"
        },
        {
          "name": "tipo",
          "value": "{type}",
          "description": "Tipo: faq, documento, guia, politica"
        }
      ]
    },
    "placeholderDefinitions": {
      "values": [
        {
          "name": "search_term",
          "description": "Termo ou pergunta a buscar na base de conhecimento",
          "type": "string"
        },
        {
          "name": "type",
          "description": "Tipo de documento (opcional): faq, documento, guia, politica",
          "type": "string"
        }
      ]
    }
  },
  "name": "Buscar Conhecimento",
  "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
  "typeVersion": 1.1
}`;

  // Tool: Obter Dados IA
  const toolObterDadosIAJSON = `{
  "parameters": {
    "name": "obter_dados_ia",
    "description": "Obtém todos os dados da IA incluindo configurações, produtos e conhecimento. Use quando precisar de informações gerais da empresa.",
    "method": "GET",
    "url": "${getIADataEndpoint}",
    "sendQuery": true,
    "specifyQuery": "keypair",
    "queryParameters": {
      "parameters": [
        {
          "name": "type",
          "value": "{data_type}",
          "description": "Tipo: all, config, products, knowledge"
        }
      ]
    },
    "placeholderDefinitions": {
      "values": [
        {
          "name": "data_type",
          "description": "Tipo de dados: all (tudo), config (configurações), products (produtos), knowledge (conhecimento)",
          "type": "string"
        }
      ]
    }
  },
  "name": "Obter Dados IA",
  "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
  "typeVersion": 1.1
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
        "method": "GET",
        "url": "${promptMasterEndpoint}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        }
      },
      "name": "Buscar Prompt Master",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [550, 450]
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
      "position": [750, 300]
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
              "content": "={{ $('Buscar Prompt Master').item.json.prompt }}"
            },
            {
              "role": "user",
              "content": "={{ $('Extrair Dados').item.json.mensagem }}"
            }
          ]
        },
        "options": {}
      },
      "name": "OpenAI Chat",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "typeVersion": 1.8,
      "position": [950, 300]
    },
    {
      "parameters": {
        "jsCode": "// Pegar resposta da IA e dados anteriores\\nconst resposta = $input.first().json.message?.content || $input.first().json.text || '';\\nconst dadosAnteriores = $('Extrair Dados').first().json;\\n\\nreturn [{\\n  json: {\\n    ...dadosAnteriores,\\n    resposta_ia: resposta\\n  }\\n}];"
      },
      "name": "Formatar Resposta",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1150, 300]
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
      "position": [1350, 300]
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
      "position": [1550, 300]
    }
  ],
  "connections": {
    "Webhook Trigger": { "main": [[{ "node": "Extrair Dados", "type": "main", "index": 0 }]] },
    "Extrair Dados": { "main": [[{ "node": "Buscar Prompt Master", "type": "main", "index": 0 }, { "node": "Salvar Mensagem Cliente", "type": "main", "index": 0 }]] },
    "Buscar Prompt Master": { "main": [[{ "node": "Salvar Mensagem Cliente", "type": "main", "index": 0 }]] },
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
              Agora com Prompt Master dinâmico! O n8n busca automaticamente a configuração da IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-8 gap-1 text-xs text-center">
              <div className="flex flex-col items-center gap-1">
                <Badge variant="outline" className="py-2 px-1 w-full text-[10px]">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Webhook
                </Badge>
                <span className="text-muted-foreground text-[10px]">Recebe msg</span>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Badge variant="outline" className="py-2 px-1 w-full text-[10px]">Extrair</Badge>
                <span className="text-muted-foreground text-[10px]">Code</span>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Badge className="py-2 px-1 w-full bg-purple-600 text-[10px]">
                  Prompt Master
                </Badge>
                <span className="text-purple-600 font-medium text-[10px]">GET (dinâmico)</span>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Badge className="py-2 px-1 w-full bg-blue-600 text-[10px]">
                  <Database className="h-3 w-3 mr-1" />
                  Salvar Cli
                </Badge>
                <span className="text-blue-600 font-medium text-[10px]">POST</span>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            
            <div className="flex justify-end">
              <div className="grid grid-cols-6 gap-1 text-xs text-center">
                <div className="flex flex-col items-center gap-1">
                  <Badge variant="outline" className="py-2 px-1 w-full text-[10px]">
                    <Bot className="h-3 w-3 mr-1" />
                    OpenAI
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">Usa prompt</span>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Badge variant="outline" className="py-2 px-1 w-full text-[10px]">Formatar</Badge>
                  <span className="text-muted-foreground text-[10px]">Code</span>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Badge className="py-2 px-1 w-full bg-green-600 text-[10px]">
                    <Database className="h-3 w-3 mr-1" />
                    Salvar IA
                  </Badge>
                  <span className="text-green-600 font-medium text-[10px]">POST</span>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                <strong>✨ Novo:</strong> O nó "Buscar Prompt Master" carrega automaticamente toda a configuração da IA definida na interface. 
                Alterou o prompt na interface? O n8n já usa a versão atualizada!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Endpoint Prompt Master */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Bot className="h-5 w-5" />
              1. Endpoint do Prompt Master (NOVO!)
            </CardTitle>
            <CardDescription>
              Busca o prompt configurado na interface para usar no nó OpenAI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-3 rounded text-sm break-all font-mono">
                {promptMasterEndpoint}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(promptMasterEndpoint, "URL Prompt Master")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-4 text-sm">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">GET</Badge>
              <span className="text-muted-foreground">Retorna: {"{ prompt, version, updated_at }"}</span>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">Como usar no nó OpenAI:</p>
              <div className="relative">
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto font-mono">
{`{
  "role": "system",
  "content": "={{ $('Buscar Prompt Master').item.json.prompt }}"
}`}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`={{ $('Buscar Prompt Master').item.json.prompt }}`, "Expression Prompt")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div>
              <p className="font-medium text-sm mb-2">JSON do Nó (importar no n8n):</p>
              <div className="relative">
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-32 font-mono">
                  {n8nNodePromptMasterJSON}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(n8nNodePromptMasterJSON, "JSON Nó Prompt Master")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endpoint Conversa */}
        <Card>
          <CardHeader>
            <CardTitle>2. Endpoint para Salvar Conversas</CardTitle>
            <CardDescription>
              Use esta URL nos nós HTTP Request para salvar mensagens
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

        {/* NOVA SEÇÃO: Ferramentas de Busca para AI Agent */}
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Wrench className="h-5 w-5" />
              3. Ferramentas de Busca (Tools) para AI Agent
            </CardTitle>
            <CardDescription>
              Configure estas tools no nó AI Agent para permitir buscas automáticas em produtos e conhecimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/30">
              <Wrench className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700 dark:text-orange-300">
                <strong>Como funciona:</strong> O AI Agent usa estas tools automaticamente quando o cliente faz perguntas. 
                Exemplo: "Quanto custa a mesa?" → O agente busca produtos → Responde com informações reais.
              </AlertDescription>
            </Alert>

            <Accordion type="single" collapsible className="w-full">
              {/* Tool 1: Buscar Produtos */}
              <AccordionItem value="tool-produtos">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold">Tool 1: Buscar Produtos</span>
                    <Badge variant="outline" className="ml-2">GET</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium w-24">Endpoint:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs flex-1 break-all">{searchProductsEndpoint}</code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(searchProductsEndpoint, "URL Buscar Produtos")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium w-24">Parâmetros:</span>
                      <div className="space-y-1 text-xs">
                        <p><code className="bg-muted px-1 rounded">q</code> - Termo de busca (obrigatório)</p>
                        <p><code className="bg-muted px-1 rounded">categoria</code> - Filtrar por categoria (opcional)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium w-24">Retorna:</span>
                      <span className="text-muted-foreground">Lista de produtos com nome, descrição, preço, imagem_url</span>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-sm mb-2">JSON da Tool (copiar para n8n):</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-48 font-mono">
                        {toolBuscarProdutosJSON}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(toolBuscarProdutosJSON, "JSON Tool Buscar Produtos")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Tool 2: Buscar Conhecimento */}
              <AccordionItem value="tool-conhecimento">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    <span className="font-semibold">Tool 2: Buscar Conhecimento</span>
                    <Badge variant="outline" className="ml-2">GET</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium w-24">Endpoint:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs flex-1 break-all">{searchKnowledgeEndpoint}</code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(searchKnowledgeEndpoint, "URL Buscar Conhecimento")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium w-24">Parâmetros:</span>
                      <div className="space-y-1 text-xs">
                        <p><code className="bg-muted px-1 rounded">q</code> - Termo de busca (obrigatório)</p>
                        <p><code className="bg-muted px-1 rounded">tipo</code> - Tipo: faq, documento, guia, politica (opcional)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium w-24">Retorna:</span>
                      <span className="text-muted-foreground">Documentos da base de conhecimento com título, conteúdo, tipo</span>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-sm mb-2">JSON da Tool (copiar para n8n):</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-48 font-mono">
                        {toolBuscarConhecimentoJSON}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(toolBuscarConhecimentoJSON, "JSON Tool Buscar Conhecimento")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Tool 3: Obter Dados IA */}
              <AccordionItem value="tool-dados-ia">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold">Tool 3: Obter Dados Completos da IA</span>
                    <Badge variant="outline" className="ml-2">GET</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium w-24">Endpoint:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs flex-1 break-all">{getIADataEndpoint}</code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(getIADataEndpoint, "URL Obter Dados IA")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium w-24">Parâmetros:</span>
                      <div className="space-y-1 text-xs">
                        <p><code className="bg-muted px-1 rounded">type</code> - all, config, products, knowledge</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium w-24">Retorna:</span>
                      <span className="text-muted-foreground">Dados completos da IA (configurações, produtos e/ou conhecimento)</span>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-sm mb-2">JSON da Tool (copiar para n8n):</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-48 font-mono">
                        {toolObterDadosIAJSON}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(toolObterDadosIAJSON, "JSON Tool Obter Dados IA")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Passo a Passo para adicionar tools */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Como adicionar Tools ao AI Agent no n8n
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Abra seu workflow no n8n</li>
                <li>Clique no nó <strong>AI Agent</strong></li>
                <li>Na parte inferior do nó, clique em <strong>"Add Tool"</strong></li>
                <li>Selecione <strong>"HTTP Request Tool"</strong></li>
                <li>Cole o JSON da tool desejada (copie acima)</li>
                <li>Repita para cada tool que deseja adicionar</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Exemplos de Uso das Tools */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Search className="h-5 w-5" />
              4. Exemplos de Uso das Tools
            </CardTitle>
            <CardDescription>
              Veja como o AI Agent utiliza as tools automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Exemplo 1 */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  Cliente pergunta sobre produto
                </h4>
                <div className="space-y-2 text-xs">
                  <p className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                    <strong>👤 Cliente:</strong> "Quanto custa a mesa de jantar?"
                  </p>
                  <p className="text-muted-foreground italic">
                    → AI Agent chama <code>buscar_produtos</code> com search_term: "mesa de jantar"
                  </p>
                  <p className="bg-muted p-2 rounded">
                    <strong>📦 Tool retorna:</strong> nome, preço R$ 4.500, imagem_url, especificações...
                  </p>
                  <p className="bg-green-50 dark:bg-green-950/30 p-2 rounded">
                    <strong>🤖 IA responde:</strong> "A mesa de jantar em madeira maciça está disponível por R$ 4.500..."
                  </p>
                </div>
              </div>

              {/* Exemplo 2 */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-green-600" />
                  Cliente pergunta sobre política
                </h4>
                <div className="space-y-2 text-xs">
                  <p className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                    <strong>👤 Cliente:</strong> "Qual é a garantia dos produtos?"
                  </p>
                  <p className="text-muted-foreground italic">
                    → AI Agent chama <code>buscar_conhecimento</code> com search_term: "garantia", tipo: "politica"
                  </p>
                  <p className="bg-muted p-2 rounded">
                    <strong>📚 Tool retorna:</strong> documento com política de garantia completa
                  </p>
                  <p className="bg-green-50 dark:bg-green-950/30 p-2 rounded">
                    <strong>🤖 IA responde:</strong> "Nossos produtos têm garantia de 5 anos contra defeitos de fabricação..."
                  </p>
                </div>
              </div>
            </div>

            {/* Diagrama do fluxo com tools */}
            <div className="mt-4 p-4 rounded-lg bg-muted/30 border">
              <h4 className="font-semibold text-sm mb-3">Fluxo Atualizado com Tools</h4>
              <div className="text-xs font-mono text-center space-y-2">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Badge variant="outline" className="py-1">WhatsApp Trigger</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="outline" className="py-1">Buscar Prompt Master</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge className="py-1 bg-orange-600">AI Agent</Badge>
                </div>
                <div className="text-muted-foreground">↓ Tools disponíveis ↓</div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="py-1">
                    <Package className="h-3 w-3 mr-1" />
                    Buscar Produtos
                  </Badge>
                  <Badge variant="secondary" className="py-1">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Buscar Conhecimento
                  </Badge>
                  <Badge variant="secondary" className="py-1">
                    <Database className="h-3 w-3 mr-1" />
                    Obter Dados IA
                  </Badge>
                </div>
                <div className="text-muted-foreground">↓</div>
                <div className="flex items-center justify-center gap-2">
                  <Badge className="py-1 bg-green-600">Responder WhatsApp</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs para diferentes configurações */}
        <Card>
          <CardHeader>
            <CardTitle>5. Configuração dos Nós HTTP Request (Salvar Conversas)</CardTitle>
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
              6. Workflow Completo (Importar)
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
            <CardTitle>7. Variáveis Disponíveis no Workflow</CardTitle>
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
              8. Resultado no CRM
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
