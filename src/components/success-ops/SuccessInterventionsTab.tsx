import { useInterventions } from '@/hooks/useSuccessOpsData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Zap } from 'lucide-react';

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendente', class: 'bg-yellow-500/10 text-yellow-500' },
  in_progress: { label: 'Em Andamento', class: 'bg-blue-500/10 text-blue-500' },
  completed: { label: 'Concluída', class: 'bg-green-500/10 text-green-500' },
  skipped: { label: 'Ignorada', class: 'bg-muted text-muted-foreground' },
};

export function SuccessInterventionsTab() {
  const { data: items, isLoading } = useInterventions();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Intervenções Automáticas</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Empresa</TableHead><TableHead>Tipo</TableHead><TableHead>Playbook</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!items?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma intervenção</TableCell></TableRow>
            ) : items.map((item: any) => {
              const st = statusMap[item.status] || { label: item.status, class: '' };
              return (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">{new Date(item.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><Zap className="h-4 w-4 text-muted-foreground" />{item.tenants?.name || '-'}</div></TableCell>
                  <TableCell>{item.intervention_type}</TableCell>
                  <TableCell>{item.success_playbooks?.name || '-'}</TableCell>
                  <TableCell className="max-w-[250px] truncate text-sm">{item.description || '-'}</TableCell>
                  <TableCell><Badge className={st.class}>{st.label}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
