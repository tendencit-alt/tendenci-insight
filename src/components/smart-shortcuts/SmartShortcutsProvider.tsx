import { useSmartShortcuts } from "@/hooks/useSmartShortcuts";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

/**
 * Mount once near the app root to enable global keyboard shortcuts
 * with analytics tracking.
 */
export function SmartShortcutsProvider({ children }: { children?: React.ReactNode }) {
  const { executeShortcut } = useSmartShortcuts();

  useKeyboardShortcuts({
    onTrigger: (s) => executeShortcut(s, "keyboard"),
  });

  return <>{children}</>;
}
