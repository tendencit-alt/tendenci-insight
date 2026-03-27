import { Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MinimizeButtonProps {
  onClick: () => void;
  /** When true, renders as absolute-positioned next to the dialog close (X) button */
  absolute?: boolean;
}

export function MinimizeButton({ onClick, absolute = false }: MinimizeButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
            absolute ? 'absolute right-10 top-4' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Minus className="h-4 w-4" />
          <span className="sr-only">Minimizar</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Minimizar</p>
      </TooltipContent>
    </Tooltip>
  );
}
