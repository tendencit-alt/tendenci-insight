import { useState } from 'react';
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
import { toast } from 'sonner';
import { OrderItemsTable } from './OrderItemsTable';
import { AddressForm } from './AddressForm';
import { Loader2 } from 'lucide-react';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  dealId?: string;
  clientId?: string;
}

interface OrderItem {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  especificacoes?: string;
}

export function CreateOrderDialog({ open, onOpenChange, onSuccess, dealId, clientId }: CreateOrderDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cliente');
  
  const [formData, setFormData] = useState({
    client_id: clientId || '',
    deal_id: dealId || '',
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
    valor_frete: 0,
  });

  const [items, setItems] = useState<OrderItem[]>([]);

  const { data: clients } = useQuery({
    queryKey: ['clients-for-order'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      return data || [];
    },
  });

  const { data: architects } = useQuery({
    queryKey: ['architects-for-order'],
    queryFn: async () => {
      const { data } = await supabase
        .from('architects')
        .select('id, name, company')
        .eq('active', true)
        .order('name');
      return data || [];
    },
  });

  const { data: deals } = useQuery({
    queryKey: ['deals-for-order'],
    queryFn: async () => {
      const { data } = await supabase
        .from('crm_deals')
        .select('id, title, value')
        .eq('status', 'won')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: paymentConditions } = useQuery({
    queryKey: ['payment-conditions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_conditions')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      return data || [];
    },
  });

  const selectedClient = clients?.find(c => c.id === formData.client_id);

  const subtotal = items.reduce((sum, item) => sum + item.valor_total, 0);
  const desconto = subtotal * (formData.desconto_percentual / 100);
  const total = subtotal - desconto + Number(formData.valor_frete || 0);

  const handleSubmit = async () => {
    if (!formData.client_id) {
      toast.error('Selecione um cliente');
      return;
    }

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    setLoading(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: formData.client_id,
          deal_id: formData.deal_id || null,
          architect_id: formData.architect_id || null,
          vendedor_id: user?.id,
          created_by: user?.id,
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
          valor_frete: formData.valor_frete,
          subtotal,
          valor_total: total,
          status: 'rascunho',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const itemsToInsert = items.map((item, index) => ({
        order_id: order.id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        especificacoes: item.especificacoes,
        position: index,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success(`Pedido #${order.order_number} criado com sucesso!`);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error('Erro ao criar pedido: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido</DialogTitle>
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
                <Select
                  value={formData.client_id}
                  onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                >
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
                <Select
                  value={formData.architect_id}
                  onValueChange={(v) => setFormData({ ...formData, architect_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o arquiteto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem arquiteto</SelectItem>
                    {architects?.map((arch) => (
                      <SelectItem key={arch.id} value={arch.id}>
                        {arch.name} {arch.company && `- ${arch.company}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Negócio Vinculado</Label>
                <Select
                  value={formData.deal_id}
                  onValueChange={(v) => setFormData({ ...formData, deal_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular a negócio (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {deals?.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        {deal.title} {deal.value && `- ${formatCurrency(deal.value)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedClient && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium">{selectedClient.name}</p>
                {selectedClient.cpf_cnpj && <p className="text-sm">CPF/CNPJ: {selectedClient.cpf_cnpj}</p>}
                {selectedClient.phone && <p className="text-sm">Telefone: {selectedClient.phone}</p>}
                {selectedClient.email && <p className="text-sm">Email: {selectedClient.email}</p>}
                {(selectedClient.logradouro || selectedClient.city) && (
                  <p className="text-sm">
                    Endereço: {[selectedClient.logradouro, selectedClient.numero, selectedClient.bairro, selectedClient.city, selectedClient.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="itens" className="space-y-4">
            <OrderItemsTable items={items} onItemsChange={setItems} />

            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Desconto (%):</span>
                  <Input
                    type="number"
                    className="w-20 h-8"
                    value={formData.desconto_percentual}
                    onChange={(e) => setFormData({ ...formData, desconto_percentual: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                  <span className="text-muted-foreground">-{formatCurrency(desconto)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Frete:</span>
                  <Input
                    type="number"
                    className="w-24 h-8"
                    value={formData.valor_frete}
                    onChange={(e) => setFormData({ ...formData, valor_frete: Number(e.target.value) })}
                    min={0}
                  />
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
                <Select
                  value={formData.forma_pagamento}
                  onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v })}
                >
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
                <Select
                  value={formData.condicao_pagamento}
                  onValueChange={(v) => setFormData({ ...formData, condicao_pagamento: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentConditions?.map((cond) => (
                      <SelectItem key={cond.id} value={cond.nome}>
                        {cond.nome} - {cond.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações para NF</Label>
              <Textarea
                value={formData.observacoes_nf}
                onChange={(e) => setFormData({ ...formData, observacoes_nf: e.target.value })}
                placeholder="Informações que aparecerão na nota fiscal..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações Internas</Label>
              <Textarea
                value={formData.observacoes_internas}
                onChange={(e) => setFormData({ ...formData, observacoes_internas: e.target.value })}
                placeholder="Observações internas (não aparece na NF)..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="entrega" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Entrega</Label>
                <Select
                  value={formData.tipo_entrega}
                  onValueChange={(v) => setFormData({ ...formData, tipo_entrega: v })}
                >
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
                <Input
                  type="date"
                  value={formData.data_entrega_prevista}
                  onChange={(e) => setFormData({ ...formData, data_entrega_prevista: e.target.value })}
                />
              </div>
            </div>

            {formData.tipo_entrega !== 'retirada' && (
              <>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.entrega_mesmo_endereco}
                    onCheckedChange={(checked) => setFormData({ ...formData, entrega_mesmo_endereco: checked })}
                  />
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
                  />
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>Observações de Entrega</Label>
              <Textarea
                value={formData.entrega_observacoes}
                onChange={(e) => setFormData({ ...formData, entrega_observacoes: e.target.value })}
                placeholder="Instruções especiais de entrega..."
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-lg font-bold">
            Total: {formatCurrency(total)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Pedido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
