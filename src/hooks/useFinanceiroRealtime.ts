import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to subscribe to real-time changes on financial tables
 * Automatically invalidates React Query caches when data changes
 */
export function useFinanceiroRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to all financial tables for real-time updates
    const channel = supabase
      .channel("financeiro-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_ledger_entries" },
        () => {
          console.log("[Realtime] fin_ledger_entries changed");
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_payables" },
        () => {
          console.log("[Realtime] fin_payables changed");
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_receivables" },
        () => {
          console.log("[Realtime] fin_receivables changed");
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_bank_accounts" },
        () => {
          console.log("[Realtime] fin_bank_accounts changed");
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_financial_goals" },
        () => {
          console.log("[Realtime] fin_financial_goals changed");
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_projects" },
        () => {
          console.log("[Realtime] fin_projects changed");
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_cost_centers" },
        () => {
          console.log("[Realtime] fin_cost_centers changed");
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fin_chart_accounts" },
        () => {
          console.log("[Realtime] fin_chart_accounts changed");
          invalidateFinanceiroQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        () => {
          console.log("[Realtime] suppliers changed");
          queryClient.invalidateQueries({ queryKey: ["suppliers-list"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          console.log("[Realtime] clients changed");
          queryClient.invalidateQueries({ queryKey: ["clients-list"] });
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Financeiro channel status:", status);
      });

    function invalidateFinanceiroQueries() {
      // Invalidate all financial queries (using predicate to match any query starting with these keys)
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && (
          key.startsWith('fin-') ||
          key === 'financeiro-summary' ||
          key === 'suppliers-list' ||
          key === 'clients-list'
        );
      }});
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
