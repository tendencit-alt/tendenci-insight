import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Users, HardDrive, Activity, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OwnerTechnicalPanel() {
  const queryClient = useQueryClient();

  const { data: tenants, isLoading: loadingTenants } = useQuery({
    queryKey: ['owner-tenants-technical'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          plan:tenant_plans(name, max_users)
        `)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: usersByTenant } = useQuery({
    queryKey: ['owner-users-by-tenant'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, username, role, tenant_id, is_owner, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleTenantMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('tenants')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-tenants-technical'] });
      toast.success('Status da empresa atualizado');
    },
  });

  const getUsersForTenant = (tenantId: string) => {
    return usersByTenant?.filter(u => u.tenant_id === tenantId) || [];
  };

  const getTotalUsersCount = (tenantId: string) => {
    return getUsersForTenant(tenantId).length;
  };

  if (loadingTenants) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Empresas</CardTitle>
            <HardDrive className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tenants?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Empresas Ativas</CardTitle>
            <Activity className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tenants?.filter(t => t.active).length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Usuários</CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usersByTenant?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Owners</CardTitle>
            <Shield className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usersByTenant?.filter(u => u.is_owner).length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants with users detail */}
      {tenants?.map((tenant) => {
        const tenantUsers = getUsersForTenant(tenant.id);
        const plan = tenant.plan as any;
        const usersCount = getTotalUsersCount(tenant.id);
        const maxUsers = tenant.max_users || plan?.max_users || 0;
        const usagePercent = maxUsers > 0 ? Math.round((usersCount / maxUsers) * 100) : 0;

        return (
          <Card key={tenant.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{tenant.name}</CardTitle>
                  <Badge variant={tenant.active ? 'default' : 'destructive'}>
                    {tenant.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {plan && (
                    <Badge variant="outline">{plan.name}</Badge>
                  )}
                  <Badge variant="secondary">
                    {usersCount}/{maxUsers} usuários ({usagePercent}%)
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ativo</span>
                  <Switch
                    checked={tenant.active}
                    onCheckedChange={(active) => toggleTenantMutation.mutate({ id: tenant.id, active })}
                  />
                </div>
              </div>
              <CardDescription>Slug: {tenant.slug} • Criado em {format(new Date(tenant.created_at), 'dd/MM/yyyy', { locale: ptBR })}</CardDescription>
            </CardHeader>
            <CardContent>
              {tenantUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || user.username || 'Sem nome'}
                          {user.is_owner && (
                            <Badge className="ml-2 bg-amber-500/20 text-amber-500 border-amber-500/30" variant="outline">
                              Owner
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role === 'admin' ? 'Admin' : user.role}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário nesta empresa</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
