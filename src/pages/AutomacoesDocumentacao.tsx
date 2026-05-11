import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  Zap, 
  CheckCircle, 
  XCircle, 
  Clock,
  MessageSquare,
  Factory,
  UserSearch,
  Target,
  Link2,
  AlertTriangle,
  Activity,
  Package,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ModuloAutomacoes } from "@/components/automacoes/ModuloAutomacoes";
import { EndpointsReference } from "@/components/automacoes/EndpointsReference";
import { SystemErrorsTab } from "@/components/automacoes/SystemErrorsTab";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KPI {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export default function AutomacoesDocumentacao() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [automacoesCRM, setAutomacoesCRM] = useState<any[]>([]);
  const [automacoesProducao, setAutomacoesProducao] = useState<any[]>([]);
  const [automacoesProspeccao, setAutomacoesProspeccao] = useState<any[]>([]);
  const [automacoesMetas, setAutomacoesMetas] = useState<any[]>([]);
  const [automacoesEstoque, setAutomacoesEstoque] = useState<any[]>([]);
  const [logsRecentes, setLogsRecentes] = useState<any[]>([]);
  const [openErrorCount, setOpenErrorCount] = useState(0);

  const fetchData = async () => {
    try {
      // Fetch CRM automations data
      const [
        { data: crmTasks },
        { data: followupLogs },
        { data: productionAutomations },
        { data: productionLogs },
        { data: campaigns },
        { data: sequences },
        { data: notifications },
        { data: systemErrors }
      ] = await Promise.all([
        supabase
          .from('crm_tasks')
          .select('*')
          .eq('tipo_tarefa', 'automatizada')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('followup_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('production_automations')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('production_automation_logs')
          .select('*')
          .order('executed_at', { ascending: false })
          .limit(100),
        supabase
          .from('tendenci_prospec_arq_campaigns')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('tendenci_prospec_arq_sequences')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('notifications')
          .select('*')
          .eq('type', 'automation_failure')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('system_errors')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      // Set open error count for badge
      setOpenErrorCount(systemErrors?.length || 0);

      // Calculate KPIs - total de automações fixas + dinâmicas
      const fixedAutomations = 24; // Total de automações fixas documentadas
      const dynamicAutomations = productionAutomations?.length || 0;
      const totalAutomacoes = fixedAutomations + dynamicAutomations;
      const automacoesAtivas = (productionAutomations?.filter(a => a.ativa)?.length || 0) + 20; // Maioria das fixas estão ativas
      const falhasRecentes = notifications?.length || 0;
      const ultimaExecucao = productionLogs?.[0]?.created_at || followupLogs?.[0]?.sent_at;

      setKpis([
        {
          label: "Total de Automações",
          value: totalAutomacoes,
          icon: <Zap className="h-5 w-5 text-primary" />
        },
        {
          label: "Ativas",
          value: automacoesAtivas,
          icon: <CheckCircle className="h-5 w-5 text-green-500" />
        },
        {
          label: "Falhas Recentes",
          value: falhasRecentes,
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          trend: falhasRecentes > 0 ? 'down' : 'neutral'
        },
        {
          label: "Última Execução",
          value: ultimaExecucao 
            ? format(new Date(ultimaExecucao), "dd/MM HH:mm", { locale: ptBR })
            : "N/A",
          icon: <Clock className="h-5 w-5 text-blue-500" />
        }
      ]);

      // Process CRM automations
      const crmSucessos = followupLogs?.filter(l => l.status === 'sent')?.length || 0;
      const crmFalhas = followupLogs?.filter(l => l.status === 'failed')?.length || 0;
      const tasksSucessos = crmTasks?.filter(t => t.status === 'completed')?.length || 0;
      const tasksFalhas = crmTasks?.filter(t => t.status === 'failed')?.length || 0;

      setAutomacoesCRM([
        {
          id: 'followup-ia',
          nome: 'Follow-up I.A.',
          descricao: 'Envia mensagens de follow-up personalizadas via I.A.',
          ativo: true,
          ultimaExecucao: followupLogs?.[0]?.sent_at,
          sucessos: crmSucessos,
          falhas: crmFalhas,
          endpoint: '/functions/v1/dispatch-followup',
          triggerType: 'scheduled' as const
        },
        {
          id: 'tarefas-automatizadas-crm',
          nome: 'Tarefas Automatizadas CRM',
          descricao: 'Processa e executa tarefas de CRM automaticamente',
          ativo: true,
          ultimaExecucao: crmTasks?.[0]?.processed_at,
          sucessos: tasksSucessos,
          falhas: tasksFalhas,
          endpoint: '/functions/v1/process-pending-crm-tasks',
          triggerType: 'scheduled' as const
        },
        {
          id: 'alertas-sla',
          nome: 'Alertas de SLA',
          descricao: 'Notifica quando negócios excedem tempo em etapa',
          ativo: true,
          ultimaExecucao: null,
          sucessos: 0,
          falhas: 0,
          triggerType: 'event' as const
        },
        {
          id: 'negocios-sem-tarefa',
          nome: 'Negócios sem Tarefa',
          descricao: 'Verifica negócios sem tarefas agendadas',
          ativo: true,
          ultimaExecucao: null,
          endpoint: '/functions/v1/check-deals-without-tasks',
          triggerType: 'scheduled' as const
        },
        {
          id: 'reativar-deals-perdidos',
          nome: 'Reativar Negócios Perdidos',
          descricao: 'Reabre negócios perdidos após período configurado',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        },
        {
          id: 'atribuir-owner-qualificacao',
          nome: 'Atribuir Responsável na Qualificação',
          descricao: 'Atribui owner_id automaticamente ao qualificar deal',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        },
        {
          id: 'criar-pedido-deal-won',
          nome: 'Criar Pedido ao Ganhar',
          descricao: 'Cria pedido automaticamente quando deal é ganho',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        },
        {
          id: 'log-mudancas-deal',
          nome: 'Histórico de Alterações',
          descricao: 'Registra todas as alterações em negócios',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        }
      ]);

      // Process Production automations
      const prodAutomacoesFormatadas = (productionAutomations || []).map(auto => {
        const autoLogs = productionLogs?.filter(l => l.automation_id === auto.id) || [];
        
        return {
          id: auto.id,
          nome: auto.nome,
          descricao: auto.descricao || 'Automação de produção',
          ativo: auto.ativa,
          ultimaExecucao: autoLogs[0]?.created_at,
          sucessos: autoLogs.length,
          falhas: 0,
          triggerType: 'event' as const
        };
      });

      // Adicionar automações fixas de produção
      const automacoesProducaoFixas = [
        {
          id: 'criar-fases-op',
          nome: 'Criar Fases da OP',
          descricao: 'Cria fases automaticamente ao criar OP',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        },
        {
          id: 'criar-producao-aprovacao',
          nome: 'Criar OP na Aprovação',
          descricao: 'Cria OP ao aprovar pedido',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        },
        {
          id: 'log-mudancas-op',
          nome: 'Histórico de Alterações OP',
          descricao: 'Registra alterações em OPs',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        }
      ];

      setAutomacoesProducao([...automacoesProducaoFixas, ...prodAutomacoesFormatadas]);

      // Process Prospeccao automations
      const campanhasAtivas = campaigns?.filter(c => c.status === 'sending')?.length || 0;
      const campanhasConcluidas = campaigns?.filter(c => c.status === 'completed')?.length || 0;

      setAutomacoesProspeccao([
        {
          id: 'campanhas-whatsapp',
          nome: 'Campanhas WhatsApp',
          descricao: 'Disparo em massa de mensagens para parceiros profissionais',
          ativo: campanhasAtivas > 0,
          ultimaExecucao: campaigns?.[0]?.updated_at,
          sucessos: campanhasConcluidas,
          falhas: campaigns?.filter(c => c.status === 'failed')?.length || 0,
          endpoint: '/functions/v1/dispatch-campaign',
          triggerType: 'manual' as const
        },
        {
          id: 'sequencias-ia',
          nome: 'Sequências I.A.',
          descricao: 'Sequências automatizadas de mensagens',
          ativo: (sequences?.filter(s => s.ativa)?.length || 0) > 0,
          ultimaExecucao: sequences?.[0]?.updated_at,
          sucessos: sequences?.filter(s => s.ativa)?.length || 0,
          falhas: 0,
          triggerType: 'scheduled' as const
        },
        {
          id: 'tarefas-prospeccao',
          nome: 'Tarefas de Prospecção',
          descricao: 'Processa tarefas de parceiros profissionais automaticamente',
          ativo: true,
          ultimaExecucao: null,
          endpoint: '/functions/v1/process-pending-architect-tasks',
          triggerType: 'scheduled' as const
        },
        {
          id: 'agendamentos-automaticos',
          nome: 'Agendamentos Automáticos',
          descricao: 'Cria agendamentos via detecção da I.A.',
          ativo: true,
          ultimaExecucao: null,
          endpoint: '/functions/v1/create-agendamento',
          triggerType: 'event' as const
        },
        {
          id: 'arquitetos-inativos',
          nome: 'Verificar Parceiros Profissionais Inativos (60 dias)',
          descricao: 'Move parceiros profissionais sem atividade para etapa Inativo',
          ativo: true,
          ultimaExecucao: null,
          endpoint: 'RPC: run_inactive_architects_check',
          triggerType: 'manual' as const
        },
        {
          id: 'validar-whatsapp',
          nome: 'Validação de WhatsApp',
          descricao: 'Valida números de WhatsApp dos parceiros profissionais',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        },
        {
          id: 'atualizar-contato-arquiteto',
          nome: 'Atualizar Data Último Contato',
          descricao: 'Atualiza data de contato ao interagir',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        }
      ]);

      // Process Metas automations
      setAutomacoesMetas([
        {
          id: 'metas-diarias',
          nome: 'Inicialização de Metas Diárias',
          descricao: 'Cria automaticamente metas diárias para vendedores',
          ativo: true,
          ultimaExecucao: null,
          endpoint: '/functions/v1/initialize-daily-goals',
          triggerType: 'scheduled' as const
        },
        {
          id: 'expirar-metas',
          nome: 'Expirar Metas Antigas',
          descricao: 'Marca metas passadas como expiradas',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'scheduled' as const
        },
        {
          id: 'lembrete-metas',
          nome: 'Lembretes de Metas',
          descricao: 'Envia lembretes sobre metas próximas do vencimento',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'scheduled' as const
        },
        {
          id: 'atualizar-progresso-metas',
          nome: 'Atualizar Progresso de Metas',
          descricao: 'Recalcula progresso ao ganhar negócio',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        }
      ]);

      // Process Estoque automations
      setAutomacoesEstoque([
        {
          id: 'atualizar-estoque',
          nome: 'Atualizar Estoque Automático',
          descricao: 'Atualiza estoque ao registrar movimentações',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        },
        {
          id: 'recalcular-totais-compra',
          nome: 'Recalcular Totais de Compra',
          descricao: 'Recalcula totais ao alterar itens da compra',
          ativo: true,
          ultimaExecucao: null,
          triggerType: 'event' as const
        }
      ]);

      // Process recent logs
      const allLogs = [
        ...(productionLogs || []).map(l => ({
          id: l.id,
          tipo: 'Produção',
          automacao: l.automation_id,
          status: 'success',
          data: l.created_at,
          detalhes: typeof l.detalhes === 'string' ? l.detalhes : null
        })),
        ...(followupLogs || []).map(l => ({
          id: l.id,
          tipo: 'Follow-up',
          automacao: 'Follow-up I.A.',
          status: l.status === 'sent' ? 'success' : 'failure',
          data: l.sent_at || l.created_at,
          detalhes: l.error_message
        }))
      ].sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());

      setLogsRecentes(allLogs.slice(0, 20));

    } catch (error) {
      console.error('Erro ao carregar dados de automações:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Dados atualizados!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Central de Automações</h1>
            <p className="text-muted-foreground">
              Documentação e monitoramento de todas as automações do sistema
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg py-1 px-3">
              <Activity className="h-4 w-4 mr-2" />
              {kpis[0]?.value || 0} automações
            </Badge>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          {kpis.map((kpi, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                  {kpi.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs por módulo */}
        <Tabs defaultValue="crm" className="space-y-4">
          <TabsList className="grid grid-cols-8 w-full max-w-5xl">
            <TabsTrigger value="crm" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              CRM
            </TabsTrigger>
            <TabsTrigger value="producao" className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Produção
            </TabsTrigger>
            <TabsTrigger value="prospeccao" className="flex items-center gap-2">
              <UserSearch className="h-4 w-4" />
              Prospecção
            </TabsTrigger>
            <TabsTrigger value="metas" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="estoque" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="erros" className="flex items-center gap-2 relative">
              <AlertCircle className="h-4 w-4" />
              Erros
              {openErrorCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {openErrorCount > 9 ? '9+' : openErrorCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Endpoints
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crm">
            <ModuloAutomacoes
              titulo="Automações CRM"
              descricao="Automações relacionadas ao funil de vendas e relacionamento com clientes"
              automacoes={automacoesCRM}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="producao">
            <ModuloAutomacoes
              titulo="Automações de Produção"
              descricao="Automações configuradas para o módulo de produção"
              automacoes={automacoesProducao}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="prospeccao">
            <ModuloAutomacoes
              titulo="Automações de Prospecção"
              descricao="Campanhas, sequências e tarefas automáticas de prospecção"
              automacoes={automacoesProspeccao}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="metas">
            <ModuloAutomacoes
              titulo="Automações de Metas"
              descricao="Automações relacionadas ao sistema de metas"
              automacoes={automacoesMetas}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="estoque">
            <ModuloAutomacoes
              titulo="Automações de Estoque"
              descricao="Automações relacionadas ao controle de estoque e compras"
              automacoes={automacoesEstoque}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="erros">
            <SystemErrorsTab onErrorCountChange={setOpenErrorCount} />
          </TabsContent>

          <TabsContent value="endpoints">
            <EndpointsReference />
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logs Recentes de Execução</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : logsRecentes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum log registrado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {logsRecentes.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {log.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{log.tipo}</p>
                            <p className="text-xs text-muted-foreground">
                              {typeof log.automacao === 'string' 
                                ? log.automacao 
                                : 'Automação de Produção'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">
                            {log.data 
                              ? format(new Date(log.data), "dd/MM HH:mm", { locale: ptBR })
                              : "N/A"}
                          </p>
                          {log.detalhes && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {log.detalhes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
