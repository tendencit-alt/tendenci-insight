import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickAction {
  key: string;
  label: string;
  icon?: any;
  onClick: () => void;
  variant?: "default" | "destructive";
  separator?: boolean;
  disabled?: boolean;
}

interface InlineQuickActionsProps {
  actions: QuickAction[];
  /** Max inline buttons shown on hover (rest go to dropdown) */
  maxInline?: number;
  className?: string;
}

export function InlineQuickActions({
  actions,
  maxInline = 2,
  className,
}: InlineQuickActionsProps) {
  if (actions.length === 0) return null;

  const inlineActions = actions.slice(0, maxInline);
  const menuActions = actions.slice(maxInline);

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {inlineActions.map((a) => {
        const Icon = a.icon;
        return (
          <Button
            key={a.key}
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 text-[10px] px-1.5 gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity",
              a.variant === "destructive" && "text-destructive hover:text-destructive"
            )}
            onClick={a.onClick}
            disabled={a.disabled}
          >
            {Icon && <Icon className="h-3 w-3" />}
            {a.label}
          </Button>
        );
      })}

      {menuActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {menuActions.map((a) => {
              const Icon = a.icon;
              if (a.separator) {
                return <DropdownMenuSeparator key={`sep-${a.key}`} />;
              }
              return (
                <DropdownMenuItem
                  key={a.key}
                  onClick={a.onClick}
                  disabled={a.disabled}
                  className={cn(
                    "text-xs",
                    a.variant === "destructive" && "text-destructive focus:text-destructive"
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 mr-2" />}
                  {a.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
