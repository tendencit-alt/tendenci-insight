import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MyTasksBlock } from "@/components/central-operacional/MyTasksBlock";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, ShoppingCart, Wallet, AlertTriangle, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVisibleModuleGroups } from "@/hooks/useModulesConfig";

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "default",
  loading,
}: {
  icon: any;
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "warning";
  loading?: boolean;
}) {
  const toneClass =
    tone === "success" ? "text-emerald-600" :
    tone === "danger" ? "text-red-600" :
    tone === "warning" ? "text-amber-600" : "text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <div className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</div>
      )}
    </Card>
  );
}

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

export default function HomeHoje() {
  const navigate = useNavigate();
  const { isLoading: modulesLoading } = useVisibleModuleGroups();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["home-hoje-kpis"],
    queryFn: async () => {
      const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const today = format(new Date(), "yyyy-MM-dd");

      const [receivables, openOrders, banks, overdue] = await Promise.all([
        supabase
          .from("fin_receivables")
          .select("amount,liquidation_date")
          .gte("liquidation_date", start)
          .lte("liquidation_date", end)
          .eq("status", "received"),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["draft", "in_progress", "approved", "production"]),
        supabase.from("fin_bank_accounts").select("current_balance"),
        supabase
          .from("fin_payables")
          .select("amount", { count: "exact" })
          .lt("due_date", today)
          .neq("status", "paid"),
      ]);

      return {
        revenue: (receivables.data || []).reduce((s, r: any) => s + Number(r.amount || 0), 0),
        openOrders: openOrders.count || 0,
        cash: (banks.data || []).reduce((s, b: any) => s + Number(b.current_balance || 0), 0),
        overdueCount: overdue.count || 0,
        overdueAmount: (overdue.data || []).reduce((s, p: any) => s + Number(p.amount || 0), 0),
      };
    },
  });

  const { data: inboxOrders, isLoading: loadingInbox } = useQuery({
    queryKey: ["home-hoje-inbox-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, created_at, client:clients(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hoje</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={DollarSign} label="Receita do mês" value={fmtBRL(kpis?.revenue || 0)} tone="success" loading={isLoading} />
          <Kpi icon={ShoppingCart} label="Pedidos abertos" value={String(kpis?.openOrders ?? 0)} loading={isLoading} />
          <Kpi icon={Wallet} label="Saldo em caixa" value={fmtBRL(kpis?.cash || 0)} loading={isLoading} />
          <Kpi
            icon={AlertTriangle}
            label="Contas vencidas"
            value={`${kpis?.overdueCount ?? 0} · ${fmtBRL(kpis?.overdueAmount || 0)}`}
            tone="danger"
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Caixa de entrada</h2>
              </div>
              <button
                onClick={() => navigate("/pedidos")}
                className="text-xs text-primary hover:underline"
              >
                Ver todos
              </button>
            </div>
            {loadingInbox ? (
              <Skeleton className="h-32 w-full" />
            ) : inboxOrders && inboxOrders.length > 0 ? (
              <ul className="divide-y divide-border">
                {inboxOrders.map((o: any) => (
                  <li
                    key={o.id}
                    onClick={() => navigate(`/pedidos?orderId=${o.id}`)}
                    className="py-2 flex items-center justify-between cursor-pointer hover:bg-muted/40 px-2 rounded"
                  >
                    <div>
                      <div className="text-sm font-medium">Pedido #{o.order_number}</div>
                      <div className="text-xs text-muted-foreground">{o.client?.name || "—"}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{o.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">Nada novo por aqui.</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold mb-3">Hoje você precisa</h2>
            <MyTasksBlock />
          </Card>
        </div>

        {modulesLoading ? null : null}
      </div>
    </DashboardLayout>
  );
}
