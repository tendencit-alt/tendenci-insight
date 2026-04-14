import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SmartSuggestion {
  id: string;
  label: string;
  reason: string;
  severity: "info" | "warning" | "urgent";
  action: () => void;
  actionLabel: string;
}

interface InlineSmartSuggestionProps {
  suggestion: SmartSuggestion;
  className?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/40 dark:border-blue-800/30 text-blue-700 dark:text-blue-300",
  warning: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/40 dark:border-amber-800/30 text-amber-700 dark:text-amber-300",
  urgent: "bg-red-50/60 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/30 text-red-700 dark:text-red-300",
};

export function InlineSmartSuggestion({ suggestion, className }: InlineSmartSuggestionProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2 py-1",
        SEVERITY_STYLES[suggestion.severity],
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {suggestion.severity === "urgent" ? (
        <AlertTriangle className="h-3 w-3 shrink-0" />
      ) : (
        <Zap className="h-3 w-3 shrink-0" />
      )}
      <span className="text-[10px] truncate max-w-[180px]">{suggestion.reason}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-5 text-[9px] px-1.5 gap-0.5 ml-auto shrink-0"
        onClick={suggestion.action}
      >
        {suggestion.actionLabel}
        <ArrowRight className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
}

/** Helper: generate suggestions for a financial row */
export function getFinancialSuggestions(row: {
  id: string;
  status?: string;
  data_vencimento?: string;
  valor?: number;
}, actions: {
  markAsPaid?: (id: string) => void;
}): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const today = new Date().toISOString().split("T")[0];

  if (row.data_vencimento && row.data_vencimento <= today && row.status === "pendente") {
    suggestions.push({
      id: `overdue-${row.id}`,
      label: "Vencido",
      reason: "Conta vencida hoje",
      severity: "urgent",
      action: () => actions.markAsPaid?.(row.id),
      actionLabel: "Marcar pago",
    });
  }

  return suggestions;
}

/** Helper: generate suggestions for a CRM row */
export function getCrmSuggestions(row: {
  id: string;
  updated_at?: string;
  stage?: string;
}, actions: {
  updatePipeline?: (id: string) => void;
}): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];

  if (row.updated_at) {
    const daysSince = Math.floor(
      (Date.now() - new Date(row.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 7) {
      suggestions.push({
        id: `stale-${row.id}`,
        label: "Sem atualização",
        reason: `${daysSince} dias sem atualização`,
        severity: "warning",
        action: () => actions.updatePipeline?.(row.id),
        actionLabel: "Atualizar",
      });
    }
  }

  return suggestions;
}

/** Helper: generate suggestions for tasks */
export function getTaskSuggestions(row: {
  id: string;
  due_date?: string;
  status?: string;
}, actions: {
  completeTask?: (id: string) => void;
}): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const today = new Date().toISOString().split("T")[0];

  if (row.due_date && row.due_date < today && row.status !== "concluida") {
    suggestions.push({
      id: `late-${row.id}`,
      label: "Atrasada",
      reason: "Tarefa atrasada",
      severity: "urgent",
      action: () => actions.completeTask?.(row.id),
      actionLabel: "Concluir",
    });
  }

  return suggestions;
}
