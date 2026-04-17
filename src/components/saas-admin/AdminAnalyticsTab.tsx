import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAnalytics, useAdminActionLog } from "@/hooks/useSaasAdmin";
import { BarChart3, Building2, Users, AlertTriangle, ShieldCheck, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AdminAnalyticsTab() {
  const { data, isLoading } = useAdminAnalytics();
  const { data: log = [] } = useAdminActionLog();

  if (isLoading || !data) return <p className="text-muted-foreground">Carregando analytics...</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard icon={Building2} label="Total empresas" value={data.total_tenants} />
        <MetricCard icon={ShieldCheck} label="Ativas" value={data.active_tenants} />
        <MetricCard icon={AlertTriangle} label="Em risco" value={data.tenants_at_risk} variant="warn" />
        <MetricCard icon={Users} label="Usuários totais" value={data.total_users} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Trial" value={data.trial_tenants} />
        <MetricCard label="Inadimplentes" value={data.past_due_tenants} variant="warn" />
        <MetricCard label="Suspensas" value={data.suspended_tenants} variant="danger" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Empresas por plano</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.tenants_by_plan).map(([plan, count]) => (
                <div key={plan} className="flex justify-between items-center">
                  <span className="text-sm">{plan}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top módulos ativados</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.top_active_modules.length === 0 && <p className="text-sm text-muted-foreground">Nenhum override ativo.</p>}
              {data.top_active_modules.map((m) => (
                <div key={m.module} className="flex justify-between items-center">
                  <span className="text-sm font-mono">{m.module}</span>
                  <span className="font-semibold">{m.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" />Últimas ações administrativas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {log.slice(0, 15).map((l) => (
              <div key={l.id} className="text-sm border-l-2 border-primary/40 pl-3 py-1">
                <div className="flex justify-between">
                  <span className="font-medium">{l.action_type}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(l.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground italic">"{l.reason}"</p>
              </div>
            ))}
            {log.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, variant }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: number; variant?: "warn" | "danger" }) {
  const color = variant === "danger" ? "text-destructive" : variant === "warn" ? "text-orange-500" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
          {Icon && <Icon className="h-8 w-8 opacity-40" />}
        </div>
      </CardContent>
    </Card>
  );
}
