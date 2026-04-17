import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Eye, Loader2, RefreshCw } from "lucide-react";
import { useAutomationSuggestions, useDismissSuggestion, useTriggerDetection, type AutomationSuggestion } from "@/hooks/useAutomationSuggestions";
import { AutomationPreviewDialog } from "./AutomationPreviewDialog";

interface Props {
  module?: string;
  limit?: number;
  compact?: boolean;
  className?: string;
  showRefresh?: boolean;
}

export function SuggestionsPanel({ module, limit = 6, compact = false, className = "", showRefresh = true }: Props) {
  const { data: suggestions, isLoading } = useAutomationSuggestions({ module, limit });
  const dismiss = useDismissSuggestion();
  const detect = useTriggerDetection();
  const [previewing, setPreviewing] = useState<AutomationSuggestion | null>(null);

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Sugestões Inteligentes
              {suggestions && suggestions.length > 0 && (
                <Badge variant="secondary" className="ml-1">{suggestions.length}</Badge>
              )}
            </CardTitle>
            {showRefresh && (
              <Button size="sm" variant="ghost" onClick={() => detect.mutate()} disabled={detect.isPending} className="h-7 text-xs">
                {detect.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              </Button>
            )}
          </div>
          {!compact && <CardDescription>Padrões detectados que podem virar automações</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !suggestions?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sugestão pendente</p>
          ) : (
            suggestions.map(s => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-md border hover:border-primary/40 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">{s.description}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-[9px] h-4">{s.occurrences}× detectado</Badge>
                    <Badge variant="outline" className="text-[9px] h-4">{Math.round(s.confidence * 100)}% confiança</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" className="h-7 text-xs" onClick={() => setPreviewing(s)}>
                    <Eye className="h-3 w-3 mr-1" /> Ver
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => dismiss.mutate(s.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AutomationPreviewDialog
        suggestion={previewing}
        open={!!previewing}
        onOpenChange={(o) => !o && setPreviewing(null)}
      />
    </>
  );
}
