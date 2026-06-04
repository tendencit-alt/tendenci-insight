import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const REALTIME_DEBOUNCE_MS = 250;

/**
 * Realtime global do sistema.
 *
 * Em vez de depender de mapas de queryKey por módulo, ouvimos qualquer mudança
 * publicada no schema público e invalidamos todas as queries do React Query.
 *
 * Isso garante que:
 * - a tela atual refetch imediatamente (`refetchType: "active"`)
 * - as demais telas fiquem stale e recarreguem ao serem acessadas
 * - automações em cascata (pedido -> financeiro -> produção) reflitam sem gaps
 */
export function useGlobalRealtime() {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let lastInvalidation = 0;
    const MIN_INTERVAL = 1000; // Mínimo de 1s entre invalidações totais para evitar "flicker"

    const invalidateAll = (payload: any) => {
      const now = Date.now();
      const table = payload?.table;

      // Se soubermos qual tabela mudou, podemos ser mais específicos
      if (table) {
        console.log(`[GlobalRT] Mudança detectada na tabela: ${table}`);
        // Invalida apenas o que for relacionado àquela tabela (se as queryKeys seguirem o padrão)
        queryClient.invalidateQueries({ queryKey: [table], refetchType: "active" });
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (now - lastInvalidation > MIN_INTERVAL) {
          console.log("[GlobalRT] Invalidação global (debounce)");
          queryClient.invalidateQueries({ refetchType: "active" });
          lastInvalidation = now;
        }
      }, REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel("global-cross-module-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          invalidateAll(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error("[GlobalRT] Erro na subscrição Realtime");
        }
      });

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
