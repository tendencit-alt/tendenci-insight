import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───
export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: "pay" | "reschedule" | "reconcile" | "approve" | "edit" | "simulate" | "anticipate" | "postpone";
  targetId?: string;
  targetTable?: string;
  route?: string;
  severity?: "normal" | "warning" | "critical";
}

export interface BatchItem {
  id: string;
  label: string;
  table: string;
  amount?: number;
}

export interface UndoEntry {
  id: string;
  label: string;
  table: string;
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

export function useActionLayer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Batch selection ──
  const [batchMode, setBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<BatchItem[]>([]);

  // ── Undo stack ──
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  // ── Rapid execution mode ──
  const [rapidMode, setRapidMode] = useState(false);

  // ── Toggle batch item ──
  const toggleBatchItem = useCallback((item: BatchItem) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === item.id && i.table === item.table);
      if (exists) return prev.filter((i) => !(i.id === item.id && i.table === item.table));
      return [...prev, item];
    });
  }, []);

  const clearBatch = useCallback(() => {
    setSelectedItems([]);
    setBatchMode(false);
  }, []);

  const isBatchSelected = useCallback(
    (id: string, table: string) => selectedItems.some((i) => i.id === id && i.table === table),
    [selectedItems]
  );

  // ── Push undo entry ──
  const pushUndo = useCallback((entry: Omit<UndoEntry, "timestamp">) => {
    setUndoStack((prev) => [...prev.slice(-9), { ...entry, timestamp: Date.now() }]);
  }, []);

  // ── Execute single action ──
  const executeAction = useCallback(
    async (action: QuickAction): Promise<boolean> => {
      try {
        switch (action.icon) {
          case "pay": {
            if (!action.targetId || !action.targetTable) return false;
            const { error } = await supabase
              .from(action.targetTable as any)
              .update({ status: "PAGO_RECEBIDO" } as any)
              .eq("id", action.targetId);
            if (error) throw error;
            pushUndo({ id: action.targetId, label: action.label, table: action.targetTable, field: "status", oldValue: "VENCIDO", newValue: "PAGO_RECEBIDO" });
            break;
          }
          case "reschedule": {
            if (!action.targetId || !action.targetTable) return false;
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + 7);
            const dateStr = newDate.toISOString().split("T")[0];
            const { error } = await supabase
              .from(action.targetTable as any)
              .update({ due_date: dateStr } as any)
              .eq("id", action.targetId);
            if (error) throw error;
            pushUndo({ id: action.targetId, label: action.label, table: action.targetTable, field: "due_date", oldValue: "", newValue: dateStr });
            break;
          }


          case "reconcile": {
            if (!action.targetId) return false;
            const { error } = await supabase
              .from("fin_bank_transactions")
              .update({ status: "reconciled" } as any)
              .eq("id", action.targetId);
            if (error) throw error;
            pushUndo({ id: action.targetId, label: action.label, table: "fin_bank_transactions", field: "status", oldValue: "pending", newValue: "reconciled" });
            break;
          }
          default:
            return false;
        }

        toast({ title: "Ação executada", description: action.label });
        queryClient.invalidateQueries({ queryKey: ["smart-launcher-actions"] });
        queryClient.invalidateQueries({ queryKey: ["decision-suggestions"] });
        queryClient.invalidateQueries({ queryKey: ["trust-layer"] });
        queryClient.invalidateQueries({ queryKey: ["predictive-layer"] });
        queryClient.invalidateQueries({ queryKey: ["company-status"] });
        return true;
      } catch (err: any) {
        toast({ title: "Erro na execução", description: err.message || "Falha ao executar ação", variant: "destructive" });
        return false;
      }
    },
    [pushUndo, toast, queryClient]
  );

  // ── Execute batch ──
  const executeBatch = useCallback(
    async (actionType: QuickAction["icon"]) => {
      let success = 0;
      let fail = 0;
      for (const item of selectedItems) {
        const ok = await executeAction({
          id: `batch-${item.id}`,
          label: item.label,
          description: "",
          icon: actionType,
          targetId: item.id,
          targetTable: item.table,
        });
        if (ok) success++;
        else fail++;
      }
      toast({
        title: "Execução em lote",
        description: `${success} executado(s)${fail > 0 ? `, ${fail} com erro` : ""}`,
      });
      clearBatch();
    },
    [selectedItems, executeAction, toast, clearBatch]
  );

  // ── Undo last action ──
  const undoLast = useCallback(async () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) {
      toast({ title: "Nada para desfazer" });
      return;
    }
    try {
      const { error } = await supabase
        .from(last.table as any)
        .update({ [last.field]: last.oldValue } as any)
        .eq("id", last.id);
      if (error) throw error;
      setUndoStack((prev) => prev.slice(0, -1));
      toast({ title: "Ação desfeita", description: last.label });
      queryClient.invalidateQueries({ queryKey: ["smart-launcher-actions"] });
      queryClient.invalidateQueries({ queryKey: ["company-status"] });
    } catch (err: any) {
      toast({ title: "Erro ao desfazer", description: err.message, variant: "destructive" });
    }
  }, [undoStack, toast, queryClient]);

  // ── Build contextual actions from action items ──
  const getActionsForAlert = useCallback((alertId: string): QuickAction[] => {
    const actions: QuickAction[] = [];
    if (alertId === "overdue-payables") {
      actions.push(
        { id: "pay-overdue", label: "Pagar conta", description: "Marcar como pago", icon: "pay", targetTable: "fin_payables" },
        { id: "reschedule-overdue", label: "Reagendar (+7 dias)", description: "Postergar vencimento", icon: "reschedule", targetTable: "fin_payables" },
      );
    }
    if (alertId === "overdue-receivables") {
      actions.push(
        { id: "receive-overdue", label: "Marcar recebido", description: "Baixar recebível", icon: "pay", targetTable: "fin_receivables" },
      );
    }
    if (alertId === "pending-reconciliation") {
      actions.push(
        { id: "reconcile-pending", label: "Conciliar", description: "Marcar como conciliado", icon: "reconcile" },
      );
    }


    return actions;
  }, []);

  // ── Build contextual actions for predictions ──
  const getActionsForPrediction = useCallback((predictionType: string): QuickAction[] => {
    if (predictionType === "cash-negative") {
      return [
        { id: "anticipate-rec", label: "Antecipar recebíveis", description: "Solicitar antecipação", icon: "anticipate", route: "/financeiro" },
        { id: "postpone-pay", label: "Postergar pagamentos", description: "Reagendar contas", icon: "postpone", route: "/financeiro" },
        { id: "sim-adjust", label: "Simular ajuste", description: "Abrir simulador", icon: "simulate" },
      ];
    }
    if (predictionType === "margin-low" || predictionType === "result-low") {
      return [
        { id: "sim-revenue", label: "Simular aumento receita", description: "Ajustar projeção", icon: "simulate" },
        { id: "sim-expense", label: "Simular corte despesas", description: "Reduzir gastos", icon: "simulate" },
      ];
    }
    return [];
  }, []);

  return {
    // Batch
    batchMode,
    setBatchMode,
    selectedItems,
    toggleBatchItem,
    clearBatch,
    isBatchSelected,
    executeBatch,
    // Actions
    executeAction,
    getActionsForAlert,
    getActionsForPrediction,
    // Undo
    undoStack,
    undoLast,
    canUndo: undoStack.length > 0,
    // Rapid mode
    rapidMode,
    setRapidMode,
  };
}
