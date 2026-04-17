import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Lightbulb } from "lucide-react";
import { useAnalyzeFriction, usePermissionRecommendations } from "@/hooks/usePermissionDebug";
import { ReactMarkdown } from "@/components/ai/MarkdownSafe";

export function RecommendationsTab() {
  const { data: recs, isLoading } = usePermissionRecommendations();
  const analyze = useAnalyzeFriction();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Recomendações automáticas baseadas em fricção real (heurísticas + IA).
        </p>
        <Button onClick={() => analyze.mutate()} disabled={analyze.isPending} size="sm">
          {analyze.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Analisar fricção agora
        </Button>
      </div>

      {analyze.data?.ai_insights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Insights da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{analyze.data.ai_insights}</ReactMarkdown>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      ) : (
        <div className="grid gap-3">
          {recs?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma recomendação ativa. Clique em "Analisar fricção" para gerar.
            </p>
          )}
          {recs?.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{r.title}</p>
                      <Badge variant="outline">{r.recommendation_type}</Badge>
                      <Badge variant="secondary">P{r.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
