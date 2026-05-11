import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, ExternalLink, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function N8nAgendamentoGuide() {
  const [copied, setCopied] = useState<string | null>(null);

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-agendamento`;
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const minimalExample = {
    architect_id: "uuid-do-arquiteto",
    data_agendamento: "2024-12-20T14:30:00",
    canal: "whatsapp"
  };

  const completeExample = {
    architect_id: "uuid-do-arquiteto",
    architect_name: "João Silva",
    architect_phone: "+5511999999999",
    client_id: "uuid-do-cliente-opcional",
    client_name: "Maria Santos",
    client_phone: "+5511888888888",
    campanha_id: "uuid-da-campanha-opcional",
    data_agendamento: "2024-12-20T14:30:00",
    canal: "whatsapp",
    observacoes: "Cliente interessado em projeto residencial",
    metadata: {
      origem: "campanha_q4",
      interesse: "alto",
      orcamento_estimado: 50000
    }
  };

  const testIntegration = async () => {
    try {
      const testPayload = {
        ...minimalExample,
        architect_id: "test-uuid",
        observacoes: "Teste de integração n8n - " + new Date().toISOString()
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(testPayload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Integração testada com sucesso!");
      } else {
        toast.error(data.error || "Erro ao testar integração");
      }
    } catch (error) {
      toast.error("Erro ao conectar com a API");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integração n8n - Agendamentos</h2>
        <p className="text-muted-foreground">
          Configure seu workflow n8n para criar agendamentos automaticamente
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Endpoint da API</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(apiUrl, "URL")}
            >
              {copied === "URL" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <code className="block p-3 bg-muted rounded text-sm break-all">
            {apiUrl}
          </code>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">API Key (Authorization Header)</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(apiKey, "API Key")}
            >
              {copied === "API Key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <code className="block p-3 bg-muted rounded text-sm break-all">
            Bearer {apiKey}
          </code>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Configuração do HTTP Request no n8n</h3>
        <div className="space-y-3 text-sm">
          <div>
            <strong>Method:</strong> POST
          </div>
          <div>
            <strong>URL:</strong> {apiUrl}
          </div>
          <div>
            <strong>Authentication:</strong> Generic Credential Type
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
              <li>Credential Type: Header Auth</li>
              <li>Name: Authorization</li>
              <li>Value: Bearer {"{seu-api-key}"}</li>
            </ul>
          </div>
          <div>
            <strong>Headers:</strong>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
              <li>Content-Type: application/json</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Exemplos de JSON Body</h3>
        <Tabs defaultValue="minimal">
          <TabsList>
            <TabsTrigger value="minimal">Mínimo</TabsTrigger>
            <TabsTrigger value="complete">Completo</TabsTrigger>
          </TabsList>

          <TabsContent value="minimal" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Campos obrigatórios para criar um agendamento
            </p>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 z-10"
                onClick={() => copyToClipboard(JSON.stringify(minimalExample, null, 2), "JSON Mínimo")}
              >
                {copied === "JSON Mínimo" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <pre className="p-4 bg-muted rounded text-xs overflow-x-auto">
                {JSON.stringify(minimalExample, null, 2)}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="complete" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Exemplo completo com todos os campos opcionais
            </p>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 z-10"
                onClick={() => copyToClipboard(JSON.stringify(completeExample, null, 2), "JSON Completo")}
              >
                {copied === "JSON Completo" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <pre className="p-4 bg-muted rounded text-xs overflow-x-auto">
                {JSON.stringify(completeExample, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Campos Disponíveis</h3>
        <div className="space-y-3 text-sm">
          <div>
            <strong className="text-red-600">Obrigatórios:</strong>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
              <li><code>architect_id</code> (string) - UUID do profissional parceiro</li>
              <li><code>data_agendamento</code> (string) - Data/hora em formato ISO 8601 (ex: "2024-12-20T14:30:00")</li>
              <li><code>canal</code> (string) - whatsapp | telefone | presencial | videochamada</li>
            </ul>
          </div>
          <div>
            <strong className="text-blue-600">Opcionais:</strong>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
              <li><code>architect_name</code> (string) - Nome do profissional parceiro (informativo)</li>
              <li><code>architect_phone</code> (string) - Telefone do profissional parceiro</li>
              <li><code>client_id</code> (string) - UUID do cliente existente</li>
              <li><code>client_name</code> (string) - Nome do cliente (cria novo se não existir client_id)</li>
              <li><code>client_phone</code> (string) - Telefone do cliente</li>
              <li><code>campanha_id</code> (string) - UUID da campanha relacionada</li>
              <li><code>observacoes</code> (string) - Observações sobre o agendamento</li>
              <li><code>metadata</code> (object) - Dados adicionais em formato JSON</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Resposta de Sucesso</h3>
        <pre className="p-4 bg-muted rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "message": "Agendamento criado com sucesso",
  "agendamento": {
    "id": "uuid-do-agendamento",
    "architect_name": "João Silva",
    "data_agendamento": "2024-12-20T14:30:00",
    "canal": "whatsapp",
    "status": "agendado"
  }
}`}
        </pre>
      </Card>

      <Card className="p-6 space-y-4 bg-blue-50 dark:bg-blue-950">
        <h3 className="font-semibold">💡 Dicas para n8n</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>Use o nó "HTTP Request" para fazer a chamada</li>
          <li>Configure autenticação com Header Auth (Authorization: Bearer)</li>
          <li>O formato de data deve ser ISO 8601: YYYY-MM-DDTHH:mm:ss</li>
          <li>Se passar client_name sem client_id, um novo cliente será criado automaticamente</li>
          <li>O agendamento sempre é criado com status "agendado"</li>
          <li>O campo criado_por_ia será automaticamente marcado como true</li>
          <li>Um log será criado automaticamente na tabela de logs de prospecção</li>
        </ul>
      </Card>

      <div className="flex gap-3">
        <Button onClick={testIntegration}>
          Testar Integração
        </Button>
        <Button variant="outline" asChild>
          <a href="https://docs.lovable.dev" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Documentação
          </a>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            copyToClipboard(
              `URL: ${apiUrl}\nAPI Key: ${apiKey}`,
              "Credenciais"
            );
          }}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copiar Credenciais
        </Button>
      </div>
    </div>
  );
}
