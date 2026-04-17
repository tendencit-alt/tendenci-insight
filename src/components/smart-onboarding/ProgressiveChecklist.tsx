import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowRight, ListChecks, Star } from "lucide-react";
import { ONBOARDING_TASKS } from "./types";
import { useSmartOnboarding } from "@/hooks/useSmartOnboarding";

interface Props {
  compact?: boolean;
  className?: string;
}

export function ProgressiveChecklist({ compact = false, className = "" }: Props) {
  const navigate = useNavigate();
  const { onboarding } = useSmartOnboarding();

  // Map known DB flags to our task keys
  const completion: Record<string, boolean> = {
    setup_completed: !!onboarding?.segment,
    chart_template: !!onboarding?.chart_template,
    first_bank_account: !!onboarding?.first_import,
    first_entry: !!onboarding?.first_import,
    first_dashboard: !!onboarding?.first_dashboard,
    first_reconciliation: !!onboarding?.first_reconciliation,
    first_dre: !!onboarding?.first_dre,
  };

  const totalWeight = ONBOARDING_TASKS.reduce((s, t) => s + t.weight, 0);
  const earnedWeight = ONBOARDING_TASKS.reduce((s, t) => (completion[t.key] ? s + t.weight : s), 0);
  const pct = Math.round((earnedWeight / totalWeight) * 100);

  const visible = compact ? ONBOARDING_TASKS.filter(t => t.priority) : ONBOARDING_TASKS;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            Checklist de Implantação
          </CardTitle>
          <Badge variant="outline">{pct}%</Badge>
        </div>
        {!compact && <CardDescription>Conclua para ativar todo o potencial do ERP</CardDescription>}
        <Progress value={pct} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map(task => {
          const done = completion[task.key];
          return (
            <div
              key={task.key}
              className={`flex items-center gap-3 p-2 rounded-md border ${
                done ? "border-success/30 bg-success/5" : "border-border"
              }`}
            >
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                  done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : task.priority ? <Star className="h-3 w-3" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{task.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{task.description}</div>
              </div>
              {!done && task.route && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(task.route!)}>
                  Iniciar <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
