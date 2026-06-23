import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Download, Copy, FileJson, Printer, Check, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface OrderExportDialogProps {
  order: any;
  items: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BrandingInfo {
  logo_url: string | null;
  company_name: string;
  trade_name: string;
  cnpj: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  primary_color: string;
  whatsapp_url: string;
  instagram_url: string;
}

interface PaymentPlanRow {
  id: string;
  forma: string;
  formaLabel: string;
  percentual: number;
  valor: number;
  dataVencimento: string;
  numeroParcelas: number;
  carenciaBoleto?: number;
  antecipacaoAutomatica?: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  link_pagamento: 'Link de Pagamento',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  permuta: 'Permuta',
  dinheiro: 'Dinheiro',
};

const DELIVERY_LABELS: Record<string, string> = {
  a_combinar: 'A combinar',
  entrega_tendenci: 'Entrega própria',
  transportadora: 'Transportadora',
  retirada: 'Retirada',
  terceirizada: 'Terceirizada',
  entrega: 'Entrega',
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const normalizeColor = (value: string | null | undefined) => {
  const color = String(value || '').trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : '#1f2937';
};

const formatDateSafe = (value: unknown, pattern = 'dd/MM/yyyy') => {
  if (!value) return '';
  const raw = String(value);
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, pattern, { locale: ptBR });
};

const getPaymentFormLabel = (forma: unknown) => {
  const key = String(forma || '');
  return PAYMENT_METHOD_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') : '—');
};

const getDeliveryLabel = (tipo: unknown) => {
  const key = String(tipo || '');
  return DELIVERY_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') : '—');
};

const parseStoredPaymentPlan = (raw: unknown): any[] | null => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).parcelas)) {
      return (parsed as any).parcelas;
    }
    return null;
  } catch {
    return null;
  }
};

const parseStoredPaymentNote = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && typeof (parsed as any).note === 'string') {
      return (parsed as any).note;
    }
  } catch {
    return null;
  }
  return null;
};

const getPaymentNote = (order: any) => {
  const raw = typeof order?.observacao_pagamento === 'string' ? order.observacao_pagamento.trim() : '';
  const embeddedNote = parseStoredPaymentNote(raw);
  if (embeddedNote && embeddedNote.trim()) return embeddedNote;
  if (raw && !parseStoredPaymentPlan(raw) && !raw.startsWith('{')) return raw;
  return order?.condicao_pagamento || '';
};

const buildPaymentPlan = (order: any, total: number): PaymentPlanRow[] => {
  const parsedPlan = parseStoredPaymentPlan(order?.observacao_pagamento);
  const rowsSource = parsedPlan && parsedPlan.length > 0
    ? parsedPlan
    : [
        {
          id: '1',
          forma_pagamento: order?.forma_pagamento,
          percentual: order?.percentual_forma_1 ?? (order?.forma_pagamento ? 100 : 0),
          data_vencimento: order?.data_primeiro_vencimento,
          numero_parcelas: order?.parcelas || 1,
        },
        ...(order?.forma_pagamento_2 || toNumber(order?.percentual_forma_2) > 0 ? [{
          id: '2',
          forma_pagamento: order?.forma_pagamento_2,
          percentual: order?.percentual_forma_2,
          data_vencimento: '',
          numero_parcelas: 1,
        }] : []),
      ];

  return rowsSource
    .filter((row) => row?.forma_pagamento || toNumber(row?.percentual) > 0 || row?.data_vencimento)
    .map((row, index) => {
      const percentual = toNumber(row.percentual, index === 0 ? 100 : 0);
      const numeroParcelas = Math.max(1, Math.round(toNumber(row.numero_parcelas, 1)));
      return {
        id: String(row.id || index + 1),
        forma: row.forma_pagamento || '',
        formaLabel: getPaymentFormLabel(row.forma_pagamento),
        percentual,
        valor: total * (percentual / 100),
        dataVencimento: row.data_vencimento || (index === 0 ? order?.data_primeiro_vencimento || '' : ''),
        numeroParcelas,
        carenciaBoleto: row.carencia_boleto ? toNumber(row.carencia_boleto) : undefined,
        antecipacaoAutomatica: typeof row.antecipacao_automatica === 'boolean' ? row.antecipacao_automatica : undefined,
      };
    });
};

export function OrderExportDialog({ order, items, open, onOpenChange }: OrderExportDialogProps) {
  const [copied, setCopied] = useState(false);
  const [branding, setBranding] = useState<BrandingInfo>({
    logo_url: null,
    company_name: '',
    trade_name: '',
    cnpj: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    primary_color: '#1f2937',
    whatsapp_url: '',
    instagram_url: '',
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: cat }, { data: comp }] = await Promise.all([
        supabase.from('tenant_catalogo_settings').select('logo_url, primary_color, footer_company_name, whatsapp_url, instagram_url').maybeSingle(),
        supabase.from('company_settings').select('logo_url, company_name, trade_name, cnpj, email, phone, website, address, primary_color').maybeSingle(),
      ]);
      setBranding({
        logo_url: cat?.logo_url || comp?.logo_url || null,
        company_name: comp?.company_name || cat?.footer_company_name || '',
        trade_name: comp?.trade_name || '',
        cnpj: comp?.cnpj || '',
        email: comp?.email || '',
        phone: comp?.phone || '',
        website: comp?.website || '',
        address: comp?.address || '',
        primary_color: cat?.primary_color || comp?.primary_color || '#1f2937',
        whatsapp_url: cat?.whatsapp_url || '',
        instagram_url: cat?.instagram_url || '',
      });
    })();
  }, [open]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const generateNFData = () => {
    const client = order.client || {};
    const total = toNumber(order.valor_total);
    const paymentPlan = buildPaymentPlan(order, total);
    return {
      pedido: {
        numero: order.order_number,
        data_emissao: order.data_emissao,
        data_aprovacao: order.data_aprovacao,
        status: order.status || '',
      },
      emitente: {
        cnpj: branding.cnpj || '00.000.000/0001-00',
        razao_social: branding.company_name || 'Empresa',
        nome_fantasia: branding.trade_name || '',
      },
      destinatario: {
        tipo_pessoa: client.tipo_pessoa || 'pf',
        cpf_cnpj: client.cpf_cnpj || '',
        razao_social: client.razao_social || client.name || '',
        nome_fantasia: client.nome_fantasia || '',
        inscricao_estadual: client.isento_ie ? 'ISENTO' : (client.inscricao_estadual || ''),
        inscricao_municipal: client.inscricao_municipal || '',
        contribuinte_icms: client.contribuinte_icms || false,
        endereco: {
          logradouro: client.logradouro || '',
          numero: client.numero || '',
          complemento: client.complemento || '',
          bairro: client.bairro || '',
          cidade: client.city || '',
          uf: client.state || '',
          cep: client.cep || '',
        },
        telefone: client.phone || '',
        email: client.email || '',
      },
      entrega: order.entrega_mesmo_endereco ? null : {
        logradouro: order.entrega_logradouro || '',
        numero: order.entrega_numero || '',
        complemento: order.entrega_complemento || '',
        bairro: order.entrega_bairro || '',
        cidade: order.entrega_cidade || '',
        uf: order.entrega_uf || '',
        cep: order.entrega_cep || '',
      },
      itens: items.map((item, index) => ({
        numero_item: index + 1,
        codigo_produto: item.codigo_produto || '',
        descricao: item.descricao,
        ncm: item.ncm || '',
        cfop: item.cfop || '',
        unidade: item.unidade || 'UN',
        quantidade: toNumber(item.quantidade),
        valor_unitario: toNumber(item.valor_unitario),
        valor_total: toNumber(item.valor_total),
        observacoes: item.especificacoes || '',
      })),
      totais: {
        subtotal: toNumber(order.subtotal),
        subtotal_itens: items.reduce((sum, item) => sum + toNumber(item.valor_total), 0),
        desconto_percentual: toNumber(order.desconto_percentual),
        desconto_valor: toNumber(order.desconto_valor),
        valor_frete: toNumber(order.valor_frete),
        valor_total: total,
      },
      pagamento: {
        forma: paymentPlan[0]?.forma || order.forma_pagamento || '',
        forma_label: paymentPlan[0]?.formaLabel || getPaymentFormLabel(order.forma_pagamento),
        condicao: order.condicao_pagamento || '',
        parcelas: paymentPlan.reduce((sum, p) => sum + p.numeroParcelas, 0) || 1,
        data_primeiro_vencimento: paymentPlan[0]?.dataVencimento || order.data_primeiro_vencimento || '',
        formas: paymentPlan.map((p) => ({
          forma: p.forma,
          forma_label: p.formaLabel,
          percentual: p.percentual,
          valor: p.valor,
          numero_parcelas: p.numeroParcelas,
          valor_por_parcela: p.numeroParcelas > 0 ? p.valor / p.numeroParcelas : p.valor,
          data_vencimento: p.dataVencimento || '',
          carencia_boleto: p.carenciaBoleto || null,
          antecipacao_automatica: p.antecipacaoAutomatica ?? null,
        })),
        observacao: getPaymentNote(order),
      },
      transporte: order.tipo_entrega === 'transportadora' ? {
        transportadora_nome: order.transportadora_nome || '',
        transportadora_cnpj: order.transportadora_cnpj || '',
      } : null,
      observacoes_nf: order.observacoes_nf || '',
    };
  };

  const nfData = generateNFData();
  const jsonString = JSON.stringify(nfData, null, 2);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    toast.success('JSON copiado para a área de transferência');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedido_${order.order_number}_nf.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Arquivo JSON baixado');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Bloqueador de pop-up ativo');
      return;
    }

    const client = order.client || {};
    const primary = normalizeColor(branding.primary_color);
    const itemSubtotal = items.reduce((sum, item) => sum + toNumber(item.valor_total), 0);
    const subtotal = order.subtotal !== null && order.subtotal !== undefined ? toNumber(order.subtotal) : itemSubtotal;
    const descontoPercentual = toNumber(order.desconto_percentual);
    const descontoPercentualValor = subtotal * (descontoPercentual / 100);
    const descontoManualValor = toNumber(order.desconto_valor);
    const descontoValor = descontoManualValor + descontoPercentualValor;
    const frete = toNumber(order.valor_frete);
    const total = order.valor_total !== null && order.valor_total !== undefined
      ? toNumber(order.valor_total)
      : subtotal - descontoValor + frete;
    const totalCalculado = subtotal - descontoValor + frete;
    const paymentPlan = buildPaymentPlan(order, total);
    const paymentTotal = paymentPlan.reduce((sum, p) => sum + p.valor, 0);
    const paymentDiff = paymentTotal - total;
    const paymentNote = getPaymentNote(order);
    const companyDisplayName = branding.trade_name || branding.company_name || 'Sua Empresa';
    const statusLabel = order.status ? String(order.status).replace(/_/g, ' ') : '';
    const dataEmissaoLabel = formatDateSafe(order.data_emissao, "dd 'de' MMMM 'de' yyyy") || formatDateSafe(order.created_at, "dd 'de' MMMM 'de' yyyy");
    const dataAprovacaoLabel = formatDateSafe(order.data_aprovacao, 'dd/MM/yyyy');
    const dataEntregaPrevistaLabel = formatDateSafe(order.data_entrega_prevista, 'dd/MM/yyyy');

    const enderecoCliente = [
      client.logradouro && `${client.logradouro}${client.numero ? ', ' + client.numero : ''}`,
      client.complemento,
      client.bairro,
      client.city && client.state ? `${client.city}/${client.state}` : (client.city || client.state),
      client.cep && `CEP ${client.cep}`,
    ].filter(Boolean).join(' • ');

    const enderecoEntrega = order.entrega_mesmo_endereco ? null : [
      order.entrega_logradouro && `${order.entrega_logradouro}${order.entrega_numero ? ', ' + order.entrega_numero : ''}`,
      order.entrega_complemento,
      order.entrega_bairro,
      order.entrega_cidade && order.entrega_uf ? `${order.entrega_cidade}/${order.entrega_uf}` : '',
      order.entrega_cep && `CEP ${order.entrega_cep}`,
    ].filter(Boolean).join(' • ');

    const contatoEmpresa = [
      branding.phone,
      branding.email,
      branding.website,
    ].filter(Boolean).join(' • ');

    const paymentRowsHtml = paymentPlan.length > 0 ? paymentPlan.map((p, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="desc-main">${escapeHtml(p.formaLabel)}</div>
          ${p.numeroParcelas > 1 ? `<div class="desc-sub">${p.numeroParcelas}x de ${formatCurrency(p.valor / p.numeroParcelas)}</div>` : ''}
          ${p.carenciaBoleto ? `<div class="desc-sub">Carência boleto: ${escapeHtml(p.carenciaBoleto)} dias</div>` : ''}
          ${typeof p.antecipacaoAutomatica === 'boolean' ? `<div class="desc-sub">Antecipação: ${p.antecipacaoAutomatica ? 'sim' : 'não'}</div>` : ''}
        </td>
        <td class="num">${p.percentual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
        <td class="num">${p.numeroParcelas}x</td>
        <td class="num">${p.dataVencimento ? escapeHtml(formatDateSafe(p.dataVencimento)) : '—'}</td>
        <td class="num"><strong>${formatCurrency(p.valor)}</strong></td>
      </tr>
    `).join('') : `
      <tr><td colspan="6" class="muted-center">Nenhuma forma de pagamento cadastrada.</td></tr>
    `;

    const deliveryDetails = [
      dataEntregaPrevistaLabel && `Previsão: ${dataEntregaPrevistaLabel}`,
      typeof order.requer_montagem === 'boolean' && `Montagem: ${order.requer_montagem ? 'sim' : 'não'}`,
      order.tipo_entrega === 'transportadora' && order.transportadora_nome && `Transportadora: ${order.transportadora_nome}`,
      order.tipo_entrega === 'transportadora' && order.transportadora_cnpj && `CNPJ transp.: ${order.transportadora_cnpj}`,
    ].filter(Boolean).join(' • ');

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Pedido ${escapeHtml(order.order_number)} — ${escapeHtml(companyDisplayName)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f4f5f7; color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: 820px; margin: 24px auto; background: #fff; padding: 48px 56px; box-shadow: 0 4px 24px rgba(15,23,42,0.08); border-radius: 4px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 24px; border-bottom: 3px solid ${primary}; }
  .brand { display: flex; flex-direction: column; gap: 6px; max-width: 60%; }
  .brand img { max-height: 64px; max-width: 220px; object-fit: contain; margin-bottom: 4px; }
  .brand .company { font-size: 16px; font-weight: 700; color: #111827; letter-spacing: -0.01em; }
  .brand .meta { font-size: 11px; color: #6b7280; line-height: 1.55; }
  .pedido-card { text-align: right; }
  .pedido-card .label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #9ca3af; font-weight: 600; }
  .pedido-card .num { font-size: 26px; font-weight: 800; color: ${primary}; letter-spacing: -0.02em; margin: 2px 0 6px; }
  .pedido-card .date { font-size: 12px; color: #4b5563; }
  .pedido-card .status { display: inline-block; margin-top: 8px; padding: 4px 10px; background: ${primary}; color: #fff; border-radius: 999px; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }

  section { margin-top: 28px; }
  .section-title { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: ${primary}; font-weight: 700; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; }
  .field { font-size: 12px; line-height: 1.5; }
  .field .k { color: #9ca3af; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  .field .v { color: #111827; font-weight: 500; margin-top: 2px; }

  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12px; }
  thead th { background: #f9fafb; color: #4b5563; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; text-align: left; padding: 10px 8px; border-bottom: 2px solid ${primary}; }
  thead th.num, tbody td.num { text-align: right; }
  tbody td { padding: 12px 8px; border-bottom: 1px solid #f1f5f9; color: #1f2937; vertical-align: top; }
  tbody tr:last-child td { border-bottom: none; }
  .desc-main { font-weight: 600; color: #111827; }
  .desc-sub { color: #6b7280; font-size: 11px; margin-top: 2px; }

  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
  .totals { width: 320px; font-size: 12px; }
  .totals .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e7eb; color: #4b5563; }
  .totals .row.total { border-bottom: none; border-top: 2px solid ${primary}; margin-top: 6px; padding: 14px 0 4px; font-size: 16px; font-weight: 800; color: #111827; }
  .totals .row.total span:last-child { color: ${primary}; }

  .pay-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .pay-card { background: #f9fafb; border-radius: 6px; padding: 12px 14px; border-left: 3px solid ${primary}; }
  .pay-card .k { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; font-weight: 600; }
  .pay-card .v { font-size: 13px; color: #111827; font-weight: 600; margin-top: 4px; }
  .muted-center { text-align: center; color: #9ca3af; padding: 14px 8px; }
  .summary-line { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 10px; padding: 10px 12px; border-radius: 6px; background: #f9fafb; color: #374151; font-size: 12px; }
  .summary-line strong { color: #111827; }
  .checkline { margin-top: 8px; font-size: 10px; color: #6b7280; text-align: right; }
  .warning { color: #92400e; background: #fffbeb; border: 1px solid #fde68a; padding: 8px 10px; border-radius: 6px; font-size: 11px; margin-top: 8px; }

  .notes { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #78350f; line-height: 1.6; }

  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af; line-height: 1.6; }
  .footer strong { color: #4b5563; }

  .toolbar { position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; z-index: 10; }
  .toolbar button { background: ${primary}; color: #fff; border: none; padding: 10px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  .toolbar button.secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; }

  @media print {
    body { background: #fff; }
    .page { box-shadow: none; margin: 0; max-width: none; padding: 24px 32px; border-radius: 0; }
    .toolbar { display: none; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="secondary" onclick="window.close()">Fechar</button>
    <button onclick="window.print()">Salvar PDF / Imprimir</button>
  </div>

  <div class="page">
    <header class="top">
      <div class="brand">
        ${branding.logo_url ? `<img src="${escapeHtml(branding.logo_url)}" alt="Logo" />` : ''}
        <div class="company">${escapeHtml(companyDisplayName)}</div>
        <div class="meta">
          ${branding.company_name && branding.trade_name && branding.company_name !== branding.trade_name ? `${escapeHtml(branding.company_name)}<br/>` : ''}
          ${branding.cnpj ? `CNPJ ${escapeHtml(branding.cnpj)}<br/>` : ''}
          ${branding.address ? `${escapeHtml(branding.address)}<br/>` : ''}
          ${contatoEmpresa ? `${escapeHtml(contatoEmpresa)}` : ''}
        </div>
      </div>
      <div class="pedido-card">
        <div class="label">Pedido</div>
        <div class="num">#${escapeHtml(order.order_number)}</div>
        <div class="date">${escapeHtml(dataEmissaoLabel)}</div>
        ${statusLabel ? `<div class="status">${escapeHtml(statusLabel)}</div>` : ''}
      </div>
    </header>

    ${(dataAprovacaoLabel || dataEntregaPrevistaLabel) ? `
    <section>
      <div class="grid-2">
        ${dataAprovacaoLabel ? `<div class="field"><div class="k">Data de Aprovação</div><div class="v">${escapeHtml(dataAprovacaoLabel)}</div></div>` : ''}
        ${dataEntregaPrevistaLabel ? `<div class="field"><div class="k">Entrega Prevista</div><div class="v">${escapeHtml(dataEntregaPrevistaLabel)}</div></div>` : ''}
      </div>
    </section>` : ''}

    <section>
      <div class="section-title">Cliente</div>
      <div class="grid-2">
        <div class="field"><div class="k">Nome / Razão Social</div><div class="v">${escapeHtml(client.razao_social || client.name || '—')}</div></div>
        <div class="field"><div class="k">CPF / CNPJ</div><div class="v">${escapeHtml(client.cpf_cnpj || '—')}</div></div>
        <div class="field"><div class="k">E-mail</div><div class="v">${escapeHtml(client.email || '—')}</div></div>
        <div class="field"><div class="k">Telefone</div><div class="v">${escapeHtml(client.phone || '—')}</div></div>
        ${enderecoCliente ? `<div class="field" style="grid-column: 1 / -1;"><div class="k">Endereço</div><div class="v">${escapeHtml(enderecoCliente)}</div></div>` : ''}
      </div>
    </section>

    ${(enderecoEntrega || order.tipo_entrega || deliveryDetails) ? `
    <section>
      <div class="section-title">Entrega</div>
      <div class="grid-2">
        <div class="field"><div class="k">Tipo de Entrega</div><div class="v">${escapeHtml(getDeliveryLabel(order.tipo_entrega))}</div></div>
        ${deliveryDetails ? `<div class="field"><div class="k">Detalhes</div><div class="v">${escapeHtml(deliveryDetails)}</div></div>` : ''}
        ${enderecoEntrega ? `<div class="field" style="grid-column: 1 / -1;"><div class="k">Endereço de Entrega</div><div class="v">${escapeHtml(enderecoEntrega)}</div></div>` : ''}
      </div>
    </section>` : ''}

    <section>
      <div class="section-title">Itens do Pedido</div>
      <table>
        <thead>
          <tr>
            <th style="width:32px;">#</th>
            <th>Descrição</th>
            <th class="num" style="width:60px;">Qtd</th>
            <th class="num" style="width:100px;">Unitário</th>
            <th class="num" style="width:110px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>
                <div class="desc-main">${escapeHtml(item.descricao || '—')}</div>
                ${item.codigo_produto ? `<div class="desc-sub">Cód. ${escapeHtml(item.codigo_produto)}</div>` : ''}
                ${item.especificacoes ? `<div class="desc-sub">${escapeHtml(item.especificacoes)}</div>` : ''}
              </td>
              <td class="num">${toNumber(item.quantidade)} ${escapeHtml(item.unidade || 'UN')}</td>
              <td class="num">${formatCurrency(toNumber(item.valor_unitario))}</td>
              <td class="num"><strong>${formatCurrency(toNumber(item.valor_total))}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-wrap">
        <div class="totals">
          <div class="row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
          ${descontoValor > 0 ? `<div class="row"><span>Desconto</span><span>− ${formatCurrency(descontoValor)}</span></div>` : ''}
          ${frete > 0 ? `<div class="row"><span>Frete</span><span>${formatCurrency(frete)}</span></div>` : ''}
          <div class="row total"><span>Total</span><span>${formatCurrency(total)}</span></div>
          ${Math.abs(totalCalculado - total) >= 0.01 ? `<div class="checkline">Total calculado: ${formatCurrency(totalCalculado)}</div>` : ''}
        </div>
      </div>
    </section>

    <section>
      <div class="section-title">Pagamento</div>
      <table>
        <thead>
          <tr>
            <th style="width:32px;">#</th>
            <th>Forma</th>
            <th class="num" style="width:90px;">%</th>
            <th class="num" style="width:70px;">Parcelas</th>
            <th class="num" style="width:100px;">Vencimento</th>
            <th class="num" style="width:120px;">Valor</th>
          </tr>
        </thead>
        <tbody>${paymentRowsHtml}</tbody>
      </table>
      <div class="summary-line">
        <span>Total das formas de pagamento</span>
        <strong>${formatCurrency(paymentTotal)}</strong>
      </div>
      ${Math.abs(paymentDiff) >= 0.01 ? `<div class="warning">Atenção: a soma das formas de pagamento difere do total do pedido em ${formatCurrency(paymentDiff)}.</div>` : ''}
      ${paymentNote ? `<div class="field" style="margin-top: 10px;"><div class="k">Observação de Pagamento</div><div class="v">${escapeHtml(paymentNote).replace(/\n/g, '<br/>')}</div></div>` : ''}
    </section>

    ${order.observacoes_nf ? `
    <section>
      <div class="section-title">Observações</div>
      <div class="notes">${escapeHtml(order.observacoes_nf).replace(/\n/g, '<br/>')}</div>
    </section>` : ''}

    <div class="footer">
      ${branding.company_name ? `<strong>${escapeHtml(branding.company_name)}</strong>${branding.cnpj ? ` • CNPJ ${escapeHtml(branding.cnpj)}` : ''}<br/>` : ''}
      ${escapeHtml(contatoEmpresa) || ''}
      ${(branding.whatsapp_url || branding.instagram_url) ? `<br/>${[branding.whatsapp_url && 'WhatsApp', branding.instagram_url && 'Instagram'].filter(Boolean).join(' • ')}` : ''}
      <br/><br/>Pedido gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
    </div>
  </div>

  <script>
    window.addEventListener('load', () => { setTimeout(() => window.focus(), 100); });
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const previewTotal = toNumber(order?.valor_total);
  const previewPaymentPlan = buildPaymentPlan(order, previewTotal);
  const previewPaymentText = previewPaymentPlan.length > 0
    ? previewPaymentPlan
        .map((p) => `${p.formaLabel} ${p.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%${p.numeroParcelas > 1 ? ` em ${p.numeroParcelas}x` : ''}`)
        .join(' • ')
    : 'Sem pagamento cadastrado';
  const previewPaymentTotal = previewPaymentPlan.reduce((sum, p) => sum + p.valor, 0);
  const previewPaymentMatchesTotal = Math.abs(previewPaymentTotal - previewTotal) < 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Exportar Pedido #{order?.order_number}</DialogTitle>
          <DialogDescription>
            Gere uma versão profissional do pedido para enviar ao cliente — ele pode salvar como PDF ou imprimir.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="print" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="print">
              <FileText className="h-4 w-4 mr-2" />
              PDF / Imprimir
            </TabsTrigger>
            <TabsTrigger value="json">
              <FileJson className="h-4 w-4 mr-2" />
              Exportar JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="print" className="flex-1 space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Pedido pronto para o cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-5 bg-background">
                  <div className="flex justify-between items-start mb-4 pb-4 border-b">
                    <div className="flex items-start gap-3">
                      {branding.logo_url ? (
                        <img src={branding.logo_url} alt="Logo" className="h-12 max-w-[140px] object-contain" />
                      ) : null}
                      <div>
                        <p className="font-semibold text-sm">{branding.trade_name || branding.company_name || 'Sua empresa'}</p>
                        {branding.cnpj && <p className="text-xs text-muted-foreground">CNPJ {branding.cnpj}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pedido</p>
                      <p className="font-bold text-lg leading-tight">#{order?.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order?.data_emissao && format(new Date(order.data_emissao), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cliente</p>
                      <p className="font-medium">{order?.client?.razao_social || order?.client?.name}</p>
                      <p className="text-xs text-muted-foreground">{order?.client?.cpf_cnpj}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</p>
                      <p className="font-bold text-lg">{formatCurrency(order?.valor_total)}</p>
                      <Badge variant="secondary" className="mt-1">{order?.status}</Badge>
                    </div>
                  </div>

                  <div className="text-sm border-t pt-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{items?.length} item(s)</p>
                    {items?.slice(0, 3).map((item, i) => (
                      <p key={i} className="truncate text-xs">
                        {item.quantidade}× {item.descricao} — {formatCurrency(item.valor_total)}
                      </p>
                    ))}
                    {items?.length > 3 && (
                      <p className="text-xs text-muted-foreground">+ {items.length - 3} itens...</p>
                    )}
                  </div>

                  <div className="text-sm border-t pt-3 mt-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Pagamento no PDF</p>
                        <p className="text-xs text-muted-foreground break-words">{previewPaymentText}</p>
                      </div>
                      <Badge variant={previewPaymentMatchesTotal ? 'secondary' : 'destructive'} className="shrink-0">
                        {previewPaymentMatchesTotal ? 'Conferido' : 'Divergente'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {!branding.logo_url && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    💡 Cadastre o logo da sua empresa em <strong>Catálogo → Configurações</strong> para que apareça no pedido.
                  </p>
                )}

                <Button className="w-full" size="lg" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Salvar PDF / Imprimir
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Na janela que abrir, escolha <strong>"Salvar como PDF"</strong> como destino para gerar o arquivo, ou envie direto à impressora.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json" className="flex-1 overflow-hidden flex flex-col space-y-4">
            <Card className="flex-1 overflow-hidden">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Dados para NF (JSON)</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopyJSON}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDownloadJSON}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <ScrollArea className="h-[350px]">
                  <pre className="text-xs bg-muted p-4 rounded-b-lg overflow-x-auto">
                    {jsonString}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              Este JSON pode ser importado em sistemas como Tiny ERP, Bling, NFe.io e outros.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
