import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Zap, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Bell,
  Info,
  Save,
  X,
  HelpCircle,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ManageProductionAutomationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Automation {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  production_type_id: string | null;
  phase_template_id: string | null;
  prazo_dias_uteis: number | null;
  prazo_horas: number | null;
  acao_tipo: string | null;
  acao_config: Record<string, any>;
  ativa: boolean;
  created_at: string;
}

const tipoLabels: Record<string, string> = {
  sla_etapa: 'SLA por Etapa',
  alerta_prazo: 'Alerta de Prazo',
  escalonar_prioridade: 'Escalonar Prioridade',
  notificacao: 'Notificação'
};

const acaoLabels: Record<string, string> = {
  gerar_alerta: 'Gerar Alerta Visual',
  mudar_prioridade: 'Mudar Prioridade',
  notificar_responsavel: 'Notificar Responsável',
  notificar_usuario: 'Notificar Usuário'
};

const tipoIcons: Record<string, React.ReactNode> = {
  sla_etapa: <Clock className="h-4 w-4" />,
  alerta_prazo: <AlertTriangle className="h-4 w-4" />,
  escalonar_prioridade: <TrendingUp className="h-4 w-4" />,
  notificacao: <Bell className="h-4 w-4" />
};

export function ManageProductionAutomationsDialog({ 
  open, 
  onOpenChange 
}: ManageProductionAutomationsDialogProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'sla_etapa',
    production_type_id: '',
    phase_template_id: '',
    prazo_dias_uteis: 3,
    acao_tipo: 'gerar_alerta',
    acao_config: {} as Record<string, any>
  });

  // Fetch automations
  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['production-automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_automations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Automation[];
    },
    enabled: open
  });

  // Fetch production types
  const { data: productionTypes = [] } = useQuery({
    queryKey: ['production-types-for-automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_types')
        .select('id, name')
        .eq('active', true)
        .order('position');
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Fetch phase templates
  const { data: phaseTemplates = [] } = useQuery({
    queryKey: ['phase-templates-for-automations', formData.production_type_id],
    queryFn: async () => {
      let query = supabase
        .from('production_phase_templates')
        .select('id, name, production_type_id')
        .order('position');
      
      if (formData.production_type_id) {
        query = query.eq('production_type_id', formData.production_type_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Fetch execution logs count
  const { data: logCounts = {} } = useQuery({
    queryKey: ['automation-log-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_automation_logs')
        .select('automation_id')
        .gte('created_at', new Date(new Date().setDate(1)).toISOString());
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(log => {
        counts[log.automation_id] = (counts[log.automation_id] || 0) + 1;
      });
      return counts;
    },
    enabled: open
  });

  // Helper to convert special values to null for database
  const getPhaseTemplateIdForDb = (value: string) => {
    if (!value || value === 'nova_op' || value === 'all') return null;
    return value;
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('production_automations').insert({
        nome: formData.nome,
        descricao: formData.descricao || null,
        tipo: formData.tipo,
        production_type_id: formData.production_type_id || null,
        phase_template_id: getPhaseTemplateIdForDb(formData.phase_template_id),
        prazo_dias_uteis: formData.prazo_dias_uteis,
        acao_tipo: formData.acao_tipo,
        acao_config: { ...formData.acao_config, is_nova_op: formData.phase_template_id === 'nova_op' }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-automations'] });
      const phaseName = getPhaseName(formData.phase_template_id || null);
      toast.success('Automação criada com sucesso', {
        description: `OPs na etapa "${phaseName}" serão alertadas após ${formData.prazo_dias_uteis} dias úteis`
      });
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao criar automação: ' + error.message);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await supabase
        .from('production_automations')
        .update({
          nome: formData.nome,
          descricao: formData.descricao || null,
          tipo: formData.tipo,
          production_type_id: formData.production_type_id || null,
          phase_template_id: getPhaseTemplateIdForDb(formData.phase_template_id),
          prazo_dias_uteis: formData.prazo_dias_uteis,
          acao_tipo: formData.acao_tipo,
          acao_config: { ...formData.acao_config, is_nova_op: formData.phase_template_id === 'nova_op' }
        })
        .eq('id', editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-automations'] });
      toast.success('Automação atualizada com sucesso');
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar automação: ' + error.message);
    }
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase
        .from('production_automations')
        .update({ ativa })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-automations'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar automação: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('production_automations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-automations'] });
      toast.success('Automação excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir automação: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo: 'sla_etapa',
      production_type_id: '',
      phase_template_id: '',
      prazo_dias_uteis: 3,
      acao_tipo: 'gerar_alerta',
      acao_config: {}
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleEdit = (automation: Automation) => {
    // Restore 'nova_op' special value if it was set
    const phaseId = automation.acao_config?.is_nova_op ? 'nova_op' : (automation.phase_template_id || '');
    
    setFormData({
      nome: automation.nome,
      descricao: automation.descricao || '',
      tipo: automation.tipo,
      production_type_id: automation.production_type_id || '',
      phase_template_id: phaseId,
      prazo_dias_uteis: automation.prazo_dias_uteis || 3,
      acao_tipo: automation.acao_tipo || 'gerar_alerta',
      acao_config: automation.acao_config || {}
    });
    setEditingId(automation.id);
    setIsCreating(true);
  };

  const handleSubmit = () => {
    if (!formData.nome.trim()) {
      toast.error('Nome da automação é obrigatório');
      return;
    }
    if (!formData.prazo_dias_uteis || formData.prazo_dias_uteis < 1) {
      toast.error('Prazo em dias úteis deve ser maior que 0');
      return;
    }

    // Check for duplicate
    const isDuplicate = automations.some(a => 
      a.id !== editingId &&
      a.tipo === formData.tipo &&
      (a.production_type_id || '') === formData.production_type_id &&
      (a.phase_template_id || '') === formData.phase_template_id
    );

    if (isDuplicate) {
      toast.error('Já existe uma automação com essa configuração', {
        description: 'Escolha um tipo de produção ou etapa diferente'
      });
      return;
    }

    // Warn for very short deadlines
    if (formData.prazo_dias_uteis < 2 && !editingId) {
      const confirmed = window.confirm(
        `Prazo de ${formData.prazo_dias_uteis} dia útil é muito curto. Deseja continuar?`
      );
      if (!confirmed) return;
    }

    if (editingId) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const getProductionTypeName = (id: string | null) => {
    if (!id) return 'Todos';
    return productionTypes.find(t => t.id === id)?.name || 'Todos';
  };

  const getPhaseName = (id: string | null) => {
    if (!id) return 'Todas';
    if (id === 'nova_op') return 'Nova OP (Aguardando)';
    return phaseTemplates.find(t => t.id === id)?.name || 'Todas';
  };

  // Check for duplicate automation
  const checkDuplicate = () => {
    return automations.some(a => 
      a.id !== editingId &&
      a.tipo === formData.tipo &&
      (a.production_type_id || '') === formData.production_type_id &&
      (a.phase_template_id || '') === formData.phase_template_id
    );
  };

  const getSuccessMessage = () => {
    const typeName = getProductionTypeName(formData.production_type_id || null);
    const phaseName = getPhaseName(formData.phase_template_id || null);
    return `OPs ${typeName !== 'Todos' ? `de "${typeName}"` : ''} na etapa "${phaseName}" serão alertadas após ${formData.prazo_dias_uteis} dias úteis`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Gerenciar Automações de Produção
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-4 p-1">
            {/* Guia Explicativo */}
            <Collapsible defaultOpen={automations.length === 0}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">📚 Guia: Como usar as Automações</span>
                <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-4 rounded-lg bg-muted/50 border text-sm space-y-4">
                  {/* O que são automações */}
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 text-primary mb-1">
                      <Zap className="h-4 w-4" />
                      O que são Automações?
                    </h4>
                    <p className="text-muted-foreground text-xs">
                      As automações monitoram automaticamente o tempo que cada ordem de produção permanece em cada etapa. 
                      Quando o prazo configurado é excedido, o sistema executa a ação definida (alerta visual, mudança de prioridade, etc).
                    </p>
                  </div>

                  {/* Como funciona dias úteis */}
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 text-primary mb-1">
                      <Clock className="h-4 w-4" />
                      Cálculo de Dias Úteis
                    </h4>
                    <p className="text-muted-foreground text-xs">
                      O sistema conta apenas <strong>segunda a sexta-feira</strong>. Sábados e domingos são automaticamente excluídos.
                    </p>
                    <div className="mt-1 p-2 rounded bg-background text-xs">
                      <strong>Exemplo:</strong> Se configurar 3 dias úteis e a OP entrar na etapa segunda-feira, 
                      o alerta será gerado na quinta-feira.
                    </div>
                  </div>

                  {/* Tipos de automação */}
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 text-primary mb-1">
                      📋 Tipos de Automação
                    </h4>
                    <div className="grid gap-2 text-xs">
                      <div className="flex items-start gap-2 p-2 rounded bg-background">
                        <Clock className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>SLA por Etapa (Dias Úteis)</strong>
                          <p className="text-muted-foreground">Define um prazo máximo para uma etapa específica. Ideal para garantir que nenhuma OP fique "esquecida".</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded bg-background">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>Alerta de Prazo Geral</strong>
                          <p className="text-muted-foreground">Monitora o prazo geral de entrega da OP. Útil para alertar quando a data está próxima.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded bg-background">
                        <TrendingUp className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>Escalonar Prioridade</strong>
                          <p className="text-muted-foreground">Aumenta automaticamente a prioridade quando prazo excede. Ex: "Após 5 dias úteis, mudar para URGENTE".</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded bg-background">
                        <Bell className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>Notificação</strong>
                          <p className="text-muted-foreground">Envia notificação para o responsável ou usuário específico.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exemplos práticos */}
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 text-primary mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Exemplos Práticos
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="p-2 rounded bg-background border-l-2 border-blue-500">
                        <strong>1️⃣ "SLA Compra Material - 2 dias úteis"</strong>
                        <p className="text-muted-foreground">Tipo: Móveis Planejados → Etapa: Compra de Material → Ação: Gerar alerta visual</p>
                      </div>
                      <div className="p-2 rounded bg-background border-l-2 border-orange-500">
                        <strong>2️⃣ "Urgente após 5 dias em Produção"</strong>
                        <p className="text-muted-foreground">Tipo: Todos → Etapa: Produção Iniciada → Ação: Mudar prioridade para Urgente</p>
                      </div>
                      <div className="p-2 rounded bg-background border-l-2 border-emerald-500">
                        <strong>3️⃣ "Alerta Geral 3 dias"</strong>
                        <p className="text-muted-foreground">Tipo: Todos → Etapa: Todas → Ação: Gerar alerta visual</p>
                      </div>
                    </div>
                  </div>

                  {/* Dicas */}
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <h4 className="font-semibold text-xs mb-1">💡 Dicas:</h4>
                    <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                      <li>Configure automações específicas para etapas críticas do seu processo</li>
                      <li>Use "Todos os Tipos" para regras que valem para toda produção</li>
                      <li>Comece com prazos maiores e ajuste conforme necessidade</li>
                      <li>Ative/desative automações sem excluí-las para testes</li>
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />
            {/* Create/Edit Form */}
            {isCreating ? (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      {editingId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {editingId ? 'Editar Automação' : 'Nova Automação'}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={resetForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome da Automação *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: SLA Etapa Compra Material"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        placeholder="Descrição opcional da automação..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Tipo de Automação</Label>
                        <Select
                          value={formData.tipo}
                          onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sla_etapa">SLA por Etapa (Dias Úteis)</SelectItem>
                            <SelectItem value="alerta_prazo">Alerta de Prazo Geral</SelectItem>
                            <SelectItem value="escalonar_prioridade">Escalonar Prioridade</SelectItem>
                            <SelectItem value="notificacao">Notificação</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label className="flex items-center gap-1">
                          Prazo (Dias Úteis) *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Exclui automaticamente sábados e domingos</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={formData.prazo_dias_uteis}
                          onChange={(e) => setFormData({ ...formData, prazo_dias_uteis: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Tipo de Produção</Label>
                        <Select
                          value={formData.production_type_id || 'all'}
                          onValueChange={(value) => setFormData({ 
                            ...formData, 
                            production_type_id: value === 'all' ? '' : value,
                            phase_template_id: ''
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os Tipos</SelectItem>
                            {productionTypes.map(type => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Etapa Específica</Label>
                        <Select
                          value={formData.phase_template_id || 'all'}
                          onValueChange={(value) => setFormData({ 
                            ...formData, 
                            phase_template_id: value === 'all' ? '' : value 
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as Etapas</SelectItem>
                            <SelectItem value="nova_op">🆕 Nova OP (Aguardando)</SelectItem>
                            {phaseTemplates.map(phase => (
                              <SelectItem key={phase.id} value={phase.id}>
                                {phase.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Ação ao Exceder Prazo</Label>
                      <Select
                        value={formData.acao_tipo}
                        onValueChange={(value) => setFormData({ ...formData, acao_tipo: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gerar_alerta">🚨 Gerar Alerta Visual no Card</SelectItem>
                          <SelectItem value="mudar_prioridade">⬆️ Mudar Prioridade para Urgente</SelectItem>
                          <SelectItem value="notificar_responsavel">📧 Notificar Responsável</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingId ? 'Atualizar' : 'Criar'} Automação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button onClick={() => setIsCreating(true)} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Nova Automação
              </Button>
            )}

            <Separator />

            {/* Automations List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Automações Configuradas ({automations.length})
              </h3>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando...
                </div>
              ) : automations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma automação configurada</p>
                  <p className="text-xs">Clique em "Nova Automação" para criar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {automations.map(automation => (
                    <Card 
                      key={automation.id}
                      className={!automation.ativa ? 'opacity-60 bg-muted/50' : ''}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Switch
                                checked={automation.ativa}
                                onCheckedChange={(checked) => 
                                  toggleMutation.mutate({ id: automation.id, ativa: checked })
                                }
                              />
                              <span className="font-medium truncate">
                                {automation.nome}
                              </span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {tipoIcons[automation.tipo]}
                                <span className="ml-1">{tipoLabels[automation.tipo]}</span>
                              </Badge>
                            </div>
                            
                            <div className="text-xs text-muted-foreground space-y-0.5 pl-10">
                              <p>
                                <span className="font-medium">Escopo:</span>{' '}
                                {getProductionTypeName(automation.production_type_id)} → {getPhaseName(automation.phase_template_id)}
                              </p>
                              <p>
                                <span className="font-medium">Prazo:</span>{' '}
                                {automation.prazo_dias_uteis} dias úteis
                              </p>
                              <p>
                                <span className="font-medium">Ação:</span>{' '}
                                {acaoLabels[automation.acao_tipo || 'gerar_alerta']}
                              </p>
                              {logCounts[automation.id] && (
                                <p className="text-primary">
                                  Executado {logCounts[automation.id]}x este mês
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(automation)}
                              aria-label="Editar automação"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm('Excluir esta automação?')) {
                                  deleteMutation.mutate(automation.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}