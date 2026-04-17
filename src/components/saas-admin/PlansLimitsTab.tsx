import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCompanyOverview, useTenantLimits } from "@/hooks/useSaasAdmin";
import { Gauge, AlertTriangle } from "lucide-react";

export function PlansLimitsTab() {
  const { data: companies = [] } = useCompanyOverview();
  const [tenantId, setTenantId] = useState<string | undefined>();
  const { data: limits = [] } = useTenantLimits(tenantId);
  const tenant = companies.find((c) => c.tenant_id === tenantId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" />Planos e Limites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecione uma empresa..." /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.tenant_id} value={c.tenant_id}>{c.tenant_name} — {c.plan_name ?? "Sem plano"}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {tenant && (
            <div className="grid gap-3 md:grid-cols-3 pt-2">
              <Card><CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Plano atual</p>
                <p className="text-lg font-semibold">{tenant.plan_name ?? "—"}</p>
                <p className="text-sm text-muted-foreground">R$ {Number(tenant.plan_price ?? 0).toFixed(2)}/mês</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={tenant.subscription_status === "active" ? "default" : "secondary"}>
                  {tenant.subscription_status ?? "—"}
                </Badge>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Próximo ciclo</p>
                <p className="text-sm">{tenant.current_period_end ? new Date(tenant.current_period_end).toLocaleDateString("pt-BR") : "—"}</p>
              </CardContent></Card>
            </div>
          )}

          {tenantId && (
            <div className="space-y-3 pt-2">
              <h3 className="font-semibold text-sm">Consumo vs Limites</h3>
              {limits.length === 0 ? (
                <p className="text-sm text-muted-foreground">Plano sem limites configurados.</p>
              ) : (
                limits.map((l) => {
                  const pct = Number(l.pct_used);
                  const danger = pct >= 90;
                  const warn = pct >= 70;
                  return (
                    <div key={l.limit_key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{l.limit_name}</span>
                        <span className={danger ? "text-destructive font-semibold" : warn ? "text-orange-500" : "text-muted-foreground"}>
                          {l.current_usage} / {l.limit_value} ({pct.toFixed(0)}%)
                          {danger && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                        </span>
                      </div>
                      <Progress value={Math.min(pct, 100)} className={danger ? "[&>div]:bg-destructive" : warn ? "[&>div]:bg-orange-500" : ""} />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
