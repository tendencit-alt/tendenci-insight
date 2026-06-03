import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useStrategicResourceDefaults } from '@/hooks/useStrategicResourceDefaults';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderItemsTable } from './OrderItemsTable';
import { OrderItemsAndExtras } from './OrderItemsAndExtras';
import { EditOrderDialog } from './EditOrderDialog';
import { OrderExportDialog } from './OrderExportDialog';
import { CancelOrderDialog } from './CancelOrderDialog';
import { DeleteOrderDialog } from './DeleteOrderDialog';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { ORDERS_STATUS, getStatusDef } from '@/lib/status-registry';
import { useProductionStatusColumns } from '@/hooks/useProductionStatusColumns';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/utils/timezone';
import {
  Phone, Mail, Calendar, CheckCircle,
  Edit, Copy, Download, MessageSquare, ExternalLink, Trash2,
  Wallet, BarChart3, MapPin
} from 'lucide-react';
import { useMinimizedDialogs } from '@/contexts/MinimizedDialogsContext';
import { MinimizeButton } from '@/components/ui/MinimizeButton';
import { OrderFulfillmentBadges } from '@/components/entregas/OrderFulfillmentBadges';

interface OrderDetailSheetProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  /** When true, the top stepper shows the production stages (Kanban de Produção/Operações)
   *  instead of the order lifecycle (Rascunho → Encerrado). */
  productionStepper?: boolean;
}

const STATUS_ORDER = ORDERS_STATUS.statuses.map(s => s.key).filter(k => k !== 'cancelado');

// Stepper keys are derived from ORDERS_STATUS.stepperKeys

function getNextAction(status: string): { label: string; nextStatus: string } | null {
  const map: Record<string, { label: string; nextStatus: string }> = {
    rascunho: { label: 'Aprovar Pedido', nextStatus: 'aprovado' },
    em_negociacao: { label: 'Aprovar Pedido', nextStatus: 'aprovado' },
    aprovado: { label: 'Liberar Produção', nextStatus: 'liberado_producao' },
    liberado_producao: { label: 'Iniciar Produção', nextStatus: 'em_producao' },
    em_producao: { label: 'Concluir Produção', nextStatus: 'producao_concluida' },
    producao_concluida: { label: 'Faturar', nextStatus: 'faturado' },
    liberado_faturamento: { label: 'Registrar Faturamento', nextStatus: 'faturado' },
    faturado: { label: 'Marcar Entregue', nextStatus: 'entregue' },
    entregue: { label: 'Encerrar', nextStatus: 'encerrado' },
  };
  return map[status] || null;
}

export function OrderDetailSheet({ orderId, open, onOpenChange, onUpdate, productionStepper }: OrderDetailSheetProps) {
  const { isMaster } = usePermissions();
  const { defaults: resourceDefaults } = useStrategicResourceDefaults();
  const { minimize: minimizeDialog, remove: removeMinimized } = useMinimizedDialogs();
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dialogId = `order-detail-${orderId}`;

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    onOpenChange(false);
    minimizeDialog({
      id: dialogId,
      label: `Pedido #${orderId?.substring(0, 6)}`,
      icon: '📄',
      route: '/pedidos',
      restore: () => { setIsMinimized(false); onOpenChange(true); },
    });
  }, [minimizeDialog, onOpenChange, orderId, dialogId]);

  useEffect(() => {
    if (!open && !isMinimized) removeMinimized(dialogId);
  }, [open, isMinimized, removeMinimized, dialogId]);

  const { data: order, refetch } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, client:clients(*), vendedor:profiles!orders_vendedor_id_fkey(id, full_name, email), deal:crm_deals(id, title, value), approved_by_user:profiles!orders_approved_by_fkey(id, full_name)`)
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const responsibleIds = order ? [
    (order as any).rt_responsavel_id,
    (order as any).comissao_vendedor_responsible_id || (order as any).comissao_vendedor_responsavel_id,
    (order as any).comissao_orcamentista_responsible_id || (order as any).comissao_orcamentista_responsavel_id,
    (order as any).comissao_projetista_responsible_id || (order as any).comissao_projetista_responsavel_id,
    (order as any).comissao_montador_responsible_id || (order as any).comissao_montador_responsavel_id,
    (order as any).comissao_producao_responsible_id || (order as any).comissao_producao_responsavel_id,
  ].filter(Boolean) : [];

  const { data: responsibles } = useQuery({
    queryKey: ['order-responsibles', responsibleIds],
    queryFn: async () => {
      if (responsibleIds.length === 0) return [];
      const { data } = await supabase.from('order_responsibles').select('id, name').in('id', responsibleIds);
      return data || [];
    },
    enabled: responsibleIds.length > 0,
  });

  const responsibleMap = new Map(responsibles?.map(r => [r.id, r.name]) || []);

  const { data: items } = useQuery({
    queryKey: ['order-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('position');
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const { data: history } = useQuery({
    queryKey: ['order-history', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_history')
        .select(`*, user:profiles!order_history_created_by_fkey(full_name)`)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch financial entries linked to this order
  const { data: financialEntries } = useQuery({
    queryKey: ['order-financials', orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from('fin_ledger_entries')
        .select('id, type, amount, competence_date, status, description, cash_date')
        .eq('order_id', orderId)
        .order('competence_date');
      return data || [];
    },
    enabled: !!orderId,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'aprovado') {
        updates.data_aprovacao = new Date().toISOString();
        updates.approved_by = (await supabase.auth.getUser()).data.user?.id;
      }
      const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
      if (error) throw error;
      const def = getStatusDef('orders', newStatus);
      toast.success(`Status alterado para ${def?.label || newStatus}`);
      refetch();
      onUpdate();
    } catch (error: any) {
      toast.error('Erro ao alterar status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProductionOrders = async () => {
    if (!order || !items || items.length === 0) { toast.error('Pedido não possui itens'); return; }
    const itemsWithCentroCusto = items.filter(i => (i as any).centro_custo);
    if (itemsWithCentroCusto.length === 0) { toast.error('Nenhum item possui centro de custo definido'); return; }
    setLoading(true);
    try {
      let createdCount = 0;
      for (const item of items) {
        const itemCentroCusto = (item as any).centro_custo;
        if (!itemCentroCusto) continue;
        const { data: productionType } = await supabase.from('production_types').select('id, name').ilike('name', `%${itemCentroCusto}%`).eq('active', true).maybeSingle();
        if (!productionType) continue;
        const { data: existingOps } = await supabase.from('production_orders').select('id, order_id, order_item_id').eq('order_id', orderId);
        if (existingOps?.find((op: any) => op.order_item_id === item.id)) continue;
        const { error: opError } = await supabase.from('production_orders').insert({
          title: `${item.descricao} - Pedido #${order.order_number}`,
          production_type_id: productionType.id,
          deal_id: order.deal_id,
          client_id: order.client_id,
          order_id: orderId,
          order_item_id: item.id,
          value: Number(item.valor_total),
          status: 'aguardando',
          priority: 'normal',
        });
        if (!opError) createdCount++;
      }
      if (createdCount > 0) {
        await supabase.from('orders').update({ status: 'em_producao' }).eq('id', orderId);
        toast.success(`${createdCount} ordem(ns) de produção criada(s)!`);
      } else {
        toast.info('Nenhuma ordem de produção foi criada');
      }
      refetch();
      onUpdate();
    } catch (error: any) {
      toast.error('Erro ao criar ordens de produção: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!order || !items) return;
    setLoading(true);
    try {
      const { data: newOrder, error: orderError } = await supabase.from('orders').insert({
        client_id: order.client_id, deal_id: null, vendedor_id: order.vendedor_id,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        forma_pagamento: order.forma_pagamento, condicao_pagamento: order.condicao_pagamento,
        tipo_entrega: order.tipo_entrega, entrega_mesmo_endereco: order.entrega_mesmo_endereco,
        entrega_cep: order.entrega_cep, entrega_logradouro: order.entrega_logradouro,
        entrega_numero: order.entrega_numero, entrega_complemento: order.entrega_complemento,
        entrega_bairro: order.entrega_bairro, entrega_cidade: order.entrega_cidade,
        entrega_uf: order.entrega_uf, entrega_observacoes: order.entrega_observacoes,
        observacoes_internas: order.observacoes_internas, observacoes_nf: order.observacoes_nf,
        desconto_percentual: order.desconto_percentual, desconto_valor: order.desconto_valor,
        valor_frete: order.valor_frete, subtotal: order.subtotal, valor_total: order.valor_total,
        status: 'rascunho',
      }).select().single();
      if (orderError) throw orderError;
      const itemsToInsert = items.map((item, index) => ({
        order_id: newOrder.id, descricao: item.descricao, quantidade: item.quantidade,
        valor_unitario: item.valor_unitario, valor_total: item.valor_total,
        especificacoes: item.especificacoes, codigo_produto: item.codigo_produto,
        ncm: item.ncm, cfop: item.cfop, unidade: item.unidade, position: index,
      }));
      await supabase.from('order_items').insert(itemsToInsert);
      toast.success(`Pedido duplicado! Novo pedido #${newOrder.order_number}`);
      onUpdate();
    } catch (error: any) {
      toast.error('Erro ao duplicar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Derived data
  const _statusDef = getStatusDef('orders', order?.status || 'rascunho');
  const canEdit = order ? ['rascunho', 'em_negociacao'].includes(order.status) : false;
  const nextAction = order ? getNextAction(order.status) : null;

  // Financial summary
  const financialSummary = useMemo(() => {
    if (!financialEntries) return { received: 0, pending: 0, total: 0, count: 0, receivedCount: 0, pendingCount: 0 };
    const receivables = financialEntries.filter(e => e.type === 'receita');
    const received = receivables.filter(e => ['pago', 'recebido', 'conciliado'].includes(e.status || '')).reduce((s, e) => s + Number(e.amount || 0), 0);
    const total = receivables.reduce((s, e) => s + Number(e.amount || 0), 0);
    return {
      received, pending: total - received, total,
      count: receivables.length,
      receivedCount: receivables.filter(e => ['pago', 'recebido', 'conciliado'].includes(e.status || '')).length,
      pendingCount: receivables.filter(e => !['pago', 'recebido', 'conciliado'].includes(e.status || '')).length,
    };
  }, [financialEntries]);

  // Compromissos sobre venda
  const compromissos = useMemo(() => {
    if (!order) return [];
    const o = order as any;
    return [
      { label: resourceDefaults.rt.label, perc: o.rt_percentual, valor: o.rt_valor, respId: o.rt_responsavel_id, habilitado: o.rt_habilitado },
      { label: resourceDefaults.vendedor.label, perc: o.comissao_vendedor_percentual, valor: o.comissao_vendedor_valor, respId: o.comissao_vendedor_responsible_id || o.comissao_vendedor_responsavel_id },
      { label: resourceDefaults.orcamentista.label, perc: o.comissao_orcamentista_percentual, valor: o.comissao_orcamentista_valor, respId: o.comissao_orcamentista_responsible_id || o.comissao_orcamentista_responsavel_id },
      { label: resourceDefaults.projetista.label, perc: o.comissao_projetista_percentual, valor: o.comissao_projetista_valor, respId: o.comissao_projetista_responsible_id || o.comissao_projetista_responsavel_id },
      { label: resourceDefaults.montador.label, perc: o.comissao_montador_percentual, valor: o.comissao_montador_valor, respId: o.comissao_montador_responsible_id || o.comissao_montador_responsavel_id },
      { label: resourceDefaults.producao.label, perc: o.comissao_producao_percentual, valor: o.comissao_producao_valor, respId: o.comissao_producao_responsible_id || o.comissao_producao_responsavel_id },
    ].filter(r => (Number(r.valor || 0) > 0 || Number(r.perc || 0) > 0) || r.habilitado);
  }, [order, resourceDefaults]);

  const totalCompromissos = compromissos.reduce((s, c) => s + Number(c.valor || 0), 0);

  // Stepper (default: ciclo de vida do pedido)
  const currentStepIdx = STATUS_ORDER.indexOf(order?.status || 'rascunho');
  const stepperStatuses = ORDERS_STATUS.stepperKeys || [];
  const orderSteps = stepperStatuses.map(key => {
    const def = getStatusDef('orders', key);
    const stepIdx = STATUS_ORDER.indexOf(key);
    return {
      key,
      label: def?.label || key,
      completed: currentStepIdx > stepIdx,
      active: order?.status === key || (key === 'em_producao' && ['liberado_producao', 'em_producao', 'producao_concluida'].includes(order?.status || '')),
    };
  });

  // Stepper alternativo: estágios de Produção/Operações (Kanban configurável por tenant)
  const { data: prodStatusColumns = [] } = useProductionStatusColumns();
  const { data: orderPos = [] } = useQuery({
    queryKey: ['order-detail-pos', orderId],
    enabled: !!orderId && !!productionStepper,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_orders')
        .select('status')
        .eq('order_id', orderId);
      if (error) throw error;
      return (data ?? []) as { status: string }[];
    },
  });
  const productionStepperData = useMemo(() => {
    if (!productionStepper || prodStatusColumns.length === 0) return null;
    const sorted = [...prodStatusColumns].sort((a, b) => a.sort_order - b.sort_order);
    const doneKeys = new Set(['concluido', 'entregue']);
    const orderBySlug: Record<string, number> = {};
    sorted.forEach((c, i) => { orderBySlug[c.slug] = i; });
    const posIdx = (orderPos as { status: string }[])
      .map(p => orderBySlug[p.status])
      .filter((v) => typeof v === 'number');
    const pendingIdx = (orderPos as { status: string }[])
      .filter(p => !doneKeys.has(p.status))
      .map(p => orderBySlug[p.status])
      .filter((v) => typeof v === 'number');
    const activeIdx = pendingIdx.length > 0
      ? Math.min(...pendingIdx)
      : (posIdx.length > 0 ? Math.max(...posIdx) : 0);
    const steps = sorted.map((c, i) => ({
      key: c.slug,
      label: c.label,
      completed: i < activeIdx,
      active: i === activeIdx,
    }));
    return { steps, label: sorted[activeIdx]?.label ?? 'Sem OP' };
  }, [productionStepper, prodStatusColumns, orderPos]);

  const steps = productionStepperData ? productionStepperData.steps : orderSteps;

  if (!order) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-3xl p-0 overflow-hidden flex flex-col">
          {/* ═══ STATUS BANNER ═══ */}
          <div className="px-4 pt-4">
            <StatusBanner
              module="orders"
              status={order.status}
              statusLabel={productionStepperData?.label}
              steps={steps}
              primaryAction={!productionStepper && nextAction ? {
                label: nextAction.label,
                onClick: () => handleStatusChange(nextAction.nextStatus),
                loading,
              } : undefined}
              secondaryAction={!productionStepper && order.status === 'aprovado' ? {
                label: 'Criar OPs',
                onClick: handleCreateProductionOrders,
                variant: 'outline',
              } : undefined}
            />
          </div>

          {/* ═══ EXECUTIVE HEADER ═══ */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between gap-2">
              <SheetHeader className="space-y-0">
                <SheetTitle className="text-lg flex items-center gap-2">
                  Pedido #{order.order_number}
                  <OrderFulfillmentBadges orderId={order.id} />
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {order.client?.name || 'Sem cliente'} • {order.vendedor?.full_name || 'Sem vendedor'}
                  {order.created_at && ` • ${format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}`}
                </p>
              </SheetHeader>
              <div className="flex items-center gap-1.5">
                <MinimizeButton onClick={handleMinimize} />
                {canEdit && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditOpen(true)}>
                    <Edit className="h-3 w-3 mr-1" />Editar
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setExportOpen(true)}>
                  <Download className="h-3 w-3 mr-1" />Exportar
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDuplicate} disabled={loading}>
                  <Copy className="h-3 w-3 mr-1" />Duplicar
                </Button>
              </div>
            </div>

            {/* ═══ KPI STRIP ═══ */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-lg font-bold">{formatCurrency(order.valor_total)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Valor Total</p>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-lg font-bold text-green-600">{formatCurrency(financialSummary.received)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Recebido</p>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-lg font-bold text-amber-600">{formatCurrency(financialSummary.pending)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Pendente</p>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-lg font-bold text-primary">{formatCurrency(order.valor_total - totalCompromissos)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Receita Líq.</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ═══ CONTENT (scroll) ═══ */}
          <ScrollArea className="flex-1">
            <div className="flex">
              {/* ─── MAIN CONTENT ─── */}
              <div className="flex-1 p-4 space-y-4 min-w-0">
                <Tabs defaultValue="geral" className="space-y-3">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
                    <TabsTrigger value="itens" className="text-xs">Itens ({items?.length || 0})</TabsTrigger>
                    <TabsTrigger value="financeiro" className="text-xs">Financeiro</TabsTrigger>
                    <TabsTrigger value="entrega" className="text-xs">Entrega</TabsTrigger>
                  </TabsList>

                  {/* ── Tab: Geral ── */}
                  <TabsContent value="geral" className="space-y-3 mt-0">
                    {/* Cliente + Vendedor */}
                    <Card>
                      <CardContent className="p-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Cliente</p>
                          <p className="font-medium">{order.client?.name}</p>
                          {order.client?.cpf_cnpj && <p className="text-xs text-muted-foreground font-mono">{order.client.cpf_cnpj}</p>}
                          {order.client?.phone && (
                            <a href={`https://wa.me/55${order.client.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5">
                              <Phone className="h-3 w-3" />{order.client.phone}<ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                          {order.client?.email && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="h-3 w-3" />{order.client.email}</p>}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Vendedor</p>
                          <p className="font-medium">{order.vendedor?.full_name || 'Não atribuído'}</p>
                          {order.vendedor?.email && <p className="text-xs text-muted-foreground">{order.vendedor.email}</p>}
                          {order.deal && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <MessageSquare className="h-3 w-3 inline mr-1" />Negócio: {order.deal.title}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Condições Comerciais */}
                    <Card>
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs text-muted-foreground uppercase">Condições Comerciais</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Forma Pagamento</p>
                          <p className="font-medium">{order.forma_pagamento || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Condição</p>
                          <p className="font-medium">{order.condicao_pagamento || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Entrega</p>
                          <p className="font-medium">{order.tipo_entrega === 'entrega' ? 'Entrega' : order.tipo_entrega === 'retirada' ? 'Retirada' : order.tipo_entrega || '—'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Compromissos Sobre Venda */}
                    {compromissos.length > 0 && (
                      <Card>
                        <CardHeader className="py-2 px-3">
                          <CardTitle className="text-xs text-muted-foreground uppercase flex items-center justify-between">
                            <span>Compromissos Sobre Venda</span>
                            <span className="text-sm text-foreground font-bold">{formatCurrency(totalCompromissos)}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 space-y-1.5">
                          {compromissos.map((r) => (
                            <div key={r.label} className="flex items-center justify-between text-sm rounded border px-2.5 py-1.5 bg-muted/30">
                              <div>
                                <span className="font-medium">{r.label}</span>
                                {r.respId && responsibleMap.get(r.respId) && (
                                  <span className="text-xs text-muted-foreground ml-1.5">— {responsibleMap.get(r.respId)}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] h-4">{Number(r.perc || 0)}%</Badge>
                                <span className="font-semibold text-xs">{formatCurrency(Number(r.valor || 0))}</span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Indicadores Gerenciais */}
                    <Card>
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
                          <BarChart3 className="h-3 w-3" />Indicadores Gerenciais
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="rounded border p-2">
                            <p className="text-sm font-bold text-green-600">
                              {order.valor_total > 0 ? ((1 - totalCompromissos / order.valor_total) * 100).toFixed(1) : 0}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">Margem Est.</p>
                          </div>
                          <div className="rounded border p-2">
                            <p className="text-sm font-bold">{formatCurrency(order.valor_total - totalCompromissos)}</p>
                            <p className="text-[10px] text-muted-foreground">Receita Líquida</p>
                          </div>
                          <div className="rounded border p-2">
                            <p className="text-sm font-bold text-blue-600">{formatCurrency(financialSummary.pending)}</p>
                            <p className="text-[10px] text-muted-foreground">Impacto Financeiro</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Observações */}
                    {(order.observacoes_internas || order.observacoes_nf) && (
                      <Card>
                        <CardHeader className="py-2 px-3">
                          <CardTitle className="text-xs text-muted-foreground uppercase">Observações</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 space-y-2 text-sm">
                          {order.observacoes_nf && (
                            <div>
                              <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">Obs. Cliente / NF</p>
                              <p className="text-muted-foreground whitespace-pre-wrap">{order.observacoes_nf}</p>
                            </div>
                          )}
                          {order.observacoes_internas && (
                            <div>
                              <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">Obs. Interna</p>
                              <p className="text-muted-foreground whitespace-pre-wrap">{order.observacoes_internas}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Ações de cancelamento */}
                    <div className="flex gap-2">
                      {['rascunho', 'em_negociacao', 'aprovado', 'liberado_producao'].includes(order.status) && (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10 text-xs h-7" onClick={() => setCancelOpen(true)}>
                          Cancelar Pedido
                        </Button>
                      )}
                      {isMaster && (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10 text-xs h-7" onClick={() => setDeleteOpen(true)}>
                          <Trash2 className="h-3 w-3 mr-1" />Excluir
                        </Button>
                      )}
                      {order.status === 'cancelado' && isMaster && (
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleStatusChange('rascunho')} disabled={loading}>
                          Reabrir como Rascunho
                        </Button>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Tab: Itens ── */}
                  <TabsContent value="itens" className="mt-0">
                    <OrderItemsAndExtras orderId={orderId} tenantId={order.tenant_id} />
                  </TabsContent>

                  {/* ── Tab: Financeiro ── */}
                  <TabsContent value="financeiro" className="space-y-3 mt-0">
                    {/* Parcelas */}
                    <Card>
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs text-muted-foreground uppercase flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Wallet className="h-3 w-3" />Contas Geradas</span>
                          <Badge variant="secondary" className="text-[10px]">{financialSummary.count} parcela(s)</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        {financialEntries && financialEntries.length > 0 ? (
                          <div className="space-y-1.5">
                            {financialEntries.filter(e => e.type === 'receita').map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between text-sm rounded border px-2.5 py-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    ['pago', 'recebido', 'conciliado'].includes(entry.status || '') ? 'bg-green-500' : 'bg-amber-500'
                                  }`} />
                                  <div>
                                    <p className="text-xs font-medium truncate max-w-[200px]">{entry.description || 'Parcela'}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      Comp: {entry.competence_date ? format(parseDateOnly(entry.competence_date)!, 'dd/MM/yyyy') : '—'}
                                      {entry.cash_date && ` • Pago: ${format(parseDateOnly(entry.cash_date)!, 'dd/MM/yyyy')}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-xs">{formatCurrency(Number(entry.amount))}</p>
                                  <Badge variant="outline" className="text-[9px] h-4">{entry.status}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conta gerada</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Resumo financeiro */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded border p-2.5 text-center bg-muted/30">
                        <p className="text-sm font-bold">{financialSummary.count}</p>
                        <p className="text-[10px] text-muted-foreground">Total Parcelas</p>
                      </div>
                      <div className="rounded border p-2.5 text-center bg-green-50 dark:bg-green-950/20">
                        <p className="text-sm font-bold text-green-600">{financialSummary.receivedCount}</p>
                        <p className="text-[10px] text-muted-foreground">Recebidas</p>
                      </div>
                      <div className="rounded border p-2.5 text-center bg-amber-50 dark:bg-amber-950/20">
                        <p className="text-sm font-bold text-amber-600">{financialSummary.pendingCount}</p>
                        <p className="text-[10px] text-muted-foreground">Pendentes</p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── Tab: Entrega ── */}
                  <TabsContent value="entrega" className="space-y-3 mt-0">
                    <Card>
                      <CardContent className="p-3 space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Tipo</p>
                            <p className="font-medium">{order.tipo_entrega === 'entrega' ? 'Entrega' : order.tipo_entrega === 'retirada' ? 'Retirada' : 'Transportadora'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Previsão</p>
                            <p className="font-medium flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {order.data_entrega_prevista ? format(parseDateOnly(order.data_entrega_prevista)!, 'dd/MM/yyyy') : '—'}
                            </p>
                          </div>
                        </div>
                        {order.data_entrega_realizada && (
                          <p className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle className="h-3 w-3" />
                            Entregue em: {format(parseDateOnly(order.data_entrega_realizada)!, 'dd/MM/yyyy')}
                          </p>
                        )}
                        <Separator />
                        <div className="flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-1" />
                          <div className="text-xs">
                            {order.entrega_mesmo_endereco ? (
                              <p>Mesmo endereço do cliente</p>
                            ) : (
                              <>
                                <p>{order.entrega_logradouro}, {order.entrega_numero}</p>
                                {order.entrega_complemento && <p>{order.entrega_complemento}</p>}
                                <p>{order.entrega_bairro} - {order.entrega_cidade}/{order.entrega_uf}</p>
                                <p>CEP: {order.entrega_cep}</p>
                              </>
                            )}
                          </div>
                        </div>
                        {order.entrega_observacoes && (
                          <>
                            <Separator />
                            <p className="text-xs text-muted-foreground">{order.entrega_observacoes}</p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* ─── TIMELINE SIDEBAR ─── */}
              <div className="w-[220px] border-l p-3 space-y-3 hidden lg:block">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Timeline</p>
                <ScrollArea className="h-[calc(100vh-350px)]">
                  <div className="space-y-2.5">
                    {history?.map((h) => (
                      <div key={h.id} className="flex gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                          <div className="w-px flex-1 bg-border" />
                        </div>
                        <div className="pb-2">
                          <p className="text-[11px] font-medium leading-tight">{h.description}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {h.user?.full_name || 'Sistema'}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!history || history.length === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum histórico</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <EditOrderDialog orderId={orderId} open={editOpen} onOpenChange={setEditOpen} onSuccess={() => { refetch(); onUpdate(); }} />
      <OrderExportDialog order={order} items={items || []} open={exportOpen} onOpenChange={setExportOpen} />
      <CancelOrderDialog orderId={orderId} orderNumber={order?.order_number || 0} open={cancelOpen} onOpenChange={setCancelOpen} onSuccess={() => { refetch(); onUpdate(); }} />
      <DeleteOrderDialog orderId={orderId} orderNumber={order?.order_number || 0} open={deleteOpen} onOpenChange={setDeleteOpen} onSuccess={() => { onOpenChange(false); onUpdate(); }} />
    </>
  );
}
