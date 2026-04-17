import { useState } from "react";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutomationSuggestions, useDismissSuggestion, type AutomationSuggestion } from "@/hooks/useAutomationSuggestions";
import { AutomationPreviewDialog } from "./AutomationPreviewDialog";
import { cn } from "@/lib/utils";

interface Props {
  module?: string;
  className?: string;
}

/**
 * Inline contextual banner: shows a single most-relevant suggestion.
 * Place inside dialogs/screens like Financeiro after repeated actions.
 */
export function ContextualSuggestionBanner({ module, className }: Props) {
  const { data } = useAutomationSuggestions({ module, limit: 1 });
  const dismiss = useDismissSuggestion();
  const [previewing, setPreviewing] = useState<AutomationSuggestion | null>(null);

  const suggestion = data?.[0];
  if (!suggestion) return null;

  return (
    <>
      <div className={cn("flex items-center gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5", className)}>
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{suggestion.title}</div>
          <div className="text-[11px] text-muted-foreground truncate">{suggestion.description}</div>
        </div>
        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setPreviewing(suggestion)}>
          Ver impacto <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => dismiss.mutate(suggestion.id)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <AutomationPreviewDialog
        suggestion={previewing}
        open={!!previewing}
        onOpenChange={(o) => !o && setPreviewing(null)}
      />
    </>
  );
}
