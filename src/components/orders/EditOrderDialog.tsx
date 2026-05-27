import { useState, useEffect, useCallback } from 'react';
import { usePaymentLinkRates } from '@/hooks/usePaymentLinkRates';
import { useStrategicResourceDefaults } from '@/hooks/useStrategicResourceDefaults';
import { useCompanyName } from '@/hooks/useCompanySettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrderResponsibles } from '@/hooks/useOrderResponsibles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateBrInput } from '@/components/ui/date-br-input';
import { MoneyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { OrderItemsTable } from './OrderItemsTable';
import { useProjects } from '@/hooks/useProjects';
import { AddressForm } from './AddressForm';
import { User, Calendar, Trash2 } from 'lucide-react';
import { Loader2, AlertTriangle, Plus, Search } from 'lucide-react';

import { useMinimizedDialogs } from '@/contexts/MinimizedDialogsContext';
import { MinimizeButton } from '@/components/ui/MinimizeButton';

const FORMAS_PAGAMENTO = [
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'link_pagamento', label: 'Link de Pagamento' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'permuta', label: 'Permuta' },
  { value: 'dinheiro', label: 'Dinheiro' },
];

const FORMAS_COM_PARCELAS = ['boleto', 'cartao_credito', 'link_pagamento'];

// Taxas de link de pagamento por número de parcelas (fallback)
const TAXAS_LINK_PAGAMENTO: Record<number, number> = {
  1: 0, 2: 0, 3: 0, 4: 0,
  5: 0, 6: 0, 7: 0, 8: 0,
  9: 0, 10: 0, 11: 0, 12: 0
};

// Taxas de cartão de crédito por número de parcelas (fallback)
const TAXAS_CARTAO_CREDITO: Record<number, number> = {
  1: 2.80, 2: 3.95, 3: 4.69, 4: 5.41,
  5: 6.13, 6: 6.84, 7: 7.30, 8: 8.00,
  9: 8.90, 10: 9.38, 11: 10.05, 12: 10.72
};

// Taxas de boleto por carência e parcelas (fallback)
const TAXAS_BOLETO: Record<number, Record<number, number>> = {
  30: { 1: 2.62, 2: 3.89, 3: 5.15, 4: 6.38, 5: 7.59, 6: 8.78, 
        7: 9.43, 8: 10.53, 9: 11.60, 10: 12.66, 11: 13.70, 12: 14.73 },
  60: { 1: 5.17, 2: 6.41, 3: 7.63, 4: 8.83, 5: 10.01, 6: 11.17,
        7: 11.68, 8: 12.74, 9: 13.79, 10: 14.82, 11: 15.84, 12: 16.84 }
};

// TIPOS_ENTREGA is now dynamic - see inside component

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
  project_id?: string;
}

interface PagamentoParcela {
  id: string;
  forma_pagamento: string;
  percentual: number;
  data_vencimento: string;
  numero_parcelas: number;
  carencia_boleto?: 30 | 60;
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
  const companyName = useCompanyName();
  const TIPOS_ENTREGA = [
    { value: 'a_combinar', label: 'A combinar' },
    { value: 'entrega_tendenci', label: `Entrega ${companyName}` },
    { value: 'transportadora', label: 'Transportadora' },
    { value: 'retirada', label: 'Retirada' },
    { value: 'terceirizada', label: 'Terceirizada' },
  ];
  const linkRatesDb = usePaymentLinkRates();
  const { defaults: resourceDefaults, isLoaded: resourceDefaultsLoaded } = useStrategicResourceDefaults();
  const { isMaster } = usePermissions();
  const { minimize: minimizeDialog, remove: removeMinimized } = useMinimizedDialogs();
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cliente');
  const [loadingCep, setLoadingCep] = useState(false);
  

  const dialogId = `edit-order-${orderId}`;

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    onOpenChange(false);
    minimizeDialog({
      id: dialogId,
      label: `Editar Pedido #${orderId?.substring(0, 6)}`,
      icon: '✏️',
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
  
  const { projects } = useProjects();

  const [formData, setFormData] = useState({
    client_id: '',
    deal_id: '',
    architect_id: '',
    project_id: '',
    chart_account_id: '',
    observacao_pagamento: '',
    data_entrega_prevista: '',
    tipo_entrega: '',
    requer_montagem: true,
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
    vendedor_id: '',
  });

  // Query para buscar vendedores do sistema (apenas para masters)
  const { data: systemVendedores } = useQuery({
    queryKey: ['vendedores-for-order'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['admin', 'vendedor'])
        .order('full_name');
      return data || [];
    },
    enabled: isMaster && open,
  });

  const {
    vendedores: vendedoresAll,
    orcamentistas: orcamentistasAll,
    projetistas: projetistasAll,
    montadores: montadoresAll,
    producoes: producoesAll,
  } = useOrderResponsibles(open);

  const vendedores = vendedoresAll.filter((item) => item.is_active);
  const orcamentistas = orcamentistasAll.filter((item) => item.is_active);
  const projetistas = projetistasAll.filter((item) => item.is_active);
  const montadores = montadoresAll.filter((item) => item.is_active);
  const producoes = producoesAll.filter((item) => item.is_active);

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

  // Atualizar percentual de uma parcela (sanitizado contra NaN)
  const atualizarPercentual = (id: string, novoPercentual: number) => {
    const valorSeguro = isNaN(novoPercentual) ? 0 : novoPercentual;
    const novasParcelas = parcelas.map(p =>
      p.id === id ? { ...p, percentual: Math.max(0, Math.min(100, valorSeguro)) } : p
    );
    setParcelas(novasParcelas);
  };

  // Atualizar valor da parcela e recalcular percentual (sincronização bidirecional)
  const atualizarValorParcela = (id: string, novoValor: number) => {
    const valorSeguro = isNaN(novoValor) ? 0 : novoValor;
    // Usar totalSemTaxa como base para calcular percentual
    const baseParaCalculo = totalSemTaxa > 0 ? totalSemTaxa : 1;
    const novoPercentual = (valorSeguro / baseParaCalculo) * 100;
    atualizarPercentual(id, novoPercentual);
  };

  // Atualizar carência do boleto
  const atualizarCarenciaBoleto = (id: string, carencia: 30 | 60) => {
    const novasParcelas = parcelas.map(p =>
      p.id === id ? { ...p, carencia_boleto: carencia } : p
    );
    setParcelas(novasParcelas);
  };

  // Atualizar número de parcelas
  const atualizarNumeroParcelas = (id: string, delta: number) => {
    const novasParcelas = parcelas.map(p => {
      if (p.id === id) {
        const novoNumero = Math.max(1, Math.min(12, (p.numero_parcelas || 1) + delta));
        return { ...p, numero_parcelas: novoNumero };
      }
      return p;
    });
    setParcelas(novasParcelas);
  };

  const [items, setItems] = useState<OrderItem[]>([]);
  
  // Estado para dados editáveis do cliente
  const [clientData, setClientData] = useState<ClientData>(initialClientData);

  // Estado para taxas de cartão de crédito - sempre Tendenci absorve
  const [taxaCartao, setTaxaCartao] = useState({
    percentual: 0,
    valor: 0,
    responsavel: 'tendenci' as const,
    numeroParcelas: 1
  });

  // Estado para taxas de link de pagamento - sempre Tendenci absorve
  const [taxaLink, setTaxaLink] = useState({
    percentual: 0,
    valor: 0,
    responsavel: 'tendenci' as const,
    numeroParcelas: 1
  });

  // Estado para taxas de boleto - sempre Tendenci absorve
  const [taxaBoleto, setTaxaBoleto] = useState({
    percentual: 0,
    valor: 0,
    responsavel: 'tendenci' as const,
    numeroParcelas: 1,
    carencia: 30 as 30 | 60
  });

  // Estado unificado para comissões (incluindo RT)
  const [comissoes, setComissoes] = useState({
    rt: { habilitado: false, percentual: resourceDefaults.rt.percentage, valor: 0, responsavel_id: '' },
    vendedor: { habilitado: resourceDefaults.vendedor.active, percentual: resourceDefaults.vendedor.percentage, valor: 0, responsavel_id: '' },
    orcamentista: { habilitado: resourceDefaults.orcamentista.active, percentual: resourceDefaults.orcamentista.percentage, valor: 0, responsavel_id: '' },
    projetista: { habilitado: resourceDefaults.projetista.active, percentual: resourceDefaults.projetista.percentage, valor: 0, responsavel_id: '' },
    montador: { habilitado: resourceDefaults.montador.active, percentual: resourceDefaults.montador.percentage, valor: 0, responsavel_id: '' },
    producao: { habilitado: resourceDefaults.producao.active, percentual: resourceDefaults.producao.percentage, valor: 0, responsavel_id: '' },
  });

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

  const { data: orderItems, isLoading: orderItemsLoading } = useQuery({
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
        } catch (parseError) {
          console.warn('Falha ao parsear observacao_pagamento:', parseError);
          // Mantém parcelasData padrão se parsing falhar
        }
      }

      setParcelas(parcelasData);
      
      setFormData({
        client_id: order.client_id || '',
        deal_id: order.deal_id || '',
        architect_id: order.architect_id || '',
        project_id: (order as any).project_id || '',
        chart_account_id: (order as any).chart_account_id || '',
        observacao_pagamento: typeof order.observacao_pagamento === 'string' && !order.observacao_pagamento.startsWith('[') 
          ? order.observacao_pagamento : '',
        data_entrega_prevista: order.data_entrega_prevista?.split('T')[0] || '',
        tipo_entrega: order.tipo_entrega || '',
        requer_montagem: (order as any).requer_montagem ?? true,
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
        vendedor_id: order.vendedor_id || '',
      });

      // Carregar dados de taxa de cartão do pedido - forçar Tendenci
      setTaxaCartao({
        percentual: Number(order.taxa_cartao_percentual) || 0,
        valor: Number(order.taxa_cartao_valor) || 0,
        responsavel: 'tendenci',
        numeroParcelas: order.numero_parcelas_cartao || 1
      });

      // Carregar dados de taxa de boleto do pedido - forçar Tendenci
      setTaxaBoleto({
        percentual: Number((order as any).taxa_boleto_percentual) || 0,
        valor: Number((order as any).taxa_boleto_valor) || 0,
        responsavel: 'tendenci',
        numeroParcelas: (order as any).numero_parcelas_boleto || 1,
        carencia: ((order as any).carencia_boleto as 30 | 60) || 30
      });

      // Carregar dados de taxa de link do pedido - forçar Tendenci
      setTaxaLink({
        percentual: Number((order as any).taxa_link_percentual) || 0,
        valor: Number((order as any).taxa_link_valor) || 0,
        responsavel: 'tendenci',
        numeroParcelas: (order as any).numero_parcelas_link || 1
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
        project_id: (i as any).project_id || undefined,
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

  const { data: architects, refetch: refetchArchitects } = useQuery({
    queryKey: ['architects-for-order'],
    queryFn: async () => {
      const { data } = await supabase.from('architects').select('id, name, company, commission_percent').eq('active', true).order('name');
      return data || [];
    },
  });

  const { data: revenueAccounts } = useQuery({
    queryKey: ['revenue-accounts-for-order'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fin_chart_accounts')
        .select('id, code, name, parent_id')
        .like('code', '1.%')
        .eq('active', true)
        .order('code');
      return data || [];
    },
  });

  // Carregar RT e comissões do order existente (unificado)
  useEffect(() => {
    if (order) {
      const orderAny = order as any;
      setComissoes({
        rt: {
          habilitado: orderAny.rt_habilitado || false,
          percentual: Number(orderAny.rt_percentual) || resourceDefaults.rt.percentage,
          valor: Number(orderAny.rt_valor) || 0,
          responsavel_id: ''
        },
        vendedor: {
          habilitado: (orderAny.comissao_vendedor_valor || 0) > 0 || (orderAny.comissao_vendedor_percentual || 0) > 0,
          percentual: Number(orderAny.comissao_vendedor_percentual) || resourceDefaults.vendedor.percentage,
          valor: Number(orderAny.comissao_vendedor_valor) || 0,
          responsavel_id: orderAny.comissao_vendedor_responsible_id || orderAny.comissao_vendedor_responsavel_id || orderAny.seller_responsible_id || ''
        },
        orcamentista: {
          habilitado: (orderAny.comissao_orcamentista_valor || 0) > 0 || (orderAny.comissao_orcamentista_percentual || 0) > 0,
          percentual: Number(orderAny.comissao_orcamentista_percentual) || resourceDefaults.orcamentista.percentage,
          valor: Number(orderAny.comissao_orcamentista_valor) || 0,
          responsavel_id: orderAny.comissao_orcamentista_responsible_id || orderAny.comissao_orcamentista_responsavel_id || ''
        },
        projetista: {
          habilitado: (orderAny.comissao_projetista_valor || 0) > 0 || (orderAny.comissao_projetista_percentual || 0) > 0,
          percentual: Number(orderAny.comissao_projetista_percentual) || resourceDefaults.projetista.percentage,
          valor: Number(orderAny.comissao_projetista_valor) || 0,
          responsavel_id: orderAny.comissao_projetista_responsible_id || orderAny.comissao_projetista_responsavel_id || ''
        },
        montador: {
          habilitado: (orderAny.comissao_montador_valor || 0) > 0 || (orderAny.comissao_montador_percentual || 0) > 0,
          percentual: Number(orderAny.comissao_montador_percentual) || resourceDefaults.montador.percentage,
          valor: Number(orderAny.comissao_montador_valor) || 0,
          responsavel_id: orderAny.comissao_montador_responsible_id || orderAny.comissao_montador_responsavel_id || orderAny.montador_responsible_id || ''
        },
        producao: {
          habilitado: (orderAny.comissao_producao_valor || 0) > 0 || (orderAny.comissao_producao_percentual || 0) > 0,
          percentual: Number(orderAny.comissao_producao_percentual) || resourceDefaults.producao.percentage,
          valor: Number(orderAny.comissao_producao_valor) || 0,
          responsavel_id: orderAny.comissao_producao_responsible_id || orderAny.comissao_producao_responsavel_id || ''
        },
      });
    }
  }, [order, resourceDefaults]);


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
  const totalSemTaxa = subtotal - descontoTotal + Number(formData.valor_frete || 0);

  // Calcular taxa de cartão automaticamente - SOMA de todos os cartões
  const parcelasCartao = parcelas.filter(p => p.forma_pagamento === 'cartao_credito');
  
  // Calcular taxa total somando todas as parcelas de cartão
  const taxaTotalCartao = parcelasCartao.reduce((acc, parcela) => {
    const numParcelas = parcela.numero_parcelas || 1;
    const taxaPerc = TAXAS_CARTAO_CREDITO[numParcelas] || 0;
    const valorBase = totalSemTaxa * (parcela.percentual / 100);
    const taxaValor = valorBase * (taxaPerc / 100);
    return acc + taxaValor;
  }, 0);

  // Para exibição, pegar a maior taxa entre os cartões
  const parcelaCartaoMaiorTaxa = parcelasCartao.reduce((maior, atual) => 
    (atual.numero_parcelas || 1) > (maior?.numero_parcelas || 0) ? atual : maior
  , null as typeof parcelasCartao[0] | null);
  
  const numParcelasCartao = parcelaCartaoMaiorTaxa?.numero_parcelas || 1;
  const taxaPercentual = parcelaCartaoMaiorTaxa ? (TAXAS_CARTAO_CREDITO[numParcelasCartao] || 0) : 0;
  
  // Atualizar estado de taxa de cartão quando mudar parcelas
  useEffect(() => {
    if (parcelasCartao.length > 0) {
      setTaxaCartao(prev => ({
        ...prev,
        percentual: taxaPercentual,
        valor: taxaTotalCartao,
        numeroParcelas: numParcelasCartao
      }));
    } else {
      setTaxaCartao({ percentual: 0, valor: 0, responsavel: 'tendenci', numeroParcelas: 1 });
    }
  }, [parcelas, totalSemTaxa, taxaPercentual, taxaTotalCartao, numParcelasCartao, parcelasCartao.length]);

  // Calcular taxa de boleto automaticamente - SOMA de todos os boletos
  const parcelasBoleto = parcelas.filter(p => p.forma_pagamento === 'boleto');
  
  // Calcular taxa total somando todas as parcelas de boleto
  const taxaTotalBoleto = parcelasBoleto.reduce((acc, parcela) => {
    const carencia = parcela.carencia_boleto || 30;
    const numParcelas = parcela.numero_parcelas || 1;
    const taxaPerc = TAXAS_BOLETO[carencia]?.[numParcelas] || 0;
    const valorBase = totalSemTaxa * (parcela.percentual / 100);
    const taxaValor = valorBase * (taxaPerc / 100);
    return acc + taxaValor;
  }, 0);

  // Para exibição, pegar a maior taxa entre os boletos
  const parcelaBoletoMaiorTaxa = parcelasBoleto.reduce((maior, atual) => 
    (atual.numero_parcelas || 1) > (maior?.numero_parcelas || 0) ? atual : maior
  , null as typeof parcelasBoleto[0] | null);
  
  const carenciaBoleto = parcelaBoletoMaiorTaxa?.carencia_boleto || 30;
  const numParcelasBoleto = parcelaBoletoMaiorTaxa?.numero_parcelas || 1;
  const taxaBoletoPercentual = parcelaBoletoMaiorTaxa ? (TAXAS_BOLETO[carenciaBoleto]?.[numParcelasBoleto] || 0) : 0;

  // Atualizar estado de taxa de boleto quando mudar parcelas
  useEffect(() => {
    if (parcelasBoleto.length > 0) {
      setTaxaBoleto(prev => ({
        ...prev,
        percentual: taxaBoletoPercentual,
        valor: taxaTotalBoleto,
        numeroParcelas: numParcelasBoleto,
        carencia: carenciaBoleto
      }));
    } else {
      setTaxaBoleto({ percentual: 0, valor: 0, responsavel: 'tendenci', numeroParcelas: 1, carencia: 30 });
    }
  }, [parcelas, totalSemTaxa, taxaBoletoPercentual, taxaTotalBoleto, numParcelasBoleto, carenciaBoleto, parcelasBoleto.length]);

  // Calcular taxa de link de pagamento automaticamente
  const parcelasLink = parcelas.filter(p => p.forma_pagamento === 'link_pagamento');
  const taxaTotalLink = parcelasLink.reduce((acc, parcela) => {
    const numParcelas = parcela.numero_parcelas || 1;
    const taxaPerc = linkRatesDb[numParcelas] ?? TAXAS_LINK_PAGAMENTO[numParcelas] ?? 0;
    const valorBase = totalSemTaxa * (parcela.percentual / 100);
    return acc + valorBase * (taxaPerc / 100);
  }, 0);
  const parcelaLinkMaiorTaxa = parcelasLink.reduce((maior, atual) => 
    (atual.numero_parcelas || 1) > (maior?.numero_parcelas || 0) ? atual : maior
  , null as typeof parcelasLink[0] | null);
  const numParcelasLink = parcelaLinkMaiorTaxa?.numero_parcelas || 1;
  const taxaLinkPercentual = parcelaLinkMaiorTaxa ? (linkRatesDb[numParcelasLink] ?? TAXAS_LINK_PAGAMENTO[numParcelasLink] ?? 0) : 0;

  useEffect(() => {
    if (parcelasLink.length > 0) {
      setTaxaLink(prev => ({
        ...prev,
        percentual: taxaLinkPercentual,
        valor: taxaTotalLink,
        numeroParcelas: numParcelasLink
      }));
    } else {
      setTaxaLink({ percentual: 0, valor: 0, responsavel: 'tendenci', numeroParcelas: 1 });
    }
  }, [parcelas, totalSemTaxa, taxaLinkPercentual, taxaTotalLink, numParcelasLink, parcelasLink.length]);

  // Total final: taxas sempre absorvidas pela Tendenci, não adicionam ao total do cliente
  const total = totalSemTaxa;

  // Calcular total de comissões (incluindo RT e Montador)
  const totalComissoes = 
    (comissoes.rt.habilitado ? comissoes.rt.valor : 0) +
    (comissoes.vendedor.habilitado ? comissoes.vendedor.valor : 0) +
    (comissoes.orcamentista.habilitado ? comissoes.orcamentista.valor : 0) +
    (comissoes.projetista.habilitado ? comissoes.projetista.valor : 0) +
    (comissoes.montador.habilitado ? comissoes.montador.valor : 0) +
    (comissoes.producao.habilitado ? comissoes.producao.valor : 0);

  // Valor líquido Tendenci (deduz taxas de cartão, boleto e link)
  const valorLiquidoTendenci = totalSemTaxa - taxaCartao.valor - taxaBoleto.valor - taxaLink.valor;

  // Valor líquido após compromissos sobre venda (deduz taxas + comissões)
  const valorLiquidoRecursos = valorLiquidoTendenci - totalComissoes;

  // Função para atualizar comissão por percentual (recalcula valor)
  const atualizarComissaoPercentual = (tipo: 'rt' | 'vendedor' | 'orcamentista' | 'projetista' | 'montador' | 'producao', novoPercentual: number) => {
    const percentualSeguro = isNaN(novoPercentual) ? 0 : Math.max(0, Math.min(100, novoPercentual));
    const novoValor = total * (percentualSeguro / 100);
    setComissoes(prev => ({
      ...prev,
      [tipo]: { ...prev[tipo], percentual: percentualSeguro, valor: novoValor }
    }));
  };

  // Recalcular valores das comissões quando o total muda
  useEffect(() => {
    setComissoes(prev => ({
      rt: { ...prev.rt, valor: total * (prev.rt.percentual / 100) },
      vendedor: { ...prev.vendedor, valor: total * (prev.vendedor.percentual / 100) },
      orcamentista: { ...prev.orcamentista, valor: total * (prev.orcamentista.percentual / 100) },
      projetista: { ...prev.projetista, valor: total * (prev.projetista.percentual / 100) },
      montador: { ...prev.montador, valor: total * (prev.montador.percentual / 100) },
      producao: { ...prev.producao, valor: total * (prev.producao.percentual / 100) },
    }));
  }, [total]);

  const isClienteValid = !!formData.client_id;
  const allItemsHaveCentroCusto = items.length > 0 && items.every((item) => !!item.centro_custo);
  const allItemsHaveProject = items.length > 0 && items.every((item) => !!item.project_id);
  const isItensValid = items.length > 0 && allItemsHaveCentroCusto && allItemsHaveProject;
  const totalPercentual = parcelas.reduce((sum, p) => sum + p.percentual, 0);
  const strategicResourceLabels = {
    rt: resourceDefaults.rt.label,
    vendedor: resourceDefaults.vendedor.label,
    orcamentista: resourceDefaults.orcamentista.label,
    projetista: resourceDefaults.projetista.label,
    montador: resourceDefaults.montador.label,
    producao: resourceDefaults.producao.label,
  };
  const allMissingStrategicResponsibles = (Object.entries(comissoes) as Array<[
    keyof typeof comissoes,
    (typeof comissoes)[keyof typeof comissoes]
  ]>).filter(([, recurso]) => recurso.habilitado && !recurso.responsavel_id).map(([key]) => key);
  const missingStrategicResponsible = allMissingStrategicResponsibles[0] || null;
  const hasAllStrategicResponsibles = allMissingStrategicResponsibles.length === 0;

  // Validação rigorosa: valor das formas de pagamento deve ser igual ao total
  const valorTotalPagamento = parcelas.reduce((sum, p) => sum + (total * (p.percentual / 100)), 0);
  const diferencaPagamento = Math.abs(valorTotalPagamento - total);
  const isPagamentoValorCorreto = total > 0 ? diferencaPagamento < 0.01 : false;
  const isPagamentoValid = parcelas.length > 0 && parcelas.every((p) => p.forma_pagamento) && totalPercentual === 100 && isPagamentoValorCorreto && hasAllStrategicResponsibles;
  const isEntregaValid = !!formData.tipo_entrega;
  const isFormValid = isClienteValid && isItensValid && isPagamentoValid && isEntregaValid;
  const isEditable = isMaster || order?.status === 'rascunho' || order?.status === 'em_negociacao';

  const handleCepSearch = async (cepValue: string) => {
    const cep = cepValue.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast.error('CEP inválido');
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setClientData((prev) => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      }));
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const resolveProjectsForItems = async (orderNumber: number): Promise<Record<string, string>> => {
    const hasItemsWithoutProject = items.some((item) => !item.project_id);
    if (!hasItemsWithoutProject) return {};

    let clientName = selectedClient?.name?.trim() || '';
    if (!clientName) {
      const { data: clientRecord } = await supabase
        .from('clients')
        .select('name')
        .eq('id', formData.client_id)
        .single();
      clientName = clientRecord?.name?.trim() || '';
    }
    if (!clientName) throw new Error('Não foi possível identificar o nome do cliente para gerar o projeto do pedido');

    // Group items by centro_custo that need project resolution
    const centroCustoSet = new Set<string>();
    for (const item of items) {
      if (!item.project_id) {
        centroCustoSet.add(item.centro_custo || 'Geral');
      }
    }

    const projectMap: Record<string, string> = {};

    for (const cc of centroCustoSet) {
      // Always use format: "[CentroCusto] - [ClientName] #[order_number]"
      const projectName = `${cc} - ${clientName} #${orderNumber}`;

      const { data: newProject, error } = await supabase
        .from('fin_projects')
        .insert({ name: projectName, status: 'ativo' })
        .select('id')
        .single();
      if (error) throw error;
      projectMap[cc] = newProject.id;
    }

    return projectMap;
  };

  const handleSubmit = async () => {
    if (!order) return;
    if (allMissingStrategicResponsibles.length > 0) {
      toast.error(`Selecione o responsável para: ${allMissingStrategicResponsibles.map(key => strategicResourceLabels[key]).join(', ')}`);
      return;
    }

    // Guard contra zeragem acidental: nunca prosseguir se itens ainda não carregaram
    // ou se o estado de itens está vazio (race condition que apagava os itens originais).
    if (orderItemsLoading || orderItems === undefined) {
      toast.error('Itens do pedido ainda não foram carregados. Aguarde e tente novamente.');
      return;
    }
    if (items.length === 0) {
      toast.error('O pedido precisa ter ao menos um item. Adicione itens antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      const shouldBeAtivo = order.status === 'rascunho' && isFormValid;

      const parcelasPrincipal = parcelas[0];
      const parcelasSecundaria = parcelas.length > 1 ? parcelas[1] : null;
      // Resolve projects with naming convention after order update
      const projectMap = await resolveProjectsForItems(order.order_number);
      const itemsWithResolvedProject = items.map((item) => {
        if (!item.project_id) {
          const cc = item.centro_custo || 'Geral';
          return { ...item, project_id: projectMap[cc] || undefined };
        }
        return item;
      });

      // Update order project_id if resolved
      if (!formData.project_id && Object.keys(projectMap).length > 0) {
        const firstProjectId = Object.values(projectMap)[0];
        await supabase.from('orders').update({ project_id: firstProjectId }).eq('id', orderId);
      }

      const { error: clientError } = await supabase
        .from('clients')
        .update({
          name: clientData.name,
          phone: clientData.phone || null,
          email: clientData.email || null,
          cpf_cnpj: clientData.cpf_cnpj || null,
          tipo_pessoa: clientData.tipo_pessoa || null,
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
          notes: clientData.notes || null,
        })
        .eq('id', formData.client_id);

      if (clientError) throw clientError;

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          client_id: formData.client_id,
          deal_id: formData.deal_id || null,
          architect_id: formData.architect_id || null,
          vendedor_id: formData.vendedor_id || order.vendedor_id || null,
          forma_pagamento: parcelasPrincipal?.forma_pagamento || '',
          forma_pagamento_2: parcelasSecundaria?.forma_pagamento || null,
          percentual_forma_1: parcelasPrincipal?.percentual || 100,
          percentual_forma_2: parcelasSecundaria?.percentual || 0,
          data_primeiro_vencimento: parcelasPrincipal?.data_vencimento || null,
          condicao_pagamento: null,
          observacao_pagamento: (parcelas.length > 2 || parcelas.some((p) => p.numero_parcelas > 1))
            ? JSON.stringify(parcelas)
            : (formData.observacao_pagamento || null),
          data_entrega_prevista: formData.data_entrega_prevista || null,
          tipo_entrega: formData.tipo_entrega || null,
          requer_montagem: formData.requer_montagem,
          entrega_mesmo_endereco: formData.entrega_mesmo_endereco,
          entrega_cep: formData.entrega_mesmo_endereco ? null : formData.entrega_cep,
          entrega_logradouro: formData.entrega_mesmo_endereco ? null : formData.entrega_logradouro,
          entrega_numero: formData.entrega_mesmo_endereco ? null : formData.entrega_numero,
          entrega_complemento: formData.entrega_mesmo_endereco ? null : formData.entrega_complemento,
          entrega_bairro: formData.entrega_mesmo_endereco ? null : formData.entrega_bairro,
          entrega_cidade: formData.entrega_mesmo_endereco ? null : formData.entrega_cidade,
          entrega_uf: formData.entrega_mesmo_endereco ? null : formData.entrega_uf,
          entrega_observacoes: formData.observacoes || null,
          observacoes_internas: formData.observacoes || null,
          observacoes_nf: formData.observacoes || null,
          desconto_percentual: formData.desconto_percentual,
          desconto_valor: formData.desconto_valor,
          valor_frete: formData.valor_frete,
          subtotal,
          valor_total: total,
          centro_custo: null,
          project_id: formData.project_id || null,
          chart_account_id: formData.chart_account_id || null,
          status: shouldBeAtivo ? 'em_negociacao' : order.status,
          taxa_cartao_percentual: taxaCartao.percentual,
          taxa_cartao_valor: taxaCartao.valor,
          taxa_cartao_responsavel: taxaCartao.responsavel,
          numero_parcelas_cartao: taxaCartao.numeroParcelas,
          taxa_boleto_percentual: taxaBoleto.percentual,
          taxa_boleto_valor: taxaBoleto.valor,
          taxa_boleto_responsavel: taxaBoleto.responsavel,
          numero_parcelas_boleto: taxaBoleto.numeroParcelas,
          carencia_boleto: taxaBoleto.carencia,
          taxa_link_percentual: taxaLink.percentual,
          taxa_link_valor: taxaLink.valor,
          taxa_link_responsavel: taxaLink.responsavel,
          numero_parcelas_link: taxaLink.numeroParcelas,
          rt_habilitado: comissoes.rt.habilitado,
          rt_percentual: comissoes.rt.habilitado ? comissoes.rt.percentual : 0,
          rt_valor: comissoes.rt.habilitado ? comissoes.rt.valor : 0,
          seller_responsible_id: comissoes.vendedor.responsavel_id || null,
          comissao_vendedor_percentual: comissoes.vendedor.habilitado ? comissoes.vendedor.percentual : 0,
          comissao_vendedor_valor: comissoes.vendedor.habilitado ? comissoes.vendedor.valor : 0,
          comissao_vendedor_responsavel_id: comissoes.vendedor.responsavel_id || null,
          comissao_vendedor_responsible_id: comissoes.vendedor.responsavel_id || null,
          comissao_orcamentista_percentual: comissoes.orcamentista.habilitado ? comissoes.orcamentista.percentual : 0,
          comissao_orcamentista_valor: comissoes.orcamentista.habilitado ? comissoes.orcamentista.valor : 0,
          comissao_orcamentista_responsavel_id: comissoes.orcamentista.responsavel_id || null,
          comissao_orcamentista_responsible_id: comissoes.orcamentista.responsavel_id || null,
          comissao_projetista_percentual: comissoes.projetista.habilitado ? comissoes.projetista.percentual : 0,
          comissao_projetista_valor: comissoes.projetista.habilitado ? comissoes.projetista.valor : 0,
          comissao_projetista_responsavel_id: comissoes.projetista.responsavel_id || null,
          comissao_projetista_responsible_id: comissoes.projetista.responsavel_id || null,
          comissao_montador_percentual: comissoes.montador.habilitado ? comissoes.montador.percentual : 0,
          comissao_montador_valor: comissoes.montador.habilitado ? comissoes.montador.valor : 0,
          comissao_montador_responsavel_id: comissoes.montador.responsavel_id || null,
          comissao_montador_responsible_id: comissoes.montador.responsavel_id || null,
          comissao_producao_percentual: comissoes.producao.habilitado ? comissoes.producao.percentual : 0,
          comissao_producao_valor: comissoes.producao.habilitado ? comissoes.producao.valor : 0,
          comissao_producao_responsavel_id: comissoes.producao.responsavel_id || null,
          comissao_producao_responsible_id: comissoes.producao.responsavel_id || null,
          data_emissao: formData.data_emissao || null,
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Sincronização diff-based dos itens: UPDATE existentes, INSERT novos, DELETE removidos.
      // Evita a janela em que o pedido fica sem itens (que zerava o valor_total via trigger).
      const originalIds = new Set((orderItems || []).map((i: any) => i.id));
      const currentIds = new Set(itemsWithResolvedProject.filter((i) => i.id).map((i) => i.id as string));

      const idsToDelete = [...originalIds].filter((id) => !currentIds.has(id as string));
      if (idsToDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('order_items')
          .delete()
          .in('id', idsToDelete as string[]);
        if (delErr) throw delErr;
      }

      const itemsToInsert = itemsWithResolvedProject
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.id || !originalIds.has(item.id))
        .map(({ item, index }) => ({
          order_id: orderId,
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
          project_id: item.project_id || null,
          position: index,
        }));

      let insertedItems: Array<{ id: string; descricao: string; centro_custo: string | null; valor_total: number }> = [];
      if (itemsToInsert.length > 0) {
        const { data, error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert)
          .select('id, descricao, centro_custo, valor_total');
        if (itemsError) throw itemsError;
        insertedItems = (data || []) as any;
      }

      // UPDATE dos itens existentes (preserva a linha e evita zerar valor_total temporariamente)
      for (let index = 0; index < itemsWithResolvedProject.length; index++) {
        const item = itemsWithResolvedProject[index];
        if (!item.id || !originalIds.has(item.id)) continue;
        const { error: updErr } = await supabase
          .from('order_items')
          .update({
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
            project_id: item.project_id || null,
            position: index,
          })
          .eq('id', item.id);
        if (updErr) throw updErr;
      }


      let opsCreated = 0;
      if (shouldBeAtivo && insertedItems) {
        const { data: productionTypes } = await supabase
          .from('production_types')
          .select('id, name')
          .eq('active', true);

        if (productionTypes) {
          for (const item of insertedItems) {
            if (!item.centro_custo) continue;

            // Dynamic matching: same logic as the SQL trigger
            const productionType = productionTypes.find((pt) =>
              pt.name === item.centro_custo ||
              pt.name.toLowerCase().includes(item.centro_custo.toLowerCase()) ||
              item.centro_custo.toLowerCase().includes(pt.name.toLowerCase())
            );
            if (!productionType) continue;

            // Check if OP already exists for this item
            const { data: existingOp } = await supabase
              .from('production_orders')
              .select('id')
              .eq('order_item_id', item.id)
              .maybeSingle();

            if (existingOp) continue;

            // Insert OP - phases are created automatically by create_phases_on_op_insert trigger
            const { data: newOP, error: opError } = await supabase
              .from('production_orders')
              .insert({
                title: `Pedido #${order.order_number} - ${item.descricao || 'Item'}`,
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

              // Set first auto-created phase as current and em_andamento
              const { data: firstPhase } = await supabase
                .from('production_phases')
                .select('id')
                .eq('production_order_id', newOP.id)
                .order('position')
                .limit(1)
                .maybeSingle();

              if (firstPhase) {
                await supabase
                  .from('production_orders')
                  .update({ current_phase_id: firstPhase.id })
                  .eq('id', newOP.id);
                await supabase
                  .from('production_phases')
                  .update({ status: 'em_andamento', started_at: new Date().toISOString() })
                  .eq('id', firstPhase.id);
              }
            }
          }
        }
      }

      const originalObs = order.entrega_observacoes || order.observacoes_internas || order.observacoes_nf || '';
      if (formData.observacoes && formData.observacoes !== originalObs) {
        await supabase.from('order_history').insert({
          order_id: orderId,
          action_type: 'observation',
          field_name: 'observacoes',
          old_value: originalObs || null,
          new_value: formData.observacoes,
          description: 'Observação atualizada',
          created_by: user?.id,
        });
      }

      if (formData.deal_id) {
        await supabase
          .from('crm_deals')
          .update({ value: total })
          .eq('id', formData.deal_id);
      }

      if (shouldBeAtivo) {
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
        <MinimizeButton onClick={handleMinimize} absolute />
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

            {/* Campo de Vendedor - Apenas para Master */}
            {isMaster && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  <Label className="text-amber-700 dark:text-amber-400 font-medium">Vendedor Responsável (Master)</Label>
                </div>
                <Select 
                  value={formData.vendedor_id || "_placeholder"} 
                  onValueChange={(v) => setFormData({ ...formData, vendedor_id: v === "_placeholder" ? "" : v })}
                  disabled={!isEditable}
                >
                  <SelectTrigger className="max-w-xs border-amber-300 dark:border-amber-700">
                    <SelectValue placeholder="Selecionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_placeholder" disabled>Selecionar vendedor</SelectItem>
                    {systemVendedores?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                  Campo disponível apenas para administradores.
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


                <div className="space-y-2 col-span-2">
                  <Label>Categoria de Receita</Label>
                  <Select
                    value={formData.chart_account_id || "_placeholder"}
                    onValueChange={(v) => setFormData({ ...formData, chart_account_id: v === "_placeholder" ? "" : v })}
                    disabled={!isEditable}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_placeholder" disabled>Selecione a categoria</SelectItem>
                      {(() => {
                        const groups = revenueAccounts?.filter(a => {
                          const dotCount = (a.code.match(/\./g) || []).length;
                          return dotCount === 1;
                        }) || [];
                        return groups.map(group => {
                          const children = revenueAccounts?.filter(a => a.parent_id === group.id) || [];
                          return (
                            <SelectGroup key={group.id}>
                              <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5">
                                {group.code} - {group.name}
                              </SelectLabel>
                              {children.map(child => (
                                <SelectItem key={child.id} value={child.id}>
                                  {'\u00A0\u00A0\u00A0'}{child.code} - {child.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        });
                      })()}
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
            <OrderItemsTable items={items} onItemsChange={setItems} readOnly={!isEditable} showFiscalFields requireCentroCusto={true} clientName={selectedClient?.name} />




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
                  <MoneyInput className="w-24 h-8" value={formData.desconto_valor} onChange={(v) => setFormData({ ...formData, desconto_valor: v })} disabled={!isEditable} />
                </div>
                <div className="flex items-center gap-2">
                  <span>Frete:</span>
                  <MoneyInput className="w-24 h-8" value={formData.valor_frete} onChange={(v) => setFormData({ ...formData, valor_frete: v })} disabled={!isEditable} />
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
                {parcelas.map((parcela, index) => {
                  const valorParcela = totalSemTaxa * (parcela.percentual / 100);
                  const taxaBoletoParcelaPercentual = parcela.forma_pagamento === 'boleto' 
                    ? (TAXAS_BOLETO[parcela.carencia_boleto || 30]?.[parcela.numero_parcelas || 1] || 0) 
                    : 0;
                  const taxaBoletoParcelaValor = valorParcela * (taxaBoletoParcelaPercentual / 100);
                  
                  return (
                  <div key={parcela.id} className={`p-3 bg-muted/30 rounded-lg relative ${parcela.forma_pagamento === 'boleto' ? 'space-y-3' : ''}`}>
                    {index === 0 && parcelas.length > 1 && (
                      <Badge className="absolute -top-2 left-2 text-xs" variant="default">
                        Entrada
                      </Badge>
                    )}
                    
                    {/* Layout para Boleto - expandido com toggle buttons e taxa inline */}
                    {parcela.forma_pagamento === 'boleto' ? (
                      <>
                        {/* Primeira linha: Forma + Carência + Parcelas */}
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Forma *</Label>
                            <Select
                              value={parcela.forma_pagamento}
                              onValueChange={(v) => {
                                const newParcelas = [...parcelas];
                                newParcelas[index].forma_pagamento = v === "_placeholder" ? "" : v;
                                if (!FORMAS_COM_PARCELAS.includes(v)) {
                                  newParcelas[index].numero_parcelas = 1;
                                }
                                if (v === 'cartao_credito' || v === 'link_pagamento') {
                                  newParcelas[index].data_vencimento = new Date().toISOString().split('T')[0];
                                }
                                setParcelas(newParcelas);
                              }}
                              disabled={!isEditable}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_placeholder" disabled>Selecione</SelectItem>
                                {FORMAS_PAGAMENTO.map((f) => (
                                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Carência como toggle buttons */}
                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Carência</Label>
                            <div className="flex gap-1 h-10">
                              <Button
                                type="button"
                                variant={(parcela.carencia_boleto || 30) === 30 ? 'default' : 'outline'}
                                size="sm"
                                className={`flex-1 h-10 ${(parcela.carencia_boleto || 30) === 30 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                onClick={() => atualizarCarenciaBoleto(parcela.id, 30)}
                                disabled={!isEditable}
                              >
                                30d
                              </Button>
                              <Button
                                type="button"
                                variant={parcela.carencia_boleto === 60 ? 'default' : 'outline'}
                                size="sm"
                                className={`flex-1 h-10 ${parcela.carencia_boleto === 60 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                onClick={() => atualizarCarenciaBoleto(parcela.id, 60)}
                                disabled={!isEditable}
                              >
                                60d
                              </Button>
                            </div>
                          </div>

                          {/* Parcelas com +/- */}
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Parcelas</Label>
                            <div className="flex items-center h-10 border rounded-lg overflow-hidden bg-background">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-10 w-8 rounded-none hover:bg-destructive/10 hover:text-destructive text-lg font-bold p-0"
                                onClick={() => atualizarNumeroParcelas(parcela.id, -1)}
                                disabled={!isEditable}
                              >
                                −
                              </Button>
                              <div className="flex-1 h-10 flex items-center justify-center bg-muted/50 text-base font-semibold">
                                {parcela.numero_parcelas || 1}x
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-10 w-8 rounded-none hover:bg-primary/10 hover:text-primary text-lg font-bold p-0"
                                onClick={() => atualizarNumeroParcelas(parcela.id, 1)}
                                disabled={!isEditable}
                              >
                                +
                              </Button>
                            </div>
                          </div>

                          {/* Vencimento */}
                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Vencimento</Label>
                            <DateBrInput
                              className="h-10"
                              value={parcela.data_vencimento}
                              onChange={(iso) => {
                                const newParcelas = [...parcelas];
                                newParcelas[index].data_vencimento = iso;
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

                        {/* Segunda linha: % + Valor editável + Taxa inline */}
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">% do Total</Label>
                            <Input
                              type="number"
                              className="h-10 bg-muted cursor-not-allowed"
                              value={parcela.percentual.toFixed(2)}
                              readOnly
                              disabled
                            />
                          </div>

                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Valor (R$)</Label>
                            <MoneyInput
                              className="h-10"
                              value={Math.round(valorParcela * 100) / 100}
                              onChange={(v) => atualizarValorParcela(parcela.id, v)}
                              disabled={!isEditable}
                            />
                          </div>

                          {/* Taxa inline - sempre Tendenci */}
                          <div className="col-span-8">
                            <div className="flex items-center gap-3 h-10 px-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex-1">
                                <span className="text-xs text-green-700 dark:text-green-300">
                                  Taxa {(parcela.carencia_boleto || 30)}d / {parcela.numero_parcelas || 1}x: 
                                  <strong className="ml-1">{taxaBoletoParcelaPercentual.toFixed(2)}%</strong>
                                  <span className="mx-1">→</span>
                                  <strong>{formatCurrency(taxaBoletoParcelaValor)}</strong>
                                  <span className="ml-2">✓ Absorvida pela Tendenci</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Layout padrão para outras formas de pagamento */
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className={`${FORMAS_COM_PARCELAS.includes(parcela.forma_pagamento) ? 'col-span-2' : 'col-span-3'} space-y-1`}>
                          <Label className="text-xs">Forma *</Label>
                          <Select
                            value={parcela.forma_pagamento || "_placeholder"}
                            onValueChange={(v) => {
                              const newParcelas = [...parcelas];
                              newParcelas[index].forma_pagamento = v === "_placeholder" ? "" : v;
                              if (!FORMAS_COM_PARCELAS.includes(v)) {
                                newParcelas[index].numero_parcelas = 1;
                              }
                              if (v === 'cartao_credito' || v === 'link_pagamento') {
                                newParcelas[index].data_vencimento = new Date().toISOString().split('T')[0];
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
                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Parcelas - para cartão de crédito e link de pagamento */}
                        {(parcela.forma_pagamento === 'cartao_credito' || parcela.forma_pagamento === 'link_pagamento') && (
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Parcelas</Label>
                            <div className="flex items-center h-10 border rounded-lg overflow-hidden bg-background">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 rounded-none hover:bg-destructive/10 hover:text-destructive text-lg font-bold"
                                onClick={() => atualizarNumeroParcelas(parcela.id, -1)}
                                disabled={!isEditable}
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
                                onClick={() => atualizarNumeroParcelas(parcela.id, 1)}
                                disabled={!isEditable}
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
                            className="h-10 bg-muted cursor-not-allowed"
                            value={parcela.percentual.toFixed(2)}
                            readOnly
                            disabled
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Valor (R$)</Label>
                          <MoneyInput
                            className="h-10"
                            value={Math.round(valorParcela * 100) / 100}
                            onChange={(v) => atualizarValorParcela(parcela.id, v)}
                            disabled={!isEditable}
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Vencimento</Label>
                          <DateBrInput
                            className="h-10"
                            value={parcela.data_vencimento}
                            onChange={(iso) => {
                              const newParcelas = [...parcelas];
                              newParcelas[index].data_vencimento = iso;
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
                    )}
                  </div>
                )})}
              </div>

              {/* Seção de Compromissos Sobre Venda (RT + Vendedor + Orçamentista + Projetista) */}
              <Card className="p-4 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                <div className="flex items-center justify-between mb-3">
                  <Label className="font-medium flex items-center gap-2">
                    💰 Compromissos Sobre Venda
                  </Label>
                </div>
                
                <div className="space-y-3">
                  {/* RT - Repasse Técnico */}
                  {resourceDefaults.rt.visible && (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={comissoes.rt.habilitado}
                      onCheckedChange={(checked) => setComissoes(prev => ({
                        ...prev,
                        rt: { ...prev.rt, habilitado: checked }
                      }))}
                      disabled={!isEditable}
                    />
                    <span className="text-sm font-medium w-28">{resourceDefaults.rt.label}</span>
                    {comissoes.rt.habilitado && (
                      <>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-8 w-20"
                            value={comissoes.rt.percentual}
                            onChange={(e) => atualizarComissaoPercentual('rt', Number(e.target.value))}
                            min={0}
                            max={100}
                            step={0.1}
                            disabled={!isEditable}
                          />
                          <Label className="text-xs text-muted-foreground">%</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">R$</Label>
                          <Input
                            type="number"
                            className="h-8 w-24 bg-muted"
                            value={comissoes.rt.valor.toFixed(2)}
                            readOnly
                            disabled
                          />
                        </div>
                        <Select
                          value={comissoes.rt.responsavel_id || "_none"}
                          onValueChange={(v) => setComissoes(prev => ({
                            ...prev,
                            rt: { ...prev.rt, responsavel_id: v === "_none" ? "" : v }
                          }))}
                          disabled={!isEditable}
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue placeholder="Responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">-</SelectItem>
                            {architects?.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                  )}

                  {/* Comissão Vendedor */}
                  {resourceDefaults.vendedor.visible && (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={comissoes.vendedor.habilitado}
                      onCheckedChange={(checked) => setComissoes(prev => ({
                        ...prev,
                        vendedor: { ...prev.vendedor, habilitado: checked }
                      }))}
                      disabled={!isEditable}
                    />
                    <span className="text-sm font-medium w-28">{resourceDefaults.vendedor.label}</span>
                    {comissoes.vendedor.habilitado && (
                      <>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-8 w-20"
                            value={comissoes.vendedor.percentual}
                            onChange={(e) => atualizarComissaoPercentual('vendedor', Number(e.target.value))}
                            min={0}
                            max={100}
                            step={0.1}
                            disabled={!isEditable}
                          />
                          <Label className="text-xs text-muted-foreground">%</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">R$</Label>
                          <Input
                            type="number"
                            className="h-8 w-24 bg-muted"
                            value={comissoes.vendedor.valor.toFixed(2)}
                            readOnly
                            disabled
                          />
                        </div>
                        <Select
                          value={comissoes.vendedor.responsavel_id || "_none"}
                          onValueChange={(v) => setComissoes(prev => ({
                            ...prev,
                            vendedor: { ...prev.vendedor, responsavel_id: v === "_none" ? "" : v }
                          }))}
                          disabled={!isEditable}
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue placeholder="Responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">-</SelectItem>
                            {vendedores?.map((v) => (
                              <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                  )}

                  {/* Comissão Orçamentista */}
                  {resourceDefaults.orcamentista.visible && (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={comissoes.orcamentista.habilitado}
                      onCheckedChange={(checked) => setComissoes(prev => ({
                        ...prev,
                        orcamentista: { ...prev.orcamentista, habilitado: checked }
                      }))}
                      disabled={!isEditable}
                    />
                    <span className="text-sm font-medium w-28">{resourceDefaults.orcamentista.label}</span>
                    {comissoes.orcamentista.habilitado && (
                      <>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-8 w-20"
                            value={comissoes.orcamentista.percentual}
                            onChange={(e) => atualizarComissaoPercentual('orcamentista', Number(e.target.value))}
                            min={0}
                            max={100}
                            step={0.1}
                            disabled={!isEditable}
                          />
                          <Label className="text-xs text-muted-foreground">%</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">R$</Label>
                          <Input
                            type="number"
                            className="h-8 w-24 bg-muted"
                            value={comissoes.orcamentista.valor.toFixed(2)}
                            readOnly
                            disabled
                          />
                        </div>
                        <Select
                          value={comissoes.orcamentista.responsavel_id || "_none"}
                          onValueChange={(v) => setComissoes(prev => ({
                            ...prev,
                            orcamentista: { ...prev.orcamentista, responsavel_id: v === "_none" ? "" : v }
                          }))}
                          disabled={!isEditable}
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue placeholder="Responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">-</SelectItem>
                            {orcamentistas?.map((o) => (
                              <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                  )}

                  {/* Comissão Projetista */}
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={comissoes.projetista.habilitado}
                      onCheckedChange={(checked) => setComissoes(prev => ({
                        ...prev,
                        projetista: { ...prev.projetista, habilitado: checked }
                      }))}
                      disabled={!isEditable}
                    />
                    <span className="text-sm font-medium w-28">{resourceDefaults.projetista.label}</span>
                    {comissoes.projetista.habilitado && (
                      <>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-8 w-20"
                            value={comissoes.projetista.percentual}
                            onChange={(e) => atualizarComissaoPercentual('projetista', Number(e.target.value))}
                            min={0}
                            max={100}
                            step={0.1}
                            disabled={!isEditable}
                          />
                          <Label className="text-xs text-muted-foreground">%</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">R$</Label>
                          <Input
                            type="number"
                            className="h-8 w-24 bg-muted"
                            value={comissoes.projetista.valor.toFixed(2)}
                            readOnly
                            disabled
                          />
                        </div>
                        <Select
                          value={comissoes.projetista.responsavel_id || "_none"}
                          onValueChange={(v) => setComissoes(prev => ({
                            ...prev,
                            projetista: { ...prev.projetista, responsavel_id: v === "_none" ? "" : v }
                          }))}
                          disabled={!isEditable}
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue placeholder="Responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">-</SelectItem>
                            {projetistas?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  {/* Comissão Montador */}
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={comissoes.montador.habilitado}
                      onCheckedChange={(checked) => setComissoes(prev => ({
                        ...prev,
                        montador: { ...prev.montador, habilitado: checked }
                      }))}
                      disabled={!isEditable}
                    />
                    <span className="text-sm font-medium w-28">{resourceDefaults.montador.label}</span>
                    {comissoes.montador.habilitado && (
                      <>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-8 w-20"
                            value={comissoes.montador.percentual}
                            onChange={(e) => atualizarComissaoPercentual('montador', Number(e.target.value))}
                            min={0}
                            max={100}
                            step={0.1}
                            disabled={!isEditable}
                          />
                          <Label className="text-xs text-muted-foreground">%</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">R$</Label>
                          <Input
                            type="number"
                            className="h-8 w-24 bg-muted"
                            value={comissoes.montador.valor.toFixed(2)}
                            readOnly
                            disabled
                          />
                        </div>
                        <Select
                          value={comissoes.montador.responsavel_id || "_none"}
                          onValueChange={(v) => setComissoes(prev => ({
                            ...prev,
                            montador: { ...prev.montador, responsavel_id: v === "_none" ? "" : v }
                          }))}
                          disabled={!isEditable}
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue placeholder="Responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">-</SelectItem>
                            {montadores?.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  {/* Comissão Produção */}
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={comissoes.producao.habilitado}
                      onCheckedChange={(checked) => setComissoes(prev => ({
                        ...prev,
                        producao: { ...prev.producao, habilitado: checked }
                      }))}
                      disabled={!isEditable}
                    />
                    <span className="text-sm font-medium w-28">{resourceDefaults.producao.label}</span>
                    {comissoes.producao.habilitado && (
                      <>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-8 w-20"
                            value={comissoes.producao.percentual}
                            onChange={(e) => atualizarComissaoPercentual('producao', Number(e.target.value))}
                            min={0}
                            max={100}
                            step={0.1}
                            disabled={!isEditable}
                          />
                          <Label className="text-xs text-muted-foreground">%</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">R$</Label>
                          <Input
                            type="number"
                            className="h-8 w-24 bg-muted"
                            value={comissoes.producao.valor.toFixed(2)}
                            readOnly
                            disabled
                          />
                        </div>
                        <Select
                          value={comissoes.producao.responsavel_id || "_none"}
                          onValueChange={(v) => setComissoes(prev => ({
                            ...prev,
                            producao: { ...prev.producao, responsavel_id: v === "_none" ? "" : v }
                          }))}
                          disabled={!isEditable}
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue placeholder="Responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">-</SelectItem>
                            {producoes?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Resumo de valores */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total dos percentuais:</span>
                  <span className={`text-sm font-medium ${totalPercentual === 100 ? 'text-green-600' : 'text-destructive'}`}>
                    {totalPercentual.toFixed(1)}%
                  </span>
                </div>
                {comissoes.rt.habilitado && comissoes.rt.valor > 0 && (
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm">RT ({comissoes.rt.percentual.toFixed(2)}%):</span>
                    <span className="text-sm font-medium">- {formatCurrency(comissoes.rt.valor)}</span>
                  </div>
                )}
                {comissoes.vendedor.habilitado && comissoes.vendedor.valor > 0 && (
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm">Vendedor ({comissoes.vendedor.percentual.toFixed(2)}%):</span>
                    <span className="text-sm font-medium">- {formatCurrency(comissoes.vendedor.valor)}</span>
                  </div>
                )}
                {comissoes.orcamentista.habilitado && comissoes.orcamentista.valor > 0 && (
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm">Orçamentista ({comissoes.orcamentista.percentual.toFixed(2)}%):</span>
                    <span className="text-sm font-medium">- {formatCurrency(comissoes.orcamentista.valor)}</span>
                  </div>
                )}
                {comissoes.projetista.habilitado && comissoes.projetista.valor > 0 && (
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm">Projetista ({comissoes.projetista.percentual.toFixed(2)}%):</span>
                    <span className="text-sm font-medium">- {formatCurrency(comissoes.projetista.valor)}</span>
                  </div>
                )}
                {comissoes.montador.habilitado && comissoes.montador.valor > 0 && (
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm">Montador ({comissoes.montador.percentual.toFixed(2)}%):</span>
                    <span className="text-sm font-medium">- {formatCurrency(comissoes.montador.valor)}</span>
                  </div>
                )}
                {comissoes.producao.habilitado && comissoes.producao.valor > 0 && (
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm">Produção ({comissoes.producao.percentual.toFixed(2)}%):</span>
                    <span className="text-sm font-medium">- {formatCurrency(comissoes.producao.valor)}</span>
                  </div>
                )}
                {taxaCartao.valor > 0 && (
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm">💳 Taxa Cartão ({taxaCartao.percentual.toFixed(2)}%):</span>
                    <span className="text-sm font-medium">- {formatCurrency(taxaCartao.valor)}</span>
                  </div>
                )}
                {taxaBoleto.valor > 0 && (
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm">📄 Taxa Boleto ({taxaBoleto.percentual.toFixed(2)}%):</span>
                    <span className="text-sm font-medium">- {formatCurrency(taxaBoleto.valor)}</span>
                  </div>
                )}
                {taxaLink.valor > 0 && (
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm">🔗 Taxa Link ({taxaLink.percentual.toFixed(2)}%):</span>
                    <span className="text-sm font-medium">- {formatCurrency(taxaLink.valor)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm font-semibold">Total do Pedido:</span>
                  <span className="text-base font-bold text-primary">{formatCurrency(total)}</span>
                </div>
                {(taxaCartao.valor > 0 || taxaBoleto.valor > 0 || taxaLink.valor > 0 || totalComissoes > 0) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-600">Valor Líquido {companyName}:</span>
                    <span className="text-base font-bold text-green-600">{formatCurrency(valorLiquidoTendenci)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                   <span className="text-sm font-semibold text-blue-600">Valor Líquido - Compromissos Sobre Venda:</span>
                   <span className={`text-base font-bold text-blue-600`}>
                     {formatCurrency(valorLiquidoRecursos)}
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

            {allMissingStrategicResponsibles.length > 0 && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Selecione o responsável para: {allMissingStrategicResponsibles.map(key => strategicResourceLabels[key]).join(', ')}
                </AlertDescription>
              </Alert>
            )}



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
                <DateBrInput value={formData.data_entrega_prevista} onChange={(iso) => setFormData({ ...formData, data_entrega_prevista: iso })} disabled={!isEditable} />
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

                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Switch checked={formData.requer_montagem} onCheckedChange={(checked) => setFormData({ ...formData, requer_montagem: checked })} disabled={!isEditable} />
                  <Label>Requer montagem</Label>
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
