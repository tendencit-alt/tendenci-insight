import { useBenchmarkRecommendations } from '@/hooks/useBenchmarkData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lightbulb } from 'lucide-react';

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendente', class: 'bg-yellow-500/10 text-yellow-500' },
  in_progress: { label: 'Em Andamento', class: 'bg-blue-500/10 text-blue-500' },
  completed: { label: 'Concluída', class: 'bg-green-500/10 text-green-500' },
  dismissed: { label: 'Descartada', class: 'bg-muted text-muted-foreground' },
};

export function BenchmarkRecommendationsTab() {
  const { data: recs, isLoading } = useBenchmarkRecommendations();
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recomendações Baseadas em Benchmark</h2>
      {!recs?.length ? <p className="text-center text-muted-foreground py-8">Nenhuma recomendação disponível</p> : (
        <div className="space-y-3">
          {recs.map((r: any) => {
            const st = statusMap[r.status] || { label: r.status, class: '' };
            return (
              <Card key={r.id}><CardContent className="p-4 flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.tenants?.name || 'Empresa'}</span>
                    <Badge variant="outline">{r.category} — {r.metric_key}</Badge>
                    <Badge className={st.class}>{st.label}</Badge>
                  </div>
                  <p className="text-sm">{r.recommendation}</p>
                  <p className="text-xs text-muted-foreground">Percentil atual: {r.current_percentile}% → Meta: {r.target_percentile}%</p>
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
