import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export type InlineEditType = "text" | "number" | "currency" | "date" | "select";

export interface InlineEditOption {
  value: string;
  label: string;
}

interface InlineEditCellProps {
  value: any;
  displayValue?: string;
  type?: InlineEditType;
  options?: InlineEditOption[];
  onSave: (newValue: any) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function InlineEditCell({
  value,
  displayValue,
  type = "text",
  options,
  onSave,
  disabled,
  placeholder,
  className,
}: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setEditValue(value);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setEditValue(value);
  };

  const save = async () => {
    if (editValue === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(type === "number" || type === "currency" ? Number(editValue) : editValue);
      setEditing(false);
    } catch (error) {
      console.error("Failed to save inline edit:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  };

  if (!editing) {
    return (
      <button
        onClick={startEdit}
        className={cn(
          "group/edit inline-flex items-center gap-1 px-1.5 py-0.5 -mx-1.5 rounded hover:bg-muted/60 transition-colors text-left max-w-full",
          disabled && "cursor-default hover:bg-transparent",
          className
        )}
      >
        <span className="truncate">{displayValue ?? value ?? "—"}</span>
        {!disabled && (
          <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover/edit:text-muted-foreground/60 transition-colors shrink-0" />
        )}
      </button>
    );
  }

  if (type === "select" && options) {
    return (
      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Select
          value={String(editValue ?? "")}
          onValueChange={async (v) => {
            setEditValue(v);
            setSaving(true);
            try {
              await onSave(v);
              setEditing(false);
            } catch (error) {
              console.error("Failed to save select:", error);
            } finally {
              setSaving(false);
            }
          }}
        >
          <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]">
            <SelectValue placeholder={placeholder || "Selecionar..."} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button onClick={cancel} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted">
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Input
        ref={inputRef}
        type={type === "currency" || type === "number" ? "number" : type === "date" ? "date" : "text"}
        step={type === "currency" ? "0.01" : undefined}
        value={editValue ?? ""}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={save}
        disabled={saving}
        placeholder={placeholder}
        className="h-7 text-xs w-auto min-w-[80px] max-w-[160px]"
      />
      <button
        onClick={save}
        disabled={saving}
        className="h-6 w-6 flex items-center justify-center rounded hover:bg-primary/10 text-primary"
      >
        <Check className="h-3 w-3" />
      </button>
      <button onClick={cancel} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted">
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
}
