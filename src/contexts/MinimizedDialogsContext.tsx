import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface MinimizedDialog {
  id: string;
  label: string;
  icon?: string;
  restore: () => void;
}

interface MinimizedDialogsContextType {
  minimized: MinimizedDialog[];
  minimize: (dialog: MinimizedDialog) => void;
  restore: (id: string) => void;
  isMinimized: (id: string) => boolean;
}

const MinimizedDialogsContext = createContext<MinimizedDialogsContextType | null>(null);

export function MinimizedDialogsProvider({ children }: { children: ReactNode }) {
  const [minimized, setMinimized] = useState<MinimizedDialog[]>([]);

  const minimize = useCallback((dialog: MinimizedDialog) => {
    setMinimized(prev => {
      const exists = prev.find(d => d.id === dialog.id);
      if (exists) return prev.map(d => d.id === dialog.id ? dialog : d);
      return [...prev, dialog];
    });
  }, []);

  const restore = useCallback((id: string) => {
    setMinimized(prev => {
      const dialog = prev.find(d => d.id === id);
      if (dialog) dialog.restore();
      return prev.filter(d => d.id !== id);
    });
  }, []);

  const isMinimized = useCallback((id: string) => {
    return minimized.some(d => d.id === id);
  }, [minimized]);

  return (
    <MinimizedDialogsContext.Provider value={{ minimized, minimize, restore, isMinimized }}>
      {children}
    </MinimizedDialogsContext.Provider>
  );
}

export function useMinimizedDialogs() {
  const ctx = useContext(MinimizedDialogsContext);
  if (!ctx) throw new Error('useMinimizedDialogs must be used within MinimizedDialogsProvider');
  return ctx;
}
