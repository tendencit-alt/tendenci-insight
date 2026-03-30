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
    invalidateByKeys([
      "orders", "order-", "orders-metrics",
      "fin-", "financeiro",
      "production", "prod-", "production-total-all", "production-metrics",
      "goals", "seller-goals", "goal",
    ]);
  }, [invalidateByKeys]);

  const onProductionChange = useCallback(() => {
    invalidateByKeys([
      "production", "prod-", "production-total-all", "production-metrics",
      "products", "stock-", "inventory",
      "orders", "order-",
    ]);
  }, [invalidateByKeys]);

  const onInventoryChange = useCallback(() => {
    invalidateByKeys([
      "products", "stock-", "inventory", "categories", "locations",
      "production", "prod-",
      "suppliers",
      "purchase-orders",
    ]);
  }, [invalidateByKeys]);

  const onSuppliersChange = useCallback(() => {
    invalidateByKeys([
      "suppliers", "suppliers-list",
      "products", "stock-", "inventory",
      "fin-", "financeiro",
      "purchase-orders",
    ]);
  }, [invalidateByKeys]);

  const onFinanceiroChange = useCallback(() => {
    invalidateByKeys([
      "fin-", "financeiro", "financeiro-summary",
      "cashflow", "dre",
      "orders", "order-",
    ]);
  }, [invalidateByKeys]);

  const onPurchasesChange = useCallback(() => {
    invalidateByKeys([
      "purchase-orders", "purchase-order-",
      "fin-", "financeiro",
      "products", "stock-", "inventory",
      "suppliers",
    ]);
  }, [invalidateByKeys]);

  const onCRMChange = useCallback(() => {
    invalidateByKeys([
      "deals", "crm", "crm-deals", "pipeline",
      "goals", "seller-goals",
    ]);
  }, [invalidateByKeys]);

  const onGoalsChange = useCallback(() => {
    invalidateByKeys([
      "goals", "seller-goals", "goal",
      "tendenci",
    ]);
  }, [invalidateByKeys]);

  const onClientsChange = useCallback(() => {
    invalidateByKeys(["clients", "clients-list"]);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "product_categories" }, onInventoryChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_locations" }, onInventoryChange)
      // Suppliers
      .on("postgres_changes", { event: "*", schema: "public", table: "suppliers" }, onSuppliersChange)
      // Clients
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, onClientsChange)
      // CRM
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_deals" }, onCRMChange)
      // Financeiro
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_ledger_entries" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_payables" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_receivables" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_bank_accounts" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_bank_transactions" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_cost_centers" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_chart_accounts" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_projects" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_financial_goals" }, onFinanceiroChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_loan_contracts" }, onFinanceiroChange)
      // Purchase Orders
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" }, onPurchasesChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_order_items" }, onPurchasesChange)
      // Goals
      .on("postgres_changes", { event: "*", schema: "public", table: "tendenci_seller_goals" }, onGoalsChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "tendenci_goal_progress" }, onGoalsChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "tendenci_daily_goal_records" }, onGoalsChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "tendenci_daily_architect_goals" }, onGoalsChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onOrdersChange, onProductionChange, onInventoryChange, onSuppliersChange, onFinanceiroChange, onPurchasesChange, onCRMChange, onGoalsChange, onClientsChange]);
}
