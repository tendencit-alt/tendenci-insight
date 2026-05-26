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
import { useIsModuleVisible } from "@/hooks/useModulesConfig";
import { useActiveTenant } from "@/hooks/useActiveTenant";

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
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export default function HomeHoje() {
  const navigate = useNavigate();
  const { visible: leadsVisible } = useIsModuleVisible("leads");
  const { visible: ordersVisible } = useIsModuleVisible("pedidos");
  const { visible: orcamentosVisible } = useIsModuleVisible("orcamentos");
  const { activeTenantId } = useActiveTenant();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["home-hoje-kpis", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const today = format(new Date(), "yyyy-MM-dd");
      const tid = activeTenantId as string;

      const [revenueEntries, openOrders, banks, overdueReceivables] = await Promise.all([
        // Receita REALIZADA do mês: entradas liquidadas/conciliadas com cash_date no mês
        supabase
          .from("fin_ledger_entries")
          .select("amount,status")
          .eq("tenant_id", tid)
          .eq("type", "RECEITA")
          .in("status", ["PAGO_RECEBIDO", "CONCILIADO"])
          .gte("cash_date", start)
          .lte("cash_date", end),
        // Pedidos abertos: status real = 'ativo' (mesmo critério da tela /pedidos)
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tid)
          .eq("status", "ativo"),
        // Saldo em caixa: contas bancárias ativas do tenant
        supabase
          .from("fin_bank_accounts")
          .select("opening_balance")
          .eq("tenant_id", tid)
          .eq("active", true),
        // Contas vencidas (recebíveis) do tenant ativo
        supabase
          .from("fin_receivables")
          .select("amount", { count: "exact" })
          .eq("tenant_id", tid)
          .lt("due_date", today)
          .not("status", "in", "(RECEBIDO,PAGO,CANCELADO)"),
      ]);

      return {
        revenue: (revenueEntries.data || []).reduce((s, r: any) => s + Math.abs(Number(r.amount || 0)), 0),
        openOrders: openOrders.count || 0,
        cash: (banks.data || []).reduce((s, b: any) => s + Number(b.opening_balance || 0), 0),
        overdueCount: overdueReceivables.count || 0,
        overdueAmount: (overdueReceivables.data || []).reduce((s, p: any) => s + Number(p.amount || 0), 0),
      };
    },
  });

  const { data: inbox, isLoading: loadingInbox } = useQuery({
    queryKey: ["home-hoje-inbox", activeTenantId, { leadsVisible, ordersVisible, orcamentosVisible }],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const tid = activeTenantId as string;
      const items: Array<{ id: string; type: "lead" | "order" | "proposta"; title: string; subtitle: string; route: string; meta?: string }> = [];

      if (ordersVisible) {
        const { data } = await supabase
          .from("orders")
          .select("id, order_number, status, client:clients(name)")
          .eq("tenant_id", tid)
          .order("created_at", { ascending: false })
          .limit(4);
        for (const o of data || []) {
          items.push({
            id: `order-${o.id}`,
            type: "order",
            title: `Pedido #${(o as any).order_number}`,
            subtitle: (o as any).client?.name || "—",
            route: `/pedidos?orderId=${o.id}`,
            meta: (o as any).status,
          });
        }
      }

      if (leadsVisible) {
        const { data } = await (supabase as any)
          .from("crm_deals")
          .select("id, title, stage")
          .eq("tenant_id", tid)
          .order("created_at", { ascending: false })
          .limit(3);
        for (const l of data || []) {
          items.push({
            id: `lead-${l.id}`,
            type: "lead",
            title: l.title || "Lead sem título",
            subtitle: "Lead novo",
            route: `/leads`,
            meta: l.stage,
          });
        }
      }

      if (orcamentosVisible) {
        const { data } = await (supabase as any)
          .from("propostas")
          .select("id, numero, status")
          .eq("tenant_id", tid)
          .order("created_at", { ascending: false })
          .limit(3);
        for (const p of data || []) {
          items.push({
            id: `proposta-${p.id}`,
            type: "proposta",
            title: `Proposta #${p.numero ?? p.id.slice(0, 6)}`,
            subtitle: "Orçamento",
            route: `/propostas`,
            meta: p.status,
          });
        }
      }

      return items;
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
          <Kpi icon={DollarSign} label="Receita realizada do mês" value={fmtBRL(kpis?.revenue || 0)} tone="success" loading={isLoading} />
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
            ) : inbox && inbox.length > 0 ? (
              <ul className="divide-y divide-border">
                {inbox.map((it) => (
                  <li
                    key={it.id}
                    onClick={() => navigate(it.route)}
                    className="py-2 flex items-center justify-between cursor-pointer hover:bg-muted/40 px-2 rounded"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{it.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{it.subtitle}</div>
                    </div>
                    {it.meta && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0 ml-2">{it.meta}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">Nada novo por aqui.</p>
            )}
          </Card>

          <MyTasksBlock />
        </div>

        
      </div>
    </DashboardLayout>
  );
}
