import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, MessageSquare, ArrowRight, Database, Bot } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const N8nConversationGuide = () => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const endpointUrl = "https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/update-deal-conversation";

  const examplePayloadAI = `{
  "client_phone": "5534999999999",
  "new_message": "Oi, vamos seguir na sua mesa de 2,20 m com borda orgânica e base em metalon. Prefere a madeira do tampo mais clara ou mais escura?",
  "sender": "ai"
}`;

  const examplePayloadClient = `{
  "client_phone": "5534999999999",
  "new_message": "Prefiro mais clara, tipo carvalho",
  "sender": "client"
}`;

  const n8nWorkflowJSON = `{
  "name": "Atualizar Conversa IA no CRM",
  "nodes": [
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
        "jsonBody": "={{ JSON.stringify({ client_phone: $json.telefone_limpo, new_message: $json.ai_response, sender: 'ai' }) }}"
      },
      "name": "Atualizar CRM",
      "type": "n8n-nodes-base.httpRequest",
      "position": [850, 300]
    }
  ]
}`;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-4xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Atualização de Conversa IA → CRM</h1>
          <p className="text-muted-foreground">
            Configure o n8n para enviar atualizações de conversa após cada resposta da IA
          </p>
        </div>

        {/* Diagrama do Fluxo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Fluxo Completo
            </CardTitle>
            <CardDescription>
              Como as mensagens devem fluir entre os sistemas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <Badge variant="outline" className="py-2 px-3">
                <MessageSquare className="h-4 w-4 mr-1" />
                Cliente WhatsApp
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="py-2 px-3">Evolution API</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="py-2 px-3">Supabase Webhook</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="py-2 px-3">n8n</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="py-2 px-3">
                <Bot className="h-4 w-4 mr-1" />
                OpenAI
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge className="py-2 px-3 bg-green-600">
                <Database className="h-4 w-4 mr-1" />
                update-deal-conversation
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="py-2 px-3">Evolution API</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="py-2 px-3">
                <MessageSquare className="h-4 w-4 mr-1" />
                Cliente
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Endpoint */}
        <Card>
          <CardHeader>
            <CardTitle>1. Endpoint da Edge Function</CardTitle>
            <CardDescription>
              URL para enviar atualizações de conversa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-3 rounded text-sm break-all">
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
            <p className="text-sm text-muted-foreground">
              <strong>Método:</strong> POST | <strong>Content-Type:</strong> application/json
            </p>
          </CardContent>
        </Card>

        {/* Payload da IA */}
        <Card>
          <CardHeader>
            <CardTitle>2. Payload - Resposta da IA</CardTitle>
            <CardDescription>
              Enviar após a IA gerar uma resposta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                {examplePayloadAI}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(examplePayloadAI, "Payload IA")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm space-y-1">
              <p><strong>client_phone:</strong> Telefone do cliente (com DDD e código do país)</p>
              <p><strong>new_message:</strong> Texto da resposta da IA</p>
              <p><strong>sender:</strong> "ai" para respostas da IA</p>
            </div>
          </CardContent>
        </Card>

        {/* Payload do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>3. Payload - Mensagem do Cliente</CardTitle>
            <CardDescription>
              Enviar quando o cliente enviar uma nova mensagem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                {examplePayloadClient}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(examplePayloadClient, "Payload Cliente")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm space-y-1">
              <p><strong>sender:</strong> "client" para mensagens do cliente</p>
            </div>
          </CardContent>
        </Card>

        {/* Configuração n8n */}
        <Card>
          <CardHeader>
            <CardTitle>4. Configuração no n8n</CardTitle>
            <CardDescription>
              Adicione um nó HTTP Request após o nó da IA responder
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Passos:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Abra seu workflow no n8n</li>
                <li>Após o nó que gera a resposta da IA (OpenAI), adicione um novo nó <Badge variant="outline">HTTP Request</Badge></li>
                <li>Configure o nó conforme abaixo:</li>
              </ol>
            </div>

            <div className="bg-muted p-4 rounded space-y-2 text-sm">
              <p><strong>Method:</strong> POST</p>
              <p><strong>URL:</strong> {endpointUrl}</p>
              <p><strong>Headers:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>Content-Type: application/json</li>
              </ul>
              <p><strong>Body (JSON):</strong></p>
              <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`{
  "client_phone": "{{ $json.telefone_limpo }}",
  "new_message": "{{ $json.ai_response }}",
  "sender": "ai"
}`}
              </pre>
            </div>

            <div className="pt-4">
              <h4 className="font-semibold mb-2">JSON do Nó (importar):</h4>
              <div className="relative">
                <pre className="bg-muted p-4 rounded text-xs overflow-x-auto max-h-48">
                  {n8nWorkflowJSON}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(n8nWorkflowJSON, "JSON do Workflow")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultado Esperado */}
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="text-green-600">5. Resultado no CRM</CardTitle>
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
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">❌ Erro 404 - Deal não encontrado</p>
              <p className="text-muted-foreground">Verifique se o telefone está correto e se existe um deal com from_ai=true para esse cliente</p>
            </div>
            <div>
              <p className="font-semibold">❌ Erro 400 - Parâmetros inválidos</p>
              <p className="text-muted-foreground">Certifique-se de enviar new_message e client_phone ou deal_id</p>
            </div>
            <div>
              <p className="font-semibold">✅ Verificar logs</p>
              <p className="text-muted-foreground">Acesse Lovable Cloud → Edge Functions → update-deal-conversation para ver logs detalhados</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default N8nConversationGuide;
