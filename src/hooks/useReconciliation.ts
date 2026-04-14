import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFinanceiroSync } from "./useFinanceiroSync";

/**
 * Hook for manual reconciliation actions:
 * - conciliar (link bank tx → ledger entry)
 * - ignorar
 * - desfazer conciliação
 */
export function useReconciliation() {
  const queryClient = useQueryClient();
  const { invalidateReconciliation } = useFinanceiroSync();

  const invalidate = () => {
    invalidateReconciliation();
    queryClient.invalidateQueries({ queryKey: ["fin-bank-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["fin-ledger-entries"] });
    queryClient.invalidateQueries({ queryKey: ["fin-bank-accounts-balance"] });
  };

  /** Manually link a bank transaction to a ledger entry */
  const manualReconcile = useMutation({
    mutationFn: async ({
      bankTransactionId,
      ledgerEntryId,
      payableId,
      receivableId,
    }: {
      bankTransactionId: string;
      ledgerEntryId: string;
      payableId?: string;
      receivableId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Create reconciliation link
      const { error: linkErr } = await supabase.from("fin_reconciliation_links").insert({
        bank_transaction_id: bankTransactionId,
        ledger_entry_id: ledgerEntryId,
        match_type: "manual",
        score: 100,
        reconciliation_status: "active",
        payable_id: payableId || null,
        receivable_id: receivableId || null,
        created_by: user?.id,
        notes: "Conciliação manual",
      });
      if (linkErr) throw linkErr;

      // Update bank transaction status
      const { error: txErr } = await supabase
        .from("fin_bank_transactions")
        .update({
          status: "CONCILIADA",
          reconciliation_score: 100,
          reconciliation_method: "manual",
        })
        .eq("id", bankTransactionId);
      if (txErr) throw txErr;

      // Mark ledger entry as reconciled
      const { error: ledgerErr } = await supabase
        .from("fin_ledger_entries")
        .update({
          reconciled: true,
          conciliado_em: new Date().toISOString(),
        })
        .eq("id", ledgerEntryId);
      if (ledgerErr) throw ledgerErr;
    },
    onSuccess: () => {
      toast.success("Transação conciliada com sucesso");
      invalidate();
    },
    onError: (e: any) => toast.error("Erro ao conciliar: " + e.message),
  });

  /** Accept a suggested reconciliation (auto-matched) */
  const acceptSuggestion = useMutation({
    mutationFn: async (bankTransactionId: string) => {
      // Get the existing link
      const { data: links } = await supabase
        .from("fin_reconciliation_links")
        .select("*")
        .eq("bank_transaction_id", bankTransactionId)
        .eq("reconciliation_status", "pending")
        .limit(1);

      if (!links?.length) throw new Error("Nenhuma sugestão encontrada");
      const link = links[0];

      await supabase
        .from("fin_reconciliation_links")
        .update({ reconciliation_status: "active" })
        .eq("id", link.id);

      await supabase
        .from("fin_bank_transactions")
        .update({ status: "CONCILIADA", reconciliation_method: "auto_confirmed" })
        .eq("id", bankTransactionId);

      if (link.ledger_entry_id) {
        await supabase
          .from("fin_ledger_entries")
          .update({ reconciled: true, conciliado_em: new Date().toISOString() })
          .eq("id", link.ledger_entry_id);
      }
    },
    onSuccess: () => {
      toast.success("Sugestão aceita");
      invalidate();
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  /** Ignore a bank transaction */
  const ignorar = useMutation({
    mutationFn: async (bankTransactionId: string) => {
      const { error } = await supabase
        .from("fin_bank_transactions")
        .update({ status: "IGNORADA" })
        .eq("id", bankTransactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transação marcada como ignorada");
      invalidate();
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  /** Undo reconciliation */
  const undoReconcile = useMutation({
    mutationFn: async (bankTransactionId: string) => {
      // Remove links
      const { data: links } = await supabase
        .from("fin_reconciliation_links")
        .select("ledger_entry_id")
        .eq("bank_transaction_id", bankTransactionId);

      await supabase
        .from("fin_reconciliation_links")
        .delete()
        .eq("bank_transaction_id", bankTransactionId);

      // Reset bank transaction
      await supabase
        .from("fin_bank_transactions")
        .update({
          status: "PENDENTE",
          reconciliation_score: null,
          reconciliation_method: null,
        })
        .eq("id", bankTransactionId);

      // Unreconcile ledger entries
      for (const link of links || []) {
        if (link.ledger_entry_id) {
          await supabase
            .from("fin_ledger_entries")
            .update({ reconciled: false, conciliado_em: null })
            .eq("id", link.ledger_entry_id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Conciliação desfeita");
      invalidate();
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return {
    manualReconcile,
    acceptSuggestion,
    ignorar,
    undoReconcile,
  };
}
