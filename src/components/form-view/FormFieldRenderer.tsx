import { Input } from "@/components/ui/input";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { FormViewField, FormValidationError } from "./types";

interface Props {
  fields: FormViewField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onBatchChange?: (patch: Record<string, any>) => void;
  errors?: FormValidationError[];
}

export function FormFieldRenderer({ fields, values, onChange, onBatchChange, errors = [] }: Props) {
  const getError = (key: string) => errors.find((e) => e.field === key);

  const handleChange = (field: FormViewField, value: any) => {
    onChange(field.key, value);
    if (field.onChangeEffect) {
      field.onChangeEffect(value, (patch) => {
        if (onBatchChange) {
          onBatchChange(patch);
        } else {
          Object.entries(patch).forEach(([k, v]) => onChange(k, v));
        }
      });
    }
  };

  const visibleFields = fields.filter((f) => !f.visibleWhen || f.visibleWhen(values));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {visibleFields.map((field) => {
        const error = getError(field.key);
        const value = values[field.key];
        const spanClass = field.span === 2 ? "md:col-span-2" : field.span === 3 ? "md:col-span-2 lg:col-span-3" : "";

        return (
          <div key={field.key} className={cn("space-y-1.5", spanClass)}>
            <Label htmlFor={field.key} className={cn("text-sm", error && "text-destructive")}>
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>

            {field.type === "text" && (
              <Input
                id={field.key}
                value={value || ""}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled}
                className={cn("h-9", error && "border-destructive")}
              />
            )}

            {field.type === "number" && (
              <Input
                id={field.key}
                type="number"
                value={value ?? ""}
                onChange={(e) => handleChange(field, e.target.value ? Number(e.target.value) : null)}
                placeholder={field.placeholder}
                disabled={field.disabled}
                className={cn("h-9", error && "border-destructive")}
              />
            )}

            {field.type === "currency" && (
              <Input
                id={field.key}
                type="number"
                step="0.01"
                value={value ?? ""}
                onChange={(e) => handleChange(field, e.target.value ? Number(e.target.value) : null)}
                placeholder={field.placeholder || "0,00"}
                disabled={field.disabled}
                className={cn("h-9", error && "border-destructive")}
              />
            )}

            {field.type === "date" && (
              <DateBrInput
                id={field.key}
                value={value || ""}
                onChange={(e) =/> handleChange(field, e.target.value)}
                disabled={field.disabled}
                className={cn("h-9", error && "border-destructive")}
              />
            )}

            {field.type === "select" && (
              <Select
                value={value || ""}
                onValueChange={(v) => handleChange(field, v === "__none__" ? "" : v)}
                disabled={field.disabled}
              >
                <SelectTrigger className={cn("h-9", error && "border-destructive")}>
                  <SelectValue placeholder={field.placeholder || "Selecionar..."} />
                </SelectTrigger>
                <SelectContent>
                  {!field.required && <SelectItem value="__none__">—</SelectItem>}
                  {field.options?.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.type === "textarea" && (
              <Textarea
                id={field.key}
                value={value || ""}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled}
                rows={3}
                className={cn(error && "border-destructive")}
              />
            )}

            {field.type === "checkbox" && (
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id={field.key}
                  checked={!!value}
                  onCheckedChange={(v) => handleChange(field, v)}
                  disabled={field.disabled}
                />
                <Label htmlFor={field.key} className="text-sm font-normal cursor-pointer">
                  {field.placeholder || field.label}
                </Label>
              </div>
            )}

            {field.type === "readonly" && (
              <p className="text-sm py-1.5 px-3 bg-muted rounded-md min-h-[36px] flex items-center">
                {value || "—"}
              </p>
            )}

            {field.type === "custom" && field.render && (
              field.render(value, (v) => handleChange(field, v), values)
            )}

            {error && <p className="text-[11px] text-destructive">{error.message}</p>}
            {field.helperText && !error && <p className="text-[11px] text-muted-foreground">{field.helperText}</p>}
          </div>
        );
      })}
    </div>
  );
}
