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
  // ============== CRM ==============
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
  'reativar-deals-perdidos': {
    titulo: 'Reativar Negócios Perdidos',
    descricao: 'Reabre negócios perdidos após período configurado',
    oQueFaz: 'Verifica negócios marcados como "lost" há mais de X dias e os reativa automaticamente para nova tentativa de venda, movendo para a primeira etapa do funil.',
    comoFunciona: [
      'Trigger de banco verifica negócios com status "lost"',
      'Filtra por tempo desde a data de perda',
      'Altera status para "open"',
      'Move para primeira etapa do pipeline',
      'Registra no histórico do deal',
      'Notifica vendedor responsável'
    ],
    quandoExecuta: 'Trigger de banco - quando status muda para "lost"',
    triggerType: 'event',
    dependencias: [
      'Trigger set_reopen_at configurado',
      'Campo reopen_at preenchido'
    ],
    dicas: [
      'Configure prazo de reativação de 30-90 dias',
      'Revise motivos de perda antes de reativar',
      'Crie segmentos para abordagem diferenciada'
    ]
  },
  'atribuir-owner-qualificacao': {
    titulo: 'Atribuir Responsável na Qualificação',
    descricao: 'Atribui automaticamente owner_id ao deal na qualificação',
    oQueFaz: 'Quando um negócio é movido para a etapa de qualificação sem um responsável definido, atribui automaticamente o usuário que fez a movimentação como owner.',
    comoFunciona: [
      'Trigger monitora mudança para etapa "Qualificação"',
      'Verifica se owner_id está nulo',
      'Atribui moved_by como owner_id',
      'Registra alteração no histórico'
    ],
    quandoExecuta: 'Trigger de banco - ao entrar na etapa Qualificação',
    triggerType: 'event',
    dependencias: [
      'Etapa "Qualificação" configurada no pipeline',
      'Trigger auto_assign_owner_on_qualification ativo'
    ],
    dicas: [
      'Garanta que apenas vendedores qualificados movam deals',
      'Configure redistribuição se necessário'
    ]
  },
  'criar-pedido-deal-won': {
    titulo: 'Criar Pedido ao Ganhar Negócio',
    descricao: 'Cria automaticamente pedido quando deal é ganho',
    oQueFaz: 'Quando um negócio é marcado como "won", cria automaticamente um pedido no módulo de pedidos com os dados do negócio.',
    comoFunciona: [
      'Trigger monitora mudança de status para "won"',
      'Cria registro na tabela orders',
      'Copia dados do deal (valor, cliente, produto)',
      'Vincula order_id ao deal',
      'Notifica responsáveis'
    ],
    quandoExecuta: 'Trigger de banco - ao marcar deal como won',
    triggerType: 'event',
    dependencias: [
      'Tabela orders configurada',
      'Trigger create_order_on_deal_won ativo'
    ],
    dicas: [
      'Verifique se todos os dados obrigatórios estão preenchidos',
      'Configure status inicial do pedido',
      'Defina prazo de entrega padrão'
    ]
  },
  'log-mudancas-deal': {
    titulo: 'Histórico de Alterações de Deal',
    descricao: 'Registra todas as alterações feitas em negócios',
    oQueFaz: 'Mantém um log completo de todas as alterações feitas em negócios do CRM, incluindo mudanças de etapa, valor, responsável e outros campos.',
    comoFunciona: [
      'Trigger monitora UPDATE na tabela crm_deals',
      'Compara valores antigos com novos',
      'Registra alteração em crm_deal_history',
      'Inclui user_id, timestamp e campos alterados'
    ],
    quandoExecuta: 'Trigger de banco - a cada UPDATE em crm_deals',
    triggerType: 'event',
    dependencias: [
      'Trigger log_crm_deal_changes ativo'
    ],
    dicas: [
      'Use para auditoria e análise',
      'Configure retenção de logs',
      'Exporte periodicamente para backup'
    ]
  },

  // ============== PROSPECÇÃO ==============
  'campanhas-whatsapp': {
    titulo: 'Campanhas WhatsApp',
    descricao: 'Disparo em massa de mensagens para parceiros profissionais',
    oQueFaz: 'Permite criar e executar campanhas de WhatsApp em massa para segmentos de parceiros profissionais, com controle de velocidade, status de entrega e relatórios.',
    comoFunciona: [
      'Usuário cria campanha selecionando segmento de parceiros profissionais',
      'Sistema filtra parceiros profissionais elegíveis (WhatsApp válido, ativos)',
      'Disparo é iniciado com delay entre mensagens (evitar bloqueio)',
      'Cada envio é registrado individualmente',
      'Status é atualizado em tempo real',
      'KPI final com taxa de sucesso/falha'
    ],
    quandoExecuta: 'Manual - iniciado pelo usuário',
    triggerType: 'manual',
    endpoint: '/functions/v1/dispatch-campaign',
    dependencias: [
      'Evolution API configurada e conectada',
      'Parceiros Profissionais com WhatsApp válido cadastrado',
      'Segmentos configurados (opcional)'
    ],
    dicas: [
      'Limite campanhas a 100-200 contatos por vez',
      'Use delay mínimo de 3-5 segundos entre mensagens',
      'Evite horários fora do comercial',
      'Personalize mensagens com variáveis do parceiro profissional'
    ]
  },
  'sequencias-ia': {
    titulo: 'Sequências I.A.',
    descricao: 'Fluxos automatizados de mensagens com IA',
    oQueFaz: 'Cria sequências de mensagens automatizadas que são enviadas ao longo do tempo, com respostas geradas por I.A. baseadas no contexto da conversa.',
    comoFunciona: [
      'Parceiro Profissional é adicionado a uma sequência',
      'Sistema agenda próximo passo da sequência',
      'I.A. gera mensagem personalizada quando devido',
      'Mensagem é enviada via WhatsApp',
      'Se parceiro profissional responde, sequência pode pausar',
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
    descricao: 'Gerenciamento de tarefas de prospecção de parceiros profissionais',
    oQueFaz: 'Gerencia tarefas específicas de prospecção como ligações, visitas, envio de materiais, acompanhando o funil de relacionamento com parceiros profissionais.',
    comoFunciona: [
      'Tarefas são criadas automaticamente ou manualmente',
      'Sistema agrupa por parceiro profissional e tipo',
      'Alertas são gerados para tarefas vencidas',
      'Ao completar, histórico é registrado na timeline',
      'Parceiro Profissional pode mudar de etapa no funil'
    ],
    quandoExecuta: 'Contínuo - tarefas são processadas conforme criadas',
    triggerType: 'event',
    endpoint: '/functions/v1/process-pending-architect-tasks',
    dependencias: [
      'Parceiros Profissionais cadastrados',
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
      'Confirma com parceiro profissional via WhatsApp'
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
  'arquitetos-inativos': {
    titulo: 'Verificar Parceiros Profissionais Inativos (60 dias)',
    descricao: 'Move parceiros profissionais sem atividade para etapa Inativo',
    oQueFaz: 'Verifica parceiros profissionais na etapa "parceiro_ativo" que não tiveram indicações, projetos ou interações nos últimos 60 dias e move automaticamente para a etapa "inativo".',
    comoFunciona: [
      'Função RPC run_inactive_architects_check é executada',
      'Busca parceiros profissionais em "parceiro_ativo"',
      'Verifica data_ultimo_contato e ultimo_projeto_data',
      'Se ambos > 60 dias, marca como inativo',
      'Atualiza status_funil para "inativo"',
      'Registra data_marcado_inativo',
      'Registra evento no histórico'
    ],
    quandoExecuta: 'Manual via botão ou agendável via n8n',
    triggerType: 'manual',
    endpoint: 'RPC: run_inactive_architects_check',
    dependencias: [
      'Etapa "inativo" configurada no funil',
      'Parceiros Profissionais com datas de contato preenchidas',
      'Função RPC criada no banco'
    ],
    dicas: [
      'Execute semanalmente ou quinzenalmente',
      'Revise lista de inativos mensalmente',
      'Crie campanhas de reativação para inativos',
      'Configure período de inatividade conforme necessidade'
    ]
  },
  'validar-whatsapp': {
    titulo: 'Validação de WhatsApp',
    descricao: 'Valida números de WhatsApp dos parceiros profissionais',
    oQueFaz: 'Verifica se os números de telefone cadastrados são válidos para WhatsApp, marcando o campo whatsapp_valido como true ou false.',
    comoFunciona: [
      'Trigger de banco ao inserir/atualizar telefone',
      'Formata número para padrão internacional',
      'Pode consultar Evolution API para validação',
      'Atualiza campo whatsapp_valido',
      'Permite filtrar apenas números válidos'
    ],
    quandoExecuta: 'Trigger de banco - ao alterar telefone',
    triggerType: 'event',
    dependencias: [
      'Campo phone preenchido',
      'Trigger validate_whatsapp_number ativo'
    ],
    dicas: [
      'Use para filtrar campanhas',
      'Valide números antes de disparos em massa',
      'Configure revalidação periódica'
    ]
  },
  'atualizar-contato-arquiteto': {
    titulo: 'Atualizar Data Último Contato',
    descricao: 'Atualiza data de último contato automaticamente',
    oQueFaz: 'Quando uma interação é registrada na timeline do parceiro profissional, atualiza automaticamente o campo data_ultimo_contato.',
    comoFunciona: [
      'Trigger monitora INSERT em architect_timeline',
      'Atualiza data_ultimo_contato no parceiro profissional',
      'Mantém histórico de interações atualizado'
    ],
    quandoExecuta: 'Trigger de banco - ao criar timeline',
    triggerType: 'event',
    dependencias: [
      'Trigger update_architect_last_contact ativo'
    ],
    dicas: [
      'Garanta que todas as interações são registradas',
      'Use para calcular inatividade'
    ]
  },

  // ============== PRODUÇÃO ==============
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
  'criar-fases-op': {
    titulo: 'Criar Fases da OP',
    descricao: 'Cria automaticamente fases ao criar OP',
    oQueFaz: 'Quando uma Ordem de Produção é criada, gera automaticamente todas as fases de produção configuradas no template.',
    comoFunciona: [
      'Trigger monitora INSERT em production_orders',
      'Busca template de fases configurado',
      'Cria registros em production_phases',
      'Define ordem e prazos de cada fase',
      'OP fica pronta para acompanhamento'
    ],
    quandoExecuta: 'Trigger de banco - ao criar OP',
    triggerType: 'event',
    dependencias: [
      'Templates de fases configurados',
      'Trigger create_production_phases ativo'
    ],
    dicas: [
      'Configure templates por tipo de produto',
      'Defina prazos realistas por fase',
      'Revise templates periodicamente'
    ]
  },
  'criar-producao-aprovacao': {
    titulo: 'Criar OP na Aprovação de Pedido',
    descricao: 'Cria OP automaticamente ao aprovar pedido',
    oQueFaz: 'Quando um pedido é aprovado (status muda para "approved"), cria automaticamente uma Ordem de Produção vinculada.',
    comoFunciona: [
      'Trigger monitora mudança de status para "approved"',
      'Cria registro em production_orders',
      'Vincula order_id e copia dados',
      'Dispara criação de fases',
      'Notifica equipe de produção'
    ],
    quandoExecuta: 'Trigger de banco - ao aprovar pedido',
    triggerType: 'event',
    dependencias: [
      'Trigger create_production_on_approval ativo',
      'Pedido com dados completos'
    ],
    dicas: [
      'Verifique dados obrigatórios antes de aprovar',
      'Configure notificações para produção',
      'Defina prioridade automática'
    ]
  },
  'log-mudancas-op': {
    titulo: 'Histórico de Alterações OP',
    descricao: 'Registra alterações em Ordens de Produção',
    oQueFaz: 'Mantém log completo de todas as alterações em OPs, incluindo mudanças de etapa, responsável, prazos e outros campos.',
    comoFunciona: [
      'Trigger monitora UPDATE em production_orders',
      'Registra em production_order_history',
      'Inclui valores anteriores e novos',
      'Permite auditoria completa'
    ],
    quandoExecuta: 'Trigger de banco - a cada UPDATE',
    triggerType: 'event',
    dependencias: [
      'Trigger log_production_changes ativo'
    ],
    dicas: [
      'Use para análise de gargalos',
      'Identifique padrões de alteração',
      'Configure alertas para mudanças críticas'
    ]
  },

  // ============== METAS ==============
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
  },
  'expirar-metas': {
    titulo: 'Expirar Metas Antigas',
    descricao: 'Marca metas passadas como expiradas',
    oQueFaz: 'Verifica metas com data_fim anterior à data atual e atualiza o status para "expirada", mantendo histórico organizado.',
    comoFunciona: [
      'Trigger verifica metas com data_fim < now()',
      'Atualiza status para "expirada"',
      'Calcula resultado final (atingida ou não)',
      'Mantém dados para relatórios históricos'
    ],
    quandoExecuta: 'Trigger de banco ou agendado diário',
    triggerType: 'scheduled',
    dependencias: [
      'Campo data_fim preenchido nas metas'
    ],
    dicas: [
      'Execute diariamente',
      'Gere relatórios mensais de resultado',
      'Analise metas não atingidas'
    ]
  },
  'lembrete-metas': {
    titulo: 'Lembretes de Metas',
    descricao: 'Envia lembretes sobre metas próximas do vencimento',
    oQueFaz: 'Quando uma meta está próxima de vencer e ainda não foi atingida, envia notificação para o vendedor responsável.',
    comoFunciona: [
      'Sistema verifica metas próximas do fim',
      'Calcula % de atingimento atual',
      'Se < 80%, gera notificação',
      'Envia para vendedor e gestor',
      'Sugere ações para atingir meta'
    ],
    quandoExecuta: 'Agendado - verificação diária',
    triggerType: 'scheduled',
    dependencias: [
      'Sistema de notificações ativo',
      'Metas com prazos definidos'
    ],
    dicas: [
      'Configure antecedência de 3-5 dias',
      'Personalize mensagens por % de atingimento',
      'Inclua sugestões práticas'
    ]
  },
  'atualizar-progresso-metas': {
    titulo: 'Atualizar Progresso de Metas',
    descricao: 'Recalcula progresso das metas automaticamente',
    oQueFaz: 'Quando um negócio é marcado como ganho (won), recalcula automaticamente o progresso das metas do vendedor responsável.',
    comoFunciona: [
      'Trigger monitora status = "won" em deals',
      'Identifica vendedor e meta ativa',
      'Soma valor ao realizado',
      'Recalcula percentual de atingimento',
      'Atualiza badges e notificações'
    ],
    quandoExecuta: 'Trigger de banco - ao ganhar negócio',
    triggerType: 'event',
    dependencias: [
      'Trigger update_goal_progress ativo',
      'Metas com vendedores vinculados'
    ],
    dicas: [
      'Verifique se valor do deal está correto',
      'Configure comemorações ao atingir meta',
      'Analise velocidade de atingimento'
    ]
  },

  // ============== ESTOQUE ==============
  'atualizar-estoque': {
    titulo: 'Atualizar Estoque Automático',
    descricao: 'Atualiza estoque ao registrar movimentações',
    oQueFaz: 'Quando uma movimentação de estoque é registrada (entrada ou saída), atualiza automaticamente a quantidade em estoque do produto.',
    comoFunciona: [
      'Trigger monitora INSERT em stock_movements',
      'Verifica tipo de movimentação (entrada/saída)',
      'Atualiza quantity no produto',
      'Registra histórico de movimentação',
      'Gera alerta se estoque baixo'
    ],
    quandoExecuta: 'Trigger de banco - ao criar movimentação',
    triggerType: 'event',
    dependencias: [
      'Trigger update_product_stock ativo',
      'Produtos cadastrados'
    ],
    dicas: [
      'Sempre registre movimentações',
      'Configure alertas de estoque mínimo',
      'Faça inventário periódico'
    ]
  },
  'recalcular-totais-compra': {
    titulo: 'Recalcular Totais de Compra',
    descricao: 'Recalcula totais ao alterar itens da compra',
    oQueFaz: 'Quando itens de uma ordem de compra são alterados, recalcula automaticamente os totais (subtotal, impostos, total geral).',
    comoFunciona: [
      'Trigger monitora changes em purchase_order_items',
      'Soma todos os itens da ordem',
      'Aplica cálculos de impostos',
      'Atualiza total_amount na ordem',
      'Mantém consistência dos dados'
    ],
    quandoExecuta: 'Trigger de banco - ao alterar itens',
    triggerType: 'event',
    dependencias: [
      'Trigger recalculate_purchase_totals ativo'
    ],
    dicas: [
      'Verifique configuração de impostos',
      'Confirme totais antes de aprovar',
      'Use para auditoria financeira'
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
