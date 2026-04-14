import { useBenchmarkSummary } from '@/hooks/useBenchmarkData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3, Target, Zap, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const catLabels: Record<string, string> = { financeiro: 'Financeiro', operacional: 'Operacional', comercial: 'Comercial', erp_efficiency: 'Eficiência ERP' };
const catColors: Record<string, string> = { financeiro: 'text-green-500', operacional: 'text-blue-500', comercial: 'text-purple-500', erp_efficiency: 'text-amber-500' };

export function BenchmarkOverviewTab() {
  const { data: s, isLoading } = useBenchmarkSummary();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!s) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Visão Geral Benchmarking</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10 text-primary"><BarChart3 className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Clusters Ativos</p><p className="text-xl font-bold">{s.totalClusters}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><Target className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Percentil Médio</p><p className="text-xl font-bold">{s.avgPercentile}%</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500"><Zap className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Recomendações Pendentes</p><p className="text-xl font-bold">{s.pendingRecs}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10 text-green-500"><TrendingUp className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Recomendações Concluídas</p><p className="text-xl font-bold">{s.completedRecs}</p></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-base">Percentil por Categoria</CardTitle></CardHeader><CardContent className="space-y-4">
        {Object.entries(s.byCategory).map(([cat, pct]) => (
          <div key={cat} className="space-y-1">
            <div className="flex justify-between text-sm"><span className={catColors[cat]}>{catLabels[cat]}</span><span className="font-medium">{pct}%</span></div>
            <Progress value={pct as number} className="h-2" />
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}
