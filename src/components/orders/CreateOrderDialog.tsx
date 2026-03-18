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
import { useProjects } from '@/hooks/useProjects';
import { useOrderResponsibles } from '@/hooks/useOrderResponsibles';

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
  project_id?: string;
}

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
    numero_parcelas: number;
    carencia_boleto?: 30 | 60;
  }

  const { projects } = useProjects();

  const [formData, setFormData] = useState({
    client_id: clientId || '',
    deal_id: dealId || '',
    architect_id: '',
    project_id: '',
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
    rt: { habilitado: false, percentual: 10, valor: 0, responsavel_id: '' },
    vendedor: { habilitado: false, percentual: 3, valor: 0, responsavel_id: '' },
    orcamentista: { habilitado: false, percentual: 0.2, valor: 0, responsavel_id: '' },
    projetista: { habilitado: false, percentual: 0.2, valor: 0, responsavel_id: '' },
    montador: { habilitado: false, percentual: 10, valor: 0, responsavel_id: '' },
    producao: { habilitado: false, percentual: 0.3, valor: 0, responsavel_id: '' },
  });

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
        .select('id, name, company, commission_percent')
        .eq('active', true)
        .order('name');
      return data || [];
    },
  });

  const hasSelectedArchitect = !!formData.architect_id;

  // RT fica obrigatório e vinculado ao arquiteto selecionado
  useEffect(() => {
    const architect = architects?.find((a) => a.id === formData.architect_id);

    setComissoes((prev) => {
      if (!formData.architect_id) {
        if (!prev.rt.habilitado && !prev.rt.responsavel_id && prev.rt.valor === 0) return prev;

        return {
          ...prev,
          rt: {
            ...prev.rt,
            habilitado: false,
            responsavel_id: '',
            valor: 0,
          },
        };
      }

      const nextPercentual = architect?.commission_percent
        ? Number(architect.commission_percent)
        : prev.rt.percentual;

      const shouldUpdate =
        !prev.rt.habilitado ||
        prev.rt.responsavel_id !== formData.architect_id ||
        prev.rt.percentual !== nextPercentual;

      if (!shouldUpdate) return prev;

      return {
        ...prev,
        rt: {
          ...prev.rt,
          habilitado: true,
          responsavel_id: formData.architect_id,
          percentual: nextPercentual,
        },
      };
    });
  }, [formData.architect_id, architects]);

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
  const selectedArchitect = architects?.find(arch => arch.id === formData.architect_id);

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

  // Valor líquido Tendenci (deduz apenas as taxas de cartão e boleto)
  const valorLiquidoTendenci = totalSemTaxa - taxaCartao.valor - taxaBoleto.valor;

  // Valor líquido após recursos estratégicos (deduz taxas + comissões)
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
    rt: 'RT',
    vendedor: 'Vendedor',
    orcamentista: 'Orçamentista',
    projetista: 'Projetista',
    montador: 'Montador',
    producao: 'Produção',
  } as const;
  const missingStrategicResponsible = (Object.entries(comissoes) as Array<[
    keyof typeof comissoes,
    (typeof comissoes)[keyof typeof comissoes]
  ]>).find(([, recurso]) => recurso.habilitado && !recurso.responsavel_id)?.[0];
  const hasAllStrategicResponsibles = !missingStrategicResponsible;
  
  // Validação rigorosa: valor das formas de pagamento deve ser igual ao total
  const valorTotalPagamento = parcelas.reduce((sum, p) => sum + (total * (p.percentual / 100)), 0);
  const diferencaPagamento = Math.abs(valorTotalPagamento - total);
  // Se total é 0 ou negativo, não permite validar como correto
  const isPagamentoValorCorreto = total > 0 ? diferencaPagamento < 0.01 : false;
  const isRtValid = !hasSelectedArchitect || (comissoes.rt.habilitado && comissoes.rt.responsavel_id === formData.architect_id);
  
  const isPagamentoValid = parcelas.length > 0 && parcelas.every(p => p.forma_pagamento) && totalPercentual === 100 && isPagamentoValorCorreto && isRtValid && hasAllStrategicResponsibles;
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
      if (missingStrategicResponsible) {
        toast.error(`Selecione o responsável para ${strategicResourceLabels[missingStrategicResponsible]}`);
        return;
      }
      if (!isRtValid) {
        toast.error('O responsável de RT deve ser o arquiteto selecionado');
        return;
      }
      if (!isPagamentoValid) {
        toast.error('Selecione a forma de pagamento');
        return;
      }
      setActiveTab('entrega');
    }
  };

  const resolveProjectIdForItems = async () => {
    const hasItemsWithoutProject = items.some((item) => !item.project_id);

    if (!hasItemsWithoutProject) {
      return null;
    }

    let clientName = selectedClient?.name?.trim() || '';

    if (!clientName) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('name')
        .eq('id', formData.client_id)
        .single();

      if (clientError) throw clientError;
      clientName = clientData?.name?.trim() || '';
    }

    if (!clientName) {
      throw new Error('Não foi possível identificar o nome do cliente para gerar o projeto do pedido');
    }

    const normalizedClientName = clientName.toLowerCase();
    const projectFromCache = projects.find(
      (project) => project.label.trim().toLowerCase() === normalizedClientName
    );

    if (projectFromCache?.value) {
      return projectFromCache.value;
    }

    const { data: existingProjects, error: existingProjectError } = await supabase
      .from('fin_projects')
      .select('id, name')
      .ilike('name', clientName)
      .limit(1);

    if (existingProjectError) throw existingProjectError;

    const existingProject = existingProjects?.find(
      (project) => project.name.trim().toLowerCase() === normalizedClientName
    ) || existingProjects?.[0];

    if (existingProject) {
      return existingProject.id;
    }

    const { data: newProject, error: newProjectError } = await supabase
      .from('fin_projects')
      .insert({ name: clientName, status: 'ativo' })
      .select('id')
      .single();

    if (newProjectError) throw newProjectError;

    return newProject.id;
  };

  const handleSubmit = async () => {
    if (missingStrategicResponsible) {
      toast.error(`Selecione o responsável para ${strategicResourceLabels[missingStrategicResponsible]}`);
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
      const resolvedProjectId = await resolveProjectIdForItems();
      const itemsWithResolvedProject = items.map((item) => ({
        ...item,
        project_id: item.project_id || resolvedProjectId || undefined,
      }));
      
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
          observacao_pagamento: (parcelas.length > 2 || parcelas.some(p => p.numero_parcelas > 1)) 
            ? JSON.stringify(parcelas) 
            : (formData.observacao_pagamento || null),
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
          centro_custo: null,
          project_id: formData.project_id || resolvedProjectId || null,
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
                  {!hasSelectedArchitect && (
                    <p className="text-sm text-muted-foreground">
                      Selecione um arquiteto para liberar o recurso estratégico RT na etapa de pagamento.
                    </p>
                  )}
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
              <OrderItemsTable items={items} onItemsChange={setItems} showFiscalFields={true} requireCentroCusto={true} requireProject={true} clientName={selectedClient?.name} />




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
                    <Input
                      type="number"
                      className="h-8 w-full sm:w-24"
                      value={formData.desconto_valor}
                      onChange={(e) => setFormData({ ...formData, desconto_valor: Number(e.target.value) })}
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs">Frete:</span>
                    <Input
                      type="number"
                      className="h-8 w-full sm:w-24"
                      value={formData.valor_frete}
                      onChange={(e) => setFormData({ ...formData, valor_frete: Number(e.target.value) })}
                      min={0}
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
                                  if (v === 'cartao_credito') {
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
                              <Input
                                type="date"
                                className="h-10"
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
                              <Input
                                type="number"
                                className="h-10"
                                value={Math.round(valorParcela * 100) / 100}
                                onChange={(e) => atualizarValorParcela(parcela.id, Number(e.target.value))}
                                min={0}
                                step={0.01}
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
                                if (v === 'cartao_credito') {
                                  newParcelas[index].data_vencimento = new Date().toISOString().split('T')[0];
                                }
                                setParcelas(newParcelas);
                              }}
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

                          {/* Parcelas - só para cartão de crédito */}
                          {parcela.forma_pagamento === 'cartao_credito' && (
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
                            <Input
                              type="number"
                              className="h-10"
                              value={Math.round(valorParcela * 100) / 100}
                              onChange={(e) => atualizarValorParcela(parcela.id, Number(e.target.value))}
                              min={0}
                              step={0.01}
                            />
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
                      💰 Recursos Estratégicos
                    </Label>
                  </div>
                  
                  <div className="space-y-3">
                    {!hasSelectedArchitect && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Selecione um arquiteto na aba Cliente para habilitar o RT neste pedido.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* RT - Repasse Técnico */}
                    <div className="flex items-center gap-3">
                      <Switch checked={comissoes.rt.habilitado} disabled />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-28">RT</span>
                        <Badge variant={hasSelectedArchitect ? "secondary" : "outline"}>
                          {hasSelectedArchitect ? "Obrigatório" : "Selecione arquiteto"}
                        </Badge>
                      </div>
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
                          <Select value={comissoes.rt.responsavel_id || "_none"} disabled>
                            <SelectTrigger className="h-8 w-52">
                              <SelectValue placeholder="Responsável" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">-</SelectItem>
                              {selectedArchitect && (
                                <SelectItem value={selectedArchitect.id}>{selectedArchitect.name}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>

                    {/* Comissão Vendedor */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={comissoes.vendedor.habilitado}
                        onCheckedChange={(checked) => setComissoes(prev => ({
                          ...prev,
                          vendedor: { ...prev.vendedor, habilitado: checked }
                        }))}
                      />
                      <span className="text-sm font-medium w-28">Vendedor</span>
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

                    {/* Comissão Orçamentista */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={comissoes.orcamentista.habilitado}
                        onCheckedChange={(checked) => setComissoes(prev => ({
                          ...prev,
                          orcamentista: { ...prev.orcamentista, habilitado: checked }
                        }))}
                      />
                      <span className="text-sm font-medium w-28">Orçamentista</span>
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

                    {/* Comissão Projetista */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={comissoes.projetista.habilitado}
                        onCheckedChange={(checked) => setComissoes(prev => ({
                          ...prev,
                          projetista: { ...prev.projetista, habilitado: checked }
                        }))}
                      />
                      <span className="text-sm font-medium w-28">Projetista</span>
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
                      <span className="text-sm font-medium w-28">Montador</span>
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
                              {vendedores?.map((v) => (
                                <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>
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
                      <span className="text-sm font-medium w-28">Produção</span>
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
                      {totalPercentual}%
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
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-sm font-semibold">Total do Pedido:</span>
                    <span className="text-base font-bold text-primary">{formatCurrency(total)}</span>
                  </div>
                  {(taxaCartao.valor > 0 || taxaBoleto.valor > 0 || totalComissoes > 0) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-green-600">Valor Líquido Tendenci:</span>
                      <span className="text-base font-bold text-green-600">{formatCurrency(valorLiquidoTendenci)}</span>
                    </div>
                  )}
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-semibold text-blue-600">Valor Líquido - Recursos Estratégicos:</span>
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