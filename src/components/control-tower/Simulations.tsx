import { useImpactSimulations } from '@/hooks/useAIDecisionData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FlaskConical } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ControlTowerSimulations() {
  const { data: sims, isLoading } = useImpactSimulations();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Simulações de Cenários Executivos</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Empresa</TableHead><TableHead>Tipo</TableHead><TableHead>Título</TableHead><TableHead>Parâmetros</TableHead><TableHead>Resultados</TableHead><TableHead>Data</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!sims?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma simulação registrada</TableCell></TableRow>
            ) : sims.map((s: any) => {
              const params = s.parameters ? Object.entries(s.parameters).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') : '-';
              const results = s.results ? Object.entries(s.results).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') : '-';
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-muted-foreground" />{s.tenants?.name || '-'}</div></TableCell>
                  <TableCell><Badge variant="outline">{s.simulation_type}</Badge></TableCell>
                  <TableCell>{s.title || '-'}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{params}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{results}</TableCell>
                  <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
