import { useMinimizedDialogs } from '@/contexts/MinimizedDialogsContext';
import { Button } from '@/components/ui/button';
import { Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MinimizedDialogsBar() {
  const { minimized, restore } = useMinimizedDialogs();

  if (minimized.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border shadow-lg rounded-full px-2 py-1.5 animate-in slide-in-from-bottom-4 duration-300">
      {minimized.map((dialog) => (
        <Button
          key={dialog.id}
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 gap-2 rounded-full px-4 text-sm font-medium",
            "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
          )}
          onClick={() => restore(dialog.id)}
        >
          {dialog.icon && <span>{dialog.icon}</span>}
          <span className="max-w-[200px] truncate">{dialog.label}</span>
          <Maximize2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      ))}
    </div>
  );
}
