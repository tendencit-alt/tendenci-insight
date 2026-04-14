import { useOperationalDiagnoses } from '@/hooks/useAIDecisionData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Settings } from 'lucide-react';

const matColors: Record<string, string> = {
  baixo: 'bg-red-500/10 text-red-500', medio: 'bg-yellow-500/10 text-yellow-500',
  alto: 'bg-green-500/10 text-green-500', avancado: 'bg-primary/10 text-primary',
};

export function AIOperationalDiagTab() {
  const { data: items, isLoading } = useOperationalDiagnoses();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Diagnóstico Operacional</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Empresa</TableHead><TableHead>Tipo</TableHead><TableHead>Maturidade</TableHead><TableHead>Gargalos</TableHead><TableHead>Ações Recomendadas</TableHead><TableHead>Data</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!items?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum diagnóstico operacional</TableCell></TableRow>
            ) : items.map((i: any) => {
              const bottlenecks = Array.isArray(i.bottlenecks) ? i.bottlenecks : [];
              const actions = Array.isArray(i.recommended_actions) ? i.recommended_actions : [];
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><Settings className="h-4 w-4 text-muted-foreground" />{i.tenants?.name || '-'}</div></TableCell>
                  <TableCell><Badge variant="outline">{i.diagnosis_type}</Badge></TableCell>
                  <TableCell><Badge className={matColors[i.maturity_level] || ''}>{i.maturity_level}</Badge></TableCell>
                  <TableCell className="text-sm max-w-[200px]">{bottlenecks.length > 0 ? bottlenecks.slice(0, 2).join(', ') : '-'}</TableCell>
                  <TableCell className="text-sm max-w-[200px]">{actions.length > 0 ? actions.slice(0, 2).join(', ') : '-'}</TableCell>
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
