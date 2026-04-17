import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { useBillingKpis, useDunningSteps, useUpgradeSignals } from "@/hooks/useBillingOps";
import { Link } from "react-router-dom";

export function BillingOpsQuickAccessCard() {
  const { data: k } = useBillingKpis();
  const { data: dunning } = useDunningSteps();
  const { data: signals } = useUpgradeSignals();

  const pendingDunning = (dunning ?? []).filter((d: any) => d.status === "pending").length;
  const openSignals = signals?.length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Smart Billing Ops</CardTitle>
          <Link to="/owner/billing-ops">
            <Button size="sm" variant="ghost" className="gap-1">Abrir<ArrowRight className="h-3 w-3" /></Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">MRR</p>
            <p className="text-sm font-bold">R$ {Number(k?.mrr ?? 0).toFixed(0)}</p>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Churn</p>
            <p className="text-sm font-bold">{Number(k?.churn_rate ?? 0).toFixed(1)}%</p>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Ativas</p>
            <p className="text-sm font-bold">{k?.active_subs ?? 0}</p>
          </div>
        </div>
        {(pendingDunning > 0 || openSignals > 0) && (
          <div className="flex flex-wrap gap-2">
            {pendingDunning > 0 && (
              <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{pendingDunning} dunning pendente(s)</Badge>
            )}
            {openSignals > 0 && (
              <Badge className="gap-1 bg-green-500/10 text-green-500"><TrendingUp className="h-3 w-3" />{openSignals} sinal(s) de upgrade</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
