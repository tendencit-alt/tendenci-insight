import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Calendar, 
  User, 
  Package, 
  ArrowRight, 
  CheckCircle2, 
  Clock,
  FileText,
  DollarSign,
  Pencil,
  Trash2,
  Zap,
  FileSpreadsheet,
  Info,
  Timer,
  CalendarRange
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OpTimelineMini } from '@/components/ops/timeline/OpTimelineMini';
import { useMinimizedDialogs } from '@/contexts/MinimizedDialogsContext';
import { MinimizeButton } from '@/components/ui/MinimizeButton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EditProductionOrderDialog } from './EditProductionOrderDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { ProductionUpdates } from './ProductionUpdates';
import { ProductionFichaTecnica } from './ProductionFichaTecnica';
import { EditPhasesSLADialog } from './EditPhasesSLADialog';
import { ProductionOrderChecklist } from './ProductionOrderChecklist';
import { useProductionStatusColumns } from '@/hooks/useProductionStatusColumns';

interface ProductionOrderDetailSheetProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  aguardando: 'Aguardando',
  em_producao: 'Em Produção',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

const statusColors: Record<string, string> = {
  aguardando: 'bg-gray-100 text-gray-800',
  em_producao: 'bg-blue-100 text-blue-800',
  pausado: 'bg-yellow-100 text-yellow-800',
  concluido: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800'
};

export function ProductionOrderDetailSheet({ orderId, open, onOpenChange }: ProductionOrderDetailSheetProps) {
  const queryClient = useQueryClient();
  const { minimize: minimizeDialog, remove: removeMinimized } = useMinimizedDialogs();
  const [isMinimized, setIsMinimized] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prazoDialogOpen, setPrazoDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const navigate = useNavigate();
  const { isMaster } = usePermissions();

  const dialogId = `production-detail-${orderId}`;

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    onOpenChange(false);
    minimizeDialog({
      id: dialogId,
      label: `Ordem Produção`,
      icon: '🏭',
      route: '/producao-operacoes',
      restore: () => { setIsMinimized(false); onOpenChange(true); },
    });
  }, [minimizeDialog, onOpenChange, orderId, dialogId]);

  useEffect(() => {
    if (!open && !isMinimized) removeMinimized(dialogId);
  }, [open, isMinimized, removeMinimized, dialogId]);

  // Buscar detalhes da OP com queries separadas para evitar problemas de FK
  const { data: order, isLoading } = useQuery({
    queryKey: ['production-order-detail', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      // Query principal - dados básicos da OP
      const { data: orderData, error: orderError } = await (supabase
        .from('production_orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle() as any);
      
      if (orderError) throw orderError;
      if (!orderData) return null;

      const results: any[] = await Promise.all([
        orderData.production_type_id 
          ? supabase.from('production_types').select('name, color').eq('id', orderData.production_type_id).maybeSingle()
          : Promise.resolve({ data: null }),
        orderData.responsible_id
          ? supabase.from('profiles').select('full_name, email').eq('id', orderData.responsible_id).maybeSingle()
          : Promise.resolve({ data: null }),
        orderData.client_id
          ? supabase.from('clients').select('name, phone').eq('id', orderData.client_id).maybeSingle()
          : Promise.resolve({ data: null }),
        orderData.deal_id
          ? supabase.from('crm_deals').select('title, value').eq('id', orderData.deal_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('production_phases').select('*').eq('production_order_id', orderId)
      ]);

      const productionTypeRes = results[0];
      const responsibleRes = results[1];
      const clientRes = results[2];
      const dealRes = results[3];
      const phasesRes = results[4];

      const templateIds = ((phasesRes.data || []) as any[]).map(p => p.phase_template_id).filter(Boolean);
      const { data: templates } = templateIds.length > 0
        ? await (supabase.from('production_phase_templates').select('*').in('id', templateIds) as any)
        : { data: [] };

      const { data: relOpsData } = (orderData as any).project_id
        ? await (supabase.from('production_orders').select('id, title, status, order_number').eq('project_id', (orderData as any).project_id).neq('id', orderId) as any)
        : { data: [] };

      const mappedPhases: any[] = ((phasesRes.data || []) as any[]).map(phase => {
        const t = (templates as any[] | null)?.find(t => t.id === phase.phase_template_id);
        return { ...phase, phase_template: t || null };
      });

      const res: any = {
        ...orderData,
        production_type: productionTypeRes.data,
        responsible: responsibleRes.data,
        client: clientRes.data,
        deal: dealRes.data,
        phases: mappedPhases,
        related_ops: (relOpsData as any[] | null) || []
      };
      return res;
    },
    enabled: !!orderId
  });

  // Buscar logs de movimentação da OP (exceto atualizações manuais que são mostradas no ProductionUpdates)
  const { data: logs = [] } = useQuery({
    queryKey: ['production-order-logs', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('production_logs')
        .select(`
          *,
          created_by_profile:profiles!production_logs_created_by_fkey(full_name)
        `)
        .eq('production_order_id', orderId)
        .neq('action_type', 'update')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId
  });

  const { data: statusColumns = [] } = useProductionStatusColumns();

  // Mutation para avançar fase
  const advancePhaseMutation = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('Ordem não carregada');

      const phasesArr = Array.isArray(order.phases) ? order.phases : [];
      const sortedPhasesInner = [...phasesArr].sort((a, b) => {
        const posA = a.position ?? a.phase_template?.position ?? 999;
        const posB = b.position ?? b.phase_template?.position ?? 999;
        return posA - posB;
      });

      const currentPhaseIndex = sortedPhasesInner.findIndex(p => p.status === 'em_andamento');
      let phaseToComplete: typeof sortedPhasesInner[0] | null = null;
      let nextPhaseToStart: typeof sortedPhasesInner[0] | null = null;

      if (currentPhaseIndex >= 0) {
        phaseToComplete = sortedPhasesInner[currentPhaseIndex];
        nextPhaseToStart = sortedPhasesInner[currentPhaseIndex + 1] || null;
      } else {
        nextPhaseToStart = sortedPhasesInner.find(p => p.status === 'pendente') || null;
      }

      // Atualizar production_phases (se houver)
      if (phaseToComplete) {
        await supabase
          .from('production_phases')
          .update({ status: 'concluido', completed_at: new Date().toISOString() })
          .eq('id', phaseToComplete.id);
      }
      if (nextPhaseToStart) {
        await supabase
          .from('production_phases')
          .update({ status: 'em_andamento', started_at: new Date().toISOString() })
          .eq('id', nextPhaseToStart.id);
        await supabase
          .from('production_orders')
          .update({
            current_phase_id: nextPhaseToStart.id,
            actual_start_date: order.actual_start_date || new Date().toISOString(),
          })
          .eq('id', orderId);
      }

      // Avançar a coluna do Kanban via RPC (fonte de verdade do status do card)
      const sortedCols = [...statusColumns].sort((a, b) => a.sort_order - b.sort_order);
      const currentIdx = sortedCols.findIndex(c => c.slug === order.status);
      const nextCol = currentIdx >= 0 ? sortedCols[currentIdx + 1] : sortedCols[0];

      if (nextCol) {
        const { error: rpcError } = await supabase.rpc('move_production_phase' as any, {
          _op_id: orderId,
          _target_slug: nextCol.slug,
          _reason: null,
        } as any);
        if (rpcError) throw rpcError;
        return { advanced: true, last: false };
      }

      // Já está na última coluna — concluir OP
      await supabase
        .from('production_orders')
        .update({ status: 'concluido', actual_end_date: new Date().toISOString() })
        .eq('id', orderId);
      return { advanced: true, last: true };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['production-order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['ops-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production_order_phase_history'] });
      toast.success(res?.last ? 'Produção concluída' : 'Fase avançada com sucesso');
    },
    onError: (e: any) => {
      toast.error(e?.message || 'Erro ao avançar fase');
    }
  });


  // Mutation para toggle de urgência
  const toggleUrgentMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      const newPriority = order.priority === 'urgente' ? 'normal' : 'urgente';
      
      // 1. Atualizar prioridade
      const { error } = await supabase
        .from('production_orders')
        .update({ priority: newPriority })
        .eq('id', orderId);
      if (error) throw error;
      
      // 2. Registrar no histórico
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('production_logs')
        .insert({
          production_order_id: orderId,
          action_type: 'priority_change',
          description: newPriority === 'urgente' 
            ? 'Ordem marcada como URGENTE' 
            : 'Urgência removida - voltou para prioridade normal',
          from_status: order.priority,
          to_status: newPriority,
          created_by: user?.id
        });
      
      return newPriority;
    },
    onSuccess: (newPriority) => {
      queryClient.invalidateQueries({ queryKey: ['production-order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['production-order-logs', orderId] });
      toast.success(newPriority === 'urgente' ? 'Marcado como urgente!' : 'Urgência removida');
    },
    onError: () => {
      toast.error('Erro ao alterar prioridade');
    }
  });

  // Mutation para excluir OP
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      
      // Excluir em cascata: anexos, logs, fases, depois a OP
      await supabase
        .from('production_attachments')
        .delete()
        .eq('production_order_id', orderId);
      
      await supabase
        .from('production_logs')
        .delete()
        .eq('production_order_id', orderId);
      
      await supabase
        .from('production_phases')
        .delete()
        .eq('production_order_id', orderId);
      
      const { error } = await supabase
        .from('production_orders')
        .delete()
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('Ordem de produção excluída com sucesso');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Erro ao excluir OP:', error);
      toast.error('Erro ao excluir ordem de produção');
    }
  });

  if (!orderId) return null;

  const phasesArray = Array.isArray(order?.phases) ? order.phases : [];
  // Ordenar por position da própria fase, depois do template
  const sortedPhases = [...phasesArray].sort((a, b) => {
    const posA = a.position ?? a.phase_template?.position ?? 999;
    const posB = b.position ?? b.phase_template?.position ?? 999;
    return posA - posB;
  });

  const completedPhases = sortedPhases.filter(p => p.status === 'concluido').length;
  const totalPhases = sortedPhases.length;
  const progress = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;

  // Encontrar fase atual e próxima de forma robusta
  const currentPhaseIndex = sortedPhases.findIndex(p => p.status === 'em_andamento');
  const currentPhase = currentPhaseIndex >= 0 ? sortedPhases[currentPhaseIndex] : null;
  const nextPhase = currentPhaseIndex >= 0 
    ? sortedPhases[currentPhaseIndex + 1] 
    : sortedPhases.find(p => p.status === 'pendente');

  // Verificar se é Móveis Planejados
  const isMoveisplanejados = order?.production_type?.name === 'Móveis Planejados';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>Carregando...</SheetTitle>
              </SheetHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : order ? (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-muted-foreground">
                        OP-{String(order.order_number).padStart(4, '0')}
                      </span>
                      <Badge className={statusColors[order.status] || statusColors.aguardando}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </div>
                    <SheetTitle className="text-xl">{order.title}</SheetTitle>
                    {order.production_type && (
                      <Badge variant="outline" className="mt-2">
                        {order.production_type.name}
                      </Badge>
                    )}
                    {order.related_ops && (order.related_ops as any[]).length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Outras OPs do Projeto</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(order.related_ops as any[]).map((op: any) => (
                            <Badge 
                              key={op.id} 
                              variant="secondary" 
                              className="text-[10px] gap-1.5 py-0.5 cursor-pointer hover:bg-secondary/80"
                              onClick={() => {
                                onOpenChange(false);
                                setTimeout(() => {
                                  const next = new URLSearchParams(window.location.search);
                                  next.set("op", op.id);
                                  window.history.replaceState(null, "", "?" + next.toString());
                                  window.dispatchEvent(new PopStateEvent('popstate'));
                                }, 100);
                              }}
                            >
                              <span className="opacity-60 font-mono">#{op.order_number}</span>
                              {op.title}
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                              <span className="opacity-70">{statusColumns.find(c => c.slug === op.status)?.label || op.status}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <MinimizeButton onClick={handleMinimize} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    {isMaster && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                {/* Progresso */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{completedPhases}/{totalPhases} fases</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Fase atual e botão avançar */}
                {order.status !== 'concluido' && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Fase Atual</p>
                          <p className="font-medium">
                            {statusColumns.find(c => c.slug === order.status)?.label || order.status}
                          </p>
                        </div>
                        {nextPhase && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Próxima</p>
                            <p className="font-medium text-primary">
                              {nextPhase.phase_template?.name}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <ProductionOrderChecklist 
                        productionOrderId={orderId} 
                        statusSlug={order.status} 
                      />
                    </div>
                    <Button 
                      className="w-full gap-2"
                      onClick={() => advancePhaseMutation.mutate()}
                      disabled={advancePhaseMutation.isPending}
                    >
                      {nextPhase ? (
                        <>
                          Avançar para {nextPhase.phase_template?.name}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Concluir Produção
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Tabs para Informações, Ficha Técnica e Atualizações */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full flex-wrap h-auto">
                    <TabsTrigger value="info" className="flex-1 gap-1.5">
                      <Info className="h-4 w-4" />
                      Informações
                    </TabsTrigger>
                    <TabsTrigger value="cronograma" className="flex-1 gap-1.5">
                      <CalendarRange className="h-4 w-4" />
                      Cronograma
                    </TabsTrigger>
                    <TabsTrigger value="ficha" className="flex-1 gap-1.5">
                      <FileSpreadsheet className="h-4 w-4" />
                      Ficha Técnica
                    </TabsTrigger>
                    <TabsTrigger value="updates" className="flex-1 gap-1.5">
                      <Clock className="h-4 w-4" />
                      Atualizações
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="cronograma" className="mt-4 space-y-3">
                    <OpTimelineMini opId={order.id} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => navigate(`/producao-operacoes?tab=cronograma&op=${order.id}`)}
                    >
                      <CalendarRange className="h-4 w-4" />
                      Ver no Cronograma completo
                    </Button>
                  </TabsContent>

                  {/* Tab Informações */}
                  <TabsContent value="info" className="space-y-4 mt-4">
                    {/* Checklist da fase atual */}
                    {order.status && (
                      <ProductionOrderChecklist productionOrderId={order.id} statusSlug={order.status} />
                    )}

                    {/* Informações */}
                    <div className="grid gap-4">
                      {order.client && (
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Cliente</p>
                            <p className="font-medium">{order.client.name}</p>
                          </div>
                        </div>
                      )}

                      {order.responsible && (
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Responsável</p>
                            <p className="font-medium">{order.responsible.full_name}</p>
                          </div>
                        </div>
                      )}

                      {order.value && order.value > 0 && (
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Valor</p>
                            <p className="font-medium">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Toggle de Urgência */}
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Prioridade</p>
                          <p className={`font-medium ${order.priority === 'urgente' ? 'text-destructive' : ''}`}>
                            {order.priority === 'urgente' ? 'URGENTE' : order.priority?.charAt(0).toUpperCase() + order.priority?.slice(1) || 'Normal'}
                          </p>
                        </div>
                        <Button
                          variant={order.priority === 'urgente' ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => toggleUrgentMutation.mutate()}
                          disabled={toggleUrgentMutation.isPending}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          {order.priority === 'urgente' ? 'Remover Urgência' : 'Marcar Urgente'}
                        </Button>
                      </div>

                      {/* Prazo - com destaque para Móveis Planejados */}
                      {isMoveisplanejados ? (
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Timer className="h-5 w-5 text-primary" />
                              <div>
                                <p className="text-sm text-muted-foreground">Prazo de Produção</p>
                                <p className="font-bold text-lg text-primary">
                                  {order.prazo_customizado_dias 
                                    ? `${order.prazo_customizado_dias} dias úteis`
                                    : 'Não definido'
                                  }
                                </p>
                              </div>
                            </div>
                            {order.status !== 'concluido' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPrazoDialogOpen(true)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                            )}
                          </div>
                          {order.planned_end_date && (
                            <p className="text-sm mt-2 text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Entrega: {format(new Date(order.planned_end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      ) : order.planned_end_date && (
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Prazo</p>
                            <p className="font-medium">
                              {format(new Date(order.planned_end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      )}

                      {order.description && (
                        <div className="flex items-start gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Descrição</p>
                            <p className="text-sm">{order.description}</p>
                          </div>
                        </div>
                      )}

                      {order.notes && (
                        <div className="flex items-start gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Observações</p>
                            <p className="text-sm">{order.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Timeline de fases */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">Fases da Produção</h3>
                        {isMoveisplanejados && order.status !== 'concluido' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPrazoDialogOpen(true)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar Prazos
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {sortedPhases.map((phase, index) => {
                          // Calcular SLA efetivo (customizado ou do template)
                          const effectiveSLA = (phase as any).sla_dias_uteis_custom ?? (phase.phase_template as any)?.sla_dias_uteis;
                          
                          return (
                            <div 
                              key={phase.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border ${
                                phase.status === 'em_andamento' 
                                  ? 'border-primary bg-primary/5' 
                                  : phase.status === 'concluido'
                                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                                  : 'border-border'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                phase.status === 'concluido' 
                                  ? 'bg-green-500 text-white'
                                  : phase.status === 'em_andamento'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {phase.status === 'concluido' ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  index + 1
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-sm">{phase.phase_template?.name}</p>
                                  {isMoveisplanejados && effectiveSLA && (
                                    <Badge variant="outline" className="text-xs">
                                      {effectiveSLA}d úteis
                                    </Badge>
                                  )}
                                </div>
                                {phase.started_at && (
                                  <p className="text-xs text-muted-foreground">
                                    {phase.status === 'concluido' && phase.completed_at
                                      ? `Concluído em ${format(new Date(phase.completed_at), 'dd/MM HH:mm')}`
                                      : `Iniciado em ${format(new Date(phase.started_at), 'dd/MM HH:mm')}`
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Histórico de Movimentação */}
                    {logs.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-medium mb-3">Histórico de Movimentação</h3>
                          <div className="space-y-2">
                            {logs.map((log) => (
                              <div key={log.id} className="flex items-start gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                  <p>{log.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(log.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                    {log.created_by_profile?.full_name && ` • ${log.created_by_profile.full_name}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* Tab Ficha Técnica */}
                  <TabsContent value="ficha" className="mt-4">
                    <ProductionFichaTecnica productionOrderId={orderId!} />
                  </TabsContent>

                  {/* Tab Atualizações */}
                  <TabsContent value="updates" className="mt-4">
                    <ProductionUpdates orderId={orderId} />
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : (
            <SheetHeader>
              <SheetTitle>Ordem não encontrada</SheetTitle>
              <p className="text-muted-foreground text-sm">A ordem de produção solicitada não foi encontrada ou foi excluída.</p>
            </SheetHeader>
          )}
        </SheetContent>
      </Sheet>

      <EditProductionOrderDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        orderId={orderId}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ordem de Produção</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja excluir a OP <strong>#{order?.order_number}</strong> - <strong>{order?.title}</strong>?
              </p>
              {order?.client?.name && (
                <p className="text-sm">Cliente: {order.client.name}</p>
              )}
              <p className="text-destructive font-medium">
                Esta ação é irreversível e excluirá também todas as fases, logs e anexos vinculados.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir OP'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de editar SLA das etapas - Móveis Planejados */}
      {order && isMoveisplanejados && (
        <EditPhasesSLADialog
          open={prazoDialogOpen}
          onOpenChange={setPrazoDialogOpen}
          orderId={orderId!}
          orderNumber={order.order_number}
          createdAt={order.created_at || null}
        />
      )}
    </>
  );
}