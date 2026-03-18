import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OrderResponsible = Database["public"]["Tables"]["order_responsibles"]["Row"];
export type OrderResponsibleType = Database["public"]["Enums"]["order_responsible_type"];

export function useOrderResponsibles(enabled = true) {
  const query = useQuery({
    queryKey: ["order-responsibles"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_responsibles")
        .select("id, name, type, is_active, created_at, updated_at")
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
  });

  const responsibles = query.data ?? [];

  const grouped = useMemo(
    () => ({
      vendedores: responsibles.filter((item) => item.type === "vendedor"),
      orcamentistas: responsibles.filter((item) => item.type === "orcamentista"),
      projetistas: responsibles.filter((item) => item.type === "projetista"),
      montadores: responsibles.filter((item) => item.type === "montador"),
    }),
    [responsibles],
  );

  return {
    ...query,
    responsibles,
    ...grouped,
  };
}
