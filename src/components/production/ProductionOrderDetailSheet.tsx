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
  const { data: statusColumns = [] } = useProductionStatusColumns();

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

  const { data: order, isLoading } = useQuery({
    queryKey: ['production-order-detail', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data: orderData } = await (supabase.from('production_orders').select('*').eq('id', orderId).maybeSingle() as any);
      if (!orderData) return null;

      const results = await Promise.all([
        (supabase.from('production_types').select('name').eq('id', orderData.production_type_id || '').maybeSingle() as any),
        (supabase.from('profiles').select('full_name').eq('id', orderData.responsible_id || '').maybeSingle() as any),
        (supabase.from('clients').select('name').eq('id', orderData.client_id || '').maybeSingle() as any),
        (supabase.from('crm_deals').select('title').eq('id', orderData.deal_id || '').maybeSingle() as any),
        (supabase.from('production_phases').select('*').eq('production_order_id', orderId) as any),
        orderData.project_id
          ? (supabase.from('production_orders').select('id, title, status, order_number').eq('project_id', orderData.project_id).neq('id', orderId) as any)
          : Promise.resolve({ data: [] })
      ]);

      const phs = results[4].data || [];
      const templateIds = phs.map((p: any) => p.phase_template_id).filter(Boolean);
      const tmplsRes = templateIds.length > 0
        ? await (supabase.from('production_phase_templates').select('*').in('id', templateIds) as any)
        : { data: [] };

      const res: any = {
        ...orderData,
        production_type: results[0].data,
        responsible: results[1].data,
        client: results[2].data,
        deal: results[3].data,
        phases: phs.map((p: any) => ({
          ...p,
          phase_template: (tmplsRes.data || []).find((t: any) => t.id === p.phase_template_id) || null
        })),
        related_ops: results[5].data || []
      };
      return res;
    },
    enabled: !!orderId
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['production-order-logs', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from('production_logs')
        .select(`*, created_by_profile:profiles!production_logs_created_by_fkey(full_name)`)
        .eq('production_order_id', orderId)
        .neq('action_type', 'update')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!orderId
  });

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
      let phaseToComplete = currentPhaseIndex >= 0 ? sortedPhasesInner[currentPhaseIndex] : null;
      let nextPhaseToStart = currentPhaseIndex >= 0 ? sortedPhasesInner[currentPhaseIndex + 1] || null : sortedPhasesInner.find(p => p.status === 'pendente') || null;

      if (phaseToComplete) {
        await supabase.from('production_phases').update({ status: 'concluido', completed_at: new Date().toISOString() }).eq('id', phaseToComplete.id);
      }
      if (nextPhaseToStart) {
        await supabase.from('production_phases').update({ status: 'em_andamento', started_at: new Date().toISOString() }).eq('id', nextPhaseToStart.id);
        await supabase.from('production_orders').update({ current_phase_id: nextPhaseToStart.id, actual_start_date: order.actual_start_date || new Date().toISOString() }).eq('id', orderId);
      }

      const sortedCols = [...statusColumns].sort((a, b) => a.sort_order - b.sort_order);
      const currentIdx = sortedCols.findIndex(c => c.slug === order.status);
      const nextCol = currentIdx >= 0 ? sortedCols[currentIdx + 1] : sortedCols[0];

      if (nextCol) {
        const { error } = await supabase.rpc('move_production_phase' as any, { _op_id: orderId, _target_slug: nextCol.slug, _reason: null } as any);
        if (error) throw error;
        return { advanced: true, last: false };
      }
      await supabase.from('production_orders').update({ status: 'concluido', actual_end_date: new Date().toISOString() }).eq('id', orderId);
      return { advanced: true, last: true };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['production-order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['ops-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production_order_phase_history'] });
      toast.success(res?.last ? 'Produção concluída' : 'Fase avançada com sucesso');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao avançar fase')
  });

  const toggleUrgentMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      const newPriority = order.priority === 'urgente' ? 'normal' : 'urgente';
      const { error } = await supabase.from('production_orders').update({ priority: newPriority }).eq('id', orderId);
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('production_logs').insert({
        production_order_id: orderId,
        action_type: 'priority_change',
        description: newPriority === 'urgente' ? 'Ordem marcada como URGENTE' : 'Urgência removida',
        from_status: order.priority,
        to_status: newPriority,
        created_by: user?.id
      });
      return newPriority;
    },
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['production-order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success(p === 'urgente' ? 'Marcado como urgente!' : 'Urgência removida');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      await supabase.from('production_attachments').delete().eq('production_order_id', orderId);
      await supabase.from('production_logs').delete().eq('production_order_id', orderId);
      await supabase.from('production_phases').delete().eq('production_order_id', orderId);
      const { error } = await supabase.from('production_orders').delete().eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('Ordem excluída');
      onOpenChange(false);
    }
  });

  if (!orderId) return null;

  const phasesArray = Array.isArray(order?.phases) ? order.phases : [];
  const sortedPhases = [...phasesArray].sort((a, b) => (a.position ?? a.phase_template?.position ?? 999) - (b.position ?? b.phase_template?.position ?? 999));
  const completedPhases = sortedPhases.filter(p => p.status === 'concluido').length;
  const totalPhases = sortedPhases.length;
  const progress = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;
  const currentIdx = sortedPhases.findIndex(p => p.status === 'em_andamento');
  const currentPhase = currentIdx >= 0 ? sortedPhases[currentIdx] : null;
  const nextPhase = currentIdx >= 0 ? sortedPhases[currentIdx + 1] : sortedPhases.find(p => p.status === 'pendente');
  const isMoveisplanejados = order?.production_type?.name === 'Móveis Planejados';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <SheetHeader><SheetTitle>Carregando...</SheetTitle></SheetHeader>
              <Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" />
            </div>
          ) : order ? (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-muted-foreground">OP-{String(order.order_number).padStart(4, '0')}</span>
                      <Badge className={statusColors[order.status] || statusColors.aguardando}>{statusLabels[order.status] || order.status}</Badge>
                    </div>
                    <SheetTitle className="text-xl">{order.title}</SheetTitle>
                    {order.production_type && <Badge variant="outline" className="mt-2">{order.production_type.name}</Badge>}
                    {order.related_ops && (order.related_ops as any[]).length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Outras OPs do Projeto</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(order.related_ops as any[]).map((op: any) => (
                            <Badge key={op.id} variant="secondary" className="text-[10px] gap-1.5 py-0.5 cursor-pointer hover:bg-secondary/80" onClick={() => {
                              onOpenChange(false);
                              setTimeout(() => {
                                const n = new URLSearchParams(window.location.search); n.set("op", op.id);
                                window.history.replaceState(null, "", "?" + n.toString());
                                window.dispatchEvent(new PopStateEvent('popstate'));
                              }, 100);
                            }}>
                              <span className="opacity-60 font-mono">#{op.order_number}</span>{op.title}
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
                    <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
                    {isMaster && <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}><Trash2 className="h-4 w-4 mr-1" />Excluir</Button>}
                  </div>
                </div>
              </SheetHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span><span className="font-medium">{completedPhases}/{totalPhases} fases</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                {order.status !== 'concluido' && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm text-muted-foreground">Fase Atual</p><p className="font-medium">{statusColumns.find(c => c.slug === order.status)?.label || order.status}</p></div>
                        {nextPhase && (
                          <div className="text-right"><p className="text-sm text-muted-foreground">Próxima</p><p className="font-medium text-primary">{nextPhase.phase_template?.name}</p></div>
                        )}
                      </div>
                      <ProductionOrderChecklist productionOrderId={orderId} statusSlug={order.status} />
                    </div>
                    <Button className="w-full gap-2" onClick={() => advancePhaseMutation.mutate()} disabled={advancePhaseMutation.isPending}>
                      {nextPhase ? (<>Avançar para {nextPhase.phase_template?.name}<ArrowRight className="h-4 w-4" /></>) : (<><CheckCircle2 className="h-4 w-4" />Concluir Produção</>)}
                    </Button>
                  </div>
                )}
                <Separator />
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full flex-wrap h-auto">
                    <TabsTrigger value="info" className="flex-1 gap-1.5"><Info className="h-4 w-4" />Informações</TabsTrigger>
                    <TabsTrigger value="cronograma" className="flex-1 gap-1.5"><CalendarRange className="h-4 w-4" />Cronograma</TabsTrigger>
                    <TabsTrigger value="ficha" className="flex-1 gap-1.5"><FileText className="h-4 w-4" />Ficha Técnica</TabsTrigger>
                    <TabsTrigger value="logs" className="flex-1 gap-1.5"><History className="h-4 w-4" />Atualizações</TabsTrigger>
                  </TabsList>
                  <TabsContent value="info" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Cliente</p><p className="text-sm font-medium">{order.client?.name || 'Não informado'}</p></div>
                      <div className="space-y-1"><p className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Projeto/Negócio</p><p className="text-sm font-medium">{order.deal?.title || 'Não informado'}</p></div>
                      <div className="space-y-1"><p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Início Planejado</p><p className="text-sm font-medium">{order.planned_start_date ? format(new Date(order.planned_start_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</p></div>
                      <div className="space-y-1"><p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Entrega Prevista</p><p className="text-sm font-medium text-primary font-bold">{order.planned_end_date ? format(new Date(order.planned_end_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</p></div>
                      {isMoveisplanejados && <div className="col-span-2"><Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setPrazoDialogOpen(true)}><CalendarRange className="h-4 w-4" />Ajustar Prazos das Etapas</Button></div>}
                    </div>
                  </TabsContent>
                  <TabsContent value="cronograma" className="pt-4"><OpTimelineMini opId={orderId} /></TabsContent>
                  <TabsContent value="ficha" className="pt-4"><ProductionFichaTecnica orderId={orderId} /></TabsContent>
                  <TabsContent value="logs" className="pt-4"><ProductionUpdates orderId={orderId} /></TabsContent>
                </Tabs>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <EditProductionOrderDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} order={order} />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Deseja excluir permanentemente esta ordem de produção?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => deleteMutation.mutate()}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {order && isMoveisplanejados && <EditPhasesSLADialog open={prazoDialogOpen} onOpenChange={setPrazoDialogOpen} orderId={orderId!} orderNumber={order.order_number} createdAt={order.created_at || null} />}
    </>
  );
}
