import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Shortcut } from "./types";

interface Props {
  shortcut: Shortcut;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
  showKeys?: boolean;
  className?: string;
}

export function ShortcutButton({
  shortcut,
  onClick,
  variant = "outline",
  size = "sm",
  showKeys = true,
  className,
}: Props) {
  const Icon = (LucideIcons as any)[shortcut.icon] || LucideIcons.Zap;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={onClick}
          className={cn("gap-2", className)}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs">{shortcut.label}</span>
          {showKeys && shortcut.keys && (
            <kbd className="ml-1 hidden md:inline-flex items-center rounded border bg-muted px-1 text-[9px] font-mono text-muted-foreground">
              {shortcut.keys.toUpperCase()}
            </kbd>
          )}
        </Button>
      </TooltipTrigger>
      {shortcut.description && (
        <TooltipContent side="bottom">
          <p className="text-xs">{shortcut.description}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
