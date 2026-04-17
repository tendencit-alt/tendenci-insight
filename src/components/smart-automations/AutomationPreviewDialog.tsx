import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, X, Loader2, Clock, TrendingUp } from "lucide-react";
import { useApplySuggestion, type AutomationSuggestion } from "@/hooks/useAutomationSuggestions";

interface Props {
  suggestion: AutomationSuggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutomationPreviewDialog({ suggestion, open, onOpenChange }: Props) {
  const apply = useApplySuggestion();
  const [pending, setPending] = useState(false);

  if (!suggestion) return null;
  const impact = suggestion.impact_preview || {};
  const evidence = suggestion.evidence || {};

  const handleApply = async () => {
    setPending(true);
    try {
      await apply.mutateAsync({ id: suggestion.id });
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {suggestion.title}
          </DialogTitle>
          <DialogDescription>{suggestion.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> EVIDÊNCIA
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-[11px] text-muted-foreground">Ocorrências</div>
                <div className="font-medium">{evidence.occurrences ?? suggestion.occurrences}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Confiança</div>
                <div className="font-medium">{Math.round(suggestion.confidence * 100)}%</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 p-3 bg-primary/5">
            <div className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> IMPACTO ESPERADO
            </div>
            <ul className="space-y-1 text-sm">
              {impact.runs && <li>• Frequência: <strong>{impact.runs}</strong></li>}
              {impact.action && <li>• {impact.action}</li>}
              {impact.category && <li>• Categoria pré-definida</li>}
              {impact.cost_center && <li>• Centro de custo pré-definido</li>}
            </ul>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline">{suggestion.suggestion_type}</Badge>
            {suggestion.module && <Badge variant="outline">{suggestion.module}</Badge>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleApply} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Criar automação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
