import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, DollarSign, TrendingUp, Wallet, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "default",
  loading,
}: { icon: any; label: string; value: string; tone?: "default" | "success" | "danger"; loading?: boolean }) {
  const toneClass =
    tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : "text-foreground";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {loading ? <Skeleton className="h-8 w-28" /> : (
        <div className={`text-3xl font-bold tabular-nums ${toneClass}`}>{value}</div>
      )}
    </Card>
  );
}

export default function DashboardSimple() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-simple-kpis"],
    queryFn: async () => {
      const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const today = format(new Date(), "yyyy-MM-dd");

      const [ledgerRes, banks, overdue, recvAll] = await Promise.all([
        supabase
          .from("fin_ledger_entries")
          .select("amount, entry_type, type, status, chart_account:fin_chart_accounts(grupo_fluxo)")
          .neq("status", "CANCELADO")
          .gte("competence_date", start)
          .lte("competence_date", end),
        supabase.from("fin_bank_accounts").select("current_balance"),
        supabase
          .from("fin_receivables")
          .select("amount", { count: "exact" })
          .lt("due_date", today)
          .neq("status", "received"),
        supabase
          .from("fin_receivables")
          .select("amount")
          .neq("status", "cancelled"),
      ]);

      const sumByFlow = (kind: "ENTRADA" | "SAIDA") =>
        (ledgerRes.data || []).reduce((s: number, r: any) => {
          const gf: string | null = r.chart_account?.grupo_fluxo ?? null;
          let match = false;
          if (gf) {
            // Suporta valores compostos: OPERACIONAL_ENTRADA, FINANCIAMENTO_SAIDA, etc.
            // NAO_CAIXA é ignorado nos KPIs de caixa.
            if (gf === "NAO_CAIXA") match = false;
            else match = kind === "ENTRADA" ? gf.endsWith("_ENTRADA") || gf === "ENTRADA"
                                            : gf.endsWith("_SAIDA")  || gf === "SAIDA";
          } else if (kind === "ENTRADA") match = r.entry_type === "credit" || r.type === "RECEITA";
          else match = r.entry_type === "debit" || r.type === "DESPESA";
          return match ? s + Number(r.amount || 0) : s;
        }, 0);

      const revenue = sumByFlow("ENTRADA");
      const costs = sumByFlow("SAIDA");
      const cash = (banks.data || []).reduce((s, b: any) => s + Number(b.current_balance || 0), 0);
      const overdueAmount = (overdue.data || []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
      const totalRecv = (recvAll.data || []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
      const margin = revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0;
      const inadimplencia = totalRecv > 0 ? (overdueAmount / totalRecv) * 100 : 0;

      return { revenue, margin, cash, inadimplencia };
    },
  });

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">BI</h1>
            <p className="text-sm text-muted-foreground">Indicadores essenciais do mês</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={DollarSign} label="Receita do mês" value={fmtBRL(data?.revenue || 0)} tone="success" loading={isLoading} />
          <Kpi icon={TrendingUp} label="Margem bruta" value={fmtPct(data?.margin || 0)} loading={isLoading} />
          <Kpi icon={Wallet} label="Saldo em caixa" value={fmtBRL(data?.cash || 0)} loading={isLoading} />
          <Kpi icon={AlertTriangle} label="Inadimplência" value={fmtPct(data?.inadimplencia || 0)} tone="danger" loading={isLoading} />
        </div>
      </div>
    </DashboardLayout>
  );
}
