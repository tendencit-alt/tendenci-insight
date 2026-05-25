import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CreditCard, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function SuperAdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const [tenantsRes, userTenantsRes, plansRes] = await Promise.all([
        supabase.from('tenants').select('id, active', { count: 'exact' }),
        supabase.from('user_tenants').select('user_id, tenant_id', { count: 'exact' }),
        supabase.from('tenant_plans').select('id', { count: 'exact' }),
      ]);

      const activeTenants = tenantsRes.data?.filter(t => t.active).length || 0;
      const totalTenants = tenantsRes.count || 0;
      // Count cross-tenant memberships via user_tenants (avoids profiles RLS per-tenant scope)
      const totalUsers = userTenantsRes.count ?? userTenantsRes.data?.length ?? 0;
      const totalPlans = plansRes.count || 0;

      return { activeTenants, totalTenants, totalUsers, totalPlans };
    },
  });

  const cards = [
    { title: 'Empresas Ativas', value: stats?.activeTenants || 0, icon: Building2, color: 'text-green-500' },
    { title: 'Total de Empresas', value: stats?.totalTenants || 0, icon: CheckCircle, color: 'text-blue-500' },
    { title: 'Total de Usuários', value: stats?.totalUsers || 0, icon: Users, color: 'text-purple-500' },
    { title: 'Planos Disponíveis', value: stats?.totalPlans || 0, icon: CreditCard, color: 'text-amber-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
