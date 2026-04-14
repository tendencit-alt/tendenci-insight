import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNavigationIntelligence } from "@/hooks/useNavigationIntelligence";
import * as LucideIcons from "lucide-react";

export function ContextualShortcutsBar() {
  const navigate = useNavigate();
  const { contextualShortcuts } = useNavigationIntelligence();

  if (contextualShortcuts.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap mb-3">
      <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">Ações:</span>
      {contextualShortcuts.map((s) => {
        const IconComp = (LucideIcons as any)[s.icon] || LucideIcons.Zap;
        return (
          <Button
            key={s.label}
            variant="outline"
            size="sm"
            className="h-6 text-[10px] gap-1 rounded-md"
            onClick={() => navigate(s.route)}
          >
            <IconComp className="h-3 w-3" />
            {s.label}
          </Button>
        );
      })}
    </div>
  );
}
