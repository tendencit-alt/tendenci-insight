import { useRetentionEvents } from '@/hooks/useLifecycleData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ShieldAlert } from 'lucide-react';

const sevColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-orange-500/10 text-orange-500',
  critical: 'bg-red-500/10 text-red-500',
};

export function LifecycleRetentionTab() {
  const { data: events, isLoading } = useRetentionEvents();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Eventos de Retenção</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!events?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum evento de retenção</TableCell></TableRow>
              ) : events.map((ev: any) => (
                <TableRow key={ev.id}>
                  <TableCell className="text-sm">{new Date(ev.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-muted-foreground" />{ev.tenants?.name || '-'}</div>
                  </TableCell>
                  <TableCell>{ev.event_type}</TableCell>
                  <TableCell><Badge className={sevColors[ev.severity] || ''}>{ev.severity}</Badge></TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm">{ev.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={ev.resolved ? 'default' : 'destructive'}>
                      {ev.resolved ? 'Resolvido' : 'Aberto'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
