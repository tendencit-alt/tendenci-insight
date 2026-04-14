import { useCustomerHealthScores } from '@/hooks/useLifecycleData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Heart } from 'lucide-react';

const classColors: Record<string, string> = {
  healthy: 'bg-green-500/10 text-green-500',
  attention: 'bg-yellow-500/10 text-yellow-500',
  risk: 'bg-orange-500/10 text-orange-500',
  critical: 'bg-red-500/10 text-red-500',
};
const classLabels: Record<string, string> = {
  healthy: 'Saudável', attention: 'Atenção', risk: 'Risco', critical: 'Crítico',
};

const dimensions = [
  { key: 'usage_score', label: 'Uso' },
  { key: 'activation_score', label: 'Ativação' },
  { key: 'reconciliation_score', label: 'Conciliação' },
  { key: 'dre_score', label: 'DRE' },
  { key: 'payment_score', label: 'Pagamento' },
  { key: 'support_score', label: 'Suporte' },
  { key: 'access_score', label: 'Acesso' },
];

export function LifecycleHealthTab() {
  const { data: scores, isLoading } = useCustomerHealthScores();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Health Score por Empresa</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                {dimensions.map(d => <TableHead key={d.key} className="text-center">{d.label}</TableHead>)}
                <TableHead className="text-center">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!scores?.length ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum health score calculado</TableCell></TableRow>
              ) : scores.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2"><Heart className="h-4 w-4 text-muted-foreground" />{s.tenants?.name || '-'}</div>
                  </TableCell>
                  {dimensions.map(d => (
                    <TableCell key={d.key} className="text-center">
                      <span className={`text-sm font-medium ${Number(s[d.key]) >= 70 ? 'text-green-500' : Number(s[d.key]) >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {Number(s[d.key]).toFixed(0)}
                      </span>
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold">{Number(s.total_score).toFixed(0)}</TableCell>
                  <TableCell><Badge className={classColors[s.classification] || ''}>{classLabels[s.classification] || s.classification}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
