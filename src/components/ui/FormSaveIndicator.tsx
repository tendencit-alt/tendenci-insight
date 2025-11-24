import { Save, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSaveIndicatorProps {
  hasRestoredData: boolean;
  className?: string;
}

export function FormSaveIndicator({ hasRestoredData, className }: FormSaveIndicatorProps) {
  if (!hasRestoredData) return null;

  return (
    <div className={cn("flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2", className)}>
      <AlertCircle className="h-4 w-4" />
      <span>Dados recuperados da sessão anterior</span>
    </div>
  );
}
