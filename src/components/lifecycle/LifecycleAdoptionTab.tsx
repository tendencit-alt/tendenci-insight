import { useCustomerAdoption } from '@/hooks/useLifecycleData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Activity } from 'lucide-react';

export function LifecycleAdoptionTab() {
  const { data: items, isLoading } = useCustomerAdoption();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Adoção por Empresa</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Módulos Utilizados</TableHead>
                <TableHead>Usuários Ativos</TableHead>
                <TableHead>Dias s/ Uso</TableHead>
                <TableHead>Score Adoção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!items?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum dado de adoção</TableCell></TableRow>
              ) : items.map((item: any) => {
                const modules = Array.isArray(item.modules_used) ? item.modules_used : [];
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" />{item.tenants?.name || '-'}</div>
                    </TableCell>
                    <TableCell>{new Date(item.period_month).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {modules.length > 0 ? modules.slice(0, 4).map((m: string) => (
                          <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                        )) : <span className="text-muted-foreground text-sm">-</span>}
                        {modules.length > 4 && <Badge variant="outline" className="text-xs">+{modules.length - 4}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{item.active_users}</TableCell>
                    <TableCell>
                      <span className={item.days_without_use > 7 ? 'text-red-500 font-medium' : item.days_without_use > 3 ? 'text-yellow-500' : ''}>
                        {item.days_without_use}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={Number(item.adoption_score) >= 70 ? 'bg-green-500/10 text-green-500' : Number(item.adoption_score) >= 40 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}>
                        {Number(item.adoption_score).toFixed(0)}
                      </Badge>
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
