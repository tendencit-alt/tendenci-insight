import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link2, TestTube2, Save } from "lucide-react";

export function WebhookSettings() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load saved webhook from localStorage
    const saved = localStorage.getItem("n8n_webhook_url");
    if (saved) {
      setWebhookUrl(saved);
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem("n8n_webhook_url", webhookUrl);
      toast.success("Webhook n8n salvo com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar webhook");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl) {
      toast.error("Digite a URL do webhook n8n primeiro");
      return;
    }

    setIsTesting(true);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          event: "test",
          timestamp: new Date().toISOString(),
          project: {
            id: "test-id",
            name: "Projeto de Teste",
            stage: "captado"
          }
        }),
      });

      toast.success("Requisição enviada! Verifique o histórico do seu Zap no n8n.");
    } catch (error) {
      console.error("Erro ao testar webhook:", error);
      toast.error("Erro ao enviar requisição de teste");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Integração n8n (Opcional)</h3>
        <Badge variant="outline">Sincronização Automática</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure um webhook do n8n para sincronizar automaticamente mudanças de estágio,
        prazos e outras atualizações de projetos com sistemas externos (WhatsApp, Slack, CRM, etc).
      </p>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">URL do Webhook n8n</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://seu-n8n.app/webhook/projects"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            💡 Crie um workflow no n8n com trigger "Webhook" e copie a URL aqui
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!webhookUrl || isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            onClick={handleTest}
            variant="outline"
            disabled={!webhookUrl || isTesting}
            className="gap-2"
          >
            <TestTube2 className="w-4 h-4" />
            {isTesting ? "Testando..." : "Testar Conexão"}
          </Button>
        </div>
      </div>

      <div className="border-t pt-4 space-y-2">
        <h4 className="font-medium text-sm">Eventos Sincronizados:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>✅ Criação de novo projeto</li>
          <li>✅ Mudança de estágio (captado → orçamento → aprovado/perdido)</li>
          <li>✅ Alteração de prazo de entrega</li>
          <li>✅ Upload de arquivos</li>
          <li>✅ Adição de orçamentos</li>
        </ul>
      </div>
    </Card>
  );
}
