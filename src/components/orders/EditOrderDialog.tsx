import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { OrderItemsTable } from './OrderItemsTable';
import { AddressForm } from './AddressForm';
import { Loader2, Building2, FileText, User } from 'lucide-react';

interface EditOrderDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface OrderItem {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  especificacoes?: string;
  codigo_produto?: string;
  ncm?: string;
  cfop?: string;
  unidade?: string;
}

export function EditOrderDialog({ orderId, open, onOpenChange, onSuccess }: EditOrderDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cliente');
  
  const [formData, setFormData] = useState({
    client_id: '',
    deal_id: '',
    architect_id: '',
    forma_pagamento: '',
    condicao_pagamento: '',
    data_entrega_prevista: '',
    tipo_entrega: 'entrega',
    entrega_mesmo_endereco: true,
    entrega_cep: '',
    entrega_logradouro: '',
    entrega_numero: '',
    entrega_complemento: '',
    entrega_bairro: '',
    entrega_cidade: '',
    entrega_uf: '',
    entrega_observacoes: '',
    observacoes_internas: '',
    observacoes_nf: '',
    desconto_percentual: 0,
    desconto_valor: 0,
    valor_frete: 0,
    transportadora_nome: '',
    transportadora_cnpj: '',
  });

  const [items, setItems] = useState<OrderItem[]>([]);

  const { data: order, refetch } = useQuery({
    queryKey: ['order-for-edit', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && open,
  });

  const { data: orderItems } = useQuery({
    queryKey: ['order-items-for-edit', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('position');
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && open,
  });

  useEffect(() => {
    if (order) {
      setFormData({
        client_id: order.client_id || '',
        deal_id: order.deal_id || '',
        architect_id: order.architect_id || '',
        forma_pagamento: order.forma_pagamento || '',
        condicao_pagamento: order.condicao_pagamento || '',
        data_entrega_prevista: order.data_entrega_prevista?.split('T')[0] || '',
        tipo_entrega: order.tipo_entrega || 'entrega',
        entrega_mesmo_endereco: order.entrega_mesmo_endereco ?? true,
        entrega_cep: order.entrega_cep || '',
        entrega_logradouro: order.entrega_logradouro || '',
        entrega_numero: order.entrega_numero || '',
        entrega_complemento: order.entrega_complemento || '',
        entrega_bairro: order.entrega_bairro || '',
        entrega_cidade: order.entrega_cidade || '',
        entrega_uf: order.entrega_uf || '',
        entrega_observacoes: order.entrega_observacoes || '',
        observacoes_internas: order.observacoes_internas || '',
        observacoes_nf: order.observacoes_nf || '',
        desconto_percentual: order.desconto_percentual || 0,
        desconto_valor: order.desconto_valor || 0,
        valor_frete: order.valor_frete || 0,
        transportadora_nome: order.transportadora_nome || '',
        transportadora_cnpj: order.transportadora_cnpj || '',
      });
    }
  }, [order]);

  useEffect(() => {
    if (orderItems) {
      setItems(orderItems.map(i => ({
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
      })));
    }
  }, [orderItems]);

  const { data: clients } = useQuery({
    queryKey: ['clients-for-order'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('*').order('name');
      return data || [];
    },
  });

  const { data: architects } = useQuery({
    queryKey: ['architects-for-order'],
    queryFn: async () => {
      const { data } = await supabase.from('architects').select('id, name, company').eq('active', true).order('name');
      return data || [];
    },
  });

  const { data: paymentConditions } = useQuery({
    queryKey: ['payment-conditions'],
    queryFn: async () => {
      const { data } = await supabase.from('payment_conditions').select('*').eq('ativo', true).order('nome');
      return data || [];
    },
  });

  const selectedClient = clients?.find(c => c.id === formData.client_id);

  const subtotal = items.reduce((sum, item) => sum + item.valor_total, 0);
  const descontoPerc = subtotal * (formData.desconto_percentual / 100);
  const descontoTotal = descontoPerc + Number(formData.desconto_valor || 0);
  const total = subtotal - descontoTotal + Number(formData.valor_frete || 0);

  const isEditable = order?.status === 'rascunho' || order?.status === 'aguardando_aprovacao';

  const handleSubmit = async () => {
    if (!isEditable) {
      toast.error('Pedido não pode ser editado neste status');
      return;
    }

    setLoading(true);
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          client_id: formData.client_id,
          deal_id: formData.deal_id || null,
          architect_id: formData.architect_id || null,
          forma_pagamento: formData.forma_pagamento,
          condicao_pagamento: formData.condicao_pagamento,
          data_entrega_prevista: formData.data_entrega_prevista || null,
          tipo_entrega: formData.tipo_entrega,
          entrega_mesmo_endereco: formData.entrega_mesmo_endereco,
          entrega_cep: formData.entrega_mesmo_endereco ? null : formData.entrega_cep,
          entrega_logradouro: formData.entrega_mesmo_endereco ? null : formData.entrega_logradouro,
          entrega_numero: formData.entrega_mesmo_endereco ? null : formData.entrega_numero,
          entrega_complemento: formData.entrega_mesmo_endereco ? null : formData.entrega_complemento,
          entrega_bairro: formData.entrega_mesmo_endereco ? null : formData.entrega_bairro,
          entrega_cidade: formData.entrega_mesmo_endereco ? null : formData.entrega_cidade,
          entrega_uf: formData.entrega_mesmo_endereco ? null : formData.entrega_uf,
          entrega_observacoes: formData.entrega_observacoes,
          observacoes_internas: formData.observacoes_internas,
          observacoes_nf: formData.observacoes_nf,
          desconto_percentual: formData.desconto_percentual,
          desconto_valor: formData.desconto_valor,
          valor_frete: formData.valor_frete,
          transportadora_nome: formData.transportadora_nome,
          transportadora_cnpj: formData.transportadora_cnpj,
          subtotal,
          valor_total: total,
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Delete existing items and recreate
      await supabase.from('order_items').delete().eq('order_id', orderId);

      const itemsToInsert = items.map((item, index) => ({
        order_id: orderId,
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

      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      toast.success('Pedido atualizado com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error('Erro ao atualizar pedido: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Pedido #{order.order_number}
            {!isEditable && <Badge variant="destructive">Bloqueado para edição</Badge>}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cliente">Cliente</TabsTrigger>
            <TabsTrigger value="itens">Itens</TabsTrigger>
            <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
            <TabsTrigger value="entrega">Entrega</TabsTrigger>
          </TabsList>

          <TabsContent value="cliente" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })} disabled={!isEditable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.cpf_cnpj && `(${client.cpf_cnpj})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Arquiteto</Label>
                <Select value={formData.architect_id || "none"} onValueChange={(v) => setFormData({ ...formData, architect_id: v === "none" ? "" : v })} disabled={!isEditable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o arquiteto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem arquiteto</SelectItem>
                    {architects?.map((arch) => (
                      <SelectItem key={arch.id} value={arch.id}>
                        {arch.name} {arch.company && `- ${arch.company}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedClient && (
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{selectedClient.name}</span>
                    {selectedClient.tipo_pessoa && (
                      <Badge variant="outline">{selectedClient.tipo_pessoa === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">CPF/CNPJ</p>
                      <p className="font-mono">{selectedClient.cpf_cnpj || '-'}</p>
                    </div>
                    {selectedClient.tipo_pessoa === 'pj' && (
                      <>
                        <div>
                          <p className="text-muted-foreground">Razão Social</p>
                          <p>{selectedClient.razao_social || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Nome Fantasia</p>
                          <p>{selectedClient.nome_fantasia || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Inscrição Estadual</p>
                          <p className="font-mono">{selectedClient.inscricao_estadual || (selectedClient.isento_ie ? 'ISENTO' : '-')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Inscrição Municipal</p>
                          <p className="font-mono">{selectedClient.inscricao_municipal || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Contribuinte ICMS</p>
                          <p>{selectedClient.contribuinte_icms ? 'Sim' : 'Não'}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-muted-foreground">Telefone</p>
                      <p>{selectedClient.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p>{selectedClient.email || '-'}</p>
                    </div>
                  </div>

                  {(selectedClient.logradouro || selectedClient.city) && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground text-sm">Endereço</p>
                      <p className="text-sm">
                        {[selectedClient.logradouro, selectedClient.numero, selectedClient.complemento, selectedClient.bairro].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-sm">
                        {[selectedClient.city, selectedClient.state].filter(Boolean).join('/')} - CEP: {selectedClient.cep || '-'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="itens" className="space-y-4">
            <OrderItemsTable items={items} onItemsChange={setItems} readOnly={!isEditable} showFiscalFields />

            <div className="flex justify-end">
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Desconto (%):</span>
                  <Input type="number" className="w-20 h-8" value={formData.desconto_percentual} onChange={(e) => setFormData({ ...formData, desconto_percentual: Number(e.target.value) })} min={0} max={100} disabled={!isEditable} />
                  <span className="text-muted-foreground">-{formatCurrency(descontoPerc)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Desconto (R$):</span>
                  <Input type="number" className="w-24 h-8" value={formData.desconto_valor} onChange={(e) => setFormData({ ...formData, desconto_valor: Number(e.target.value) })} min={0} disabled={!isEditable} />
                </div>
                <div className="flex items-center gap-2">
                  <span>Frete:</span>
                  <Input type="number" className="w-24 h-8" value={formData.valor_frete} onChange={(e) => setFormData({ ...formData, valor_frete: Number(e.target.value) })} min={0} disabled={!isEditable} />
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pagamento" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={formData.forma_pagamento} onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v })} disabled={!isEditable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condição de Pagamento</Label>
                <Select value={formData.condicao_pagamento} onValueChange={(v) => setFormData({ ...formData, condicao_pagamento: v })} disabled={!isEditable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentConditions?.map((cond) => (
                      <SelectItem key={cond.id} value={cond.nome}>
                        {cond.nome} {cond.descricao && `- ${cond.descricao}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações para NF</Label>
              <Textarea value={formData.observacoes_nf} onChange={(e) => setFormData({ ...formData, observacoes_nf: e.target.value })} placeholder="Informações que aparecerão na nota fiscal..." rows={3} disabled={!isEditable} />
            </div>

            <div className="space-y-2">
              <Label>Observações Internas</Label>
              <Textarea value={formData.observacoes_internas} onChange={(e) => setFormData({ ...formData, observacoes_internas: e.target.value })} placeholder="Observações internas (não aparece na NF)..." rows={3} disabled={!isEditable} />
            </div>
          </TabsContent>

          <TabsContent value="entrega" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Entrega</Label>
                <Select value={formData.tipo_entrega} onValueChange={(v) => setFormData({ ...formData, tipo_entrega: v })} disabled={!isEditable}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrega">Entrega</SelectItem>
                    <SelectItem value="retirada">Retirada</SelectItem>
                    <SelectItem value="transportadora">Transportadora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data de Entrega Prevista</Label>
                <Input type="date" value={formData.data_entrega_prevista} onChange={(e) => setFormData({ ...formData, data_entrega_prevista: e.target.value })} disabled={!isEditable} />
              </div>
            </div>

            {formData.tipo_entrega === 'transportadora' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Transportadora</Label>
                  <Input value={formData.transportadora_nome} onChange={(e) => setFormData({ ...formData, transportadora_nome: e.target.value })} disabled={!isEditable} />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ da Transportadora</Label>
                  <Input value={formData.transportadora_cnpj} onChange={(e) => setFormData({ ...formData, transportadora_cnpj: e.target.value })} disabled={!isEditable} />
                </div>
              </div>
            )}

            {formData.tipo_entrega !== 'retirada' && (
              <>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.entrega_mesmo_endereco} onCheckedChange={(checked) => setFormData({ ...formData, entrega_mesmo_endereco: checked })} disabled={!isEditable} />
                  <Label>Mesmo endereço do cliente</Label>
                </div>

                {!formData.entrega_mesmo_endereco && (
                  <AddressForm
                    address={{
                      cep: formData.entrega_cep,
                      logradouro: formData.entrega_logradouro,
                      numero: formData.entrega_numero,
                      complemento: formData.entrega_complemento,
                      bairro: formData.entrega_bairro,
                      cidade: formData.entrega_cidade,
                      uf: formData.entrega_uf,
                    }}
                    onAddressChange={(addr) => setFormData({
                      ...formData,
                      entrega_cep: addr.cep,
                      entrega_logradouro: addr.logradouro,
                      entrega_numero: addr.numero,
                      entrega_complemento: addr.complemento,
                      entrega_bairro: addr.bairro,
                      entrega_cidade: addr.cidade,
                      entrega_uf: addr.uf,
                    })}
                    disabled={!isEditable}
                  />
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>Observações de Entrega</Label>
              <Textarea value={formData.entrega_observacoes} onChange={(e) => setFormData({ ...formData, entrega_observacoes: e.target.value })} placeholder="Instruções especiais de entrega..." rows={3} disabled={!isEditable} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !isEditable}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
