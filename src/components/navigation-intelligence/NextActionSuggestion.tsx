import { useNavigate } from "react-router-dom";
import { ArrowRight, Lightbulb } from "lucide-react";
import { useNavigationIntelligence } from "@/hooks/useNavigationIntelligence";

export function NextActionSuggestion() {
  const navigate = useNavigate();
  const { nextActions, basePath } = useNavigationIntelligence();

  // Don't show on home/launcher, or on pages that already render their own contextual "Próximo" list
  if (basePath === "/" || basePath === "/central-navegacao" || basePath === "/relatorios" || nextActions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-none">
      <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      <span className="text-[10px] text-muted-foreground font-medium shrink-0">Próximo:</span>
      {nextActions.map((a) => (
        <button
          key={a.label}
          onClick={() => navigate(a.route)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-colors shrink-0"
        >
          <ArrowRight className="h-3 w-3 text-primary" />
          <div className="text-left">
            <p className="text-[10px] font-medium">{a.label}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
