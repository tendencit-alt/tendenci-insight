import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompanyOverview } from "@/hooks/useSaasAdmin";
import { Heart, AlertTriangle, TrendingUp, ShieldCheck } from "lucide-react";

const buckets = [
  { key: "healthy", label: "Saudáveis", icon: ShieldCheck, color: "text-green-600" },
  { key: "attention", label: "Atenção", icon: TrendingUp, color: "text-yellow-600" },
  { key: "risk", label: "Em risco", icon: AlertTriangle, color: "text-orange-600" },
  { key: "critical", label: "Críticas", icon: Heart, color: "text-destructive" },
];

export function HealthOverviewTab() {
  const { data: companies = [] } = useCompanyOverview();

  const grouped = buckets.map((b) => ({
    ...b,
    items: companies.filter((c) => c.health_classification === b.key),
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {grouped.map((g) => {
          const Icon = g.icon;
          return (
            <Card key={g.key}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{g.label}</p>
                    <p className="text-3xl font-bold">{g.items.length}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${g.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {grouped.map((g) => (
        g.items.length > 0 && (
          <Card key={g.key}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <g.icon className={`h-4 w-4 ${g.color}`} />{g.label} ({g.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {g.items.map((c) => (
                  <div key={c.tenant_id} className="flex items-center justify-between p-2 rounded border">
                    <div>
                      <p className="font-medium text-sm">{c.tenant_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.plan_name ?? "Sem plano"} • {c.active_users}/{c.max_users} usuários
                        {c.overdue_invoices > 0 && ` • ${c.overdue_invoices} faturas em atraso`}
                      </p>
                    </div>
                    <Badge variant="outline">Score: {Number(c.health_score ?? 0).toFixed(0)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ))}
    </div>
  );
}
