import { useEducationMetrics, CERTIFICATION_LEVELS } from '@/hooks/useEducationData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Award, TrendingUp, CheckCircle2, Percent, BarChart3 } from 'lucide-react';

function MetricCard({ title, value, subtitle, icon: Icon, color }: { title: string; value: string; subtitle?: string; icon: any; color: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </CardContent></Card>
  );
}

export function EducationAnalyticsTab() {
  const { data: m, isLoading } = useEducationMetrics();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!m) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Education Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Trilhas Disponíveis" value={String(m.totalTracks)} icon={BookOpen} color="bg-blue-500/10 text-blue-500" />
        <MetricCard title="Trilhas Iniciadas" value={String(m.startedTracks)} subtitle={`${m.completedTracks} concluídas`} icon={TrendingUp} color="bg-primary/10 text-primary" />
        <MetricCard title="Taxa Conclusão" value={`${m.completionRate}%`} icon={Percent} color="bg-green-500/10 text-green-500" />
        <MetricCard title="Certificações" value={String(m.totalCertifications)} icon={Award} color="bg-yellow-500/10 text-yellow-500" />
      </div>
      {Object.keys(m.levelCounts).length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Distribuição por Nível</h3>
          <div className="flex flex-wrap gap-3">
            {CERTIFICATION_LEVELS.map(l => (
              <div key={l.key} className="flex items-center gap-2">
                <Badge className={l.color}>{l.label}</Badge>
                <span className="text-lg font-bold">{m.levelCounts[l.key] || 0}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
      {Object.keys(m.eventCounts).length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Eventos Educacionais</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(m.eventCounts).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <Badge variant="outline">{k}</Badge>
                <span className="font-bold">{v as number}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
