import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Records a denied permission attempt for analytics. Silent failure. */
export function useDenialLogger() {
  const { user } = useAuth();

  return useCallback(
    async (permissionKey: string, module?: string, context: Record<string, unknown> = {}) => {
      if (!user) return;
      try {
        await supabase.rpc("log_permission_denial", {
          _permission_key: permissionKey,
          _module: module ?? null,
          _context: context as never,
        });
      } catch {
        /* swallow — analytics-only */
      }
    },
    [user]
  );
}
