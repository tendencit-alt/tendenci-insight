import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function OwnerFinancialPanel() {
  const { data: tenants, isLoading: loadingTenants } = useQuery({
    queryKey: ['owner-tenants-financial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, active, plan_id, created_at')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ['owner-plans-financial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_plans')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Financial data per tenant - orders
  const { data: ordersData } = useQuery({
    queryKey: ['owner-financial-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, tenant_id, total_price, status, created_at');
      if (error) throw error;
      return data;
    },
  });

  // Receivables
  const { data: receivablesData } = useQuery({
    queryKey: ['owner-financial-receivables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fin_receivables')
        .select('id, tenant_id, amount, status');
      if (error) throw error;
      return data;
    },
  });

  // Payables
  const { data: payablesData } = useQuery({
    queryKey: ['owner-financial-payables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fin_payables')
        .select('id, tenant_id, amount, status');
      if (error) throw error;
      return data;
    },
  });

  if (loadingTenants) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getPlanName = (planId: string | null) => {
    return plans?.find(p => p.id === planId)?.name || 'Sem plano';
  };

  const getPlanPrice = (planId: string | null) => {
    return plans?.find(p => p.id === planId)?.price || 0;
  };

  const getFinancialForTenant = (tenantId: string) => {
    const orders = ordersData?.filter(o => o.tenant_id === tenantId) || [];
    const receivables = receivablesData?.filter(r => r.tenant_id === tenantId) || [];
    const payables = payablesData?.filter(p => p.tenant_id === tenantId) || [];

    const totalOrders = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const totalReceivables = receivables.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalPayables = payables.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingReceivables = receivables.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.amount || 0), 0);
    const pendingPayables = payables.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalOrders,
      ordersCount: orders.length,
      totalReceivables,
      totalPayables,
      pendingReceivables,
      pendingPayables,
      balance: totalReceivables - totalPayables,
    };
  };

  // Global totals
  const globalTotalOrders = ordersData?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
  const globalTotalReceivables = receivablesData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
  const globalTotalPayables = payablesData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const mrrTotal = tenants?.reduce((sum, t) => sum + getPlanPrice(t.plan_id), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Global Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR (Receita Recorrente)</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mrrTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">{tenants?.length} empresas ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pedidos (Global)</CardTitle>
            <Wallet className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(globalTotalOrders)}</div>
            <p className="text-xs text-muted-foreground mt-1">{ordersData?.length || 0} pedidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A Receber (Global)</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(globalTotalReceivables)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A Pagar (Global)</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(globalTotalPayables)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Tenant Financial */}
      <Card>
        <CardHeader>
          <CardTitle>Financeiro por Empresa</CardTitle>
          <CardDescription>Visão consolidada das finanças de cada empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Mensalidade</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">A Receber</TableHead>
                <TableHead className="text-right">A Pagar</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants?.map((tenant) => {
                const fin = getFinancialForTenant(tenant.id);
                return (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPlanName(tenant.plan_id)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(getPlanPrice(tenant.plan_id))}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(fin.totalOrders)}
                      <span className="text-xs text-muted-foreground ml-1">({fin.ordersCount})</span>
                    </TableCell>
                    <TableCell className="text-right text-emerald-500">{formatCurrency(fin.totalReceivables)}</TableCell>
                    <TableCell className="text-right text-red-500">{formatCurrency(fin.totalPayables)}</TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={fin.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                        {formatCurrency(fin.balance)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
