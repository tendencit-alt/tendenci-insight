import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to subscribe to real-time changes on the orders table.
 * Automatically invalidates React Query caches when orders are created, updated or deleted.
 */
export function useOrdersRealtime() {
  const queryClient = useQueryClient();

  const invalidateOrderQueries = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && (
          key === "orders" ||
          key.startsWith("order-") ||
          key === "orders-kpis"
        );
      },
      refetchType: "all",
    });
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => invalidateOrderQueries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidateOrderQueries]);
}
