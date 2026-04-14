import { useSupportTickets } from '@/hooks/useSuccessOpsData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Ticket } from 'lucide-react';

const statusMap: Record<string, { label: string; class: string }> = {
  open: { label: 'Aberto', class: 'bg-blue-500/10 text-blue-500' },
  in_progress: { label: 'Em Andamento', class: 'bg-yellow-500/10 text-yellow-500' },
  waiting: { label: 'Aguardando', class: 'bg-muted text-muted-foreground' },
  resolved: { label: 'Resolvido', class: 'bg-green-500/10 text-green-500' },
  closed: { label: 'Fechado', class: 'bg-muted text-muted-foreground' },
};
const prioMap: Record<string, { label: string; class: string }> = {
  low: { label: 'Baixa', class: '' },
  medium: { label: 'Média', class: 'bg-yellow-500/10 text-yellow-500' },
  high: { label: 'Alta', class: 'bg-orange-500/10 text-orange-500' },
  urgent: { label: 'Urgente', class: 'bg-red-500/10 text-red-500' },
};

export function SuccessTicketsTab() {
  const { data: tickets, isLoading } = useSupportTickets();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Tickets de Suporte</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>#</TableHead><TableHead>Empresa</TableHead><TableHead>Assunto</TableHead><TableHead>Módulo</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead>Resolução (h)</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!tickets?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum ticket</TableCell></TableRow>
            ) : tickets.map((t: any) => {
              const st = statusMap[t.status] || { label: t.status, class: '' };
              const pr = prioMap[t.priority] || { label: t.priority, class: '' };
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-muted-foreground" />#{t.ticket_number}</div></TableCell>
                  <TableCell>{t.tenants?.name || '-'}</TableCell>
                  <TableCell className="max-w-[250px] truncate">{t.subject}</TableCell>
                  <TableCell>{t.module || '-'}</TableCell>
                  <TableCell><Badge className={pr.class}>{pr.label}</Badge></TableCell>
                  <TableCell><Badge className={st.class}>{st.label}</Badge></TableCell>
                  <TableCell>{t.resolution_time_hours != null ? Number(t.resolution_time_hours).toFixed(1) : '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
