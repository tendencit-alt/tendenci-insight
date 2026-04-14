import { useSelfServiceMetrics } from '@/hooks/useKnowledgeData';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, BookOpen, GraduationCap, Search, CheckCircle2, ThumbsUp, Eye } from 'lucide-react';

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

export function KnowledgeAnalyticsTab() {
  const { data: m, isLoading } = useSelfServiceMetrics();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!m) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Self-Service Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Resoluções Self-Service" value={String(m.totalResolutions)} icon={CheckCircle2} color="bg-green-500/10 text-green-500" />
        <MetricCard title="Artigos Publicados" value={String(m.totalArticles)} subtitle={`${m.totalArticleViews} visualizações`} icon={BookOpen} color="bg-blue-500/10 text-blue-500" />
        <MetricCard title="Tutoriais Concluídos" value={`${m.completionRate}%`} subtitle={`${m.completedTutorials} de ${m.totalProgress}`} icon={GraduationCap} color="bg-primary/10 text-primary" />
        <MetricCard title="Buscas com Resultado" value={`${m.searchSuccessRate}%`} subtitle={`${m.totalSearches} buscas totais`} icon={Search} color="bg-yellow-500/10 text-yellow-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard title="Artigos Úteis" value={String(m.totalHelpful)} subtitle="Avaliações positivas" icon={ThumbsUp} color="bg-green-500/10 text-green-500" />
        <MetricCard title="Total Visualizações" value={String(m.totalArticleViews)} icon={Eye} color="bg-muted text-muted-foreground" />
      </div>
    </div>
  );
}
