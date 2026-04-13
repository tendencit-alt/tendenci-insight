import { useState, useCallback, useEffect } from 'react';
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
import { OrderItemsTable } from './OrderItemsTable';
import { EditOrderDialog } from './EditOrderDialog';
import { OrderExportDialog } from './OrderExportDialog';
import { CancelOrderDialog } from './CancelOrderDialog';
import { DeleteOrderDialog } from './DeleteOrderDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/utils/timezone';
import {
  User, Building2, Phone, Mail, MapPin, Calendar, DollarSign,
  Truck, FileText, Clock, CheckCircle, AlertCircle, Loader2, Factory,
  Edit, Copy, Download, Printer, MessageSquare, ExternalLink, Trash2
} from 'lucide-react';
import { useMinimizedDialogs } from '@/contexts/MinimizedDialogsContext';
import { MinimizeButton } from '@/components/ui/MinimizeButton';

interface OrderDetailSheetProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-500', icon: FileText },
  ativo: { label: 'Ativo', color: 'bg-blue-500', icon: CheckCircle },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'bg-yellow-500', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-green-500', icon: CheckCircle },
  em_producao: { label: 'Em Produção', color: 'bg-purple-500', icon: Factory },
  faturado: { label: 'Faturado', color: 'bg-blue-500', icon: FileText },
  entregue: { label: 'Entregue', color: 'bg-teal-500', icon: Truck },
  cancelado: { label: 'Cancelado', color: 'bg-red-500', icon: AlertCircle },
};

export function OrderDetailSheet({ orderId, open, onOpenChange, onUpdate }: OrderDetailSheetProps) {
  const { isMaster } = usePermissions();
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
      restore: () => {
        setIsMinimized(false);
        onOpenChange(true);
      },
    });
  }, [minimizeDialog, onOpenChange, orderId, dialogId]);

  // Clean up minimized entry when dialog is closed normally
  useEffect(() => {
    if (!open && !isMinimized) {
      removeMinimized(dialogId);
    }
  }, [open, isMinimized, removeMinimized, dialogId]);

  const { data: order, refetch } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(*),
          vendedor:profiles!orders_vendedor_id_fkey(id, full_name, email),
          architect:architects(id, name, company, phone),
          deal:crm_deals(id, title, value),
          approved_by_user:profiles!orders_approved_by_fkey(id, full_name)
        `)
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch responsible names for comissões
  const responsibleIds = order ? [
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
      const { data } = await supabase
        .from('order_responsibles')
        .select('id, name')
        .in('id', responsibleIds);
      return data || [];
    },
    enabled: responsibleIds.length > 0,
  });

  const responsibleMap = new Map(responsibles?.map(r => [r.id, r.name]) || []);

  const { data: items } = useQuery({
    queryKey: ['order-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('position');
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

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

      toast.success(`Status alterado para ${STATUS_CONFIG[newStatus]?.label}`);
      refetch();
      onUpdate();
    } catch (error: any) {
      toast.error('Erro ao alterar status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProductionOrders = async () => {
    if (!order || !items || items.length === 0) {
      toast.error('Pedido não possui itens');
      return;
    }

    // Verificar se todos os itens têm centro de custo
    const itemsWithCentroCusto = items.filter(i => (i as any).centro_custo);
    if (itemsWithCentroCusto.length === 0) {
      toast.error('Nenhum item possui centro de custo definido');
      return;
    }

    setLoading(true);
    try {
      let createdCount = 0;

      for (const item of items) {
        const itemCentroCusto = (item as any).centro_custo;
        if (!itemCentroCusto) continue;

        // Buscar tipo de produção pelo nome do centro de custo (match dinâmico)
        const { data: productionType } = await supabase
          .from('production_types')
          .select('id, name')
          .ilike('name', `%${itemCentroCusto}%`)
          .eq('active', true)
          .maybeSingle();

        if (!productionType) continue;

        // Verificar se já existe OP para este item (simplificado)
        const { data: existingOps } = await supabase
          .from('production_orders')
          .select('id, order_id, order_item_id')
          .eq('order_id', orderId);

        const existingOp = existingOps?.find((op: any) => op.order_item_id === item.id);

        if (existingOp) continue;

        // Criar ordem de produção por item
        const { error: opError } = await supabase
          .from('production_orders')
          .insert({
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
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: order.client_id,
          deal_id: null, // Don't duplicate deal link
          architect_id: order.architect_id,
          vendedor_id: order.vendedor_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          forma_pagamento: order.forma_pagamento,
          condicao_pagamento: order.condicao_pagamento,
          tipo_entrega: order.tipo_entrega,
          entrega_mesmo_endereco: order.entrega_mesmo_endereco,
          entrega_cep: order.entrega_cep,
          entrega_logradouro: order.entrega_logradouro,
          entrega_numero: order.entrega_numero,
          entrega_complemento: order.entrega_complemento,
          entrega_bairro: order.entrega_bairro,
          entrega_cidade: order.entrega_cidade,
          entrega_uf: order.entrega_uf,
          entrega_observacoes: order.entrega_observacoes,
          observacoes_internas: order.observacoes_internas,
          observacoes_nf: order.observacoes_nf,
          desconto_percentual: order.desconto_percentual,
          desconto_valor: order.desconto_valor,
          valor_frete: order.valor_frete,
          subtotal: order.subtotal,
          valor_total: order.valor_total,
          status: 'rascunho',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = items.map((item, index) => ({
        order_id: newOrder.id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        especificacoes: item.especificacoes,
        codigo_produto: item.codigo_produto,
        ncm: item.ncm,
        cfop: item.cfop,
        unidade: item.unidade,
        position: index,
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

  if (!order) return null;

  const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-500', icon: FileText };
  const StatusIcon = statusConfig.icon;
  const canEdit = order.status === 'rascunho' || order.status === 'ativo' || order.status === 'aguardando_aprovacao' || order.status === 'em_producao';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                Pedido #{order.order_number}
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              </SheetTitle>
              <div className="flex items-center gap-2">
                <MinimizeButton onClick={handleMinimize} />
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setExportOpen(true)}>
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </Button>
                <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={loading}>
                  <Copy className="h-4 w-4 mr-1" />
                  Duplicar
                </Button>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
              <TabsTrigger value="itens">Itens</TabsTrigger>
              <TabsTrigger value="entrega">Entrega</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              {/* Cliente */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-2 text-sm">
                  <p className="font-medium">{order.client?.name || 'Sem cliente'}</p>
                  {order.client?.tipo_pessoa === 'pj' && order.client?.razao_social && (
                    <p className="text-muted-foreground">{order.client.razao_social}</p>
                  )}
                  {order.client?.cpf_cnpj && <p className="font-mono text-xs">CPF/CNPJ: {order.client.cpf_cnpj}</p>}
                  {order.client?.inscricao_estadual && (
                    <p className="font-mono text-xs">IE: {order.client.isento_ie ? 'ISENTO' : order.client.inscricao_estadual}</p>
                  )}
                  {order.client?.phone && (
                    <a href={`https://wa.me/55${order.client.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <Phone className="h-3 w-3" />
                      {order.client.phone}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {order.client?.email && (
                    <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{order.client.email}</p>
                  )}
                </CardContent>
              </Card>

              {/* Arquiteto */}
              {order.architect && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Arquiteto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-1 text-sm">
                    <p className="font-medium">{order.architect.name}</p>
                    {order.architect.company && <p className="text-muted-foreground">{order.architect.company}</p>}
                    {order.architect.phone && (
                      <a href={`https://wa.me/55${order.architect.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <Phone className="h-3 w-3" />
                        {order.architect.phone}
                      </a>
                    )}
                    
                    {/* RT - Repasse Técnico */}
                    {(order as any).rt_habilitado && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              RT {(order as any).rt_percentual}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">Repasse Técnico</span>
                          </div>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {formatCurrency((order as any).rt_valor)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Vendedor */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Vendedor
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-1 text-sm">
                  <p className="font-medium">{order.vendedor?.full_name || 'Não atribuído'}</p>
                  {order.vendedor?.email && <p className="text-muted-foreground">{order.vendedor.email}</p>}
                </CardContent>
              </Card>

              {/* Negócio Vinculado */}
              {order.deal && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Negócio Vinculado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-1 text-sm">
                    <p className="font-medium">{order.deal.title}</p>
                    {order.deal.value && <p className="text-muted-foreground">Valor: {formatCurrency(order.deal.value)}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Valores */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valores
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  {(order.desconto_percentual > 0 || order.desconto_valor > 0) && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Desconto {order.desconto_percentual > 0 && `(${order.desconto_percentual}%)`}:</span>
                      <span>-{formatCurrency(order.desconto_valor || (order.subtotal * order.desconto_percentual / 100))}</span>
                    </div>
                  )}
                  {order.valor_frete > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Frete:</span>
                      <span>{formatCurrency(order.valor_frete)}</span>
                    </div>
                  )}
                  {/* Breakdown de Taxas por Forma de Pagamento */}
                  {order.observacao_pagamento && (() => {
                    try {
                      const pagamentoInfo = JSON.parse(order.observacao_pagamento);
                      const parcelas = pagamentoInfo?.parcelas || [];
                      
                      const TAXAS_CARTAO: Record<number, number> = {
                        1: 2.8, 2: 3.95, 3: 4.69, 4: 5.41, 5: 6.13, 6: 6.84,
                        7: 7.3, 8: 8.0, 9: 8.9, 10: 9.38, 11: 10.05, 12: 10.72
                      };
                      
                      const parcelasCartao = parcelas.filter((p: any) => p.forma_pagamento === 'cartao_credito');
                      const parcelasBoleto = parcelas.filter((p: any) => p.forma_pagamento === 'boleto');
                      const totalBase = (order.subtotal || 0) - (order.desconto_valor || 0) + (order.valor_frete || 0);
                      
                      return (
                        <>
                          {/* Breakdown de Cartões */}
                          {parcelasCartao.length > 0 && (
                            <div className="space-y-1">
                              {parcelasCartao.map((parcela: any, index: number) => {
                                const taxaPerc = TAXAS_CARTAO[parcela.numero_parcelas] || 0;
                                const valorBase = totalBase * (parcela.percentual / 100);
                                const taxaValor = valorBase * (taxaPerc / 100);
                                
                                return (
                                  <div 
                                    key={index}
                                    className={`flex justify-between items-center text-xs ${
                                      order.taxa_cartao_responsavel === 'tendenci' ? 'text-muted-foreground' : 'text-amber-600'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1">
                                      💳 Cartão {parcela.numero_parcelas}x ({parcela.percentual}% do pedido) - {taxaPerc}%
                                    </span>
                                    <span className={order.taxa_cartao_responsavel === 'tendenci' ? 'line-through' : ''}>
                                      {formatCurrency(taxaValor)}
                                    </span>
                                  </div>
                                );
                              })}
                              {parcelasCartao.length > 1 && (
                                <div className={`flex justify-between items-center font-medium ${
                                  order.taxa_cartao_responsavel === 'tendenci' ? 'text-muted-foreground' : 'text-amber-600'
                                }`}>
                                  <span className="flex items-center gap-2">
                                    Total Taxas Cartão:
                                    <Badge 
                                      variant={order.taxa_cartao_responsavel === 'cliente' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {order.taxa_cartao_responsavel === 'cliente' ? 'Cliente paga' : 'Tendenci absorve'}
                                    </Badge>
                                  </span>
                                  <span className={order.taxa_cartao_responsavel === 'tendenci' ? 'line-through' : ''}>
                                    {formatCurrency(order.taxa_cartao_valor)}
                                  </span>
                                </div>
                              )}
                              {parcelasCartao.length === 1 && (
                                <div className={`flex justify-between items-center ${
                                  order.taxa_cartao_responsavel === 'tendenci' ? 'text-muted-foreground' : 'text-amber-600'
                                }`}>
                                  <Badge 
                                    variant={order.taxa_cartao_responsavel === 'cliente' ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {order.taxa_cartao_responsavel === 'cliente' ? 'Cliente paga' : 'Tendenci absorve'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Breakdown de Boletos */}
                          {parcelasBoleto.length > 0 && (
                            <div className="space-y-1">
                              {parcelasBoleto.map((parcela: any, index: number) => {
                                const taxaPerc = (order as any).taxa_boleto_percentual || 0;
                                const valorBase = totalBase * (parcela.percentual / 100);
                                const taxaValor = valorBase * (taxaPerc / 100);
                                
                                  return (
                                  <div 
                                    key={index}
                                    className="flex justify-between items-center text-xs text-muted-foreground"
                                  >
                                    <span className="flex items-center gap-1">
                                      📄 Boleto {parcela.numero_parcelas}x / {parcela.carencia_dias}d ({parcela.percentual}% do pedido) - {taxaPerc}%
                                    </span>
                                    <span className="line-through">
                                      {formatCurrency(taxaValor)}
                                    </span>
                                  </div>
                                );
                              })}
                              {parcelasBoleto.length > 1 && (
                                <div className="flex justify-between items-center font-medium text-muted-foreground">
                                  <span className="flex items-center gap-2">
                                    Total Taxas Boleto:
                                    <span className="text-xs text-green-600">✓ Tendenci absorve</span>
                                  </span>
                                  <span className="line-through">
                                    {formatCurrency((order as any).taxa_boleto_valor)}
                                  </span>
                                </div>
                              )}
                              {parcelasBoleto.length === 1 && (
                                <div className="flex justify-between items-center text-muted-foreground">
                                  <span className="text-xs text-green-600">✓ Tendenci absorve</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    } catch {
                      // Fallback para exibição antiga se JSON inválido
                      return (
                        <>
                          {order.taxa_cartao_valor > 0 && (
                            <div className={`flex justify-between items-center ${order.taxa_cartao_responsavel === 'tendenci' ? 'text-muted-foreground' : 'text-amber-600'}`}>
                              <span className="flex items-center gap-2">
                                Taxa Cartão {order.numero_parcelas_cartao}x ({order.taxa_cartao_percentual}%):
                                <Badge 
                                  variant={order.taxa_cartao_responsavel === 'cliente' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {order.taxa_cartao_responsavel === 'cliente' ? 'Cliente paga' : 'Tendenci absorve'}
                                </Badge>
                              </span>
                              <span className={order.taxa_cartao_responsavel === 'tendenci' ? 'line-through' : ''}>
                                {formatCurrency(order.taxa_cartao_valor)}
                              </span>
                            </div>
                          )}
                          {(order as any).taxa_boleto_valor > 0 && (
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span className="flex items-center gap-2">
                                Taxa Boleto {(order as any).carencia_boleto}d / {(order as any).numero_parcelas_boleto}x ({(order as any).taxa_boleto_percentual}%):
                                <span className="text-xs text-green-600">✓ Tendenci absorve</span>
                              </span>
                              <span className="line-through">
                                {formatCurrency((order as any).taxa_boleto_valor)}
                              </span>
                            </div>
                          )}
                        </>
                      );
                    }
                  })()}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(order.valor_total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Pagamento */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-2 text-sm">
                  {(() => {
                    const FORMAS_MAP: Record<string, string> = {
                      pix: 'PIX', cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito',
                      link_pagamento: 'Link de Pagamento', boleto: 'Boleto', transferencia: 'Transferência',
                      permuta: 'Permuta', dinheiro: 'Dinheiro',
                    };

                    let parcelas: any[] = [];
                    try {
                      if (order.observacao_pagamento) {
                        const info = JSON.parse(order.observacao_pagamento);
                        parcelas = info?.parcelas || [];
                      }
                    } catch {}

                    if (parcelas.length > 0) {
                      return (
                        <div className="space-y-2">
                          {parcelas.map((p: any, i: number) => (
                            <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {FORMAS_MAP[p.forma_pagamento] || p.forma_pagamento}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {p.percentual}%
                                </Badge>
                              </div>
                              {p.numero_parcelas && (
                                <p className="text-xs text-muted-foreground">
                                  {p.numero_parcelas}x parcela{p.numero_parcelas > 1 ? 's' : ''}
                                  {p.carencia_dias ? ` · Carência ${p.carencia_dias} dias` : ''}
                                </p>
                              )}
                              {p.data_vencimento && (
                                <p className="text-xs text-muted-foreground">
                                  Vencimento: {format(parseDateOnly(p.data_vencimento), "dd/MM/yyyy")}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // Fallback: show forma_pagamento fields
                    return (
                      <div className="space-y-1">
                        <p>Forma: {FORMAS_MAP[order.forma_pagamento] || order.forma_pagamento || 'Não definida'}</p>
                        {order.forma_pagamento_2 && (
                          <p>Forma 2: {FORMAS_MAP[order.forma_pagamento_2] || order.forma_pagamento_2}</p>
                        )}
                        <p>Condição: {order.condicao_pagamento || 'Não definida'}</p>
                      </div>
                    );
                  })()}
                  {order.observacoes_nf && (
                    <>
                      <Separator className="my-2" />
                      <p className="text-muted-foreground"><strong>Obs. NF:</strong> {order.observacoes_nf}</p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Compromissos Sobre Venda */}
              {(() => {
                const o = order as any;
                const recursos = [
                  { label: 'RT', perc: o.rt_percentual, valor: o.rt_valor, respId: null, habilitado: o.rt_habilitado },
                  { label: 'Vendedor', perc: o.comissao_vendedor_percentual, valor: o.comissao_vendedor_valor, respId: o.comissao_vendedor_responsible_id || o.comissao_vendedor_responsavel_id },
                  { label: 'Orçamentista', perc: o.comissao_orcamentista_percentual, valor: o.comissao_orcamentista_valor, respId: o.comissao_orcamentista_responsible_id || o.comissao_orcamentista_responsavel_id },
                  { label: 'Projetista', perc: o.comissao_projetista_percentual, valor: o.comissao_projetista_valor, respId: o.comissao_projetista_responsible_id || o.comissao_projetista_responsavel_id },
                  { label: 'Montador', perc: o.comissao_montador_percentual, valor: o.comissao_montador_valor, respId: o.comissao_montador_responsible_id || o.comissao_montador_responsavel_id },
                  { label: 'Produção', perc: o.comissao_producao_percentual, valor: o.comissao_producao_valor, respId: o.comissao_producao_responsible_id || o.comissao_producao_responsavel_id },
                ];
                const ativos = recursos.filter(r => (r.valor > 0 || r.perc > 0) || r.habilitado);
                if (ativos.length === 0) return null;

                return (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Compromissos Sobre Venda
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 space-y-2 text-sm">
                      {ativos.map((r) => (
                        <div key={r.label} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                          <div>
                            <span className="font-medium">{r.label}</span>
                            {r.respId && responsibleMap.get(r.respId) && (
                              <span className="text-xs text-muted-foreground ml-2">
                                — {responsibleMap.get(r.respId)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{r.perc || 0}%</Badge>
                            <span className="font-semibold">{formatCurrency(r.valor || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Observações */}
              {order.observacoes_internas && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Observações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {order.observacoes_internas}
                  </CardContent>
                </Card>
              )}

              {/* Ações */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Ações</CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-2">
                  {order.status === 'rascunho' && (
                    <Button className="w-full" onClick={() => handleStatusChange('aguardando_aprovacao')} disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Enviar para Aprovação
                    </Button>
                  )}

                  {order.status === 'aguardando_aprovacao' && isMaster && (
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => handleStatusChange('aprovado')} disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Aprovar
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => setCancelOpen(true)} disabled={loading}>
                        Rejeitar
                      </Button>
                    </div>
                  )}

                  {(order.status === 'rascunho' || order.status === 'aguardando_aprovacao') && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-3 text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => setCancelOpen(true)}
                    >
                      Cancelar Pedido
                    </Button>
                  )}

                  {isMaster && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-3 text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Pedido
                    </Button>
                  )}

                  {order.status === 'aprovado' && (
                    <Button className="w-full" onClick={handleCreateProductionOrders} disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Factory className="h-4 w-4 mr-2" />
                      Criar Ordens de Produção
                    </Button>
                  )}

                  {order.status === 'em_producao' && (
                    <Button className="w-full" onClick={() => handleStatusChange('faturado')} disabled={loading}>
                      Marcar como Faturado
                    </Button>
                  )}

                  {order.status === 'faturado' && (
                    <Button className="w-full" onClick={() => handleStatusChange('entregue')} disabled={loading}>
                      <Truck className="h-4 w-4 mr-2" />
                      Marcar como Entregue
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pagamento" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Formas de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-3 text-sm">
                  {(() => {
                    const FORMAS_MAP: Record<string, string> = {
                      pix: 'PIX', cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito',
                      link_pagamento: 'Link de Pagamento', boleto: 'Boleto', transferencia: 'Transferência',
                      permuta: 'Permuta', dinheiro: 'Dinheiro',
                    };

                    let parcelas: any[] = [];
                    try {
                      if (order.observacao_pagamento) {
                        const parsed = JSON.parse(order.observacao_pagamento);
                        if (Array.isArray(parsed)) parcelas = parsed;
                        else if (parsed?.parcelas) parcelas = parsed.parcelas;
                      }
                    } catch {}

                    if (parcelas.length === 0) {
                      parcelas = [
                        {
                          id: '1',
                          forma_pagamento: order.forma_pagamento,
                          percentual: order.percentual_forma_1 || (order.forma_pagamento ? 100 : 0),
                          data_vencimento: order.data_primeiro_vencimento,
                          numero_parcelas: order.parcelas || 1,
                        },
                        order.forma_pagamento_2 ? {
                          id: '2',
                          forma_pagamento: order.forma_pagamento_2,
                          percentual: order.percentual_forma_2 || 0,
                          data_vencimento: null,
                          numero_parcelas: 1,
                        } : null,
                      ].filter(Boolean);
                    }

                    return (
                      <div className="space-y-3">
                        {parcelas.map((parcela: any, index: number) => (
                          <div key={parcela.id || index} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">{FORMAS_MAP[parcela.forma_pagamento] || parcela.forma_pagamento || 'Não definida'}</p>
                                {index === 0 && parcelas.length > 1 && (
                                  <p className="text-xs text-muted-foreground">Entrada</p>
                                )}
                              </div>
                              <Badge variant="secondary" className="text-xs">{Number(parcela.percentual || 0).toFixed(2)}%</Badge>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
                              <div>
                                <span className="block">Parcelas</span>
                                <strong className="text-foreground">{parcela.numero_parcelas || 1}x</strong>
                              </div>
                              <div>
                                <span className="block">Vencimento</span>
                                <strong className="text-foreground">
                                  {parcela.data_vencimento ? format(parseDateOnly(parcela.data_vencimento), 'dd/MM/yyyy') : '—'}
                                </strong>
                              </div>
                              <div>
                                <span className="block">Valor estimado</span>
                                <strong className="text-foreground">
                                  {formatCurrency(((order.subtotal || 0) - (order.desconto_valor || 0) + (order.valor_frete || 0)) * ((Number(parcela.percentual || 0)) / 100))}
                                </strong>
                              </div>
                            </div>
                            {parcela.forma_pagamento === 'boleto' && (
                              <p className="text-xs text-muted-foreground">Carência: {parcela.carencia_boleto || parcela.carencia_dias || 30} dias</p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {order.condicao_pagamento && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Condição de pagamento</p>
                      <p className="font-medium">{order.condicao_pagamento}</p>
                    </div>
                  )}

                  {typeof order.observacao_pagamento === 'string' && order.observacao_pagamento && !order.observacao_pagamento.trim().startsWith('[') && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Observação de pagamento</p>
                      <p className="whitespace-pre-wrap">{order.observacao_pagamento}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(() => {
                const o = order as any;
                const recursos = [
                  { label: 'RT', perc: o.rt_percentual, valor: o.rt_valor, respId: null, habilitado: o.rt_habilitado },
                  { label: 'Vendedor', perc: o.comissao_vendedor_percentual, valor: o.comissao_vendedor_valor, respId: o.comissao_vendedor_responsible_id || o.comissao_vendedor_responsavel_id },
                  { label: 'Orçamentista', perc: o.comissao_orcamentista_percentual, valor: o.comissao_orcamentista_valor, respId: o.comissao_orcamentista_responsible_id || o.comissao_orcamentista_responsavel_id },
                  { label: 'Projetista', perc: o.comissao_projetista_percentual, valor: o.comissao_projetista_valor, respId: o.comissao_projetista_responsible_id || o.comissao_projetista_responsavel_id },
                  { label: 'Montador', perc: o.comissao_montador_percentual, valor: o.comissao_montador_valor, respId: o.comissao_montador_responsible_id || o.comissao_montador_responsavel_id },
                  { label: 'Produção', perc: o.comissao_producao_percentual, valor: o.comissao_producao_valor, respId: o.comissao_producao_responsible_id || o.comissao_producao_responsavel_id },
                ];
                const ativos = recursos.filter(r => (Number(r.valor || 0) > 0 || Number(r.perc || 0) > 0) || r.habilitado);
                if (ativos.length === 0) return null;

                return (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Compromissos Sobre Venda
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 space-y-2 text-sm">
                      {ativos.map((r) => (
                        <div key={r.label} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 gap-3">
                          <div>
                            <p className="font-medium">{r.label}</p>
                            {r.respId && responsibleMap.get(r.respId) && (
                              <p className="text-xs text-muted-foreground">{responsibleMap.get(r.respId)}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-xs mb-1">{Number(r.perc || 0)}%</Badge>
                            <p className="font-semibold">{formatCurrency(Number(r.valor || 0))}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })()}

              {order.observacoes_internas && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Observações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {order.observacoes_internas}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="itens">
              <OrderItemsTable
                items={items?.map(i => ({
                  id: i.id,
                  descricao: i.descricao,
                  quantidade: Number(i.quantidade),
                  valor_unitario: Number(i.valor_unitario),
                  valor_total: Number(i.valor_total),
                  especificacoes: i.especificacoes || undefined,
                  codigo_produto: i.codigo_produto || undefined,
                  ncm: i.ncm || undefined,
                  cfop: i.cfop || undefined,
                  unidade: i.unidade || undefined,
                })) || []}
                onItemsChange={() => {}}
                readOnly
                showFiscalFields
              />
            </TabsContent>

            <TabsContent value="entrega" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-2 text-sm">
                  <p>Tipo: {order.tipo_entrega === 'entrega' ? 'Entrega' : order.tipo_entrega === 'retirada' ? 'Retirada' : 'Transportadora'}</p>
                  
                  {order.tipo_entrega === 'transportadora' && (order.transportadora_nome || order.transportadora_cnpj) && (
                    <div className="bg-muted/50 p-2 rounded">
                      <p className="font-medium">Transportadora: {order.transportadora_nome || '-'}</p>
                      {order.transportadora_cnpj && <p className="font-mono text-xs">CNPJ: {order.transportadora_cnpj}</p>}
                    </div>
                  )}

                  {order.data_entrega_prevista && (
                    <p className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Previsão: {format(parseDateOnly(order.data_entrega_prevista)!, 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  )}

                  {order.data_entrega_realizada && (
                    <p className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Entregue em: {format(parseDateOnly(order.data_entrega_realizada)!, 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  )}

                  <Separator />

                  <div className="flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-1" />
                    <div>
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
                      <p className="text-muted-foreground">{order.entrega_observacoes}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historico" className="space-y-2">
              {history?.map((h) => (
                <div key={h.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{h.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.user?.full_name || 'Sistema'} • {format(new Date(h.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
              {(!history || history.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Nenhum histórico</p>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <EditOrderDialog
        orderId={orderId}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          refetch();
          onUpdate();
        }}
      />

      <OrderExportDialog
        order={order}
        items={items || []}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />

      <CancelOrderDialog
        orderId={orderId}
        orderNumber={order?.order_number || 0}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSuccess={() => {
          refetch();
          onUpdate();
        }}
      />

      <DeleteOrderDialog
        orderId={orderId}
        orderNumber={order?.order_number || 0}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => {
          onOpenChange(false);
          onUpdate();
        }}
      />
    </>
  );
}
