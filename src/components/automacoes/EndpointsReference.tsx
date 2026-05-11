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
  // CRM
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
    name: "Estatísticas de Follow-up",
    description: "Retorna estatísticas de follow-ups enviados",
    path: "/functions/v1/get-followup-stats",
    method: "GET",
    module: "CRM"
  },
  {
    name: "Atualizar Histórico Follow-up",
    description: "Atualiza histórico de follow-ups do deal",
    path: "/functions/v1/update-followup-history",
    method: "POST",
    module: "CRM",
    payload: {
      deal_id: "uuid",
      followup_number: 1,
      status: "sent"
    }
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
    name: "Processar Tarefas CRM Pendentes",
    description: "Processa lote de tarefas CRM",
    path: "/functions/v1/process-pending-crm-tasks",
    method: "POST",
    module: "CRM"
  },
  {
    name: "Verificar Deals sem Tarefa",
    description: "Retorna deals sem tarefas pendentes",
    path: "/functions/v1/check-deals-without-tasks",
    method: "GET",
    module: "CRM"
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

  // Prospecção
  {
    name: "Criar Agendamento",
    description: "Cria um agendamento para parceiro profissional",
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
    name: "Executar Campanha Background",
    description: "Executa campanha em segundo plano",
    path: "/functions/v1/execute-campaign-background",
    method: "POST",
    module: "Prospecção",
    payload: {
      campaign_id: "uuid"
    }
  },
  {
    name: "Processar Tarefas Parceiros Profissionais",
    description: "Processa tarefas de prospecção pendentes",
    path: "/functions/v1/process-pending-architect-tasks",
    method: "POST",
    module: "Prospecção"
  },
  {
    name: "Importar Parceiros Profissionais",
    description: "Importa parceiros profissionais de planilha",
    path: "/functions/v1/import-architects",
    method: "POST",
    module: "Prospecção",
    payload: {
      data: [{ name: "Nome", phone: "5511999999999", email: "email@exemplo.com" }]
    }
  },
  {
    name: "Log Interação Prospecção",
    description: "Registra interação na timeline do parceiro profissional",
    path: "/functions/v1/log-prospeccao-interaction",
    method: "POST",
    module: "Prospecção",
    payload: {
      architect_id: "uuid",
      type: "whatsapp",
      message: "Mensagem enviada"
    }
  },

  // WhatsApp
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
    name: "WhatsApp Evolution",
    description: "Integração direta com Evolution API",
    path: "/functions/v1/whatsapp-evolution",
    method: "POST",
    module: "WhatsApp"
  },

  // Metas
  {
    name: "Inicializar Metas Diárias",
    description: "Cria metas diárias para vendedores",
    path: "/functions/v1/initialize-daily-goals",
    method: "POST",
    module: "Metas"
  },

  // Geral
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
  },
  {
    name: "Registrar Erro do Sistema",
    description: "Registra erro no log de erros do sistema",
    path: "/functions/v1/log-system-error",
    method: "POST",
    module: "Geral",
    payload: {
      error_type: "edge_function_error",
      message: "Descrição do erro",
      context: { function: "nome-da-funcao" }
    }
  },

  // Admin
  {
    name: "Criar Usuário Admin",
    description: "Cria novo usuário no sistema",
    path: "/functions/v1/admin-create-user",
    method: "POST",
    module: "Admin",
    payload: {
      email: "usuario@exemplo.com",
      password: "senha123",
      name: "Nome do Usuário"
    }
  },
  {
    name: "Deletar Usuário Admin",
    description: "Remove usuário do sistema",
    path: "/functions/v1/admin-delete-user",
    method: "POST",
    module: "Admin",
    payload: {
      user_id: "uuid"
    }
  },
  {
    name: "Resetar Senha Admin",
    description: "Reseta senha de usuário",
    path: "/functions/v1/admin-reset-password",
    method: "POST",
    module: "Admin",
    payload: {
      user_id: "uuid",
      new_password: "novaSenha123"
    }
  },
  {
    name: "Atualizar Email Admin",
    description: "Atualiza email de usuário",
    path: "/functions/v1/admin-update-user-email",
    method: "POST",
    module: "Admin",
    payload: {
      user_id: "uuid",
      new_email: "novoemail@exemplo.com"
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
