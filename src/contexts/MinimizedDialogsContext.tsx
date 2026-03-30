import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface MinimizedDialog {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  restore: () => void;
}

interface MinimizedDialogsContextType {
  minimized: MinimizedDialog[];
  minimize: (dialog: MinimizedDialog) => void;
  restore: (id: string) => void;
  remove: (id: string) => void;
  isMinimized: (id: string) => boolean;
  getPendingRestore: (id: string) => boolean;
  clearPendingRestore: (id: string) => void;
}

const MinimizedDialogsContext = createContext<MinimizedDialogsContextType | null>(null);

export function MinimizedDialogsProvider({ children }: { children: ReactNode }) {
  const [minimized, setMinimized] = useState<MinimizedDialog[]>([]);
  const [pendingRestores, setPendingRestores] = useState<Set<string>>(new Set());

  const minimize = useCallback((dialog: MinimizedDialog) => {
    setMinimized(prev => {
      const exists = prev.find(d => d.id === dialog.id);
      if (exists) return prev.map(d => d.id === dialog.id ? dialog : d);
      return [...prev, dialog];
    });
  }, []);

  const restore = useCallback((id: string) => {
    setPendingRestores(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    setMinimized(prev => {
      const dialog = prev.find(d => d.id === id);
      if (dialog) {
        setTimeout(() => {
          dialog.restore();
        }, 0);
      }
      return prev.filter(d => d.id !== id);
    });
  }, []);

  const remove = useCallback((id: string) => {
    setMinimized(prev => prev.filter(d => d.id !== id));
  }, []);

  const isMinimized = useCallback((id: string) => {
    return minimized.some(d => d.id === id);
  }, [minimized]);

  const getPendingRestore = useCallback((id: string) => {
    return pendingRestores.has(id);
  }, [pendingRestores]);

  const clearPendingRestore = useCallback((id: string) => {
    setPendingRestores(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <MinimizedDialogsContext.Provider value={{ minimized, minimize, restore, remove, isMinimized, getPendingRestore, clearPendingRestore }}>
      {children}
    </MinimizedDialogsContext.Provider>
  );
}

export function useMinimizedDialogs() {
  const ctx = useContext(MinimizedDialogsContext);
  if (!ctx) throw new Error('useMinimizedDialogs must be used within MinimizedDialogsProvider');
  return ctx;
}
