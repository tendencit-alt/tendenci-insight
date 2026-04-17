import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSmartShortcuts } from "@/hooks/useSmartShortcuts";
import { ShortcutButton } from "./ShortcutButton";
import { ShortcutSettingsDialog } from "./ShortcutSettingsDialog";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  compact?: boolean;
}

export function QuickAccessBar({ className, compact = false }: Props) {
  const { quickShortcuts, executeShortcut } = useSmartShortcuts();
  const [open, setOpen] = useState(false);

  if (quickShortcuts.length === 0) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex items-center gap-1.5 flex-wrap rounded-lg border bg-card/50 p-2 backdrop-blur-sm",
          className
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
          Atalhos
        </span>
        {quickShortcuts.map((s) => (
          <ShortcutButton
            key={s.id}
            shortcut={s}
            onClick={() => executeShortcut(s, "quickbar")}
            variant="ghost"
            size="sm"
            showKeys={!compact}
          />
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-auto"
          onClick={() => setOpen(true)}
          aria-label="Personalizar atalhos"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ShortcutSettingsDialog open={open} onOpenChange={setOpen} />
    </TooltipProvider>
  );
}
