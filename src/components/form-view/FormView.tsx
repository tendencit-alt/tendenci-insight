import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { FormViewProps, FormValidationError } from "./types";
import { FormViewHeader } from "./FormViewHeader";
import { FormFieldRenderer } from "./FormFieldRenderer";
import { FormViewSidePanel } from "./FormViewSidePanel";
import { StatusBanner } from "@/components/ui/StatusBanner";

export function FormView({
  title, subtitle, status, statusBanner, isNew,
  values, onChange, onBatchChange,
  topFields, tabs, defaultTab,
  onSave, onSaveAndClose, onDuplicate, onDelete, extraActions, saving,
  errors: externalErrors, validate,
  autosave, autosaveDelay = 3000, onAutosave, lastSavedAt,
  showSidePanel = true, timeline, relations, alerts, sidePanelExtra, sidePanelTabs,
  createdAt, createdBy, updatedAt, updatedBy,
  onBack, backLabel,
}: FormViewProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key || "");
  const [internalErrors, setInternalErrors] = useState<FormValidationError[]>([]);
  const [autosaveTimer, setAutosaveTimer] = useState<string | undefined>(lastSavedAt);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  const errors = externalErrors || internalErrors;

  // Autosave
  useEffect(() => {
    if (!autosave || !onAutosave) return;
    isDirtyRef.current = true;

    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      if (isDirtyRef.current) {
        onAutosave(values);
        isDirtyRef.current = false;
        setAutosaveTimer(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      }
    }, autosaveDelay);

    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, [values, autosave, autosaveDelay, onAutosave]);

  const handleSave = useCallback(() => {
    if (validate) {
      const validationErrors = validate(values);
      setInternalErrors(validationErrors);
      if (validationErrors.length > 0) return;
    }
    onSave?.();
  }, [values, validate, onSave]);

  const handleSaveAndClose = useCallback(() => {
    if (validate) {
      const validationErrors = validate(values);
      setInternalErrors(validationErrors);
      if (validationErrors.length > 0) return;
    }
    onSaveAndClose?.();
  }, [values, validate, onSaveAndClose]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <FormViewHeader
        title={title}
        subtitle={subtitle}
        status={status}
        isNew={isNew}
        onSave={onSave ? handleSave : undefined}
        onSaveAndClose={onSaveAndClose ? handleSaveAndClose : undefined}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        extraActions={extraActions}
        saving={saving}
        onBack={onBack}
        backLabel={backLabel}
        lastSavedAt={autosaveTimer || lastSavedAt}
      />

      {/* Validation Errors Banner */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium text-sm">Corrija os erros antes de salvar:</p>
            <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
              {errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Layout: Content + Side Panel */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Top Fields */}
          {topFields && topFields.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <FormFieldRenderer
                  fields={topFields}
                  values={values}
                  onChange={onChange}
                  onBatchChange={onBatchChange}
                  errors={errors}
                />
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="text-xs gap-1.5">
                  {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                  {tab.label}
                  {tab.badge !== undefined && (
                    <Badge variant="secondary" className="text-[10px] h-4 ml-1">{tab.badge}</Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent key={tab.key} value={tab.key} className="mt-3">
                <Card>
                  <CardContent className="p-4">
                    {tab.content
                      ? tab.content(values, onChange)
                      : tab.fields
                        ? <FormFieldRenderer fields={tab.fields} values={values} onChange={onChange} onBatchChange={onBatchChange} errors={errors} />
                        : <p className="text-sm text-muted-foreground text-center py-6">Sem conteúdo</p>
                    }
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Side Panel */}
        {showSidePanel && (
          <FormViewSidePanel
            timeline={timeline}
            relations={relations}
            alerts={alerts}
            createdAt={createdAt}
            createdBy={createdBy}
            updatedAt={updatedAt}
            updatedBy={updatedBy}
            extra={sidePanelExtra}
          />
        )}
      </div>
    </div>
  );
}
