import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getOrphanLedgerEntries, syncOrphanLedgerEntries } from "@/lib/financeiroIntegration";
import { useFinanceiroSync } from "@/hooks/useFinanceiroSync";

export function OrphanEntriesAlert() {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { invalidateAll } = useFinanceiroSync();

  const { data: orphans, isLoading, refetch } = useQuery({
    queryKey: ["fin-orphan-entries"],
    queryFn: getOrphanLedgerEntries,
    refetchInterval: 30000, // Check every 30 seconds
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncOrphanLedgerEntries();
      
      if (result.success) {
        toast.success(
          `Sincronização concluída! Criados: ${result.createdPayables} contas a pagar e ${result.createdReceivables} contas a receber.`
        );
      } else {
        toast.warning(
          `Sincronização parcial. Criados: ${result.createdPayables} a pagar, ${result.createdReceivables} a receber. Erros: ${result.errors.length}`,
          { duration: 5000 }
        );
        console.error("Sync errors:", result.errors);
      }

      // Invalidate all financial queries
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["fin-orphan-entries"] });
      refetch();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Erro ao sincronizar lançamentos órfãos");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) return null;
  
  if (!orphans || orphans.totalOrphans === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800 dark:text-orange-200">
        Lançamentos não sincronizados detectados
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              <strong>{orphans.totalOrphans}</strong> lançamento(s) sem vínculo com Contas a Pagar/Receber
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              Valor total: <strong>{formatCurrency(orphans.totalValue)}</strong>
              {orphans.orphanDespesas.length > 0 && (
                <span className="ml-2">
                  ({orphans.orphanDespesas.length} despesa{orphans.orphanDespesas.length > 1 ? "s" : ""})
                </span>
              )}
              {orphans.orphanReceitas.length > 0 && (
                <span className="ml-2">
                  ({orphans.orphanReceitas.length} receita{orphans.orphanReceitas.length > 1 ? "s" : ""})
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="border-orange-500 text-orange-700 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/30"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizar Agora
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
