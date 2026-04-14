import { useSuccessAlerts } from '@/hooks/useSuccessOpsData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Bell } from 'lucide-react';

const sevColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-orange-500/10 text-orange-500',
  critical: 'bg-red-500/10 text-red-500',
};

export function SuccessAlertsTab() {
  const { data: alerts, isLoading } = useSuccessAlerts();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Alertas Inteligentes</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Empresa</TableHead><TableHead>Tipo</TableHead><TableHead>Severidade</TableHead><TableHead>Título</TableHead><TableHead>Módulo</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!alerts?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum alerta</TableCell></TableRow>
            ) : alerts.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="text-sm">{new Date(a.created_at).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="font-medium"><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" />{a.tenants?.name || '-'}</div></TableCell>
                <TableCell>{a.alert_type}</TableCell>
                <TableCell><Badge className={sevColors[a.severity] || ''}>{a.severity}</Badge></TableCell>
                <TableCell className="max-w-[250px] truncate">{a.title}</TableCell>
                <TableCell>{a.source_module || '-'}</TableCell>
                <TableCell><Badge variant={a.acknowledged ? 'default' : 'destructive'}>{a.acknowledged ? 'Reconhecido' : 'Novo'}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
