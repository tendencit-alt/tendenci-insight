import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusOption {
  value: string;
  label: string;
  color: "green" | "yellow" | "red" | "blue" | "gray" | "orange" | "purple";
}

const DOT_COLORS: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  gray: "bg-muted-foreground/50",
  orange: "bg-orange-500",
  purple: "bg-violet-500",
};

interface InlineStatusChangeProps {
  currentStatus: string;
  options: StatusOption[];
  onStatusChange: (newStatus: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export function InlineStatusChange({
  currentStatus,
  options,
  onStatusChange,
  disabled,
  className,
}: InlineStatusChangeProps) {
  const [saving, setSaving] = useState(false);
  const current = options.find((o) => o.value === currentStatus);

  const handleChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setSaving(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setSaving(false);
    }
  };

  if (disabled) {
    return (
      <Badge variant="outline" className={cn("text-[10px] h-5 gap-1", className)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", DOT_COLORS[current?.color || "gray"])} />
        {current?.label || currentStatus}
      </Badge>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className={className}>
      {saving ? (
        <Badge variant="outline" className="text-[10px] h-5 gap-1">
          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Salvando...
        </Badge>
      ) : (
        <Select value={currentStatus} onValueChange={handleChange}>
          <SelectTrigger className="h-6 text-[10px] w-auto min-w-[100px] border-dashed px-2 gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT_COLORS[current?.color || "gray"])} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full", DOT_COLORS[o.color])} />
                  {o.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
