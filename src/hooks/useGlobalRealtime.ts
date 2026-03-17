import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global realtime hook that ensures ALL modules stay in sync.
 * Listens to key tables and invalidates cross-module queries.
 * 
 * Module interaction map:
 * - Orders → Financeiro (contas a pagar/receber), Production, BI
 * - Production → BI, Inventory (materiais)
 * - Inventory → Production, Suppliers, BI
 * - Suppliers → Financeiro, Inventory
 * - Financeiro → BI Dashboard
 */
export function useGlobalRealtime() {
  const queryClient = useQueryClient();

  const invalidateByKeys = useCallback((prefixes: string[]) => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        if (typeof key !== "string") return false;
        return prefixes.some((p) => key.startsWith(p) || key === p);
      },
      refetchType: "all",
    });
  }, [queryClient]);

  // Cross-module invalidation maps
  const onOrdersChange = useCallback(() => {
    console.log("[GlobalRT] Orders changed → invalidating orders, financeiro, production, BI");
    invalidateByKeys([
      "orders", "order-",
      "fin-", "financeiro",
      "production", "prod-",
      "bi-", "dashboard",
    ]);
  }, [invalidateByKeys]);

  const onProductionChange = useCallback(() => {
    console.log("[GlobalRT] Production changed → invalidating production, inventory, BI");
    invalidateByKeys([
      "production", "prod-",
      "products", "stock-", "inventory",
      "bi-", "dashboard",
    ]);
  }, [invalidateByKeys]);

  const onInventoryChange = useCallback(() => {
    console.log("[GlobalRT] Inventory changed → invalidating inventory, production, suppliers, BI");
    invalidateByKeys([
      "products", "stock-", "inventory",
      "production", "prod-",
      "suppliers",
      "bi-", "dashboard",
    ]);
  }, [invalidateByKeys]);

  const onSuppliersChange = useCallback(() => {
    console.log("[GlobalRT] Suppliers changed → invalidating suppliers, inventory, financeiro");
    invalidateByKeys([
      "suppliers",
      "products", "stock-", "inventory",
      "fin-", "financeiro",
    ]);
  }, [invalidateByKeys]);

  const onFinanceiroChange = useCallback(() => {
    console.log("[GlobalRT] Financeiro changed → invalidating financeiro, BI, cost-centers, projects");
    invalidateByKeys([
      "fin-", "financeiro",
      "bi-", "dashboard",
      "fin-cost-centers-active",
      "fin-projects-active",
    ]);
  }, [invalidateByKeys]);

  const onPurchasesChange = useCallback(() => {
    console.log("[GlobalRT] Purchases changed → invalidating purchases, financeiro, inventory, suppliers");
    invalidateByKeys([
      "purchase-orders", "purchase-order-",
      "fin-", "financeiro",
      "products", "stock-", "inventory",
      "suppliers",
      "bi-", "dashboard",
    ]);
  }, [invalidateByKeys]);

  useEffect(() => {
    console.log("[GlobalRT] Setting up cross-module realtime subscriptions...");

    const channel = supabase
      .channel("global-cross-module-realtime")
      // Orders
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, onOrdersChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, onOrdersChange)
      // Production
      .on("postgres_changes", { event: "*", schema: "public", table: "production_orders" }, onProductionChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "production_phases" }, onProductionChange)
      // Inventory
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, onInventoryChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_movements" }, onInventoryChange)
      // Suppliers
      .on("postgres_changes", { event: "*", schema: "public", table: "suppliers" }, onSuppliersChange)
      // Financeiro
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_ledger_entries" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_payables" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_receivables" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_bank_accounts" }, onFinanceiroChange)
      // Purchase Orders
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" }, onPurchasesChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_order_items" }, onPurchasesChange)
      // Cost Centers (propagate to all modules using cost centers)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_cost_centers" }, onFinanceiroChange)
      // Financial Projects
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_projects" }, onFinanceiroChange)
      .subscribe((status, err) => {
        console.log("[GlobalRT] Channel status:", status);
        if (err) console.error("[GlobalRT] Error:", err);
      });

    return () => {
      console.log("[GlobalRT] Cleaning up cross-module realtime...");
      supabase.removeChannel(channel);
    };
  }, [onOrdersChange, onProductionChange, onInventoryChange, onSuppliersChange, onFinanceiroChange, onPurchasesChange]);
}
