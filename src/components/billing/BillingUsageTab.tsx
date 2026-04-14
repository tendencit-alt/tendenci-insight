import { useUsageConsumption } from '@/hooks/useBillingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';

export function BillingUsageTab() {
  const { data: usage, isLoading } = useUsageConsumption();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Consumo por Empresa</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Métrica</TableHead>
                <TableHead>Consumo</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead className="w-[200px]">Progresso</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!usage?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum consumo registrado</TableCell></TableRow>
              ) : usage.map((u: any) => {
                const pct = u.limit_value > 0 ? (u.current_value / u.limit_value) * 100 : 0;
                const critical = pct >= 90;
                const warning = pct >= 70;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.tenants?.name || '-'}</TableCell>
                    <TableCell>{u.metric_name}</TableCell>
                    <TableCell>{Number(u.current_value).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{u.limit_value > 0 ? Number(u.limit_value).toLocaleString('pt-BR') : '∞'}</TableCell>
                    <TableCell>
                      {u.limit_value > 0 && (
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(pct, 100)} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-10">{pct.toFixed(0)}%</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {critical ? (
                        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Crítico</Badge>
                      ) : warning ? (
                        <Badge className="bg-yellow-500/10 text-yellow-500">Atenção</Badge>
                      ) : (
                        <Badge className="bg-green-500/10 text-green-500">Normal</Badge>
                      )}
                    </TableCell>
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
