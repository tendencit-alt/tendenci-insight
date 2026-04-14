import { useInvoices } from '@/hooks/useBillingData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText } from 'lucide-react';

const statusMap: Record<string, { label: string; class: string }> = {
  draft: { label: 'Rascunho', class: 'bg-muted text-muted-foreground' },
  pending: { label: 'Pendente', class: 'bg-yellow-500/10 text-yellow-500' },
  paid: { label: 'Pago', class: 'bg-green-500/10 text-green-500' },
  failed: { label: 'Falhou', class: 'bg-red-500/10 text-red-500' },
  void: { label: 'Cancelada', class: 'bg-muted text-muted-foreground' },
};

export function BillingInvoicesTab() {
  const { data: invoices, isLoading } = useInvoices();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Faturas</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Pago em</TableHead>
                <TableHead>Tentativas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : !invoices?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma fatura encontrada</TableCell></TableRow>
              ) : invoices.map((inv: any) => {
                const st = statusMap[inv.status] || { label: inv.status, class: '' };
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />#{inv.invoice_number}</div></TableCell>
                    <TableCell>{inv.tenants?.name || '-'}</TableCell>
                    <TableCell>R$ {Number(inv.total).toFixed(2)}</TableCell>
                    <TableCell><Badge className={st.class}>{st.label}</Badge></TableCell>
                    <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell>{inv.payment_attempts}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
