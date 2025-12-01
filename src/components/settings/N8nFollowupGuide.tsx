import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, MessageCircle, Zap, CheckCircle } from "lucide-react";

export function N8nFollowupGuide() {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configuração do n8n - Follow-up Automático</h2>
        <p className="text-muted-foreground">
          Sistema de follow-up automático a cada 2 dias para leads na etapa "Follow Up (I.A)"
        </p>
      </div>

      <Alert>
        <Zap className="h-4 w-4" />
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription>
          O sistema busca leads que não responderam há 2 dias, envia mensagem personalizada usando o mesmo agente de IA,
          salva a conversa no histórico, e reseta o contador quando o cliente responde.
        </AlertDescription>
      </Alert>

      {/* Passo 1: Schedule Trigger */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            1
          </div>
          <h3 className="font-semibold text-lg">Schedule Trigger</h3>
        </div>
        <div className="space-y-3 ml-11">
          <div>
            <p className="font-medium mb-2">Configuração:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Trigger Type: <code className="bg-muted px-2 py-1 rounded">Schedule Trigger</code></li>
              <li>Interval: <strong>A cada 30 minutos</strong> (ou 1 hora)</li>
              <li>Horário: <strong>9h às 18h, dias úteis</strong> (opcional)</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Passo 2: Buscar Leads Pendentes */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            2
          </div>
          <h3 className="font-semibold text-lg">HTTP Request - Buscar Leads Pendentes</h3>
        </div>
        <div className="space-y-3 ml-11">
          <div>
            <p className="font-medium mb-2">Endpoint:</p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm break-all">
              POST {projectUrl}/rest/v1/rpc/get_pending_followups
            </div>
          </div>
          <div>
            <p className="font-medium mb-2">Headers:</p>
            <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`{
  "apikey": "${anonKey}",
  "Authorization": "Bearer ${anonKey}",
  "Content-Type": "application/json"
}`}
            </pre>
          </div>
          <div>
            <p className="font-medium mb-2">Body:</p>
            <pre className="bg-muted p-3 rounded-lg text-sm">
{`{}`}
            </pre>
          </div>
          <Alert className="mt-3">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Esta RPC retorna lista de leads elegíveis: não responderam há 2 dias, follow-up ativo, ainda não atingiram limite máximo
            </AlertDescription>
          </Alert>
        </div>
      </Card>

      {/* Passo 3: Split In Batches */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            3
          </div>
          <h3 className="font-semibold text-lg">Split In Batches</h3>
        </div>
        <div className="space-y-3 ml-11">
          <p className="text-sm text-muted-foreground">
            Processar <strong>1 lead por vez</strong> para controlar envios
          </p>
          <div>
            <p className="font-medium mb-2">Configuração:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Input Field Name: <code className="bg-muted px-2 py-1 rounded">body</code></li>
              <li>Batch Size: <code className="bg-muted px-2 py-1 rounded">1</code></li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Passo 4: Gerar Mensagem com IA */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            4
          </div>
          <h3 className="font-semibold text-lg">Agente IA - Gerar Mensagem de Follow-up</h3>
        </div>
        <div className="space-y-3 ml-11">
          <Alert>
            <MessageCircle className="h-4 w-4" />
            <AlertDescription>
              Use o <strong>mesmo agente de IA</strong> que já responde o WhatsApp receptivo
            </AlertDescription>
          </Alert>
          <div>
            <p className="font-medium mb-2">System Prompt:</p>
            <div className="bg-muted p-3 rounded-lg text-sm">
              Você é o Matheus da Tendenci. Envie mensagem de follow-up casual e amigável para reengajar o cliente.
              Use o histórico de conversa para personalizar. Seja breve (máx 2 linhas). Não force venda.
            </div>
          </div>
          <div>
            <p className="font-medium mb-2">Input (Histórico de Conversa):</p>
            <code className="bg-muted px-2 py-1 rounded text-sm">
              {"{{$json.conversation_history}}"}
            </code>
          </div>
          <div>
            <p className="font-medium mb-2">Variables disponíveis:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>{"{{$json.client_name}}"}</code> - Nome do cliente</li>
              <li><code>{"{{$json.followup_count}}"}</code> - Número do follow-up atual</li>
              <li><code>{"{{$json.conversation_history}}"}</code> - Histórico completo</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Passo 5: Enviar via Evolution API */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            5
          </div>
          <h3 className="font-semibold text-lg">HTTP Request - Enviar WhatsApp</h3>
        </div>
        <div className="space-y-3 ml-11">
          <div>
            <p className="font-medium mb-2">Evolution API Endpoint:</p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm">
              POST {"{{EVOLUTION_API_URL}}"}/message/sendText/{"{{$json.instance_name}}"}
            </div>
          </div>
          <div>
            <p className="font-medium mb-2">Body:</p>
            <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`{
  "number": "{{$json.client_phone}}@s.whatsapp.net",
  "text": "{{$('Agente IA').output}}"
}`}
            </pre>
          </div>
        </div>
      </Card>

      {/* Passo 6: Atualizar Histórico */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            6
          </div>
          <h3 className="font-semibold text-lg">HTTP Request - Atualizar Histórico no CRM</h3>
        </div>
        <div className="space-y-3 ml-11">
          <div>
            <p className="font-medium mb-2">Endpoint:</p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm break-all">
              POST {projectUrl}/functions/v1/update-followup-history
            </div>
          </div>
          <div>
            <p className="font-medium mb-2">Headers:</p>
            <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`{
  "Authorization": "Bearer ${anonKey}",
  "Content-Type": "application/json"
}`}
            </pre>
          </div>
          <div>
            <p className="font-medium mb-2">Body:</p>
            <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`{
  "deal_id": "{{$json.deal_id}}",
  "new_message": "{{$('Agente IA').output}}"
}`}
            </pre>
          </div>
        </div>
      </Card>

      {/* Passo 7: Delay entre envios */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            7
          </div>
          <h3 className="font-semibold text-lg">Wait - Delay entre envios</h3>
        </div>
        <div className="space-y-3 ml-11">
          <p className="text-sm text-muted-foreground">
            Adicionar delay de <strong>3 minutos</strong> entre cada envio
          </p>
          <div>
            <p className="font-medium mb-2">Configuração:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Wait Amount: <code className="bg-muted px-2 py-1 rounded">3</code></li>
              <li>Wait Unit: <code className="bg-muted px-2 py-1 rounded">minutes</code></li>
            </ul>
          </div>
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Este delay previne bloqueio da conta WhatsApp por spam
            </AlertDescription>
          </Alert>
        </div>
      </Card>

      {/* Resumo */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Resumo do Fluxo</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p><strong>1.</strong> A cada 30min, n8n busca leads que não responderam há 2 dias</p>
          <p><strong>2.</strong> Para cada lead, a IA gera mensagem personalizada usando o histórico</p>
          <p><strong>3.</strong> Envia mensagem via WhatsApp Evolution API</p>
          <p><strong>4.</strong> Atualiza contador de follow-up no CRM</p>
          <p><strong>5.</strong> Aguarda 3 minutos antes do próximo envio</p>
          <p><strong>6.</strong> Quando cliente responde, contador é resetado automaticamente</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}