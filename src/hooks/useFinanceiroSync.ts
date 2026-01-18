import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to manage synchronization between financial modules:
 * - Payables (fin_payables)
 * - Receivables (fin_receivables)
 * - Ledger Entries (fin_ledger_entries)
 * - Bank Transactions (fin_bank_transactions)
 * 
 * When an action is performed in one module, this hook provides
 * methods to invalidate related queries so all tabs stay in sync.
 */
export function useFinanceiroSync() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all financial queries to refresh all tabs
   */
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["fin-payables"] });
    queryClient.invalidateQueries({ queryKey: ["fin-receivables"] });
    queryClient.invalidateQueries({ queryKey: ["fin-ledger-entries"] });
    queryClient.invalidateQueries({ queryKey: ["fin-bank-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["fin-payables-summary-tab"] });
    queryClient.invalidateQueries({ queryKey: ["fin-receivables-summary-tab"] });
    queryClient.invalidateQueries({ queryKey: ["fin-last-import-date"] });
    queryClient.invalidateQueries({ queryKey: ["fin-orphan-entries"] });
  };

  /**
   * Invalidate queries related to payables
   */
  const invalidatePayables = () => {
    queryClient.invalidateQueries({ queryKey: ["fin-payables"] });
    queryClient.invalidateQueries({ queryKey: ["fin-payables-summary-tab"] });
    queryClient.invalidateQueries({ queryKey: ["fin-ledger-entries"] });
  };

  /**
   * Invalidate queries related to receivables
   */
  const invalidateReceivables = () => {
    queryClient.invalidateQueries({ queryKey: ["fin-receivables"] });
    queryClient.invalidateQueries({ queryKey: ["fin-receivables-summary-tab"] });
    queryClient.invalidateQueries({ queryKey: ["fin-ledger-entries"] });
  };

  /**
   * Invalidate queries related to ledger entries
   */
  const invalidateLedger = () => {
    queryClient.invalidateQueries({ queryKey: ["fin-ledger-entries"] });
    queryClient.invalidateQueries({ queryKey: ["fin-payables"] });
    queryClient.invalidateQueries({ queryKey: ["fin-receivables"] });
    queryClient.invalidateQueries({ queryKey: ["fin-payables-summary-tab"] });
    queryClient.invalidateQueries({ queryKey: ["fin-receivables-summary-tab"] });
    queryClient.invalidateQueries({ queryKey: ["fin-orphan-entries"] });
  };

  /**
   * Invalidate queries related to reconciliation
   */
  const invalidateReconciliation = () => {
    queryClient.invalidateQueries({ queryKey: ["fin-ledger-entries"] });
    queryClient.invalidateQueries({ queryKey: ["fin-bank-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["fin-payables"] });
    queryClient.invalidateQueries({ queryKey: ["fin-receivables"] });
  };

  return {
    invalidateAll,
    invalidatePayables,
    invalidateReceivables,
    invalidateLedger,
    invalidateReconciliation,
  };
}
