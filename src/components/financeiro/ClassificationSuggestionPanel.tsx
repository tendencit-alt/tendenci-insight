import { ClassificationSuggestion } from "@/hooks/useClassifyEntry";
import { Button } from "@/components/ui/button";
import { Brain, CheckCircle2, ChevronDown, ChevronUp, Lightbulb, ShieldCheck } from "lucide-react";
import { useState } from "react";

interface ClassificationSuggestionPanelProps {
  suggestions: ClassificationSuggestion[];
  bestSuggestion: ClassificationSuggestion | null;
  status: string;
  loading?: boolean;
  onApply: (suggestion: ClassificationSuggestion) => void;
  onDismiss?: () => void;
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 90 ? "bg-green-500" : value >= 70 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums">{value}%</span>
    </div>
  );
}

export function ClassificationSuggestionPanel({
  suggestions,
  bestSuggestion,
  status,
  loading,
  onApply,
  onDismiss,
}: ClassificationSuggestionPanelProps) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-dashed">
        <Brain className="h-4 w-4 animate-pulse text-primary" />
        <span className="text-sm text-muted-foreground">Analisando classificação...</span>
      </div>
    );
  }

  if (!bestSuggestion) return null;

  const isAutoApplied = status === "auto_classified";
  const others = suggestions.filter(s => s !== bestSuggestion);

  return (
    <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
      {/* Best suggestion */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {isAutoApplied ? "Classificado automaticamente" : "Sugestão de classificação"}
            </span>
            {isAutoApplied && <ShieldCheck className="h-3.5 w-3.5 text-green-600" />}
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {bestSuggestion.chart_account_name && (
              <div>
                <span className="text-muted-foreground">Categoria:</span>{" "}
                <span className="font-medium">{bestSuggestion.chart_account_name}</span>
              </div>
            )}
            {bestSuggestion.cost_center_name && (
              <div>
                <span className="text-muted-foreground">Centro Custo:</span>{" "}
                <span className="font-medium">{bestSuggestion.cost_center_name}</span>
              </div>
            )}
            {bestSuggestion.project_name && (
              <div>
                <span className="text-muted-foreground">Projeto:</span>{" "}
                <span className="font-medium">{bestSuggestion.project_name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ConfidenceBar value={bestSuggestion.confidence} />
            <span className="text-[11px] text-muted-foreground italic">{bestSuggestion.reason}</span>
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0">
          {!isAutoApplied && (
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => onApply(bestSuggestion)}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Aplicar
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onDismiss}>
              Ignorar
            </Button>
          )}
        </div>
      </div>

      {/* Other suggestions */}
      {others.length > 0 && (
        <div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAll ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {others.length} outra(s) sugestão(ões)
          </button>

          {showAll && (
            <div className="mt-2 space-y-1.5">
              {others.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-background/50 rounded border text-xs">
                  <div className="flex-1">
                    <span className="font-medium">{s.chart_account_name || "N/A"}</span>
                    {s.cost_center_name && <span className="text-muted-foreground ml-2">• {s.cost_center_name}</span>}
                    <div className="flex items-center gap-2 mt-0.5">
                      <ConfidenceBar value={s.confidence} />
                      <span className="text-[10px] text-muted-foreground">{s.reason}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] ml-2" onClick={() => onApply(s)}>
                    Usar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
