import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to subscribe to real-time changes on financial tables
 * Automatically invalidates React Query caches when data changes
 */
export function useFinanceiroRealtime() {
  const queryClient = useQueryClient();

  const invalidateFinanceiroQueries = useCallback(() => {
    console.log("[Realtime] Invalidating all financial queries...");
    
    // Force refetch all queries that match the predicate
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        const shouldInvalidate = typeof key === 'string' && (
          key.startsWith('fin-') ||
          key === 'financeiro-summary' ||
          key === 'suppliers-list' ||
          key === 'clients-list'
        );
        if (shouldInvalidate) {
          console.log("[Realtime] Invalidating query:", query.queryKey);
        }
        return shouldInvalidate;
      },
      refetchType: 'all', // Force immediate refetch
    });
  }, [queryClient]);

  useEffect(() => {
    console.log("[Realtime] Setting up financeiro realtime subscriptions...");
    
    // Subscribe to all financial tables for real-time updates
    const channel = supabase
      .channel("financeiro-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_ledger_entries" },
        (payload) => {
          console.log("[Realtime] fin_ledger_entries changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_payables" },
        (payload) => {
          console.log("[Realtime] fin_payables changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_receivables" },
        (payload) => {
          console.log("[Realtime] fin_receivables changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_bank_accounts" },
        (payload) => {
          console.log("[Realtime] fin_bank_accounts changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_financial_goals" },
        (payload) => {
          console.log("[Realtime] fin_financial_goals changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_projects" },
        (payload) => {
          console.log("[Realtime] fin_projects changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_cost_centers" },
        (payload) => {
          console.log("[Realtime] fin_cost_centers changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_chart_accounts" },
        (payload) => {
          console.log("[Realtime] fin_chart_accounts changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_bank_transactions" },
        (payload) => {
          console.log("[Realtime] fin_bank_transactions changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_loan_contracts" },
        (payload) => {
          console.log("[Realtime] fin_loan_contracts changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        (payload) => {
          console.log("[Realtime] suppliers changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        (payload) => {
          console.log("[Realtime] clients changed:", payload.eventType);
          invalidateFinanceiroQueries();
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] Financeiro channel status:", status);
        if (err) {
          console.error("[Realtime] Subscription error:", err);
        }
      });

    return () => {
      console.log("[Realtime] Cleaning up financeiro realtime subscriptions...");
      supabase.removeChannel(channel);
    };
  }, [invalidateFinanceiroQueries]);
}
