import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Loader2 } from "lucide-react";
import type { StatusConfig, StatusKey } from "@/lib/status-machine/types";
import { cn } from "@/lib/utils";

interface Props {
  current: StatusConfig | undefined;
  available: StatusConfig[];
  onSelect: (to: StatusKey) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function StatusTransitionSelect({ current, available, onSelect, loading, disabled }: Props) {
  if (!current) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={disabled || loading || available.length === 0}
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <Badge className={cn("text-[10px]", current.bgColor, current.textColor)}>
            {current.label}
          </Badge>
          {available.length > 0 && <ChevronDown className="h-3 w-3" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {available.map((s) => (
          <DropdownMenuItem key={s.key} onClick={() => onSelect(s.key)}>
            <Badge className={cn("text-[10px] mr-2", s.bgColor, s.textColor)}>
              {s.label}
            </Badge>
            Mover para {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
