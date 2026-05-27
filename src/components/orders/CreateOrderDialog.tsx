import { useState, useEffect, useCallback, useRef } from 'react';
import { usePaymentLinkRates } from '@/hooks/usePaymentLinkRates';
import { useStrategicResourceDefaults } from '@/hooks/useStrategicResourceDefaults';
import { useCompanyName } from '@/hooks/useCompanySettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
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
import { OrderItemsTable } from './OrderItemsTable';
import { useProjects } from '@/hooks/useProjects';
import { useOrderResponsibles } from '@/hooks/useOrderResponsibles';

import { CreateClientDialog } from '@/components/crm/CreateClientDialog';

import { CreateWonDealDialog } from './CreateWonDealDialog';
import { Loader2, AlertTriangle, Link, Plus, ChevronRight, Check, Trash2 } from 'lucide-react';
import { useMinimizedDialogs } from '@/contexts/MinimizedDialogsContext';
import { MinimizeButton } from '@/components/ui/MinimizeButton';
import { AddressForm } from './AddressForm';

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
  project_id?: string;
}

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

// TIPOS_ENTREGA is now dynamic - see getDeliveryOptions()

// Centro de custo agora é por item, não mais no pedido
const CREATE_ORDER_DRAFT_KEY = 'orders:create-order:draft';
const CREATE_ORDER_ITEMS_DRAFT_KEY = 'orders:create-order:draft:items-table';

export function CreateOrderDialog({ open, onOpenChange, onSuccess, dealId, clientId }: CreateOrderDialogProps) {
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
  const {
    minimize: minimizeDialog,
    remove: removeMinimized,
    isMinimized: isDialogMinimized,
    getPendingRestore,
    clearPendingRestore,
  } = useMinimizedDialogs();
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cliente');
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  
  const hasMountedRef = useRef(false);
  const hasAppliedResourceDefaultsRef = useRef(false);

  interface PagamentoParcela {
    id: string;
    forma_pagamento: string;
    percentual: number;
    data_vencimento: string;
    numero_parcelas: number;
    carencia_boleto?: 30 | 60;
  }

  const { projects } = useProjects();

  const [formData, setFormData] = useState({
    client_id: clientId || '',
    deal_id: dealId || '',
    
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
  });

  const [parcelas, setParcelas] = useState<PagamentoParcela[]>([
    { id: '1', forma_pagamento: '', percentual: 100, data_vencimento: '', numero_parcelas: 1 }
  ]);

  const [items, setItems] = useState<OrderItem[]>([]);

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

  useEffect(() => {
    if (!open) {
      hasAppliedResourceDefaultsRef.current = false;
    }
  }, [open]);

  // Sync dos cadastros quando o dialog abre
  useEffect(() => {
    if (!open || !resourceDefaultsLoaded || hasAppliedResourceDefaultsRef.current) return;

    setComissoes((prev) => ({
      rt: { ...prev.rt, percentual: resourceDefaults.rt.percentage },
      vendedor: { ...prev.vendedor, habilitado: resourceDefaults.vendedor.active, percentual: resourceDefaults.vendedor.percentage },
      orcamentista: { ...prev.orcamentista, habilitado: resourceDefaults.orcamentista.active, percentual: resourceDefaults.orcamentista.percentage },
      projetista: { ...prev.projetista, habilitado: resourceDefaults.projetista.active, percentual: resourceDefaults.projetista.percentage },
      montador: { ...prev.montador, habilitado: resourceDefaults.montador.active, percentual: resourceDefaults.montador.percentage },
      producao: { ...prev.producao, habilitado: resourceDefaults.producao.active, percentual: resourceDefaults.producao.percentage },
    }));

    hasAppliedResourceDefaultsRef.current = true;
  }, [open, resourceDefaultsLoaded, resourceDefaults]);

  const clearDraftStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(CREATE_ORDER_DRAFT_KEY);
    window.localStorage.removeItem(CREATE_ORDER_ITEMS_DRAFT_KEY);
  }, []);

  const saveDraft = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      CREATE_ORDER_DRAFT_KEY,
      JSON.stringify({
        activeTab,
        formData,
        parcelas,
        items,
        taxaCartao,
        taxaBoleto,
        comissoes,
      })
    );
  }, [activeTab, formData, parcelas, items, taxaCartao, taxaBoleto, comissoes]);

  const restoreDraft = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const rawDraft = window.localStorage.getItem(CREATE_ORDER_DRAFT_KEY);
    if (!rawDraft) return false;

    try {
      const draft = JSON.parse(rawDraft);
      if (draft.activeTab) setActiveTab(draft.activeTab);
      if (draft.formData) setFormData(draft.formData);
      if (Array.isArray(draft.parcelas) && draft.parcelas.length > 0) setParcelas(draft.parcelas);
      if (Array.isArray(draft.items)) setItems(draft.items);
      if (draft.taxaCartao) setTaxaCartao(draft.taxaCartao);
      if (draft.taxaBoleto) setTaxaBoleto(draft.taxaBoleto);
      if (draft.comissoes) setComissoes(draft.comissoes);
      return true;
    } catch {
      clearDraftStorage();
      return false;
    }
  }, [clearDraftStorage]);

  const handleMinimize = useCallback(() => {
    saveDraft();
    setIsMinimized(true);
    onOpenChange(false);
    minimizeDialog({
      id: 'create-order',
      label: 'Novo Pedido',
      icon: '📋',
      route: '/pedidos',
      restore: () => {
        restoreDraft();
        setIsMinimized(false);
        onOpenChange(true);
      },
    });
  }, [minimizeDialog, onOpenChange, restoreDraft, saveDraft]);

  const hasPendingRestore = getPendingRestore('create-order');
  const isPersistedAsMinimized = isDialogMinimized('create-order');

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!open && !isMinimized && !isPersistedAsMinimized && !hasPendingRestore) {
      removeMinimized('create-order');
      clearDraftStorage();
    }
  }, [open, isMinimized, isPersistedAsMinimized, hasPendingRestore, removeMinimized, clearDraftStorage]);

  useEffect(() => {
    if (!hasPendingRestore) return;

    restoreDraft();
    setIsMinimized(false);
    onOpenChange(true);
    clearPendingRestore('create-order');
  }, [hasPendingRestore, restoreDraft, onOpenChange, clearPendingRestore]);

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
    // Redistribuir percentual se a removida tinha valor
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


  // Query para buscar dados do deal quando vem do CRM
  const { data: linkedDeal } = useQuery({
    queryKey: ['linked-deal', dealId],
    queryFn: async () => {
      if (!dealId) return null;
      const { data } = await supabase
        .from('crm_deals')
        .select(`
          id, title, value,
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
        .select('id, name, company, commission_percent')
        .eq('active', true)
        .order('name');
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

  // Set default chart_account_id to first leaf account (subgroup) when accounts load
  useEffect(() => {
    if (revenueAccounts && revenueAccounts.length > 0 && !formData.chart_account_id) {
      const firstLeaf = revenueAccounts.find(a => {
        const dotCount = (a.code.match(/\./g) || []).length;
        return dotCount >= 2;
      });
      if (firstLeaf) {
        setFormData(prev => ({ ...prev, chart_account_id: firstLeaf.id }));
      }
    }
  }, [revenueAccounts]);



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

  const selectedClient = clients?.find(c => c.id === formData.client_id);
  

  // Validação de dados fiscais para PJ
  const hasFiscalWarning = selectedClient?.tipo_pessoa === 'pj' && (
    !selectedClient.cpf_cnpj || 
    (!selectedClient.inscricao_estadual && !selectedClient.isento_ie)
  );

  const subtotal = items.reduce((sum, item) => sum + item.valor_total, 0);
  const descontoPercentual = subtotal * (formData.desconto_percentual / 100);
  const descontoTotal = descontoPercentual + Number(formData.desconto_valor || 0);
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

  // Calcular total de comissões (incluindo RT)
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

  // Validações por etapa
  const isClienteValid = !!formData.client_id;
  const allItemsHaveCentroCusto = items.length > 0 && items.every(item => !!item.centro_custo);
  const allItemsHaveProject = items.length > 0 && items.every(item => !!item.project_id);
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
  // Se total é 0 ou negativo, não permite validar como correto
  const isPagamentoValorCorreto = total > 0 ? diferencaPagamento < 0.01 : false;
  
  const isPagamentoValid = parcelas.length > 0 && parcelas.every(p => p.forma_pagamento) && totalPercentual === 100 && isPagamentoValorCorreto && hasAllStrategicResponsibles;
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
      if (!allItemsHaveProject) {
        toast.error('Todos os itens precisam ter um projeto definido');
        return;
      }
      setActiveTab('pagamento');
    } else if (activeTab === 'pagamento') {
      if (allMissingStrategicResponsibles.length > 0) {
        toast.error(`Selecione o responsável para: ${allMissingStrategicResponsibles.map(key => strategicResourceLabels[key]).join(', ')}`);
        return;
      }
      if (parcelas.length === 0) {
        toast.error('Adicione pelo menos uma forma de pagamento');
        return;
      }
      if (!parcelas.every(p => p.forma_pagamento)) {
        toast.error('Selecione a forma de pagamento em todas as parcelas');
        return;
      }
      if (totalPercentual !== 100) {
        toast.error(`O percentual total das parcelas deve ser 100%. Atual: ${totalPercentual.toFixed(1)}%`);
        return;
      }
      if (!isPagamentoValorCorreto) {
        toast.error('O valor total das parcelas deve ser igual ao total do pedido');
        return;
      }
      setActiveTab('entrega');
    }
  };

  const CUSTOM_PROJECT_PREFIX = '__custom_project__';

  const resolveProjectId = async (projectName: string): Promise<string> => {
    const { data: newProject, error: newProjectError } = await supabase
      .from('fin_projects')
      .insert({ name: projectName.trim(), status: 'ativo' })
      .select('id')
      .single();
    if (newProjectError) throw newProjectError;
    return newProject.id;
  };

  /**
   * After order is created, resolve projects per centro_custo group.
   * Naming: "[CentroCusto] - [ClientName]" or "[CentroCusto] - [ClientName] #[order_number]"
   */
  const resolveProjectsAfterOrder = async (orderNumber: number): Promise<Record<string, string>> => {
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
      if (!item.project_id || item.project_id === '__new_from_client__') {
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
    if (allMissingStrategicResponsibles.length > 0) {
      toast.error(`Selecione o responsável para: ${allMissingStrategicResponsibles.map(key => strategicResourceLabels[key]).join(', ')}`);
      return;
    }

    if (!isFormValid) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const parcelasPrincipal = parcelas[0];
      const parcelasSecundaria = parcelas.length > 1 ? parcelas[1] : null;
      
      // Resolve custom project names for each item (these don't need order_number)
      const resolvedCustomProjects: Record<string, string> = {};
      for (const item of items) {
        if (item.project_id?.startsWith(CUSTOM_PROJECT_PREFIX)) {
          const customName = item.project_id.replace(CUSTOM_PROJECT_PREFIX, '');
          if (!resolvedCustomProjects[customName]) {
            resolvedCustomProjects[customName] = await resolveProjectId(customName);
          }
        }
      }
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: formData.client_id,
          deal_id: formData.deal_id || null,
          architect_id: null,
          vendedor_id: user?.id,
          created_by: user?.id,
          forma_pagamento: parcelasPrincipal?.forma_pagamento || '',
          forma_pagamento_2: parcelasSecundaria?.forma_pagamento || null,
          percentual_forma_1: parcelasPrincipal?.percentual || 100,
          percentual_forma_2: parcelasSecundaria?.percentual || 0,
          data_primeiro_vencimento: parcelasPrincipal?.data_vencimento || null,
          condicao_pagamento: null,
          observacao_pagamento: (parcelas.length > 2 || parcelas.some(p => p.numero_parcelas > 1)) 
            ? JSON.stringify(parcelas) 
            : (formData.observacao_pagamento || null),
          data_entrega_prevista: formData.data_entrega_prevista || null,
          tipo_entrega: formData.tipo_entrega,
          requer_montagem: formData.requer_montagem,
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
          centro_custo: null,
          project_id: formData.project_id || null,
          chart_account_id: formData.chart_account_id || null,
          status: 'rascunho',
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
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Now resolve projects using order_number with [CentroCusto] - [Client] naming
      const projectMap = await resolveProjectsAfterOrder(order.order_number);

      // Build final items with resolved project IDs
      const itemsWithResolvedProject = items.map((item) => {
        if (item.project_id?.startsWith(CUSTOM_PROJECT_PREFIX)) {
          const customName = item.project_id.replace(CUSTOM_PROJECT_PREFIX, '');
          return { ...item, project_id: resolvedCustomProjects[customName] };
        }
        if (!item.project_id || item.project_id === '__new_from_client__') {
          const cc = item.centro_custo || 'Geral';
          return { ...item, project_id: projectMap[cc] || undefined };
        }
        return item;
      });

      // Update order with the first resolved project_id if not already set
      if (!formData.project_id && Object.keys(projectMap).length > 0) {
        const firstProjectId = Object.values(projectMap)[0];
        await supabase.from('orders').update({ project_id: firstProjectId }).eq('id', order.id);
      }

      const itemsToInsert = itemsWithResolvedProject.map((item, index) => ({
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
        project_id: item.project_id || null,
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

      // SYNC: Atualizar valor do deal no CRM se vinculado
      if (formData.deal_id) {
        await supabase
          .from('crm_deals')
          .update({ value: total })
          .eq('id', formData.deal_id);
      }

      toast.success(`Pedido #${order.order_number} criado com sucesso!`);
      clearDraftStorage();
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

  const handleClientCreated = async (clientId: string) => {
    const { data: refreshedClients } = await refetchClients();
    const createdClient = refreshedClients?.find((client) => client.id === clientId);

    setFormData(prev => ({
      ...prev,
      client_id: createdClient?.id || clientId,
    }));
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
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl xl:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <MinimizeButton onClick={handleMinimize} absolute />
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





                <div className="space-y-2 col-span-2">
                  <Label>Categoria de Receita</Label>
                  <Select
                    value={formData.chart_account_id || "_placeholder"}
                    onValueChange={(v) => setFormData({ ...formData, chart_account_id: v === "_placeholder" ? "" : v })}
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
              <OrderItemsTable items={items} onItemsChange={setItems} showFiscalFields={true} requireCentroCusto={true} requireProject={true} clientName={selectedClient?.name} draftStorageKey={CREATE_ORDER_ITEMS_DRAFT_KEY} />




              <div className="flex justify-stretch xl:justify-end">
                <div className="w-full max-w-full space-y-2 text-sm xl:w-64">
                  <div className="flex justify-between gap-3">
                    <span>Subtotal:</span>
                    <span className="text-right">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs">Desconto (%):</span>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <Input
                        type="number"
                        className="h-8 w-full sm:w-16"
                        value={formData.desconto_percentual}
                        onChange={(e) => setFormData({ ...formData, desconto_percentual: Number(e.target.value) })}
                        min={0}
                        max={100}
                      />
                      <span className="text-right text-xs text-muted-foreground">-{formatCurrency(descontoPercentual)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs">Desconto (R$):</span>
                    <MoneyInput
                      className="h-8 w-full sm:w-24"
                      value={formData.desconto_valor}
                      onChange={(v) => setFormData({ ...formData, desconto_valor: v })}
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs">Frete:</span>
                    <MoneyInput
                      className="h-8 w-full sm:w-24"
                      value={formData.valor_frete}
                      onChange={(v) => setFormData({ ...formData, valor_frete: v })}
                    />
                  </div>
                  {descontoTotal > 0 && (
                    <div className="flex justify-between gap-3 text-muted-foreground">
                      <span>Total Descontos:</span>
                      <span className="text-right">-{formatCurrency(descontoTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 border-t pt-2 text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-right break-words">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={() => setActiveTab('cliente')} className="w-full sm:w-auto">
                  Voltar
                </Button>
                <Button onClick={handleNext} disabled={!isItensValid} className="w-full sm:w-auto">
                  Avançar <ChevronRight className="ml-1 h-4 w-4" />
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
                                >
                                  30d
                                </Button>
                                <Button
                                  type="button"
                                  variant={parcela.carencia_boleto === 60 ? 'default' : 'outline'}
                                  size="sm"
                                  className={`flex-1 h-10 ${parcela.carencia_boleto === 60 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                  onClick={() => atualizarCarenciaBoleto(parcela.id, 60)}
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
                            >
                              <SelectTrigger className={`h-9 ${!parcela.forma_pagamento ? 'border-destructive ring-1 ring-destructive/30' : ''}`}>
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
                      )}
                    </div>
                  )})}
                </div>

                {/* Seção de Comissões (RT + Vendedor + Orçamentista + Projetista) */}
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
                          >
                            <SelectTrigger className="h-8 w-52">
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
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab('itens')}>
                  Voltar
                </Button>
                <Button onClick={handleNext}>
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
                  <DateBrInput
                    value={formData.data_entrega_prevista}
                    onChange={(iso) => setFormData({ ...formData, data_entrega_prevista: iso })}
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

              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <Switch
                  id="requer-montagem"
                  checked={formData.requer_montagem}
                  onCheckedChange={(checked) => setFormData({ ...formData, requer_montagem: checked })}
                />
                <Label htmlFor="requer-montagem">Requer montagem</Label>
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
      />
    </>
  );
}