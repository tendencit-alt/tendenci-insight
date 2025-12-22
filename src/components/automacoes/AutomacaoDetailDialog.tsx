import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap,
  Play,
  Copy,
  Lightbulb,
  AlertTriangle,
  Settings,
  FileText,
  Target
} from "lucide-react";
import { toast } from "sonner";

export interface AutomacaoDetail {
  id: string;
  titulo: string;
  descricao: string;
  ativo: boolean;
  oQueFaz: string;
  comoFunciona: string[];
  quandoExecuta: string;
  triggerType: 'scheduled' | 'webhook' | 'event' | 'manual';
  endpoint?: string;
  dependencias: string[];
  dicas: string[];
  sucessos?: number;
  falhas?: number;
  ultimaExecucao?: string | null;
}

// Mapeamento de detalhes de cada automação
export const AUTOMACOES_DETAILS: Record<string, Omit<AutomacaoDetail, 'id' | 'ativo' | 'sucessos' | 'falhas' | 'ultimaExecucao'>> = {
  // CRM
  'followup-ia': {
    titulo: 'Follow-up I.A.',
    descricao: 'Sistema inteligente de follow-up automático',
    oQueFaz: 'Envia mensagens de follow-up personalizadas via WhatsApp para leads que não responderam dentro do período configurado. Utiliza inteligência artificial para gerar mensagens contextualizadas baseadas no histórico de conversas.',
    comoFunciona: [
      'O n8n executa periodicamente verificando leads elegíveis',
      'Sistema identifica negócios sem resposta dentro do intervalo configurado',
      'I.A. analisa o histórico de conversas e gera mensagem personalizada',
      'Mensagem é enviada via Evolution API (WhatsApp)',
      'Log é registrado na tabela followup_logs',
      'Contador de follow-ups é incrementado no negócio'
    ],
    quandoExecuta: 'Agendado via n8n - geralmente a cada hora durante horário comercial',
    triggerType: 'scheduled',
    endpoint: '/functions/v1/dispatch-followup',
    dependencias: [
      'Evolution API configurada e conectada',
      'n8n com workflow de follow-up ativo',
      'Templates de follow-up configurados',
      'Negócios com followup_enabled = true'
    ],
    dicas: [
      'Configure intervalos de 24-48h entre follow-ups',
      'Limite máximo de 3-5 follow-ups por lead',
      'Personalize os templates por tipo de produto',
      'Monitore a taxa de resposta para ajustar timing'
    ]
  },
  'tarefas-automatizadas-crm': {
    titulo: 'Tarefas Automatizadas CRM',
    descricao: 'Processamento automático de tarefas agendadas',
    oQueFaz: 'Processa tarefas do tipo "automatizada" no CRM, executando ações como envio de mensagens WhatsApp quando a data/hora agendada é atingida.',
    comoFunciona: [
      'n8n verifica a cada minuto tarefas pendentes',
      'Filtra tarefas com tipo_tarefa = "automatizada" e status = "pendente"',
      'Verifica se due_at já passou',
      'Executa a ação configurada (ex: enviar WhatsApp)',
      'Atualiza status da tarefa para "concluída"',
      'Registra log de execução'
    ],
    quandoExecuta: 'Agendado via n8n - verificação a cada minuto',
    triggerType: 'scheduled',
    endpoint: '/functions/v1/process-pending-crm-tasks',
    dependencias: [
      'n8n com workflow de tarefas ativo',
      'Evolution API para envio WhatsApp',
      'Tarefas criadas corretamente no sistema'
    ],
    dicas: [
      'Agende tarefas com pelo menos 5 minutos de antecedência',
      'Use horários comerciais para melhor taxa de resposta',
      'Verifique se o número WhatsApp está válido antes de agendar'
    ]
  },
  'alertas-sla': {
    titulo: 'Alertas de SLA',
    descricao: 'Monitoramento de prazos por etapa do funil',
    oQueFaz: 'Monitora o tempo que cada negócio permanece em cada etapa do funil e gera alertas quando o SLA configurado é ultrapassado.',
    comoFunciona: [
      'Sistema calcula tempo desde stage_entered_at',
      'Compara com sla_hours da etapa atual',
      'Exibe alerta visual quando SLA é ultrapassado',
      'Pode gerar notificações para responsáveis'
    ],
    quandoExecuta: 'Tempo real - verificação ao carregar o CRM',
    triggerType: 'event',
    dependencias: [
      'sla_hours configurado nas etapas do pipeline',
      'stage_entered_at preenchido nos negócios'
    ],
    dicas: [
      'Configure SLAs realistas por etapa',
      'Etapas iniciais geralmente precisam de SLAs menores',
      'Revise os SLAs mensalmente baseado na performance'
    ]
  },
  'negocios-sem-tarefa': {
    titulo: 'Negócios sem Tarefa',
    descricao: 'Alerta de negócios sem próxima ação agendada',
    oQueFaz: 'Identifica negócios ativos que não possuem nenhuma tarefa pendente agendada, indicando que podem estar "esquecidos" no pipeline.',
    comoFunciona: [
      'Edge function verifica negócios sem tarefas pendentes',
      'Filtra apenas negócios com status "open"',
      'Exibe lista de negócios que precisam de atenção',
      'Permite criar tarefa diretamente do alerta'
    ],
    quandoExecuta: 'Pode ser agendado via n8n ou executado manualmente',
    triggerType: 'scheduled',
    endpoint: '/functions/v1/check-deals-without-tasks',
    dependencias: [
      'Negócios cadastrados no CRM',
      'Sistema de tarefas ativo'
    ],
    dicas: [
      'Execute diariamente no início do expediente',
      'Configure alertas por email/WhatsApp para gestores',
      'Estabeleça meta de zero negócios sem tarefa'
    ]
  },

  // Prospecção
  'campanhas-whatsapp': {
    titulo: 'Campanhas WhatsApp',
    descricao: 'Disparo em massa de mensagens para arquitetos',
    oQueFaz: 'Permite criar e executar campanhas de WhatsApp em massa para segmentos de arquitetos, com controle de velocidade, status de entrega e relatórios.',
    comoFunciona: [
      'Usuário cria campanha selecionando segmento de arquitetos',
      'Sistema filtra arquitetos elegíveis (WhatsApp válido, ativos)',
      'Disparo é iniciado com delay entre mensagens (evitar bloqueio)',
      'Cada envio é registrado individualmente',
      'Status é atualizado em tempo real',
      'Relatório final com taxa de sucesso/falha'
    ],
    quandoExecuta: 'Manual - iniciado pelo usuário',
    triggerType: 'manual',
    endpoint: '/functions/v1/dispatch-campaign',
    dependencias: [
      'Evolution API configurada e conectada',
      'Arquitetos com WhatsApp válido cadastrado',
      'Segmentos configurados (opcional)'
    ],
    dicas: [
      'Limite campanhas a 100-200 contatos por vez',
      'Use delay mínimo de 3-5 segundos entre mensagens',
      'Evite horários fora do comercial',
      'Personalize mensagens com variáveis do arquiteto'
    ]
  },
  'sequencias-ia': {
    titulo: 'Sequências I.A.',
    descricao: 'Fluxos automatizados de mensagens com IA',
    oQueFaz: 'Cria sequências de mensagens automatizadas que são enviadas ao longo do tempo, com respostas geradas por I.A. baseadas no contexto da conversa.',
    comoFunciona: [
      'Arquiteto é adicionado a uma sequência',
      'Sistema agenda próximo passo da sequência',
      'I.A. gera mensagem personalizada quando devido',
      'Mensagem é enviada via WhatsApp',
      'Se arquiteto responde, sequência pode pausar',
      'Logs são registrados para análise'
    ],
    quandoExecuta: 'Agendado conforme configuração da sequência',
    triggerType: 'scheduled',
    dependencias: [
      'Sequências configuradas com passos',
      'Evolution API ativa',
      'n8n com workflow de sequências'
    ],
    dicas: [
      'Crie sequências curtas (3-5 passos)',
      'Espaçe mensagens em 2-3 dias',
      'Configure pausa automática ao receber resposta'
    ]
  },
  'tarefas-prospeccao': {
    titulo: 'Tarefas de Prospecção',
    descricao: 'Gerenciamento de tarefas de prospecção de arquitetos',
    oQueFaz: 'Gerencia tarefas específicas de prospecção como ligações, visitas, envio de materiais, acompanhando o funil de relacionamento com arquitetos.',
    comoFunciona: [
      'Tarefas são criadas automaticamente ou manualmente',
      'Sistema agrupa por arquiteto e tipo',
      'Alertas são gerados para tarefas vencidas',
      'Ao completar, histórico é registrado na timeline',
      'Arquiteto pode mudar de etapa no funil'
    ],
    quandoExecuta: 'Contínuo - tarefas são processadas conforme criadas',
    triggerType: 'event',
    endpoint: '/functions/v1/process-pending-architect-tasks',
    dependencias: [
      'Arquitetos cadastrados',
      'Funil de prospecção configurado'
    ],
    dicas: [
      'Crie tarefas com datas realistas',
      'Use tipos de tarefa padronizados',
      'Revise tarefas vencidas diariamente'
    ]
  },
  'agendamentos-automaticos': {
    titulo: 'Agendamentos Automáticos',
    descricao: 'Criação automática de agendamentos via I.A.',
    oQueFaz: 'Quando a I.A. do WhatsApp detecta intenção de agendamento em uma conversa, cria automaticamente um registro de agendamento no sistema.',
    comoFunciona: [
      'I.A. analisa mensagens recebidas',
      'Detecta intenção de marcar reunião/visita',
      'Extrai data, hora e contexto',
      'Cria agendamento na tabela apropriada',
      'Notifica vendedor responsável',
      'Confirma com arquiteto via WhatsApp'
    ],
    quandoExecuta: 'Evento - quando I.A. detecta intenção',
    triggerType: 'event',
    endpoint: '/functions/v1/create-agendamento',
    dependencias: [
      'I.A. WhatsApp ativa',
      'Webhook configurado',
      'Calendário integrado (opcional)'
    ],
    dicas: [
      'Treine a I.A. com exemplos de agendamento',
      'Configure confirmação automática',
      'Envie lembrete 24h antes'
    ]
  },

  // Produção
  'automacao-producao': {
    titulo: 'Automação de Produção',
    descricao: 'Automações configuráveis por etapa da produção',
    oQueFaz: 'Permite criar automações personalizadas que são executadas quando pedidos entram ou saem de determinadas etapas da produção.',
    comoFunciona: [
      'Usuário configura automação para etapa específica',
      'Define trigger (entrada ou saída da etapa)',
      'Configura ação (notificação, webhook, etc)',
      'Sistema monitora movimentações de pedidos',
      'Quando trigger é acionado, executa ação',
      'Log é registrado para auditoria'
    ],
    quandoExecuta: 'Evento - quando pedido muda de etapa',
    triggerType: 'event',
    dependencias: [
      'Etapas de produção configuradas',
      'Automações ativas criadas'
    ],
    dicas: [
      'Crie automações para etapas críticas',
      'Configure notificações para gestores',
      'Use webhooks para integrar com outros sistemas'
    ]
  },

  // Metas
  'metas-diarias': {
    titulo: 'Inicialização de Metas Diárias',
    descricao: 'Criação automática de metas diárias para vendedores',
    oQueFaz: 'Inicializa automaticamente as metas diárias de cada vendedor no início do dia, distribuindo a meta mensal pelos dias úteis restantes.',
    comoFunciona: [
      'Edge function é chamada no início de cada dia',
      'Busca meta mensal ativa de cada vendedor',
      'Calcula valor proporcional para o dia',
      'Cria registro em daily_goals',
      'Considera dias úteis restantes no mês',
      'Ajusta conforme performance acumulada'
    ],
    quandoExecuta: 'Agendado - diariamente às 00:01',
    triggerType: 'scheduled',
    endpoint: '/functions/v1/initialize-daily-goals',
    dependencias: [
      'Metas mensais configuradas',
      'Vendedores ativos no sistema',
      'n8n com agendamento diário'
    ],
    dicas: [
      'Configure metas mensais antes do início do mês',
      'Revise distribuição semanalmente',
      'Ajuste para considerar feriados'
    ]
  }
};

interface AutomacaoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automacao: AutomacaoDetail | null;
}

export function AutomacaoDetailDialog({ 
  open, 
  onOpenChange, 
  automacao 
}: AutomacaoDetailDialogProps) {
  if (!automacao) return null;

  const total = (automacao.sucessos || 0) + (automacao.falhas || 0);
  const taxaSucesso = total > 0 ? Math.round(((automacao.sucessos || 0) / total) * 100) : 0;

  const copyEndpoint = () => {
    if (automacao.endpoint) {
      navigator.clipboard.writeText(automacao.endpoint);
      toast.success("Endpoint copiado!");
    }
  };

  const getTriggerIcon = () => {
    switch (automacao.triggerType) {
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'webhook': return <Zap className="h-4 w-4" />;
      case 'event': return <Play className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  const getTriggerLabel = () => {
    switch (automacao.triggerType) {
      case 'scheduled': return 'Agendado';
      case 'webhook': return 'Webhook';
      case 'event': return 'Evento';
      default: return 'Manual';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{automacao.titulo}</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {getTriggerIcon()}
                <span className="ml-1">{getTriggerLabel()}</span>
              </Badge>
              <Badge variant={automacao.ativo ? "default" : "secondary"}>
                {automacao.ativo ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ativo
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Inativo
                  </>
                )}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{automacao.descricao}</p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* O que faz */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-primary" />
              O QUE FAZ
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {automacao.oQueFaz}
            </p>
          </div>

          <Separator />

          {/* Como funciona */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Settings className="h-4 w-4 text-primary" />
              COMO FUNCIONA
            </div>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              {automacao.comoFunciona.map((passo, index) => (
                <li key={index}>{passo}</li>
              ))}
            </ol>
          </div>

          <Separator />

          {/* Quando executa */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              QUANDO EXECUTA
            </div>
            <p className="text-sm text-muted-foreground">
              {automacao.quandoExecuta}
            </p>
          </div>

          {/* Endpoint */}
          {automacao.endpoint && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4 text-primary" />
                  ENDPOINT
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded font-mono">
                    {automacao.endpoint}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyEndpoint}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Estatísticas */}
          {total > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-primary" />
                  ESTATÍSTICAS
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600">✓ {automacao.sucessos} sucessos</span>
                  <span className="text-red-600">✗ {automacao.falhas} falhas</span>
                  <span className={`font-medium ${taxaSucesso >= 80 ? 'text-green-600' : taxaSucesso >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {taxaSucesso}% sucesso
                  </span>
                </div>
                {automacao.ultimaExecucao && (
                  <p className="text-xs text-muted-foreground">
                    Última execução: {new Date(automacao.ultimaExecucao).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Dependências */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              DEPENDÊNCIAS
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {automacao.dependencias.map((dep, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  {dep}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Dicas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              DICAS DE USO
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {automacao.dicas.map((dica, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-500">💡</span>
                  {dica}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
