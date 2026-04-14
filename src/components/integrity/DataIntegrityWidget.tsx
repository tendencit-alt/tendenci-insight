import { useDataIntegrity, type IntegritySeverity } from "@/hooks/useDataIntegrity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, AlertTriangle, XCircle, Info,
  ArrowRight, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const SEVERITY_CONFIG: Record<IntegritySeverity, { icon: any; color: string; badge: string }> = {
  critical: { icon: XCircle, color: "text-destructive", badge: "bg-destructive/10 text-destructive border-destructive/20" },
  warning: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  info: { icon: Info, color: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
};

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function progressColor(score: number) {
  if (score >= 90) return "[&>div]:bg-emerald-500";
  if (score >= 70) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-destructive";
}

export function DataIntegrityWidget({ className }: { className?: string }) {
  const { issues, score, isLoading } = useDataIntegrity();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;

  return (
    <Card className={cn("border border-border/60", className)}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Integridade da Base
          </span>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5">
                {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 text-amber-600 border-amber-300">
                {warningCount} alerta{warningCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Overall score */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Score geral</span>
              <span className={cn("text-sm font-bold tabular-nums", scoreColor(score.overall))}>
                {isLoading ? "..." : `${score.overall}%`}
              </span>
            </div>
            <Progress value={score.overall} className={cn("h-2", progressColor(score.overall))} />
          </div>
        </div>

        {/* Category breakdown */}
        <div className="grid grid-cols-2 gap-2">
          {score.categories.map(cat => (
            <div key={cat.label} className="flex items-center gap-2 p-1.5 rounded bg-muted/40">
              <div className={cn("h-2 w-2 rounded-full", cat.score >= 90 ? "bg-emerald-500" : cat.score >= 70 ? "bg-amber-500" : "bg-destructive")} />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-muted-foreground truncate block">{cat.label}</span>
              </div>
              <span className={cn("text-[11px] font-semibold tabular-nums", scoreColor(cat.score))}>
                {cat.score}%
              </span>
            </div>
          ))}
        </div>

        {/* Issues list */}
        {issues.length > 0 && (
          <div>
            <button
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              onClick={() => setExpanded(!expanded)}
            >
              <span>{issues.length} inconsistência{issues.length > 1 ? "s" : ""} detectada{issues.length > 1 ? "s" : ""}</span>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {expanded && (
              <div className="space-y-1.5 mt-1">
                {issues
                  .sort((a, b) => {
                    const order: Record<IntegritySeverity, number> = { critical: 0, warning: 1, info: 2 };
                    return order[a.severity] - order[b.severity];
                  })
                  .map(issue => {
                    const config = SEVERITY_CONFIG[issue.severity];
                    const Icon = config.icon;
                    return (
                      <div
                        key={issue.id}
                        className={cn("flex items-start gap-2 p-2 rounded-lg border text-[11px]", config.badge)}
                      >
                        <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", config.color)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{issue.message}</p>
                          {issue.detail && (
                            <p className="text-[10px] opacity-70 mt-0.5">{issue.detail}</p>
                          )}
                        </div>
                        {issue.route && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => navigate(issue.route!)}
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {issues.length === 0 && !isLoading && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 py-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Base de dados consistente</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
