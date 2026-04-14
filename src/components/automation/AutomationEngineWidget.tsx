import { useState } from "react";
import { useAutomationLayer, type AutomationSuggestion } from "@/hooks/useAutomationLayer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Zap, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, Clock, AlertTriangle, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_ICON: Record<string, { icon: any; color: string }> = {
  sucesso: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
  falha: { icon: XCircle, color: "text-destructive" },
  pendente: { icon: Clock, color: "text-amber-600 dark:text-amber-400" },
};

export function AutomationEngineWidget({ className }: { className?: string }) {
  const { summary, suggestions, activeRules, activateRule } = useAutomationLayer();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const handleActivate = async (suggestion: AutomationSuggestion) => {
    setActivating(suggestion.id);
    const ok = await activateRule(suggestion);
    if (ok) {
      toast.success(`Regra "${suggestion.label}" ativada`);
      queryClient.invalidateQueries({ queryKey: ["automation-layer"] });
    } else {
      toast.error("Erro ao ativar regra");
    }
    setActivating(null);
  };

  return (
    <Card className={cn("border border-border/60", className)}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Motor de Automação
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-5">
              {activeRules.filter((r: any) => r.active).length} ativas
            </Badge>
            {summary.failed > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5">
                {summary.failed} falha{summary.failed > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Summary counters */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Executadas hoje", value: summary.executedToday, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Pendentes", value: summary.pending, color: "text-amber-600 dark:text-amber-400" },
            { label: "Pausadas", value: summary.paused, color: "text-muted-foreground" },
            { label: "Falhas", value: summary.failed, color: "text-destructive" },
          ].map(item => (
            <div key={item.label} className="text-center p-1.5 rounded bg-muted/40">
              <span className={cn("text-sm font-bold tabular-nums block", item.color)}>{item.value}</span>
              <span className="text-[9px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Recent executions */}
        {summary.recentExecutions.length > 0 && (
          <div>
            <button
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              onClick={() => setExpanded(!expanded)}
            >
              <span>Execuções recentes</span>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {expanded && (
              <div className="space-y-1 mt-1">
                {summary.recentExecutions.map(exec => {
                  const statusCfg = STATUS_ICON[exec.status] || STATUS_ICON.pendente;
                  const Icon = statusCfg.icon;
                  return (
                    <div key={exec.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/30 text-[11px]">
                      <Icon className={cn("h-3 w-3 shrink-0", statusCfg.color)} />
                      <span className="flex-1 truncate">{exec.ruleName}</span>
                      <span className="text-[9px] text-muted-foreground tabular-nums">
                        {new Date(exec.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <button
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                {suggestions.length} regra{suggestions.length > 1 ? "s" : ""} sugerida{suggestions.length > 1 ? "s" : ""}
              </span>
              {showSuggestions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showSuggestions && (
              <div className="space-y-1.5 mt-1">
                {suggestions.slice(0, 6).map(s => (
                  <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg border border-border/50 bg-muted/20">
                    <Zap className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.description}</p>
                      <Badge variant="outline" className="text-[8px] h-3.5 mt-1">
                        {s.type}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 shrink-0"
                      disabled={activating === s.id}
                      onClick={() => handleActivate(s)}
                    >
                      {activating === s.id ? (
                        <Clock className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Ativar
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
