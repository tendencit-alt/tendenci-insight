import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function EvolutionAPIGuide() {
  const webhookUrl = `https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/whatsapp-webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configuração Evolution API</h2>
        <p className="text-muted-foreground">
          Configure webhooks na sua Evolution API para sincronização automática
        </p>
      </div>

      {/* Webhook URL */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Badge>Webhook URL</Badge>
          <span className="text-sm text-muted-foreground">Configure na Evolution API</span>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Configure este webhook na sua instância da Evolution API para receber
            notificações automáticas de status e conexão
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label className="text-sm font-medium">URL do Webhook</Label>
          <div className="flex gap-2">
            <code className="flex-1 p-3 bg-muted rounded-md text-sm break-all">
              {webhookUrl}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(webhookUrl)}
              aria-label="Copiar URL do webhook"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Eventos a Configurar</Label>
          <div className="grid grid-cols-2 gap-2">
            <code className="p-2 bg-muted rounded text-xs">connection.update</code>
            <code className="p-2 bg-muted rounded text-xs">qrcode.updated</code>
          </div>
        </div>
      </Card>

      {/* Passo a Passo */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Como Configurar</h3>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex-1">
              <p className="font-medium">Configure as credenciais</p>
              <p className="text-sm text-muted-foreground">
                Adicione EVOLUTION_API_URL e EVOLUTION_API_KEY nos secrets
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex-1">
              <p className="font-medium">Configure o Webhook na Evolution API</p>
              <p className="text-sm text-muted-foreground">
                Acesse as configurações da Evolution API e adicione o webhook URL acima
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
              3
            </div>
            <div className="flex-1">
              <p className="font-medium">Crie uma conexão</p>
              <p className="text-sm text-muted-foreground">
                Use a aba "WhatsApp" para criar uma nova conexão e escanear o QR Code
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
              4
            </div>
            <div className="flex-1">
              <p className="font-medium">Status sincroniza automaticamente</p>
              <p className="text-sm text-muted-foreground">
                O webhook notificará quando a conexão for estabelecida
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Exemplo de Configuração */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Exemplo de Configuração na Evolution API</h3>
          <Button variant="outline" size="sm" asChild>
            <a href="https://doc.evolution-api.com/v2/pt/get-started/introduction" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Documentação
            </a>
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">Webhook Settings (Evolution API)</Label>
            <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`{
  "webhook": {
    "url": "${webhookUrl}",
    "enabled": true,
    "events": [
      "connection.update",
      "qrcode.updated"
    ]
  }
}`}
            </pre>
          </div>
        </div>
      </Card>

      {/* Testando a Conexão */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Testando a Integração</h3>
        
        <ol className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>Certifique-se que Evolution API está rodando</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Configure o webhook na Evolution API</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>Crie uma nova conexão na aba "WhatsApp"</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>Escaneie o QR Code com seu WhatsApp</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <span>Status mudará automaticamente para "Conectado"</span>
          </li>
        </ol>
      </Card>
    </div>
  );
}

function Label({ children, className, ...props }: any) {
  return <label className={className} {...props}>{children}</label>;
}
