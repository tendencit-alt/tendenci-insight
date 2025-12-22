import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Endpoint {
  name: string;
  description: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  payload?: object;
  module: string;
}

const endpoints: Endpoint[] = [
  {
    name: "Criar Lead via I.A.",
    description: "Cria um novo lead a partir de conversa de WhatsApp",
    path: "/functions/v1/create-lead-from-ai",
    method: "POST",
    module: "CRM",
    payload: {
      nome: "João Silva",
      telefone: "5511999999999",
      origem: "whatsapp",
      conversa: "Histórico da conversa..."
    }
  },
  {
    name: "Criar Agendamento",
    description: "Cria um agendamento para arquiteto",
    path: "/functions/v1/create-agendamento",
    method: "POST",
    module: "Prospecção",
    payload: {
      architect_id: "uuid",
      data_agendamento: "2025-01-15T10:00:00",
      tipo: "visita",
      notas: "Visita técnica"
    }
  },
  {
    name: "Disparar Follow-up",
    description: "Dispara follow-up I.A. para leads elegíveis",
    path: "/functions/v1/dispatch-followup",
    method: "POST",
    module: "CRM"
  },
  {
    name: "Listar Leads Elegíveis",
    description: "Retorna leads prontos para follow-up",
    path: "/functions/v1/get-eligible-followups",
    method: "GET",
    module: "CRM"
  },
  {
    name: "Processar Tarefa Automatizada",
    description: "Processa tarefa de CRM automatizada",
    path: "/functions/v1/process-automated-task",
    method: "POST",
    module: "CRM",
    payload: {
      task_id: "uuid"
    }
  },
  {
    name: "Disparar Campanha",
    description: "Inicia disparo de campanha WhatsApp",
    path: "/functions/v1/dispatch-campaign",
    method: "POST",
    module: "Prospecção",
    payload: {
      campaign_id: "uuid"
    }
  },
  {
    name: "Verificar Saúde Evolution",
    description: "Verifica status da conexão WhatsApp",
    path: "/functions/v1/check-evolution-health",
    method: "GET",
    module: "WhatsApp"
  },
  {
    name: "Enviar Mensagem WhatsApp",
    description: "Envia mensagem via Evolution API",
    path: "/functions/v1/whatsapp-send-message",
    method: "POST",
    module: "WhatsApp",
    payload: {
      phone: "5511999999999",
      message: "Sua mensagem aqui"
    }
  },
  {
    name: "Webhook WhatsApp",
    description: "Recebe eventos do WhatsApp",
    path: "/functions/v1/whatsapp-webhook",
    method: "POST",
    module: "WhatsApp"
  },
  {
    name: "Inicializar Metas Diárias",
    description: "Cria metas diárias para vendedores",
    path: "/functions/v1/initialize-daily-goals",
    method: "POST",
    module: "Metas"
  },
  {
    name: "Processar Tarefas CRM Pendentes",
    description: "Processa lote de tarefas CRM",
    path: "/functions/v1/process-pending-crm-tasks",
    method: "POST",
    module: "CRM"
  },
  {
    name: "Processar Tarefas Arquitetos",
    description: "Processa tarefas de prospecção pendentes",
    path: "/functions/v1/process-pending-architect-tasks",
    method: "POST",
    module: "Prospecção"
  },
  {
    name: "Atualizar Histórico Conversa",
    description: "Atualiza histórico de conversa do deal",
    path: "/functions/v1/update-deal-conversation",
    method: "POST",
    module: "CRM",
    payload: {
      deal_id: "uuid",
      message: "Nova mensagem",
      role: "client"
    }
  },
  {
    name: "Transcrever Áudio",
    description: "Transcreve áudio para texto",
    path: "/functions/v1/transcribe-audio",
    method: "POST",
    module: "Geral"
  },
  {
    name: "Assistente Tendenci",
    description: "I.A. assistente do sistema",
    path: "/functions/v1/tendenci-assistant",
    method: "POST",
    module: "I.A.",
    payload: {
      message: "Sua pergunta aqui",
      conversation_id: "uuid (opcional)"
    }
  }
];

export function EndpointsReference() {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'POST': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'PUT': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'DELETE': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return '';
    }
  };

  const groupedEndpoints = endpoints.reduce((acc, endpoint) => {
    if (!acc[endpoint.module]) {
      acc[endpoint.module] = [];
    }
    acc[endpoint.module].push(endpoint);
    return acc;
  }, {} as Record<string, Endpoint[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Referência de Endpoints</h3>
          <p className="text-sm text-muted-foreground">
            Todos os endpoints disponíveis para integração
          </p>
        </div>
        <Badge variant="outline">{endpoints.length} endpoints</Badge>
      </div>

      {Object.entries(groupedEndpoints).map(([module, moduleEndpoints]) => (
        <div key={module} className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            {module}
          </h4>
          <div className="grid gap-3">
            {moduleEndpoints.map((endpoint) => (
              <Card key={endpoint.path} className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getMethodColor(endpoint.method)} variant="outline">
                        {endpoint.method}
                      </Badge>
                      <CardTitle className="text-sm font-medium">
                        {endpoint.name}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(`${SUPABASE_URL}${endpoint.path}`, 'URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="py-3 px-4 space-y-3">
                  <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                  
                  <div className="bg-muted/50 p-2 rounded text-xs font-mono flex items-center justify-between">
                    <span className="truncate">{SUPABASE_URL}{endpoint.path}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 ml-2 text-muted-foreground" />
                  </div>

                  {endpoint.payload && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Payload Exemplo:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => copyToClipboard(JSON.stringify(endpoint.payload, null, 2), 'Payload')}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar
                        </Button>
                      </div>
                      <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto">
                        {JSON.stringify(endpoint.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
