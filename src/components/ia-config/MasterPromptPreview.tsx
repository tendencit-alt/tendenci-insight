import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, Loader2, Check, RefreshCw, Wrench, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MasterPromptData {
  prompt: string;
  version: number;
  updated_at: string;
  sections: {
    identidade: boolean;
    negocio: boolean;
    comunicacao: boolean;
    qualificacao: boolean;
    vendas: boolean;
    produtos: number;
    conhecimento: number;
    comportamento: boolean;
    regras: boolean;
  };
}

export default function MasterPromptPreview() {
  const [open, setOpen] = useState(false);
  const [integrationOpen, setIntegrationOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MasterPromptData | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const projectId = "emnwuzrysqoiwapzmnbv";
  const endpointUrl = `https://${projectId}.supabase.co/functions/v1/generate-master-prompt`;

  const loadPrompt = async () => {
    setLoading(true);
    try {
      const { data: responseData, error } = await supabase.functions.invoke('generate-master-prompt');

      if (error) throw error;

      if (responseData?.success) {
        setData(responseData);
      } else {
        throw new Error(responseData?.error || 'Erro ao gerar prompt');
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
      toast.error('Erro ao carregar prompt master');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !data) {
      loadPrompt();
    }
  };

  const copyPrompt = async () => {
    if (!data?.prompt) return;
    
    try {
      await navigator.clipboard.writeText(data.prompt);
      setCopied(true);
      toast.success('Prompt copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(endpointUrl);
      setCopiedUrl(true);
      toast.success('URL copiada!');
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      toast.error('Erro ao copiar URL');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // JSON do nó HTTP Request para buscar prompt master
  const n8nNodePromptMasterJSON = `{
  "parameters": {
    "method": "GET",
    "url": "${endpointUrl}",
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

  const systemMessageExpression = `={{ $('Buscar Prompt Master').item.json.prompt }}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Prompt Master
        </CardTitle>
        <CardDescription>
          Visualize e copie o prompt completo gerado a partir de todas as configurações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                Ver Prompt Master
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Prompt Master Gerado</span>
                  {data && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">v{data.version}</Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={loadPrompt}
                        disabled={loading}
                      >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  )}
                </DialogTitle>
              </DialogHeader>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : data ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {data.sections.identidade && <Badge>Identidade ✓</Badge>}
                    {data.sections.negocio && <Badge>Negócio ✓</Badge>}
                    {data.sections.comunicacao && <Badge>Comunicação ✓</Badge>}
                    {data.sections.qualificacao && <Badge>Qualificação ✓</Badge>}
                    {data.sections.vendas && <Badge>Vendas ✓</Badge>}
                    {data.sections.produtos > 0 && <Badge>Produtos ({data.sections.produtos})</Badge>}
                    {data.sections.conhecimento > 0 && <Badge>Conhecimento ({data.sections.conhecimento})</Badge>}
                    {data.sections.comportamento && <Badge>Comportamento ✓</Badge>}
                    {data.sections.regras && <Badge>Regras ✓</Badge>}
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={copyPrompt} className="gap-2">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copiado!' : 'Copiar Prompt'}
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {data.prompt}
                    </pre>
                  </ScrollArea>
                  
                  <p className="text-xs text-muted-foreground">
                    Última atualização: {new Date(data.updated_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado carregado
                </p>
              )}
            </DialogContent>
          </Dialog>

          {/* Botão Integrar no n8n */}
          <Dialog open={integrationOpen} onOpenChange={setIntegrationOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2 bg-purple-600 hover:bg-purple-700">
                <Wrench className="h-4 w-4" />
                Como Integrar no n8n
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-purple-600" />
                  Integrar Prompt Master no n8n
                </DialogTitle>
              </DialogHeader>
              
              <ScrollArea className="h-[70vh] pr-4">
                <div className="space-y-6">
                  {/* Introdução */}
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      <strong>Objetivo:</strong> Substituir o prompt fixo no seu nó AI Agent pelo prompt dinâmico configurado aqui no Tendenci. 
                      Assim, toda alteração feita nesta interface será aplicada automaticamente no n8n!
                    </p>
                  </div>

                  {/* Passo 1 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600">Passo 1</Badge>
                      <h3 className="font-semibold">Adicionar Nó HTTP Request</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Adicione um novo nó "HTTP Request" ANTES do seu nó "AI Agent" ou "AI Agent1":
                    </p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto font-mono max-h-48">
                        {n8nNodePromptMasterJSON}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(n8nNodePromptMasterJSON, "JSON do nó")}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      💡 Você pode importar esse JSON diretamente no n8n (Ctrl+V no canvas)
                    </p>
                  </div>

                  {/* Passo 2 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600">Passo 2</Badge>
                      <h3 className="font-semibold">Conectar o Nó</h3>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Webhook</Badge>
                        <ArrowRight className="h-4 w-4" />
                        <Badge variant="outline">Extrair/Code</Badge>
                        <ArrowRight className="h-4 w-4" />
                        <Badge className="bg-purple-600">Buscar Prompt Master</Badge>
                        <ArrowRight className="h-4 w-4" />
                        <Badge variant="outline">AI Agent</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      O nó "Buscar Prompt Master" deve executar ANTES do AI Agent para que o prompt esteja disponível.
                    </p>
                  </div>

                  {/* Passo 3 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600">Passo 3</Badge>
                      <h3 className="font-semibold">Configurar o AI Agent</h3>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Abra as configurações do nó "AI Agent" e localize o campo <strong>"System Message"</strong>.
                        Substitua TODO o conteúdo por esta expressão:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-muted p-3 rounded text-sm font-mono break-all">
                          {systemMessageExpression}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(systemMessageExpression, "Expression")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          <strong>Importante:</strong> O nome do nó na expressão deve corresponder exatamente ao nome que você deu ao nó HTTP Request. 
                          Se você alterou o nome, ajuste a expressão.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Verificação */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold">Verificar Integração</h3>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>✅ Execute o nó "Buscar Prompt Master" isoladamente e verifique se retorna o prompt</p>
                      <p>✅ Teste enviando uma mensagem pelo WhatsApp e veja se o comportamento da IA mudou</p>
                      <p>✅ Altere algo aqui no Tendenci e teste novamente - deve refletir automaticamente</p>
                    </div>
                  </div>

                  {/* Benefícios */}
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">🎉 Pronto!</h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>• Toda configuração feita aqui será usada automaticamente pelo n8n</li>
                      <li>• Sem necessidade de editar o workflow quando mudar o prompt</li>
                      <li>• Versão e cache incluídos para otimização</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <p className="text-sm font-medium">Endpoint para n8n:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 rounded bg-background text-xs break-all">
              {endpointUrl}
            </code>
            <Button variant="outline" size="icon" onClick={copyUrl}>
              {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use esse endpoint no n8n para buscar o prompt atualizado automaticamente.
            O retorno inclui versão para cache.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
