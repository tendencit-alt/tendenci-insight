import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Card, CardContent } from '@/components/ui/card';
import { OrderItemsTable } from './OrderItemsTable';
import { AddressForm } from './AddressForm';
import { User, Calendar, Trash2 } from 'lucide-react';
import { Loader2, AlertTriangle, Plus, Search } from 'lucide-react';

const FORMAS_PAGAMENTO = [
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'permuta', label: 'Permuta' },
  { value: 'dinheiro', label: 'Dinheiro' },
];

const FORMAS_COM_PARCELAS = ['boleto', 'cartao_credito'];

const TIPOS_ENTREGA = [
  { value: 'a_combinar', label: 'A combinar' },
  { value: 'entrega_tendenci', label: 'Entrega Tendenci' },
  { value: 'transportadora', label: 'Transportadora' },
  { value: 'retirada', label: 'Retirada' },
  { value: 'terceirizada', label: 'Terceirizada' },
];

// Centro de custo agora é por item, não mais no pedido

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

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
  centro_custo?: string;
}

interface PagamentoParcela {
  id: string;
  forma_pagamento: string;
  percentual: number;
  data_vencimento: string;
  numero_parcelas: number;
}

interface ClientData {
  name: string;
  phone: string;
  email: string;
  cpf_cnpj: string;
  tipo_pessoa: string;
  razao_social: string;
  nome_fantasia: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  isento_ie: boolean;
  contribuinte_icms: boolean;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  city: string;
  state: string;
  telefone_fixo: string;
  contato_financeiro: string;
  email_financeiro: string;
  notes: string;
}

const initialClientData: ClientData = {
  name: '',
  phone: '',
  email: '',
  cpf_cnpj: '',
  tipo_pessoa: 'pf',
  razao_social: '',
  nome_fantasia: '',
  inscricao_estadual: '',
  inscricao_municipal: '',
  isento_ie: false,
  contribuinte_icms: false,
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  city: '',
  state: '',
  telefone_fixo: '',
  contato_financeiro: '',
  email_financeiro: '',
  notes: ''
};

export function EditOrderDialog({ orderId, open, onOpenChange, onSuccess }: EditOrderDialogProps) {
  const { user } = useAuth();
  const { isMaster } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cliente');
  const [loadingCep, setLoadingCep] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    deal_id: '',
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
    transportadora_nome: '',
    transportadora_cnpj: '',
    data_emissao: '',
  });

  const [parcelas, setParcelas] = useState<PagamentoParcela[]>([
    { id: '1', forma_pagamento: '', percentual: 100, data_vencimento: '', numero_parcelas: 1 }
  ]);

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
        data_vencimento: hoje.toISOString().split('T')[0],
        numero_parcelas: 1
      }
    ]);
  };

  // Remover forma de pagamento
  const removerFormaPagamento = (id: string) => {
    if (parcelas.length <= 1) return;
    const novasParcelas = parcelas.filter(p => p.id !== id);
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

  const [items, setItems] = useState<OrderItem[]>([]);
  
  // Estado para dados editáveis do cliente
  const [clientData, setClientData] = useState<ClientData>(initialClientData);

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
      // Parse parcelas from observacao_pagamento if it's JSON
      let parcelasData: PagamentoParcela[] = [
        { id: '1', forma_pagamento: order.forma_pagamento || '', percentual: order.percentual_forma_1 || 100, data_vencimento: order.data_primeiro_vencimento?.split('T')[0] || '', numero_parcelas: 1 }
      ];
      
      if (order.percentual_forma_2 > 0 && order.forma_pagamento_2) {
        parcelasData.push({
          id: '2',
          forma_pagamento: order.forma_pagamento_2,
          percentual: order.percentual_forma_2,
          data_vencimento: '',
          numero_parcelas: 1
        });
      }

      // Try to parse extended parcelas from observacao_pagamento
      if (order.observacao_pagamento) {
        try {
          const parsed = JSON.parse(order.observacao_pagamento);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parcelasData = parsed.map((p: any) => ({
              ...p,
              numero_parcelas: p.numero_parcelas || 1
            }));
          }
        } catch {}
      }

      setParcelas(parcelasData);
      
      setFormData({
        client_id: order.client_id || '',
        deal_id: order.deal_id || '',
        architect_id: order.architect_id || '',
        observacao_pagamento: typeof order.observacao_pagamento === 'string' && !order.observacao_pagamento.startsWith('[') 
          ? order.observacao_pagamento : '',
        data_entrega_prevista: order.data_entrega_prevista?.split('T')[0] || '',
        tipo_entrega: order.tipo_entrega || '',
        entrega_mesmo_endereco: order.entrega_mesmo_endereco ?? true,
        entrega_cep: order.entrega_cep || '',
        entrega_logradouro: order.entrega_logradouro || '',
        entrega_numero: order.entrega_numero || '',
        entrega_complemento: order.entrega_complemento || '',
        entrega_bairro: order.entrega_bairro || '',
        entrega_cidade: order.entrega_cidade || '',
        entrega_uf: order.entrega_uf || '',
        observacoes: order.entrega_observacoes || order.observacoes_internas || order.observacoes_nf || '',
        desconto_percentual: order.desconto_percentual || 0,
        desconto_valor: order.desconto_valor || 0,
        valor_frete: order.valor_frete || 0,
        transportadora_nome: order.transportadora_nome || '',
        transportadora_cnpj: order.transportadora_cnpj || '',
        data_emissao: order.data_emissao ? order.data_emissao.slice(0, 16) : '',
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
        centro_custo: (i as any).centro_custo || undefined,
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

  // Query de paymentConditions removida - agora usamos CONDICOES_PAGAMENTO constante

  const selectedClient = clients?.find(c => c.id === formData.client_id);

  // Carregar dados do cliente quando selecionado
  useEffect(() => {
    if (selectedClient) {
      setClientData({
        name: selectedClient.name || '',
        phone: selectedClient.phone || '',
        email: selectedClient.email || '',
        cpf_cnpj: selectedClient.cpf_cnpj || '',
        tipo_pessoa: selectedClient.tipo_pessoa || 'pf',
        razao_social: selectedClient.razao_social || '',
        nome_fantasia: selectedClient.nome_fantasia || '',
        inscricao_estadual: selectedClient.inscricao_estadual || '',
        inscricao_municipal: selectedClient.inscricao_municipal || '',
        isento_ie: selectedClient.isento_ie || false,
        contribuinte_icms: selectedClient.contribuinte_icms || false,
        cep: selectedClient.cep || '',
        logradouro: selectedClient.logradouro || '',
        numero: selectedClient.numero || '',
        complemento: selectedClient.complemento || '',
        bairro: selectedClient.bairro || '',
        city: selectedClient.city || '',
        state: selectedClient.state || '',
        telefone_fixo: selectedClient.telefone_fixo || '',
        contato_financeiro: selectedClient.contato_financeiro || '',
        email_financeiro: selectedClient.email_financeiro || '',
        notes: selectedClient.notes || ''
      });
    } else {
      setClientData(initialClientData);
    }
  }, [selectedClient]);

  const subtotal = items.reduce((sum, item) => sum + item.valor_total, 0);
  const descontoPerc = subtotal * (formData.desconto_percentual / 100);
  const descontoTotal = descontoPerc + Number(formData.desconto_valor || 0);
  const total = subtotal - descontoTotal + Number(formData.valor_frete || 0);

  const totalPercentual = parcelas.reduce((sum, p) => sum + p.percentual, 0);
  
  // Validação rigorosa: valor das formas de pagamento deve ser igual ao total
  const valorTotalPagamento = parcelas.reduce((sum, p) => sum + (total * (p.percentual / 100)), 0);
  const diferencaPagamento = Math.abs(valorTotalPagamento - total);
  const isPagamentoValorCorreto = diferencaPagamento < 0.01;
  const isPagamentoValid = parcelas.length > 0 && parcelas.every(p => p.forma_pagamento) && totalPercentual === 100 && isPagamentoValorCorreto;
  
  const isEditable = order?.status === 'rascunho' || order?.status === 'ativo' || order?.status === 'aguardando_aprovacao';

  // Busca automática de CEP
  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setClientData(prev => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            city: data.localidade || prev.city,
            state: data.uf || prev.state
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!isEditable) {
      toast.error('Pedido não pode ser editado neste status');
      return;
    }

    if (!clientData.name.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    setLoading(true);
    try {
      // 1. Salvar alterações do cliente primeiro
      if (formData.client_id) {
        const { error: clientError } = await supabase
          .from('clients')
          .update({
            name: clientData.name,
            phone: clientData.phone || null,
            email: clientData.email || null,
            cpf_cnpj: clientData.cpf_cnpj || null,
            tipo_pessoa: clientData.tipo_pessoa || 'pf',
            razao_social: clientData.razao_social || null,
            nome_fantasia: clientData.nome_fantasia || null,
            inscricao_estadual: clientData.inscricao_estadual || null,
            inscricao_municipal: clientData.inscricao_municipal || null,
            isento_ie: clientData.isento_ie,
            contribuinte_icms: clientData.contribuinte_icms,
            cep: clientData.cep || null,
            logradouro: clientData.logradouro || null,
            numero: clientData.numero || null,
            complemento: clientData.complemento || null,
            bairro: clientData.bairro || null,
            city: clientData.city || null,
            state: clientData.state || null,
            telefone_fixo: clientData.telefone_fixo || null,
            contato_financeiro: clientData.contato_financeiro || null,
            email_financeiro: clientData.email_financeiro || null,
            notes: clientData.notes || null
          })
          .eq('id', formData.client_id);

        if (clientError) throw clientError;
      }

      // 2. Salvar pedido
      const parcelasPrincipal = parcelas[0];
      const parcelasSecundaria = parcelas.length > 1 ? parcelas[1] : null;

      // Verificar se deve mudar status para 'ativo'
      const allItemsHaveCentroCusto = items.length > 0 && items.every(i => i.centro_custo);
      const hasPaymentMethod = !!parcelasPrincipal?.forma_pagamento;
      const hasDeliveryType = !!formData.tipo_entrega;
      const hasClient = !!formData.client_id;
      
      const shouldBeAtivo = order?.status === 'rascunho' && 
        hasClient && 
        items.length > 0 && 
        allItemsHaveCentroCusto && 
        hasPaymentMethod && 
        hasDeliveryType;
      
      const newStatus = shouldBeAtivo ? 'ativo' : order?.status;

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          client_id: formData.client_id,
          deal_id: formData.deal_id || null,
          architect_id: formData.architect_id || null,
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
          transportadora_nome: formData.transportadora_nome,
          transportadora_cnpj: formData.transportadora_cnpj,
          subtotal,
          valor_total: total,
          centro_custo: null, // centro_custo agora é por item
          status: newStatus,
          ...(isMaster && formData.data_emissao ? { data_emissao: new Date(formData.data_emissao).toISOString() } : {}),
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // 3. Delete existing items and recreate
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
        centro_custo: item.centro_custo || null,
        position: index,
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)
        .select('id, descricao, centro_custo, valor_total');
      if (itemsError) throw itemsError;

      // 4. Se mudou para ativo, criar OPs automaticamente
      let opsCreated = 0;
      if (shouldBeAtivo && insertedItems) {
        const centroCustoMap: Record<string, string> = {
          'moveis_planejados': 'Móveis Planejados',
          'producao_tendenci': 'Produção Tendenci',
          'revenda': 'Revenda'
        };

        // Buscar tipos de produção ativos
        const { data: productionTypes } = await supabase
          .from('production_types')
          .select('id, name')
          .eq('active', true);

        if (productionTypes) {
          for (const item of insertedItems) {
            if (!item.centro_custo) continue;

            const productionTypeName = centroCustoMap[item.centro_custo];
            if (!productionTypeName) continue;

            const productionType = productionTypes.find(pt => pt.name === productionTypeName);
            if (!productionType) continue;

            // Buscar a primeira fase template do tipo de produção
            const { data: firstPhaseTemplate } = await supabase
              .from('production_phase_templates')
              .select('id')
              .eq('production_type_id', productionType.id)
              .eq('active', true)
              .order('position')
              .limit(1)
              .single();

            // Criar a OP
            const { data: newOP, error: opError } = await supabase
              .from('production_orders')
              .insert({
                title: `${item.descricao} - Pedido #${order.order_number}`,
                production_type_id: productionType.id,
                deal_id: formData.deal_id || null,
                client_id: formData.client_id,
                order_id: orderId,
                order_item_id: item.id,
                value: item.valor_total,
                status: 'aguardando',
                priority: 'normal',
              })
              .select('id')
              .single();

            if (!opError && newOP) {
              opsCreated++;

              // Se tiver fase template, criar a fase inicial e vincular à OP
              if (firstPhaseTemplate) {
                const { data: newPhase } = await supabase
                  .from('production_phases')
                  .insert({
                    production_order_id: newOP.id,
                    phase_template_id: firstPhaseTemplate.id,
                    status: 'em_andamento',
                    started_at: new Date().toISOString()
                  })
                  .select('id')
                  .single();

                if (newPhase) {
                  await supabase
                    .from('production_orders')
                    .update({ current_phase_id: newPhase.id })
                    .eq('id', newOP.id);
                }
              }
            }
          }
        }
      }

      // 5. SYNC: Se observações foram alteradas, registrar no order_history
      const originalObs = order.entrega_observacoes || order.observacoes_internas || order.observacoes_nf || '';
      if (formData.observacoes && formData.observacoes !== originalObs) {
        await supabase.from('order_history').insert({
          order_id: orderId,
          action_type: 'observation',
          field_name: 'observacoes',
          old_value: originalObs || null,
          new_value: formData.observacoes,
          description: 'Observação atualizada',
          created_by: user?.id
        });
      }

      // 6. SYNC: Atualizar valor do deal no CRM se vinculado
      if (formData.deal_id) {
        await supabase
          .from('crm_deals')
          .update({ value: total })
          .eq('id', formData.deal_id);
      }

      if (shouldBeAtivo && order?.status === 'rascunho') {
        toast.success(`Pedido ativado! ${opsCreated > 0 ? `${opsCreated} ordem(ns) de produção criada(s).` : ''}`);
      } else {
        toast.success('Pedido e cliente atualizados com sucesso!');
      }
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
            {/* Campo de Data de Emissão - Apenas para Master */}
            {isMaster && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  <Label className="text-amber-700 dark:text-amber-400 font-medium">Data de Emissão (Master)</Label>
                </div>
                <Input 
                  type="datetime-local"
                  value={formData.data_emissao}
                  onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                  className="max-w-xs border-amber-300 dark:border-amber-700"
                />
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                  Campo disponível apenas para administradores. Alterar com cuidado.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={formData.client_id || "_placeholder"} onValueChange={(v) => setFormData({ ...formData, client_id: v === "_placeholder" ? "" : v })} disabled={!isEditable}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label>Arquiteto</Label>
                <Select value={formData.architect_id || "_none"} onValueChange={(v) => setFormData({ ...formData, architect_id: v === "_none" ? "" : v })} disabled={!isEditable}>
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

            </div>

            {selectedClient && (
              <div className="space-y-6 border rounded-lg p-4">
                {/* Dados Básicos */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Dados do Cliente</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input 
                        value={clientData.name} 
                        onChange={(e) => setClientData({ ...clientData, name: e.target.value })} 
                        disabled={!isEditable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo Pessoa</Label>
                      <Select 
                        value={clientData.tipo_pessoa || "pf"} 
                        onValueChange={(v) => setClientData({ ...clientData, tipo_pessoa: v })} 
                        disabled={!isEditable}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pf">Pessoa Física</SelectItem>
                          <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone (WhatsApp)</Label>
                      <Input 
                        value={clientData.phone} 
                        onChange={(e) => setClientData({ ...clientData, phone: e.target.value })} 
                        placeholder="(00) 00000-0000"
                        disabled={!isEditable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={clientData.email} 
                        onChange={(e) => setClientData({ ...clientData, email: e.target.value })} 
                        disabled={!isEditable}
                      />
                    </div>
                  </div>
                </div>

                {/* Documentação */}
                <div className="space-y-4">
                  <div className="pb-2 border-b">
                    <span className="font-medium text-sm">Documentação</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CPF/CNPJ</Label>
                      <Input 
                        value={clientData.cpf_cnpj} 
                        onChange={(e) => setClientData({ ...clientData, cpf_cnpj: e.target.value })} 
                        placeholder={clientData.tipo_pessoa === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'}
                        disabled={!isEditable}
                      />
                    </div>
                    {clientData.tipo_pessoa === 'pj' && (
                      <>
                        <div className="space-y-2">
                          <Label>Razão Social</Label>
                          <Input 
                            value={clientData.razao_social} 
                            onChange={(e) => setClientData({ ...clientData, razao_social: e.target.value })} 
                            disabled={!isEditable}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nome Fantasia</Label>
                          <Input 
                            value={clientData.nome_fantasia} 
                            onChange={(e) => setClientData({ ...clientData, nome_fantasia: e.target.value })} 
                            disabled={!isEditable}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Inscrições */}
                <div className="space-y-4">
                  <div className="pb-2 border-b">
                    <span className="font-medium text-sm">Inscrições</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Inscrição Estadual</Label>
                      <Input 
                        value={clientData.inscricao_estadual} 
                        onChange={(e) => setClientData({ ...clientData, inscricao_estadual: e.target.value })} 
                        disabled={!isEditable || clientData.isento_ie}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Inscrição Municipal</Label>
                      <Input 
                        value={clientData.inscricao_municipal} 
                        onChange={(e) => setClientData({ ...clientData, inscricao_municipal: e.target.value })} 
                        disabled={!isEditable}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={clientData.isento_ie} 
                          onCheckedChange={(v) => setClientData({ ...clientData, isento_ie: v, inscricao_estadual: v ? '' : clientData.inscricao_estadual })} 
                          disabled={!isEditable}
                        />
                        <Label>Isento IE</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={clientData.contribuinte_icms} 
                          onCheckedChange={(v) => setClientData({ ...clientData, contribuinte_icms: v })} 
                          disabled={!isEditable}
                        />
                        <Label>Contribuinte ICMS</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="space-y-4">
                  <div className="pb-2 border-b">
                    <span className="font-medium text-sm">Endereço</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={clientData.cep} 
                          onChange={(e) => setClientData({ ...clientData, cep: e.target.value })} 
                          placeholder="00000-000"
                          disabled={!isEditable}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleCepSearch(clientData.cep)}
                          disabled={!isEditable || loadingCep}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Logradouro</Label>
                      <Input 
                        value={clientData.logradouro} 
                        onChange={(e) => setClientData({ ...clientData, logradouro: e.target.value })} 
                        disabled={!isEditable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input 
                        value={clientData.numero} 
                        onChange={(e) => setClientData({ ...clientData, numero: e.target.value })} 
                        disabled={!isEditable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Complemento</Label>
                      <Input 
                        value={clientData.complemento} 
                        onChange={(e) => setClientData({ ...clientData, complemento: e.target.value })} 
                        disabled={!isEditable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input 
                        value={clientData.bairro} 
                        onChange={(e) => setClientData({ ...clientData, bairro: e.target.value })} 
                        disabled={!isEditable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input 
                        value={clientData.city} 
                        onChange={(e) => setClientData({ ...clientData, city: e.target.value })} 
                        disabled={!isEditable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Select 
                        value={clientData.state || "_none"} 
                        onValueChange={(v) => setClientData({ ...clientData, state: v === "_none" ? "" : v })} 
                        disabled={!isEditable}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">-</SelectItem>
                          {UF_OPTIONS.map((uf) => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Contato Financeiro */}
                <div className="space-y-4">
                  <div className="pb-2 border-b">
                    <span className="font-medium text-sm">Contato Financeiro</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone Fixo</Label>
                      <Input 
                        value={clientData.telefone_fixo} 
                        onChange={(e) => setClientData({ ...clientData, telefone_fixo: e.target.value })} 
                        placeholder="(00) 0000-0000"
                        disabled={!isEditable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Contato Financeiro</Label>
                      <Input 
                        value={clientData.contato_financeiro} 
                        onChange={(e) => setClientData({ ...clientData, contato_financeiro: e.target.value })} 
                        disabled={!isEditable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Financeiro</Label>
                      <Input 
                        type="email"
                        value={clientData.email_financeiro} 
                        onChange={(e) => setClientData({ ...clientData, email_financeiro: e.target.value })} 
                        disabled={!isEditable}
                      />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label>Observações do Cliente</Label>
                  <Textarea 
                    value={clientData.notes} 
                    onChange={(e) => setClientData({ ...clientData, notes: e.target.value })} 
                    placeholder="Anotações sobre o cliente..."
                    rows={2}
                    disabled={!isEditable}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="itens" className="space-y-4">
            <OrderItemsTable items={items} onItemsChange={setItems} readOnly={!isEditable} showFiscalFields requireCentroCusto={true} />

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
            {/* Formas de Pagamento */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="font-medium text-base">Formas de Pagamento</Label>
                {isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={adicionarFormaPagamento}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Forma
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {parcelas.map((parcela, index) => (
                  <div key={parcela.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-lg relative">
                    {index === 0 && parcelas.length > 1 && (
                      <Badge className="absolute -top-2 left-2 text-xs" variant="default">
                        Entrada
                      </Badge>
                    )}
                    
                    <div className={`${FORMAS_COM_PARCELAS.includes(parcela.forma_pagamento) ? 'col-span-2' : 'col-span-3'} space-y-1`}>
                      <Label className="text-xs">Forma *</Label>
                      <Select
                        value={parcela.forma_pagamento || "_placeholder"}
                        onValueChange={(v) => {
                          const newParcelas = [...parcelas];
                          newParcelas[index].forma_pagamento = v === "_placeholder" ? "" : v;
                          // Reset parcelas se mudou para forma sem parcelas
                          if (!FORMAS_COM_PARCELAS.includes(v)) {
                            newParcelas[index].numero_parcelas = 1;
                          }
                          setParcelas(newParcelas);
                        }}
                        disabled={!isEditable}
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

                    {/* Parcelas - só para boleto e cartão de crédito */}
                    {FORMAS_COM_PARCELAS.includes(parcela.forma_pagamento) && (
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Parcelas</Label>
                        <div className="flex items-center h-10 border rounded-lg overflow-hidden bg-background">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 rounded-none hover:bg-destructive/10 hover:text-destructive text-lg font-bold"
                            disabled={!isEditable}
                            onClick={() => {
                              const newParcelas = [...parcelas];
                              newParcelas[index].numero_parcelas = Math.max(1, (parcela.numero_parcelas || 1) - 1);
                              setParcelas(newParcelas);
                            }}
                          >
                            −
                          </Button>
                          <div className="flex-1 h-10 flex items-center justify-center bg-muted/50 text-base font-semibold min-w-[50px]">
                            {parcela.numero_parcelas || 1}x
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 rounded-none hover:bg-primary/10 hover:text-primary text-lg font-bold"
                            disabled={!isEditable}
                            onClick={() => {
                              const newParcelas = [...parcelas];
                              newParcelas[index].numero_parcelas = Math.min(12, (parcela.numero_parcelas || 1) + 1);
                              setParcelas(newParcelas);
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className={`${FORMAS_COM_PARCELAS.includes(parcela.forma_pagamento) ? 'col-span-2' : 'col-span-3'} space-y-1`}>
                      <Label className="text-xs">% do Total</Label>
                      <Input
                        type="number"
                        className="h-10"
                        value={parcela.percentual}
                        onChange={(e) => atualizarPercentual(parcela.id, Number(e.target.value))}
                        min={0}
                        max={100}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Valor</Label>
                      <p className="h-10 flex items-center text-sm font-medium text-primary bg-muted/30 rounded-lg px-3">
                        {formatCurrency(total * (parcela.percentual / 100))}
                      </p>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Vencimento</Label>
                      <Input
                        type="date"
                        className="h-10"
                        value={parcela.data_vencimento}
                        onChange={(e) => {
                          const newParcelas = [...parcelas];
                          newParcelas[index].data_vencimento = e.target.value;
                          setParcelas(newParcelas);
                        }}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="col-span-1 flex items-end justify-center">
                      {index > 0 && isEditable && (
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

              {/* Resumo de valores */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total dos percentuais:</span>
                  <span className={`text-sm font-medium ${totalPercentual === 100 ? 'text-green-600' : 'text-destructive'}`}>
                    {totalPercentual}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor do Pedido:</span>
                  <span className="text-sm font-medium">{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Formas de Pagamento:</span>
                  <span className={`text-sm font-medium ${isPagamentoValorCorreto ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(valorTotalPagamento)}
                  </span>
                </div>
              </div>

              {totalPercentual !== 100 && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    O total dos percentuais deve ser exatamente 100%.
                  </AlertDescription>
                </Alert>
              )}

              {totalPercentual === 100 && !isPagamentoValorCorreto && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    O valor total das formas de pagamento ({formatCurrency(valorTotalPagamento)}) deve ser igual ao valor do pedido ({formatCurrency(total)}).
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
                disabled={!isEditable} 
              />
            </div>
          </TabsContent>

          <TabsContent value="entrega" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Entrega *</Label>
                <Select value={formData.tipo_entrega || "_placeholder"} onValueChange={(v) => setFormData({ ...formData, tipo_entrega: v === "_placeholder" ? "" : v })} disabled={!isEditable}>
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_placeholder" disabled>-</SelectItem>
                    {TIPOS_ENTREGA.map((te) => (
                      <SelectItem key={te.value} value={te.value}>
                        {te.label}
                      </SelectItem>
                    ))}
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
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Switch checked={formData.entrega_mesmo_endereco} onCheckedChange={(checked) => setFormData({ ...formData, entrega_mesmo_endereco: checked })} disabled={!isEditable} />
                  <Label>Usar endereço do cliente</Label>
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
              <Label>Observações</Label>
              <Textarea 
                value={formData.observacoes} 
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} 
                placeholder="Observações do pedido..." 
                rows={3} 
                disabled={!isEditable} 
              />
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
