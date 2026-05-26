import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, ExternalLink, Zap, Code2 } from "lucide-react";

export function N8nIntegrationGuide() {
  const apiUrl = "https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/create-lead-from-ai";
  const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtbnd1enJ5c3FvaXdhcHptbmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MjkxMjMsImV4cCI6MjA3ODEwNTEyM30.tzEXZQShQWgyyJHxvCVYIGQg0gal-LuO4jlKQDFjq-c";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const testIntegration = async () => {
    const testData = {
      name: "Teste n8n",
      phone: "34999887766",
      email: "teste@n8n.com",
      source: "WhatsApp",
      temperature: "quente",
      deal_title: "Teste de Integração"
    };

    console.log("🧪 Testando integração n8n...");
    console.log("📤 Enviando dados:", testData);
    console.log("🔗 URL:", apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(testData)
      });

      console.log("📥 Status da resposta:", response.status);
      const responseData = await response.json();
      console.log("📋 Dados da resposta:", responseData);

      if (response.ok) {
        toast.success("✅ Integração funcionando! Lead de teste criado.");
        console.log("✅ Sucesso:", responseData);
      } else {
        toast.error(`❌ Erro ${response.status}: ${responseData.error || 'Erro desconhecido'}`);
        console.error("❌ Erro:", responseData);
      }
    } catch (error) {
      console.error("❌ Erro na requisição:", error);
      toast.error("❌ Erro ao testar integração. Veja o console.");
    }
  };

  const exampleMinimal = JSON.stringify({
    name: "João Silva",
    phone: "34991234567"
  }, null, 2);

  const exampleComplete = JSON.stringify({
    name: "João Silva",
    phone: "34991234567",
    email: "joao@email.com",
    city: "Uberlândia",
    state: "MG",
    source: "WhatsApp",
    temperature: "quente",
    deal_title: "Projeto Cozinha Planejada",
    deal_value: 15000,
    product_type: "Planejado",
    pipeline_id: "34747cb5-063a-4369-b619-d4afa6095d0d",
    conversation_history: "Cliente perguntou sobre armários de cozinha.",
    ai_status: "Aguardando orçamento"
  }, null, 2);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Integração n8n → Tendenci CRM</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          Configure sua automação n8n para criar leads automaticamente no CRM através da sua IA de atendimento.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Endpoint da API</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(apiUrl, "URL")}
                aria-label="Copiar URL"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                readOnly
                className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(apiKey, "API Key")}
                aria-label="Copiar API Key"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Code2 className="w-5 h-5" />
          Configuração do HTTP Request no n8n
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">HTTP Method</span>
              <Badge variant="secondary" className="ml-2">POST</Badge>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Content-Type</span>
              <Badge variant="secondary" className="ml-2">application/json</Badge>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-muted/50">
            <p className="text-sm font-medium mb-2">Headers necessários:</p>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex gap-2">
                <span className="text-muted-foreground">Content-Type:</span>
                <span>application/json</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground">apikey:</span>
                <span className="break-all">{apiKey}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground">Authorization:</span>
                <span className="break-all">Bearer {apiKey}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Exemplos de JSON (Body)</h3>
        
        <Tabs defaultValue="minimal">
          <TabsList>
            <TabsTrigger value="minimal">Mínimo (obrigatório)</TabsTrigger>
            <TabsTrigger value="complete">Completo (todos os campos)</TabsTrigger>
          </TabsList>

          <TabsContent value="minimal" className="mt-4">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{exampleMinimal}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(exampleMinimal, "Exemplo")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="complete" className="mt-4">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{exampleComplete}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(exampleComplete, "Exemplo")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Campos Disponíveis</h3>
        
        <div className="space-y-4">
          <div>
            <Badge variant="destructive" className="mb-2">Obrigatórios</Badge>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li><code className="bg-muted px-2 py-0.5 rounded">name</code> - Nome do cliente</li>
              <li><code className="bg-muted px-2 py-0.5 rounded">phone</code> - Telefone (apenas números)</li>
            </ul>
          </div>

          <div>
            <Badge variant="secondary" className="mb-2">Opcionais - Dados do Cliente</Badge>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li><code className="bg-muted px-2 py-0.5 rounded">email</code> - E-mail</li>
              <li><code className="bg-muted px-2 py-0.5 rounded">city</code> - Cidade</li>
              <li><code className="bg-muted px-2 py-0.5 rounded">state</code> - Estado (UF)</li>
            </ul>
          </div>

          <div>
            <Badge variant="secondary" className="mb-2">Opcionais - Dados do Lead</Badge>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li><code className="bg-muted px-2 py-0.5 rounded">source</code> - Origem: Instagram, WhatsApp, Meta Ads, Indicação, Outros</li>
              <li><code className="bg-muted px-2 py-0.5 rounded">temperature</code> - Temperatura: frio, morno, quente</li>
            </ul>
          </div>

          <div>
            <Badge variant="secondary" className="mb-2">Opcionais - Criar Negócio Automaticamente</Badge>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li><code className="bg-muted px-2 py-0.5 rounded">deal_title</code> - Título do negócio</li>
              <li><code className="bg-muted px-2 py-0.5 rounded">deal_value</code> - Valor estimado</li>
              <li><code className="bg-muted px-2 py-0.5 rounded">product_type</code> - Tipo: Planejado ou Móvel</li>
              <li><code className="bg-muted px-2 py-0.5 rounded">pipeline_id</code> - UUID do funil (use 34747cb5-063a-4369-b619-d4afa6095d0d para Funil Padrão)</li>
              <li><code className="bg-muted px-2 py-0.5 rounded">conversation_history</code> - Histórico de conversas da IA</li>
              <li><code className="bg-muted px-2 py-0.5 rounded">ai_status</code> - Status identificado pela IA</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
        <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200">
          ✅ Resposta de Sucesso
        </h3>
        <pre className="bg-white/50 dark:bg-black/20 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{JSON.stringify({
            success: true,
            message: "Lead criado com sucesso",
            data: {
              client_id: "uuid-do-cliente",
              lead_id: "uuid-do-lead",
              deal_id: "uuid-do-deal-ou-null"
            }
          }, null, 2)}</code>
        </pre>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">💡 Dicas para n8n</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span>✓</span>
            <span>Use variáveis dinâmicas do n8n para preencher os campos baseado nas respostas da IA</span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>Capture o telefone automaticamente do WhatsApp</span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>Defina <code className="bg-muted px-1 rounded">temperature</code> baseado no engajamento do cliente</span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>Armazene os IDs retornados para atualizar o lead posteriormente</span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>Configure error handling para tentar novamente em caso de falha</span>
          </li>
        </ul>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="default"
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={testIntegration}
        >
          <Zap className="w-4 h-4 mr-2" />
          Testar Integração
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.open("/API_INTEGRATION_GUIDE.md", "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver Documentação
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => copyToClipboard(apiUrl + "\n\nAPI Key: " + apiKey, "Credenciais")}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copiar Credenciais
        </Button>
      </div>
    </div>
  );
}
