import { useEducationTracks, useEducationProgress } from '@/hooks/useEducationData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, BookOpen, CheckCircle2 } from 'lucide-react';

const diffColors: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-500',
  intermediate: 'bg-yellow-500/10 text-yellow-500',
  advanced: 'bg-red-500/10 text-red-500',
};
const diffLabels: Record<string, string> = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado' };

export function EducationTracksTab() {
  const { data: tracks, isLoading } = useEducationTracks();
  const { data: progress } = useEducationProgress();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const progressMap = new Map<string, any>((progress || []).map((p: any) => [p.track_id, p]));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Trilhas de Aprendizado</h2>
      {!tracks?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma trilha cadastrada</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tracks.map((t: any) => {
            const prog = progressMap.get(t.id);
            const pct = prog && t.total_modules > 0 ? (prog.current_module / t.total_modules) * 100 : 0;
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{t.title}</h3>
                    </div>
                    {prog?.completed && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t.category}</Badge>
                    <Badge className={diffColors[t.difficulty] || ''}>{diffLabels[t.difficulty] || t.difficulty}</Badge>
                    <span className="text-xs text-muted-foreground">{t.total_modules} módulos</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{prog ? 'Em andamento' : 'Não iniciada'}</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
