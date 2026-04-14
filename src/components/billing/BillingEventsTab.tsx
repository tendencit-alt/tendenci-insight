import { useBillingEvents } from '@/hooks/useBillingData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Zap } from 'lucide-react';

export function BillingEventsTab() {
  const { data: events, isLoading } = useBillingEvents();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Eventos de Cobrança</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo Evento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : !events?.length ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum evento registrado</TableCell></TableRow>
              ) : events.map((ev: any) => (
                <TableRow key={ev.id}>
                  <TableCell className="text-sm">{new Date(ev.created_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{ev.tenants?.name || '-'}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><Zap className="h-4 w-4 text-muted-foreground" />{ev.event_type}</div></TableCell>
                  <TableCell><Badge variant="outline">{ev.status || '-'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
