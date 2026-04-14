import { useGuidedTutorials, useTutorialProgress } from '@/hooks/useKnowledgeData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, GraduationCap, CheckCircle2 } from 'lucide-react';

export function KnowledgeTutorialsTab() {
  const { data: tutorials, isLoading } = useGuidedTutorials();
  const { data: progress } = useTutorialProgress();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const progressMap = new Map((progress || []).map((p: any) => [p.tutorial_id, p]));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Tutoriais Guiados</h2>
      {!tutorials?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum tutorial cadastrado</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tutorials.map((t: any) => {
            const prog = progressMap.get(t.id);
            const pct = prog ? (t.total_steps > 0 ? (prog.current_step / t.total_steps) * 100 : 0) : 0;
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{t.title}</h3>
                    </div>
                    {prog?.completed && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t.category}</Badge>
                    <span className="text-xs text-muted-foreground">{t.total_steps} passos</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
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
