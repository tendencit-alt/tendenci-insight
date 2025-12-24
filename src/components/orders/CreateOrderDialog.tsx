import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { OrderItemsTable } from './OrderItemsTable';

import { CreateClientDialog } from '@/components/crm/CreateClientDialog';
import { CreateWonDealDialog } from './CreateWonDealDialog';
import { Loader2, AlertTriangle, Link, Plus, ChevronRight, Check, Trash2 } from 'lucide-react';

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
  codigo_produto?: string;
  ncm?: string;
  cfop?: string;
  unidade?: string;
  centro_custo?: string;
}

const FORMAS_PAGAMENTO = [
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'permuta', label: 'Permuta' },
  { value: 'dinheiro', label: 'Dinheiro' },
];

const TIPOS_ENTREGA = [
  { value: 'a_combinar', label: 'A combinar' },
  { value: 'entrega_tendenci', label: 'Entrega Tendenci' },
  { value: 'transportadora', label: 'Transportadora' },
  { value: 'retirada', label: 'Retirada' },
  { value: 'terceirizada', label: 'Terceirizada' },
];

// Centro de custo agora é por item, não mais no pedido

export function CreateOrderDialog({ open, onOpenChange, onSuccess, dealId, clientId }: CreateOrderDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cliente');
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  
  interface PagamentoParcela {
    id: string;
    forma_pagamento: string;
    percentual: number;
    data_vencimento: string;
  }

  const [formData, setFormData] = useState({
    client_id: clientId || '',
    deal_id: dealId || '',
    architect_id: '',
    observacao_pagamento: '',
    data_entrega_prevista: '',
    tipo_entrega: '',
    entrega_mesmo_endereco: true,
    entrega_cep: '',
    entrega_logradouro: '',
    entrega_numero: '',
    entrega_complemento: '',
    entrega_bairro: '',
    entrega_cidade: '',
    entrega_uf: '',
    observacoes: '',
    desconto_percentual: 0,
    desconto_valor: 0,
    valor_frete: 0,
  });

  const [parcelas, setParcelas] = useState<PagamentoParcela[]>([
    { id: '1', forma_pagamento: '', percentual: 100, data_vencimento: '' }
  ]);

  const [items, setItems] = useState<OrderItem[]>([]);

  // Adicionar nova forma de pagamento
  const adicionarFormaPagamento = () => {
    const hoje = new Date();
    hoje.setMonth(hoje.getMonth() + parcelas.length);
    setParcelas([
      ...parcelas,
      {
        id: String(Date.now()),
        forma_pagamento: '',
        percentual: 0,
        data_vencimento: hoje.toISOString().split('T')[0]
      }
    ]);
  };

  // Remover forma de pagamento
  const removerFormaPagamento = (id: string) => {
    if (parcelas.length <= 1) return;
    const novasParcelas = parcelas.filter(p => p.id !== id);
    // Redistribuir percentual se a removida tinha valor
    const totalAtual = novasParcelas.reduce((sum, p) => sum + p.percentual, 0);
    if (totalAtual < 100 && novasParcelas.length > 0) {
      const diff = 100 - totalAtual;
      novasParcelas[0].percentual += diff;
    }
    setParcelas(novasParcelas);
  };

  // Atualizar percentual de uma parcela
  const atualizarPercentual = (id: string, novoPercentual: number) => {
    const novasParcelas = parcelas.map(p =>
      p.id === id ? { ...p, percentual: Math.max(0, Math.min(100, novoPercentual)) } : p
    );
    setParcelas(novasParcelas);
  };

  // Query para buscar dados do deal quando vem do CRM
  const { data: linkedDeal } = useQuery({
    queryKey: ['linked-deal', dealId],
    queryFn: async () => {
      if (!dealId) return null;
      const { data } = await supabase
        .from('crm_deals')
        .select(`
          id, title, value, architect_id,
          lead:leads(client_id)
        `)
        .eq('id', dealId)
        .single();
      return data;
    },
    enabled: !!dealId && open,
  });

  // Pré-preencher dados do deal quando disponível
  useEffect(() => {
    if (linkedDeal && open) {
      setFormData(prev => ({
        ...prev,
        deal_id: linkedDeal.id,
        client_id: linkedDeal.lead?.client_id || clientId || prev.client_id,
        architect_id: linkedDeal.architect_id || prev.architect_id,
      }));
    }
  }, [linkedDeal, open, clientId]);

  const { data: clients, refetch: refetchClients } = useQuery({
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

  const { data: deals, refetch: refetchDeals } = useQuery({
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

  const selectedClient = clients?.find(c => c.id === formData.client_id);

  // Validação de dados fiscais para PJ
  const hasFiscalWarning = selectedClient?.tipo_pessoa === 'pj' && (
    !selectedClient.cpf_cnpj || 
    (!selectedClient.inscricao_estadual && !selectedClient.isento_ie)
  );

  const subtotal = items.reduce((sum, item) => sum + item.valor_total, 0);
  const descontoPercentual = subtotal * (formData.desconto_percentual / 100);
  const descontoTotal = descontoPercentual + Number(formData.desconto_valor || 0);
  const total = subtotal - descontoTotal + Number(formData.valor_frete || 0);

  // Validações por etapa
  const isClienteValid = !!formData.client_id;
  const allItemsHaveCentroCusto = items.length > 0 && items.every(item => !!item.centro_custo);
  const isItensValid = items.length > 0 && allItemsHaveCentroCusto;
  const totalPercentual = parcelas.reduce((sum, p) => sum + p.percentual, 0);
  const isPagamentoValid = parcelas.length > 0 && parcelas.every(p => p.forma_pagamento) && totalPercentual === 100;
  const isEntregaValid = !!formData.tipo_entrega;
  const isFormValid = isClienteValid && isItensValid && isPagamentoValid && isEntregaValid;

  const handleNext = () => {
    if (activeTab === 'cliente') {
      if (!formData.client_id) {
        toast.error('Selecione um cliente para continuar');
        return;
      }
      setActiveTab('itens');
    } else if (activeTab === 'itens') {
      if (items.length === 0) {
        toast.error('Adicione pelo menos um item ao pedido');
        return;
      }
      if (!allItemsHaveCentroCusto) {
        toast.error('Todos os itens precisam ter um centro de custo definido');
        return;
      }
      setActiveTab('pagamento');
    } else if (activeTab === 'pagamento') {
      if (!isPagamentoValid) {
        toast.error('Selecione a forma de pagamento');
        return;
      }
      setActiveTab('entrega');
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      // Create order - save first parcela as forma_pagamento principal
      const parcelasPrincipal = parcelas[0];
      const parcelasSecundaria = parcelas.length > 1 ? parcelas[1] : null;
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: formData.client_id,
          deal_id: formData.deal_id || null,
          architect_id: formData.architect_id || null,
          vendedor_id: user?.id,
          created_by: user?.id,
          forma_pagamento: parcelasPrincipal?.forma_pagamento || '',
          forma_pagamento_2: parcelasSecundaria?.forma_pagamento || null,
          percentual_forma_1: parcelasPrincipal?.percentual || 100,
          percentual_forma_2: parcelasSecundaria?.percentual || 0,
          data_primeiro_vencimento: parcelasPrincipal?.data_vencimento || null,
          condicao_pagamento: null,
          observacao_pagamento: parcelas.length > 2 ? JSON.stringify(parcelas) : (formData.observacao_pagamento || null),
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
          entrega_observacoes: formData.observacoes,
          observacoes_internas: formData.observacoes,
          observacoes_nf: formData.observacoes,
          desconto_percentual: formData.desconto_percentual,
          desconto_valor: formData.desconto_valor,
          valor_frete: formData.valor_frete,
          subtotal,
          valor_total: total,
          centro_custo: null, // centro_custo agora é por item
          status: 'rascunho',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items with fiscal fields
      const itemsToInsert = items.map((item, index) => ({
        order_id: order.id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        especificacoes: item.especificacoes,
        codigo_produto: item.codigo_produto || null,
        ncm: item.ncm || null,
        cfop: item.cfop || null,
        unidade: item.unidade || 'UN',
        centro_custo: item.centro_custo || null,
        position: index,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // SYNC: Se houver observações, registrar no order_history
      if (formData.observacoes?.trim()) {
        await supabase.from('order_history').insert({
          order_id: order.id,
          action_type: 'observation',
          field_name: 'observacoes',
          new_value: formData.observacoes,
          description: 'Observação adicionada na criação do pedido',
          created_by: user?.id
        });
      }

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

  const handleClientCreated = () => {
    refetchClients();
    setShowCreateClient(false);
  };

  const handleDealCreated = (dealId: string) => {
    refetchDeals();
    setFormData(prev => ({ ...prev, deal_id: dealId }));
    setShowCreateDeal(false);
  };

  const getTabStatus = (tab: string) => {
    switch (tab) {
      case 'cliente': return isClienteValid;
      case 'itens': return isItensValid;
      case 'pagamento': return isPagamentoValid;
      case 'entrega': return isEntregaValid;
      default: return false;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Novo Pedido</DialogTitle>
              {linkedDeal && (
                <Badge variant="secondary" className="gap-1">
                  <Link className="h-3 w-3" />
                  Vinculado: {linkedDeal.title}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cliente" className="gap-1">
                {getTabStatus('cliente') && <Check className="h-3 w-3 text-green-500" />}
                Cliente
              </TabsTrigger>
              <TabsTrigger value="itens" className="gap-1">
                {getTabStatus('itens') && <Check className="h-3 w-3 text-green-500" />}
                Itens
              </TabsTrigger>
              <TabsTrigger value="pagamento" className="gap-1">
                {getTabStatus('pagamento') && <Check className="h-3 w-3 text-green-500" />}
                Pagamento
              </TabsTrigger>
              <TabsTrigger value="entrega" className="gap-1">
                {getTabStatus('entrega') && <Check className="h-3 w-3 text-green-500" />}
                Entrega
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cliente" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.client_id || "_placeholder"}
                      onValueChange={(v) => setFormData({ ...formData, client_id: v === "_placeholder" ? "" : v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_placeholder" disabled>-</SelectItem>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} {client.cpf_cnpj && `(${client.cpf_cnpj})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowCreateClient(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Arquiteto</Label>
                  <Select
                    value={formData.architect_id || "_none"}
                    onValueChange={(v) => setFormData({ ...formData, architect_id: v === "_none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">-</SelectItem>
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
                  <div className="flex gap-2">
                    <Select
                      value={formData.deal_id || "_none"}
                      onValueChange={(v) => setFormData({ ...formData, deal_id: v === "_none" ? "" : v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">-</SelectItem>
                        {deals?.map((deal) => (
                          <SelectItem key={deal.id} value={deal.id}>
                            {deal.title} {deal.value && `- ${formatCurrency(deal.value)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowCreateDeal(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

              </div>

              {selectedClient && (
                <Card className="p-4 bg-muted/50 border-primary/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="font-bold text-lg">{selectedClient.name}</p>
                      {selectedClient.tipo_pessoa === 'pj' && selectedClient.razao_social && (
                        <p className="text-sm text-muted-foreground">{selectedClient.razao_social}</p>
                      )}
                      {selectedClient.cpf_cnpj && (
                        <p className="text-sm font-mono">
                          <span className="text-muted-foreground">{selectedClient.tipo_pessoa === 'pj' ? 'CNPJ: ' : 'CPF: '}</span>
                          {selectedClient.cpf_cnpj}
                        </p>
                      )}
                      {selectedClient.tipo_pessoa === 'pj' && (
                        <p className="text-sm font-mono">
                          <span className="text-muted-foreground">IE: </span>
                          {selectedClient.isento_ie ? 'ISENTO' : selectedClient.inscricao_estadual || 'Não informada'}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      {selectedClient.phone && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Telefone: </span>
                          {selectedClient.phone}
                        </p>
                      )}
                      {selectedClient.email && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Email: </span>
                          {selectedClient.email}
                        </p>
                      )}
                      {(selectedClient.logradouro || selectedClient.city) && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Endereço: </span>
                          {[selectedClient.logradouro, selectedClient.numero, selectedClient.bairro, selectedClient.city, selectedClient.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {hasFiscalWarning && (
                <Alert variant="destructive" className="border-orange-500/50 bg-orange-500/10">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <AlertDescription className="text-orange-700 dark:text-orange-400">
                    <strong>Atenção:</strong> Cliente PJ com dados fiscais incompletos. 
                    {!selectedClient?.cpf_cnpj && ' CNPJ não informado.'}
                    {!selectedClient?.inscricao_estadual && !selectedClient?.isento_ie && ' Inscrição Estadual não informada.'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} disabled={!isClienteValid}>
                  Avançar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="itens" className="space-y-4">
              <OrderItemsTable items={items} onItemsChange={setItems} showFiscalFields={true} requireCentroCusto={true} />

              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Desconto (%):</span>
                    <Input
                      type="number"
                      className="w-16 h-8"
                      value={formData.desconto_percentual}
                      onChange={(e) => setFormData({ ...formData, desconto_percentual: Number(e.target.value) })}
                      min={0}
                      max={100}
                    />
                    <span className="text-muted-foreground text-xs">-{formatCurrency(descontoPercentual)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Desconto (R$):</span>
                    <Input
                      type="number"
                      className="w-24 h-8"
                      value={formData.desconto_valor}
                      onChange={(e) => setFormData({ ...formData, desconto_valor: Number(e.target.value) })}
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Frete:</span>
                    <Input
                      type="number"
                      className="w-24 h-8"
                      value={formData.valor_frete}
                      onChange={(e) => setFormData({ ...formData, valor_frete: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                  {descontoTotal > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total Descontos:</span>
                      <span>-{formatCurrency(descontoTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab('cliente')}>
                  Voltar
                </Button>
                <Button onClick={handleNext} disabled={!isItensValid}>
                  Avançar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="pagamento" className="space-y-4">
              {/* Formas de Pagamento */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-medium text-base">Formas de Pagamento</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={adicionarFormaPagamento}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Forma
                  </Button>
                </div>

                <div className="space-y-3">
                  {parcelas.map((parcela, index) => (
                    <div key={parcela.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-lg relative">
                      {index === 0 && (
                        <Badge className="absolute -top-2 left-2 text-xs" variant="default">
                          Entrada
                        </Badge>
                      )}
                      
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Forma *</Label>
                        <Select
                          value={parcela.forma_pagamento || "_placeholder"}
                          onValueChange={(v) => {
                            const newParcelas = [...parcelas];
                            newParcelas[index].forma_pagamento = v === "_placeholder" ? "" : v;
                            setParcelas(newParcelas);
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_placeholder" disabled>Selecione</SelectItem>
                            {FORMAS_PAGAMENTO.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">% do Total</Label>
                        <Input
                          type="number"
                          className="h-9"
                          value={parcela.percentual}
                          onChange={(e) => atualizarPercentual(parcela.id, Number(e.target.value))}
                          min={0}
                          max={100}
                        />
                      </div>

                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <p className="h-9 flex items-center text-sm font-medium text-primary">
                          {formatCurrency(total * (parcela.percentual / 100))}
                        </p>
                      </div>

                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Vencimento</Label>
                        <Input
                          type="date"
                          className="h-9"
                          value={parcela.data_vencimento}
                          onChange={(e) => {
                            const newParcelas = [...parcelas];
                            newParcelas[index].data_vencimento = e.target.value;
                            setParcelas(newParcelas);
                          }}
                        />
                      </div>

                      <div className="col-span-1 flex items-end justify-center">
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => removerFormaPagamento(parcela.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumo de percentuais */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Total dos percentuais:</span>
                  <span className={`text-sm font-medium ${totalPercentual === 100 ? 'text-green-600' : 'text-destructive'}`}>
                    {totalPercentual}%
                  </span>
                </div>

                {totalPercentual !== 100 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      O total dos percentuais deve ser exatamente 100%.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observação de Pagamento</Label>
                <Textarea
                  value={formData.observacao_pagamento}
                  onChange={(e) => setFormData({ ...formData, observacao_pagamento: e.target.value })}
                  placeholder="Observações sobre o pagamento..."
                  rows={2}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab('itens')}>
                  Voltar
                </Button>
                <Button onClick={handleNext} disabled={!isPagamentoValid}>
                  Avançar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="entrega" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Entrega *</Label>
                  <Select
                    value={formData.tipo_entrega || "_placeholder"}
                    onValueChange={(v) => setFormData({ ...formData, tipo_entrega: v === "_placeholder" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_placeholder" disabled>-</SelectItem>
                      {TIPOS_ENTREGA.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
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

              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <Switch
                  id="mesmo-endereco"
                  checked={formData.entrega_mesmo_endereco}
                  onCheckedChange={(checked) => setFormData({ ...formData, entrega_mesmo_endereco: checked })}
                />
                <Label htmlFor="mesmo-endereco">Usar endereço do cliente</Label>
              </div>

              {!formData.entrega_mesmo_endereco && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input
                      value={formData.entrega_cep}
                      onChange={(e) => setFormData({ ...formData, entrega_cep: e.target.value })}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Logradouro</Label>
                    <Input
                      value={formData.entrega_logradouro}
                      onChange={(e) => setFormData({ ...formData, entrega_logradouro: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input
                      value={formData.entrega_numero}
                      onChange={(e) => setFormData({ ...formData, entrega_numero: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Complemento</Label>
                    <Input
                      value={formData.entrega_complemento}
                      onChange={(e) => setFormData({ ...formData, entrega_complemento: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input
                      value={formData.entrega_bairro}
                      onChange={(e) => setFormData({ ...formData, entrega_bairro: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={formData.entrega_cidade}
                      onChange={(e) => setFormData({ ...formData, entrega_cidade: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input
                      value={formData.entrega_uf}
                      onChange={(e) => setFormData({ ...formData, entrega_uf: e.target.value })}
                      maxLength={2}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações do pedido..."
                  rows={3}
                />
              </div>

              {/* Resumo Final */}
              <Card className="p-4 bg-primary/5 border-primary/20">
                <h4 className="font-semibold mb-2">Resumo do Pedido</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">Cliente:</span> {selectedClient?.name}</p>
                  <p><span className="text-muted-foreground">Itens:</span> {items.length}</p>
                  <p><span className="text-muted-foreground">Pagamento:</span> {parcelas.map(p => FORMAS_PAGAMENTO.find(f => f.value === p.forma_pagamento)?.label).filter(Boolean).join(', ') || '-'}</p>
                  <p><span className="text-muted-foreground">Entrega:</span> {TIPOS_ENTREGA.find(t => t.value === formData.tipo_entrega)?.label}</p>
                  <p className="col-span-2 font-bold text-lg pt-2 border-t">
                    <span className="text-muted-foreground">Total:</span> {formatCurrency(total)}
                  </p>
                </div>
              </Card>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab('pagamento')}>
                  Voltar
                </Button>
                <Button onClick={handleSubmit} disabled={loading || !isFormValid}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Pedido
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CreateClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onSuccess={handleClientCreated}
      />

      <CreateWonDealDialog
        open={showCreateDeal}
        onOpenChange={setShowCreateDeal}
        onSuccess={handleDealCreated}
        prefilledClientId={formData.client_id}
        prefilledArchitectId={formData.architect_id}
      />
    </>
  );
}