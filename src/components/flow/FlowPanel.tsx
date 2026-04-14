import { useState } from "react";
import { useFlowLayer, type FlowStepState } from "@/hooks/useFlowLayer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, Clock, Lock,
  ChevronRight, User, ArrowRight, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Step status visuals ──
const STEP_STYLES: Record<FlowStepState["status"], { dot: string; text: string; icon: any }> = {
  done: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
  active: { dot: "bg-blue-500 animate-pulse", text: "text-blue-700 dark:text-blue-400", icon: ArrowRight },
  blocked: { dot: "bg-red-500", text: "text-red-700 dark:text-red-400", icon: Lock },
  pending: { dot: "bg-muted-foreground/30", text: "text-muted-foreground", icon: Clock },
};

// ── Mini flow widget for HomeLauncher ──
export function FlowWidget() {
  const { flows, totalBlockers } = useFlowLayer();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Fluxos Operacionais
          </span>
          {totalBlockers > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              {totalBlockers} bloqueio{totalBlockers > 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {flows.map(flow => (
          <div key={flow.flowId}>
            <button
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left"
              onClick={() => setExpanded(expanded === flow.flowId ? null : flow.flowId)}
            >
              <span className="text-base">{flow.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{flow.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{flow.progress}%</span>
                </div>
                <Progress value={flow.progress} className="h-1.5 mt-1" />
              </div>
              {flow.blockers.length > 0 && (
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
              )}
              <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform", expanded === flow.flowId && "rotate-90")} />
            </button>

            {expanded === flow.flowId && (
              <div className="ml-8 mt-1 mb-2 space-y-0.5">
                {flow.steps.map((step, i) => {
                  const style = STEP_STYLES[step.status];
                  return (
                    <div key={step.id} className="flex items-center gap-2 py-1">
                      {/* Connector */}
                      <div className="flex flex-col items-center w-4">
                        <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", style.dot)} />
                        {i < flow.steps.length - 1 && <div className="w-px h-3 bg-border" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-[11px] truncate", style.text)}>{step.label}</span>
                          {step.status === "blocked" && step.blocker && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Lock className="h-3 w-3 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">{step.blocker}</TooltipContent>
                            </Tooltip>
                          )}
                          {step.isLate && (
                            <Badge variant="outline" className="text-[8px] h-3.5 text-amber-600 border-amber-300">atrasado</Badge>
                          )}
                        </div>
                      </div>
                      {step.owner && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <User className="h-2.5 w-2.5" />{step.owner}
                        </span>
                      )}
                      {step.route && step.status === "active" && (
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => navigate(step.route!)}>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}

                {/* Bottleneck alert */}
                {flow.bottleneck && (
                  <div className="flex items-center gap-2 mt-1 p-1.5 rounded bg-destructive/10 text-[10px] text-destructive">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>Gargalo: <strong>{flow.bottleneck.label}</strong> {flow.bottleneck.blocker || "(atraso detectado)"}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
