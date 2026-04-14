import { useFinancialDiagnoses } from '@/hooks/useAIDecisionData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, HeartPulse } from 'lucide-react';

const sevColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground', medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-orange-500/10 text-orange-500', critical: 'bg-red-500/10 text-red-500',
};

export function AIFinancialDiagTab() {
  const { data: items, isLoading } = useFinancialDiagnoses();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Diagnóstico Financeiro</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Empresa</TableHead><TableHead>Tipo</TableHead><TableHead>Severidade</TableHead><TableHead>Descrição</TableHead><TableHead>Causa Provável</TableHead><TableHead>Ação Sugerida</TableHead><TableHead>P</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!items?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum diagnóstico</TableCell></TableRow>
            ) : items.map((i: any) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium"><div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-muted-foreground" />{i.tenants?.name || '-'}</div></TableCell>
                <TableCell><Badge variant="outline">{i.diagnosis_type}</Badge></TableCell>
                <TableCell><Badge className={sevColors[i.severity] || ''}>{i.severity}</Badge></TableCell>
                <TableCell className="max-w-[200px] truncate text-sm">{i.description}</TableCell>
                <TableCell className="max-w-[150px] truncate text-sm">{i.probable_cause || '-'}</TableCell>
                <TableCell className="max-w-[150px] truncate text-sm">{i.suggested_action || '-'}</TableCell>
                <TableCell>{i.priority}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
