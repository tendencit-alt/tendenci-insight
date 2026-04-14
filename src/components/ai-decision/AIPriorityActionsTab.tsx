import { usePriorityActions } from '@/hooks/useAIDecisionData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Zap } from 'lucide-react';

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendente', class: 'bg-yellow-500/10 text-yellow-500' },
  in_progress: { label: 'Em Andamento', class: 'bg-blue-500/10 text-blue-500' },
  completed: { label: 'Concluída', class: 'bg-green-500/10 text-green-500' },
  dismissed: { label: 'Descartada', class: 'bg-muted text-muted-foreground' },
};

export function AIPriorityActionsTab() {
  const { data: items, isLoading } = usePriorityActions();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Ações Prioritárias</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Empresa</TableHead><TableHead>Tipo</TableHead><TableHead>Título</TableHead><TableHead>Módulo</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!items?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma ação prioritária</TableCell></TableRow>
            ) : items.map((i: any) => {
              const st = statusMap[i.status] || { label: i.status, class: '' };
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><Zap className="h-4 w-4 text-muted-foreground" />{i.tenants?.name || '-'}</div></TableCell>
                  <TableCell><Badge variant="outline">{i.action_type}</Badge></TableCell>
                  <TableCell className="max-w-[250px] truncate">{i.title}</TableCell>
                  <TableCell className="text-sm">{i.source_module || '-'}</TableCell>
                  <TableCell>{i.priority}</TableCell>
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
