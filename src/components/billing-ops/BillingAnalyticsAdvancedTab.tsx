import { useBillingKpis } from "@/hooks/useBillingOps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Users, BarChart3, Repeat } from "lucide-react";

function Kpi({ title, value, sub, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BillingAnalyticsAdvancedTab() {
  const { data: k, isLoading } = useBillingKpis();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!k || k.error) return <p className="text-muted-foreground">Sem dados disponíveis</p>;

  const fmt = (n: any) => `R$ ${Number(n ?? 0).toFixed(2)}`;
  const pct = (n: any) => `${Number(n ?? 0).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Billing Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="MRR" value={fmt(k.mrr)} sub="Receita Recorrente Mensal" icon={DollarSign} color="bg-green-500/10 text-green-500" />
        <Kpi title="ARR" value={fmt(k.arr)} sub="Receita Recorrente Anual" icon={TrendingUp} color="bg-blue-500/10 text-blue-500" />
        <Kpi title="ARPA" value={fmt(k.arpa)} sub="Receita média por conta" icon={Users} color="bg-primary/10 text-primary" />
        <Kpi title="Upgrade Rate" value={pct(k.upgrade_rate)} sub="últimos 30 dias" icon={Repeat} color="bg-purple-500/10 text-purple-500" />
        <Kpi title="Churn Rate" value={pct(k.churn_rate)} sub={`${k.cancelled_subs} canceladas`} icon={TrendingDown} color="bg-red-500/10 text-red-500" />
        <Kpi title="Inadimplência" value={pct(k.inadimplencia_pct)} sub={`${k.past_due_subs} em atraso`} icon={AlertTriangle} color="bg-yellow-500/10 text-yellow-500" />
        <Kpi title="Assinaturas Ativas" value={String(k.active_subs ?? 0)} sub={`${k.total_subs} total`} icon={Users} color="bg-green-500/10 text-green-500" />
        <Kpi title="Past Due" value={String(k.past_due_subs ?? 0)} icon={AlertTriangle} color="bg-orange-500/10 text-orange-500" />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Receita por plano</CardTitle></CardHeader>
        <CardContent>
          {(!k.revenue_by_plan || k.revenue_by_plan.length === 0) ? (
            <p className="text-muted-foreground text-sm">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {k.revenue_by_plan.map((r: any, i: number) => {
                const max = Math.max(...k.revenue_by_plan.map((x: any) => Number(x.revenue)));
                const w = max > 0 ? (Number(r.revenue) / max) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{r.plan ?? "Sem plano"}</span>
                      <span className="text-muted-foreground">{r.count} assinatura(s) · {fmt(r.revenue)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded">
                      <div className="h-full bg-primary rounded" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
