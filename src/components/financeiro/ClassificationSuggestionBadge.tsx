import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle2, AlertCircle, Clock, History, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClassificationSuggestionBadgeProps {
  status?: string | null;
  score?: number | null;
  source?: string | null;
  compact?: boolean;
}

const statusConfig: Record<string, { label: string; icon: any; variant: string; color: string }> = {
  auto_classified: { label: "Auto classificado", icon: Brain, variant: "default", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  classified: { label: "Classificado", icon: CheckCircle2, variant: "default", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  suggested: { label: "Sugerido", icon: AlertCircle, variant: "outline", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  pending: { label: "Pendente", icon: Clock, variant: "outline", color: "bg-muted text-muted-foreground" },
  learned: { label: "Aprendido", icon: History, variant: "default", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  divergent: { label: "Divergente", icon: AlertTriangle, variant: "destructive", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const sourceLabels: Record<string, string> = {
  keyword_rule: "Regra por palavra-chave",
  party_history: "Histórico do fornecedor/cliente",
  description_history: "Histórico de descrição",
  origin_rule: "Regra de origem",
  heuristic: "Heurística do sistema",
  manual: "Classificação manual",
};

export function ClassificationSuggestionBadge({ status, score, source, compact }: ClassificationSuggestionBadgeProps) {
  const config = statusConfig[status || "pending"] || statusConfig.pending;
  const Icon = config.icon;

  const scoreColor = (score || 0) >= 90 ? "text-green-600" : (score || 0) >= 70 ? "text-yellow-600" : "text-red-600";

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
              <Icon className="h-3 w-3" />
              {score ? `${score}%` : ""}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="text-xs space-y-1">
              <p className="font-medium">{config.label}</p>
              {score && <p>Confiança: <span className={scoreColor}>{score}%</span></p>}
              {source && <p>Fonte: {sourceLabels[source] || source}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
      {score != null && (
        <span className={`text-xs font-medium ${scoreColor}`}>
          {score}%
        </span>
      )}
    </div>
  );
}
