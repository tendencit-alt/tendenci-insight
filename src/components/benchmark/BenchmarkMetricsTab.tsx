import { useBenchmarkMetrics, useBenchmarkClusters } from '@/hooks/useBenchmarkData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const catLabels: Record<string, string> = { financeiro: 'Financeiro', operacional: 'Operacional', comercial: 'Comercial', erp_efficiency: 'Eficiência ERP' };

export function BenchmarkMetricsTab() {
  const { data: clusters } = useBenchmarkClusters();
  const [clusterId, setClusterId] = useState<string>();
  const { data: metrics, isLoading } = useBenchmarkMetrics(clusterId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Métricas por Cluster</h2>
        <Select value={clusterId || 'all'} onValueChange={v => setClusterId(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todos clusters" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos clusters</SelectItem>
            {(clusters || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Cluster</TableHead><TableHead>Categoria</TableHead><TableHead>Métrica</TableHead><TableHead>Média</TableHead><TableHead>Mediana</TableHead><TableHead>P25</TableHead><TableHead>P75</TableHead><TableHead>P90</TableHead><TableHead>Amostra</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {!metrics?.length ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma métrica disponível</TableCell></TableRow>
              ) : metrics.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.benchmark_clusters?.name || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{catLabels[m.category] || m.category}</Badge></TableCell>
                  <TableCell>{m.metric_key}</TableCell>
                  <TableCell>{Number(m.avg_value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{Number(m.median_value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{Number(m.p25_value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{Number(m.p75_value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{Number(m.p90_value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{m.sample_size}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}
