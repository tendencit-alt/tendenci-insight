import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import type { FormViewField } from "@/components/form-view/types";
import { cn } from "@/lib/utils";

interface FormCompletionGuidanceProps {
  fields: FormViewField[];
  values: Record<string, any>;
  className?: string;
  compact?: boolean;
}

export function FormCompletionGuidance({
  fields,
  values,
  className,
  compact = false,
}: FormCompletionGuidanceProps) {
  const analysis = useMemo(() => {
    const visibleFields = fields.filter(
      (f) => !f.visibleWhen || f.visibleWhen(values)
    );
    const requiredFields = visibleFields.filter((f) => f.required);
    const optionalFields = visibleFields.filter((f) => !f.required);

    const isFilled = (f: FormViewField) => {
      const v = values[f.key];
      return v !== undefined && v !== null && v !== "" && v !== false;
    };

    const filledRequired = requiredFields.filter(isFilled);
    const filledOptional = optionalFields.filter(isFilled);
    const missingRequired = requiredFields.filter((f) => !isFilled(f));

    const totalWeight = requiredFields.length * 2 + optionalFields.length;
    const filledWeight = filledRequired.length * 2 + filledOptional.length;
    const pct = totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 100;

    const readyToSave = missingRequired.length === 0;

    return {
      pct,
      readyToSave,
      filledRequired: filledRequired.length,
      totalRequired: requiredFields.length,
      filledOptional: filledOptional.length,
      totalOptional: optionalFields.length,
      missingRequired,
    };
  }, [fields, values]);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Progress value={analysis.pct} className="h-1.5 w-20" />
        <span className="text-[10px] text-muted-foreground">{analysis.pct}%</span>
        {analysis.readyToSave ? (
          <Badge variant="outline" className="text-[9px] h-4 gap-0.5 text-emerald-600 border-emerald-300">
            <CheckCircle2 className="h-2.5 w-2.5" /> Pronto
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] h-4 gap-0.5 text-amber-600 border-amber-300">
            <AlertCircle className="h-2.5 w-2.5" /> {analysis.missingRequired.length} pendente{analysis.missingRequired.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border/60 p-3 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Preenchimento
        </span>
        <span className="text-xs font-bold">{analysis.pct}%</span>
      </div>
      <Progress value={analysis.pct} className="h-1.5" />

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>Obrigatórios: {analysis.filledRequired}/{analysis.totalRequired}</span>
        <span>Opcionais: {analysis.filledOptional}/{analysis.totalOptional}</span>
      </div>

      {analysis.readyToSave ? (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="font-medium">Formulário pronto para salvar</span>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            Campos obrigatórios faltantes:
          </p>
          {analysis.missingRequired.map((f) => (
            <div key={f.key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Circle className="h-2.5 w-2.5 text-amber-400" />
              {f.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
