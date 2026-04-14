import { useSubscriptions } from '@/hooks/useBillingData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Building2 } from 'lucide-react';

const statusColors: Record<string, string> = {
  trial: 'bg-blue-500/10 text-blue-500',
  active: 'bg-green-500/10 text-green-500',
  past_due: 'bg-yellow-500/10 text-yellow-500',
  suspended: 'bg-orange-500/10 text-orange-500',
  cancelled: 'bg-red-500/10 text-red-500',
};

const statusLabels: Record<string, string> = {
  trial: 'Trial', active: 'Ativo', past_due: 'Inadimplente', suspended: 'Suspenso', cancelled: 'Cancelado',
};

export function BillingSubscriptionsTab() {
  const { data: subs, isLoading } = useSubscriptions();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Assinaturas</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Período Atual</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : !subs?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma assinatura encontrada</TableCell></TableRow>
              ) : subs.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{s.tenants?.name || '-'}</div>
                  </TableCell>
                  <TableCell>{s.tenant_plans?.name || '-'}</TableCell>
                  <TableCell><Badge className={statusColors[s.status] || ''}>{statusLabels[s.status] || s.status}</Badge></TableCell>
                  <TableCell className="capitalize">{s.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(s.current_period_start).toLocaleDateString('pt-BR')} — {new Date(s.current_period_end).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>R$ {Number(s.tenant_plans?.price || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
