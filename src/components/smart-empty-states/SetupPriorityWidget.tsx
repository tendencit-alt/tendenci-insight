import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { EMPTY_STATE_CONFIGS } from "./SmartEmptyState";

interface SetupPriorityWidgetProps {
  /** Module keys that are still unconfigured */
  unconfiguredModules?: string[];
  className?: string;
}

export function SetupPriorityWidget({
  unconfiguredModules,
  className = "",
}: SetupPriorityWidgetProps) {
  const navigate = useNavigate();

  // Default: show all modules; in production, pass only unconfigured ones
  const modules = (unconfiguredModules || Object.keys(EMPTY_STATE_CONFIGS))
    .map((key) => EMPTY_STATE_CONFIGS[key])
    .filter(Boolean);

  if (modules.length === 0) return null;

  // Show max 3 priority modules
  const prioritized = modules.slice(0, 3);
  const totalModules = Object.keys(EMPTY_STATE_CONFIGS).length;
  const configuredCount = totalModules - modules.length;
  const progressPct = Math.round((configuredCount / totalModules) * 100);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Configuração do Sistema
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] h-5 gap-1">
            {configuredCount}/{totalModules} módulos
          </Badge>
          <span className="text-[10px] text-muted-foreground">{progressPct}%</span>
        </div>
      </div>
      <Progress value={progressPct} className="h-1.5" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {prioritized.map((cfg) => {
          const IconComp = (LucideIcons as any)[cfg.icon] || LucideIcons.HelpCircle;
          const primaryAction = cfg.actions.find((a) => a.primary) || cfg.actions[0];
          return (
            <Card key={cfg.module} className={`${cfg.borderColor} overflow-hidden`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-7 w-7 rounded-lg ${cfg.bgColor} flex items-center justify-center`}>
                    <IconComp className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{cfg.title}</p>
                    <Badge variant="outline" className="text-[8px] h-3.5 mt-0.5">
                      <AlertTriangle className="h-2 w-2 mr-0.5" /> Pendente
                    </Badge>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{cfg.description}</p>
                {primaryAction && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1 rounded-md w-full"
                    onClick={() => primaryAction.route && navigate(primaryAction.route)}
                  >
                    <ArrowRight className="h-3 w-3" />
                    {primaryAction.label}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
