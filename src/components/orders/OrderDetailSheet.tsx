import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { OrderItemsTable } from './OrderItemsTable';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User, Building2, Phone, Mail, MapPin, Calendar, DollarSign,
  Truck, FileText, Clock, CheckCircle, AlertCircle, Loader2, Factory
} from 'lucide-react';

interface OrderDetailSheetProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-500', icon: FileText },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'bg-yellow-500', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-green-500', icon: CheckCircle },
  em_producao: { label: 'Em Produção', color: 'bg-purple-500', icon: Factory },
  faturado: { label: 'Faturado', color: 'bg-blue-500', icon: FileText },
  entregue: { label: 'Entregue', color: 'bg-teal-500', icon: Truck },
  cancelado: { label: 'Cancelado', color: 'bg-red-500', icon: AlertCircle },
};

export function OrderDetailSheet({ orderId, open, onOpenChange, onUpdate }: OrderDetailSheetProps) {
  const { isMaster } = usePermissions();
  const [loading, setLoading] = useState(false);

  const { data: order, refetch } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(*),
          vendedor:profiles!orders_vendedor_id_fkey(id, full_name, email),
          architect:architects(id, name, company),
          deal:crm_deals(id, title),
          approved_by_user:profiles!orders_approved_by_fkey(id, full_name)
        `)
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

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
        .select(`
          *,
          user:profiles!order_history_created_by_fkey(full_name)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'aprovado') {
        updates.data_aprovacao = new Date().toISOString();
        updates.approved_by = (await supabase.auth.getUser()).data.user?.id;
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

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
    if (!items || items.length === 0) {
      toast.error('Pedido não possui itens');
      return;
    }

    setLoading(true);
    try {
      // Get production types
      const { data: productionTypes } = await supabase
        .from('production_types')
        .select('id')
        .eq('active', true)
        .limit(1);

      if (!productionTypes || productionTypes.length === 0) {
        toast.error('Nenhum tipo de produção configurado');
        return;
      }

      const productionTypeId = productionTypes[0].id;

      // Create production orders for each item
      for (const item of items) {
        const { data: op, error } = await supabase
          .from('production_orders')
          .insert({
            title: `${item.descricao} - Pedido #${order?.order_number}`,
            production_type_id: productionTypeId,
            deal_id: order?.deal_id,
            client_id: order?.client_id,
            value: item.valor_total,
            status: 'aguardando',
            notes: item.especificacoes,
          })
          .select()
          .single();

        if (error) throw error;

        // Link item to production order
        await supabase
          .from('order_items')
          .update({ production_order_id: op.id })
          .eq('id', item.id);
      }

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'em_producao' })
        .eq('id', orderId);

      toast.success('Ordens de produção criadas com sucesso!');
      refetch();
      onUpdate();
    } catch (error: any) {
      toast.error('Erro ao criar ordens de produção: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-500', icon: FileText };
  const StatusIcon = statusConfig.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              Pedido #{order.order_number}
              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            </SheetTitle>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Info</TabsTrigger>
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
              <CardContent className="py-2 space-y-1 text-sm">
                <p className="font-medium">{order.client?.name || 'Sem cliente'}</p>
                {order.client?.cpf_cnpj && <p className="text-muted-foreground">CPF/CNPJ: {order.client.cpf_cnpj}</p>}
                {order.client?.phone && (
                  <p className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {order.client.phone}
                  </p>
                )}
                {order.client?.email && (
                  <p className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {order.client.email}
                  </p>
                )}
              </CardContent>
            </Card>

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
                  <FileText className="h-4 w-4" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-1 text-sm">
                <p>Forma: {order.forma_pagamento || 'Não definida'}</p>
                <p>Condição: {order.condicao_pagamento || 'Não definida'}</p>
              </CardContent>
            </Card>

            {/* Ações */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Ações</CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                {order.status === 'rascunho' && (
                  <Button
                    className="w-full"
                    onClick={() => handleStatusChange('aguardando_aprovacao')}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enviar para Aprovação
                  </Button>
                )}

                {order.status === 'aguardando_aprovacao' && isMaster && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleStatusChange('aprovado')}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleStatusChange('cancelado')}
                      disabled={loading}
                    >
                      Rejeitar
                    </Button>
                  </div>
                )}

                {order.status === 'aprovado' && (
                  <Button
                    className="w-full"
                    onClick={handleCreateProductionOrders}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Factory className="h-4 w-4 mr-2" />
                    Criar Ordens de Produção
                  </Button>
                )}

                {order.status === 'em_producao' && (
                  <Button
                    className="w-full"
                    onClick={() => handleStatusChange('faturado')}
                    disabled={loading}
                  >
                    Marcar como Faturado
                  </Button>
                )}

                {order.status === 'faturado' && (
                  <Button
                    className="w-full"
                    onClick={() => handleStatusChange('entregue')}
                    disabled={loading}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Marcar como Entregue
                  </Button>
                )}
              </CardContent>
            </Card>
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
              })) || []}
              onItemsChange={() => {}}
              readOnly
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
                
                {order.data_entrega_prevista && (
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Previsão: {format(new Date(order.data_entrega_prevista), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                )}

                {order.data_entrega_realizada && (
                  <p className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Entregue em: {format(new Date(order.data_entrega_realizada), 'dd/MM/yyyy', { locale: ptBR })}
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
  );
}
