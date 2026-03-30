import { useMinimizedDialogs } from '@/contexts/MinimizedDialogsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MinimizedDialogsBar() {
  const { minimized, restore, remove } = useMinimizedDialogs();
  const navigate = useNavigate();
  const location = useLocation();

  if (minimized.length === 0) return null;

  const handleRestore = (dialog: typeof minimized[0]) => {
    // If the dialog has a route and we're not on it, navigate first
    if (dialog.route && location.pathname !== dialog.route) {
      navigate(dialog.route);
      // Small delay to let the page mount before restoring
      setTimeout(() => {
        restore(dialog.id);
      }, 100);
    } else {
      restore(dialog.id);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border shadow-lg rounded-full px-2 py-1.5 animate-in slide-in-from-bottom-4 duration-300">
      {minimized.map((dialog) => (
        <div key={dialog.id} className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 gap-2 rounded-full px-4 text-sm font-medium",
              "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
            )}
            onClick={() => handleRestore(dialog)}
          >
            {dialog.icon && <span>{dialog.icon}</span>}
            <span className="max-w-[200px] truncate">{dialog.label}</span>
            <Maximize2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              remove(dialog.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
