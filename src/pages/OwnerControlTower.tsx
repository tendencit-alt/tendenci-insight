import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Building2, DollarSign, Package } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

function useOwnerMetrics() {
  return useQuery({
    queryKey: ['owner-control-tower-metrics-v2'],
    queryFn: async () => {
      const [tenantsRes, plansRes, userTenantsRes] = await Promise.all([
        supabase.from('tenants').select('id, name, active, plan_id'),
        supabase.from('tenant_plans').select('id, name, price'),
        supabase.from('user_tenants').select('tenant_id, user_id'),
      ]);
      if (tenantsRes.error) throw tenantsRes.error;
      if (plansRes.error) throw plansRes.error;
      if (userTenantsRes.error) throw userTenantsRes.error;

      const tenants = tenantsRes.data ?? [];
      const plans = plansRes.data ?? [];
      const userTenants = userTenantsRes.data ?? [];

      const planById = new Map(plans.map((p: any) => [p.id, p]));
      const usersByTenant = new Map<string, number>();
      for (const ut of userTenants) {
        usersByTenant.set(ut.tenant_id, (usersByTenant.get(ut.tenant_id) ?? 0) + 1);
      }

      const totalTenants = tenants.length;
      const activeTenants = tenants.filter((t: any) => t.active).length;
      const totalUsers = userTenants.length;

      let mrr = 0;
      const planDistribution = new Map<string, { name: string; count: number; mrr: number }>();
      for (const t of tenants) {
        if (!t.active) continue;
        const plan: any = t.plan_id ? planById.get(t.plan_id) : null;
        const planName = plan?.name ?? 'Sem plano';
        const price = Number(plan?.price ?? 0);
        mrr += price;
        const cur = planDistribution.get(planName) ?? { name: planName, count: 0, mrr: 0 };
        cur.count += 1;
        cur.mrr += price;
        planDistribution.set(planName, cur);
      }

      const tenantRows = tenants
        .map((t: any) => {
          const plan: any = t.plan_id ? planById.get(t.plan_id) : null;
          return {
            id: t.id,
            name: t.name,
            active: t.active,
            planName: plan?.name ?? 'Sem plano',
            planPrice: Number(plan?.price ?? 0),
            users: usersByTenant.get(t.id) ?? 0,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        totalTenants,
        activeTenants,
        totalUsers,
        mrr,
        arr: mrr * 12,
        planDistribution: Array.from(planDistribution.values()).sort((a, b) => b.mrr - a.mrr),
        tenantRows,
      };
    },
    refetchInterval: 60000,
  });
}

export default function OwnerControlTower() {
  const { isOwner } = usePermissions();
  const { data, isLoading, error } = useOwnerMetrics();

  if (!isOwner) return <Navigate to="/" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            🛰️ Owner Control Tower
          </h1>
          <p className="text-muted-foreground text-lg">
            Visão consolidada da base de tenants — dados em tempo real
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Card><CardContent className="p-6 text-sm text-destructive">Erro ao carregar métricas: {(error as Error).message}</CardContent></Card>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard icon={Building2} label="Tenants ativos" value={data.activeTenants} sub={`${data.totalTenants} total`} />
              <KPICard icon={Users} label="Usuários (todas empresas)" value={data.totalUsers} />
              <KPICard icon={DollarSign} label="MRR" value={fmtMoney(data.mrr)} sub={`ARR ${fmtMoney(data.arr)}`} />
              <KPICard icon={Package} label="Planos ativos" value={data.planDistribution.length} />
            </div>

            <Card>
              <CardHeader><CardTitle>Distribuição por plano</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.planDistribution.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum tenant ativo com plano atribuído.</p>
                )}
                {data.planDistribution.map((p) => (
                  <div key={p.name} className="flex justify-between p-3 rounded border">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{p.name}</Badge>
                      <span className="text-sm text-muted-foreground">{p.count} tenant{p.count === 1 ? '' : 's'}</span>
                    </div>
                    <span className="font-bold">{fmtMoney(p.mrr)}/mês</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Empresas</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground border-b">
                      <tr>
                        <th className="py-2 pr-4">Empresa</th>
                        <th className="py-2 pr-4">Plano</th>
                        <th className="py-2 pr-4">Usuários</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4 text-right">Receita/mês</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tenantRows.map((t) => (
                        <tr key={t.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{t.name}</td>
                          <td className="py-2 pr-4"><Badge variant="outline">{t.planName}</Badge></td>
                          <td className="py-2 pr-4">{t.users}</td>
                          <td className="py-2 pr-4">
                            {t.active
                              ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>
                              : <Badge variant="secondary">Inativo</Badge>}
                          </td>
                          <td className="py-2 pr-4 text-right">{fmtMoney(t.planPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function KPICard({ icon: Icon, label, value, sub }: any) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-4 w-4" />{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
