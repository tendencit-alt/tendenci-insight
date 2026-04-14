import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to trigger the automatic marking of overdue financial entries.
 * Calls the `mark_overdue_entries` database function.
 */
export function useMarkOverdue() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const markOverdue = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("mark_overdue_entries" as any);
      if (error) throw error;

      const result = data as any;
      const total = (result?.payables_marked || 0) + (result?.receivables_marked || 0);

      if (total > 0) {
        toast({
          title: `${total} título(s) marcado(s) como vencido`,
          description: `Pagar: ${result?.payables_marked || 0} | Receber: ${result?.receivables_marked || 0}`,
        });
      }

      return result;
    } catch (err: any) {
      toast({
        title: "Erro ao verificar vencidos",
        description: err.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { markOverdue, loading };
}
