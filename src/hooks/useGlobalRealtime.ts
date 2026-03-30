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
    const invalidateAll = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ refetchType: "active" });
      }, REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel("global-cross-module-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        () => {
          invalidateAll();
        }
      )
      .subscribe((status) => {
        console.log("[GlobalRT] Channel status:", status);
      });

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
