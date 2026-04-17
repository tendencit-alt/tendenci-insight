import { TooltipProvider } from "@/components/ui/tooltip";
import { useSmartShortcuts } from "@/hooks/useSmartShortcuts";
import { ShortcutButton } from "./ShortcutButton";
import { Sparkles } from "lucide-react";

export function ContextualShortcutsPanel() {
  const { contextualShortcuts, executeShortcut } = useSmartShortcuts();

  if (contextualShortcuts.length === 0) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1.5 flex-wrap rounded-md border border-dashed bg-muted/30 px-3 py-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
          Nesta tela
        </span>
        {contextualShortcuts.map((s) => (
          <ShortcutButton
            key={s.id}
            shortcut={s}
            onClick={() => executeShortcut(s, "contextual")}
            variant="outline"
            size="sm"
            showKeys={false}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}
