import { useImpactSimulations } from '@/hooks/useAIDecisionData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FlaskConical } from 'lucide-react';

export function AISimulationsTab() {
  const { data: items, isLoading } = useImpactSimulations();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Simulações de Impacto</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Empresa</TableHead><TableHead>Tipo</TableHead><TableHead>Título</TableHead><TableHead>Parâmetros</TableHead><TableHead>Resultados</TableHead><TableHead>Data</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!items?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma simulação</TableCell></TableRow>
            ) : items.map((i: any) => {
              const params = i.parameters ? Object.entries(i.parameters).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') : '-';
              const results = i.results ? Object.entries(i.results).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') : '-';
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-muted-foreground" />{i.tenants?.name || '-'}</div></TableCell>
                  <TableCell><Badge variant="outline">{i.simulation_type}</Badge></TableCell>
                  <TableCell>{i.title || '-'}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{params}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{results}</TableCell>
                  <TableCell className="text-sm">{new Date(i.created_at).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
