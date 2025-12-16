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
  X
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('production_automations').insert({
        nome: formData.nome,
        descricao: formData.descricao || null,
        tipo: formData.tipo,
        production_type_id: formData.production_type_id || null,
        phase_template_id: formData.phase_template_id || null,
        prazo_dias_uteis: formData.prazo_dias_uteis,
        acao_tipo: formData.acao_tipo,
        acao_config: formData.acao_config
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-automations'] });
      toast.success('Automação criada com sucesso');
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
          phase_template_id: formData.phase_template_id || null,
          prazo_dias_uteis: formData.prazo_dias_uteis,
          acao_tipo: formData.acao_tipo,
          acao_config: formData.acao_config
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
    setFormData({
      nome: automation.nome,
      descricao: automation.descricao || '',
      tipo: automation.tipo,
      production_type_id: automation.production_type_id || '',
      phase_template_id: automation.phase_template_id || '',
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
    return phaseTemplates.find(t => t.id === id)?.name || 'Todas';
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