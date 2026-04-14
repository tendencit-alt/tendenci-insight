import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { ChevronLeft, ChevronRight, Check, Circle, CheckCircle2 } from "lucide-react";
import { FormFieldRenderer } from "@/components/form-view/FormFieldRenderer";
import type { FormViewField, FormValidationError } from "@/components/form-view/types";
import { cn } from "@/lib/utils";

export interface ProgressiveFormStep {
  key: string;
  label: string;
  description?: string;
  fields: FormViewField[];
  /** Optional validation for this step */
  validate?: (values: Record<string, any>) => FormValidationError[];
}

interface ProgressiveFormProps {
  steps: ProgressiveFormStep[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onBatchChange?: (patch: Record<string, any>) => void;
  onComplete: () => void;
  errors?: FormValidationError[];
  saving?: boolean;
  completeLabel?: string;
  className?: string;
}

export function ProgressiveForm({
  steps,
  values,
  onChange,
  onBatchChange,
  onComplete,
  errors: externalErrors,
  saving,
  completeLabel = "Finalizar",
  className,
}: ProgressiveFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<FormValidationError[]>([]);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progressPct = Math.round(((currentStep + 1) / steps.length) * 100);

  const allErrors = useMemo(
    () => [...(externalErrors || []), ...stepErrors],
    [externalErrors, stepErrors]
  );

  const currentStepErrors = useMemo(
    () =>
      allErrors.filter((e) =>
        step.fields.some((f) => f.key === e.field)
      ),
    [allErrors, step.fields]
  );

  const validateCurrentStep = (): boolean => {
    if (!step.validate) return true;
    const errors = step.validate(values);
    setStepErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStepErrors([]);
    const next = currentStep + 1;
    setCurrentStep(next);
    setVisitedSteps((prev) => new Set(prev).add(next));
  };

  const handlePrev = () => {
    setStepErrors([]);
    setCurrentStep((p) => Math.max(0, p - 1));
  };

  const handleStepClick = (idx: number) => {
    if (visitedSteps.has(idx) || idx <= currentStep) {
      setStepErrors([]);
      setCurrentStep(idx);
    }
  };

  const handleComplete = () => {
    if (!validateCurrentStep()) return;
    onComplete();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Step indicators */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Etapa {currentStep + 1} de {steps.length}</span>
          <span>{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />

        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {steps.map((s, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            const isVisited = visitedSteps.has(idx);
            return (
              <button
                key={s.key}
                onClick={() => handleStepClick(idx)}
                disabled={!isVisited && idx > currentStep}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : isCompleted
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground hover:bg-muted/50",
                  !isVisited && idx > currentStep && "opacity-50 cursor-not-allowed"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : isActive ? (
                  <Circle className="h-3 w-3 fill-primary/20" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {step.description && (
            <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
              {step.description}
            </p>
          )}
          <FormFieldRenderer
            fields={step.fields}
            values={values}
            onChange={onChange}
            onBatchChange={onBatchChange}
            errors={currentStepErrors}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={isFirst}
          className="h-8 text-xs gap-1"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Anterior
        </Button>

        {isLast ? (
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={saving}
            className="h-8 text-xs gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            {saving ? "Salvando..." : completeLabel}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleNext}
            className="h-8 text-xs gap-1"
          >
            Próximo <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
