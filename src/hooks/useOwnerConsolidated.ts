// Visão consolidada do Owner: agrega TODOS os inquilinos (read-only).
// Exclui o tenant Master Owner (a1b2c3d4-...) que é apenas estrutura/templates.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const OWNER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

async function countNot(table: string) {
  const { count, error } = await supabase
    .from(table as any)
    .select("id", { count: "exact", head: true })
    .neq("tenant_id", OWNER_ID);
  if (error) throw error;
  return count ?? 0;
}

async function sumAmount(table: string, col: string, filter?: { col: string; op: "neq" | "eq"; val: string }) {
  let q = supabase.from(table as any).select(col).neq("tenant_id", OWNER_ID);
  if (filter) q = filter.op === "neq" ? q.neq(filter.col, filter.val) : q.eq(filter.col, filter.val);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).reduce((s: number, r: any) => s + Number(r[col] ?? 0), 0);
}

export function useOwnerConsolidated() {
  return useQuery({
    queryKey: ["owner-consolidated-v1"],
    queryFn: async () => {
      const [
        ordersCount, ordersAmt,
        payablesOpenCount, payablesOpenAmt,
        recvOpenCount, recvOpenAmt,
        prodCount, delCount, instCount,
        empCount, pjCount,
        clientsCount, suppliersCount,
      ] = await Promise.all([
        countNot("orders"),
        sumAmount("orders", "valor_total"),
        supabase.from("fin_payables").select("id", { count: "exact", head: true })
          .neq("tenant_id", OWNER_ID).neq("status", "pago").then(r => r.count ?? 0),
        sumAmount("fin_payables", "amount", { col: "status", op: "neq", val: "pago" }),
        supabase.from("fin_receivables").select("id", { count: "exact", head: true })
          .neq("tenant_id", OWNER_ID).neq("status", "recebido").then(r => r.count ?? 0),
        sumAmount("fin_receivables", "amount", { col: "status", op: "neq", val: "recebido" }),
        countNot("production_orders"),
        countNot("delivery_orders"),
        countNot("installation_orders"),
        countNot("hr_employees"),
        countNot("service_providers"),
        countNot("clients"),
        countNot("suppliers"),
      ]);
      return {
        ordersCount, ordersAmt,
        payablesOpenCount, payablesOpenAmt,
        recvOpenCount, recvOpenAmt,
        prodCount, delCount, instCount,
        empCount, pjCount,
        clientsCount, suppliersCount,
      };
    },
    refetchInterval: 60000,
  });
}
