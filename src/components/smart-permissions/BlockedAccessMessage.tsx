import { Lock, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface Props {
  reason?: string;
  label?: string;
  variant?: "alert" | "inline";
  className?: string;
}

export function BlockedAccessMessage({ reason, label, variant = "alert", className }: Props) {
  const message =
    reason ??
    "Você não possui permissão para executar esta ação. Solicite acesso ao administrador da empresa.";

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
          className
        )}
      >
        <Lock className="h-3 w-3" />
        <span>{label ? `${label}: ` : ""}{message}</span>
      </div>
    );
  }

  return (
    <Alert className={cn("border-destructive/40 bg-destructive/5", className)}>
      <ShieldAlert className="h-4 w-4 text-destructive" />
      <AlertTitle className="text-sm">
        {label ? `Acesso negado · ${label}` : "Acesso negado"}
      </AlertTitle>
      <AlertDescription className="text-xs">{message}</AlertDescription>
    </Alert>
  );
}
