import { useBenchmarkPercentiles } from '@/hooks/useBenchmarkData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const catLabels: Record<string, string> = { financeiro: 'Financeiro', operacional: 'Operacional', comercial: 'Comercial', erp_efficiency: 'Eficiência ERP' };

export function BenchmarkPercentilesTab() {
  const { data: scores, isLoading } = useBenchmarkPercentiles();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Ranking Percentil por Empresa</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Empresa</TableHead><TableHead>Cluster</TableHead><TableHead>Categoria</TableHead><TableHead>Métrica</TableHead><TableHead>Valor</TableHead><TableHead>Percentil</TableHead><TableHead className="w-[120px]">Visual</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!scores?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum percentil calculado</TableCell></TableRow>
            ) : scores.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.tenants?.name || '-'}</TableCell>
                <TableCell>{s.benchmark_clusters?.name || '-'}</TableCell>
                <TableCell><Badge variant="outline">{catLabels[s.category] || s.category}</Badge></TableCell>
                <TableCell>{s.metric_key}</TableCell>
                <TableCell>{Number(s.tenant_value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</TableCell>
                <TableCell><Badge className={s.percentile >= 75 ? 'bg-green-500/10 text-green-500' : s.percentile >= 50 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}>{s.percentile}%</Badge></TableCell>
                <TableCell><Progress value={s.percentile} className="h-2" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
