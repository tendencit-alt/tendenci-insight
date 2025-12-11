import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Download, Copy, FileJson, Printer, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderExportDialogProps {
  order: any;
  items: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderExportDialog({ order, items, open, onOpenChange }: OrderExportDialogProps) {
  const [copied, setCopied] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const generateNFData = () => {
    const client = order.client || {};
    
    return {
      pedido: {
        numero: order.order_number,
        data_emissao: order.data_emissao,
        data_aprovacao: order.data_aprovacao,
      },
      emitente: {
        // Dados da empresa (podem ser configurados em settings)
        cnpj: "00.000.000/0001-00",
        razao_social: "Empresa Exemplo LTDA",
        nome_fantasia: "Empresa Exemplo",
        inscricao_estadual: "000.000.000.000",
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
        quantidade: Number(item.quantidade),
        valor_unitario: Number(item.valor_unitario),
        valor_total: Number(item.valor_total),
        observacoes: item.especificacoes || '',
      })),
      totais: {
        subtotal: order.subtotal || 0,
        desconto_percentual: order.desconto_percentual || 0,
        desconto_valor: order.desconto_valor || 0,
        valor_frete: order.valor_frete || 0,
        valor_total: order.valor_total || 0,
      },
      pagamento: {
        forma: order.forma_pagamento || '',
        condicao: order.condicao_pagamento || '',
        parcelas: order.parcelas || 1,
        data_primeiro_vencimento: order.data_primeiro_vencimento || '',
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pedido #${order.order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
          h1 { font-size: 18px; margin-bottom: 20px; }
          h2 { font-size: 14px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ccc; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .info-item { margin-bottom: 5px; }
          .label { color: #666; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .totals { text-align: right; margin-top: 20px; }
          .total-line { margin: 5px 0; }
          .total-final { font-weight: bold; font-size: 14px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>PEDIDO #${order.order_number}</h1>
            <p>Data: ${format(new Date(order.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}</p>
          </div>
        </div>

        <h2>CLIENTE</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="label">Nome/Razão Social</div>
            <div>${order.client?.razao_social || order.client?.name || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">CPF/CNPJ</div>
            <div>${order.client?.cpf_cnpj || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">IE</div>
            <div>${order.client?.isento_ie ? 'ISENTO' : (order.client?.inscricao_estadual || '-')}</div>
          </div>
          <div class="info-item">
            <div class="label">Telefone</div>
            <div>${order.client?.phone || '-'}</div>
          </div>
        </div>

        <h2>ITENS</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Código</th>
              <th>Descrição</th>
              <th>NCM</th>
              <th>Qtd</th>
              <th>Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${item.codigo_produto || '-'}</td>
                <td>${item.descricao}</td>
                <td>${item.ncm || '-'}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${Number(item.valor_unitario).toFixed(2)}</td>
                <td>R$ ${Number(item.valor_total).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-line">Subtotal: R$ ${Number(order.subtotal || 0).toFixed(2)}</div>
          ${order.desconto_percentual > 0 || order.desconto_valor > 0 ? `<div class="total-line">Desconto: -R$ ${Number((order.subtotal * (order.desconto_percentual || 0) / 100) + (order.desconto_valor || 0)).toFixed(2)}</div>` : ''}
          ${order.valor_frete > 0 ? `<div class="total-line">Frete: R$ ${Number(order.valor_frete).toFixed(2)}</div>` : ''}
          <div class="total-line total-final">TOTAL: R$ ${Number(order.valor_total || 0).toFixed(2)}</div>
        </div>

        ${order.observacoes_nf ? `
          <h2>OBSERVAÇÕES</h2>
          <p>${order.observacoes_nf}</p>
        ` : ''}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Exportar Pedido #{order?.order_number}</DialogTitle>
          <DialogDescription>
            Exporte os dados do pedido para integração com sistemas de NF ou imprima uma versão formatada
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="json" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="json">
              <FileJson className="h-4 w-4 mr-2" />
              Exportar JSON
            </TabsTrigger>
            <TabsTrigger value="print">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="print" className="flex-1 space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Visualização de Impressão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 bg-background">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">Pedido #{order?.order_number}</h3>
                      <p className="text-sm text-muted-foreground">
                        {order?.data_emissao && format(new Date(order.data_emissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge>{order?.status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground">Cliente</p>
                      <p className="font-medium">{order?.client?.name}</p>
                      <p className="text-xs">{order?.client?.cpf_cnpj}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-bold text-lg">{formatCurrency(order?.valor_total)}</p>
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted-foreground mb-2">{items?.length} item(s)</p>
                    {items?.slice(0, 3).map((item, i) => (
                      <p key={i} className="truncate">
                        {item.quantidade}x {item.descricao} - {formatCurrency(item.valor_total)}
                      </p>
                    ))}
                    {items?.length > 3 && (
                      <p className="text-muted-foreground">+ {items.length - 3} itens...</p>
                    )}
                  </div>
                </div>

                <Button className="w-full" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Pedido
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
