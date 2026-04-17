import { Star } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSmartShortcuts } from "@/hooks/useSmartShortcuts";
import { ShortcutButton } from "./ShortcutButton";

export function PersonalShortcutsBar() {
  const { personalShortcuts, executeShortcut } = useSmartShortcuts();

  if (personalShortcuts.length === 0) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Star className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
          Meus atalhos
        </span>
        {personalShortcuts.map((s) => (
          <ShortcutButton
            key={s.id}
            shortcut={s}
            onClick={() => executeShortcut(s, "click")}
            variant="secondary"
            size="sm"
            showKeys={false}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}
