import { Button } from '@/components/ui/button';
import { Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MinimizeButtonProps {
  onClick: () => void;
}

export function MinimizeButton({ onClick }: MinimizeButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Minus className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Minimizar</p>
      </TooltipContent>
    </Tooltip>
  );
}
