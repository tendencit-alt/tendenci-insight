import { useStrategyAlerts } from '@/hooks/useAIDecisionData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle } from 'lucide-react';

const sevColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground', medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-orange-500/10 text-orange-500', critical: 'bg-red-500/10 text-red-500',
};

export function AIStrategyAlertsTab() {
  const { data: items, isLoading } = useStrategyAlerts();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Alertas Estratégicos</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Empresa</TableHead><TableHead>Tipo</TableHead><TableHead>Severidade</TableHead><TableHead>Título</TableHead><TableHead>Impacto</TableHead><TableHead>Ação</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!items?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum alerta estratégico</TableCell></TableRow>
            ) : items.map((i: any) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" />{i.tenants?.name || '-'}</div></TableCell>
                <TableCell><Badge variant="outline">{i.alert_type}</Badge></TableCell>
                <TableCell><Badge className={sevColors[i.severity] || ''}>{i.severity}</Badge></TableCell>
                <TableCell className="max-w-[200px] truncate">{i.title}</TableCell>
                <TableCell className="max-w-[150px] truncate text-sm">{i.estimated_impact || '-'}</TableCell>
                <TableCell className="max-w-[150px] truncate text-sm">{i.recommended_action || '-'}</TableCell>
                <TableCell><Badge variant={i.acknowledged ? 'default' : 'destructive'}>{i.acknowledged ? 'Reconhecido' : 'Novo'}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
