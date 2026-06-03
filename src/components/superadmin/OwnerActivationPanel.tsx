import { useQuery } from '@tanstack/react-query';
import { auditStub } from "@/lib/audit-stub";
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Activity, AlertTriangle, Building2, CheckCircle2,
  BarChart3, TrendingUp, ShieldCheck, XCircle
} from 'lucide-react';

interface TenantActivation {
  tenantId: string;
  tenantName: string;
  score: number;
  dreReliability: number;
  cashFlowReliability: number;
  risk: 'baixo' | 'medio' | 'alto' | 'critico';
  readyForManagement: boolean;
  daysSinceCreation: number;
  hasLedger: boolean;
  hasGoals: boolean;
  hasReconciliation: boolean;
}

const riskConfig = {
  baixo: { label: 'Baixo', color: 'text-green-600 bg-green-500/10' },
  medio: { label: 'Médio', color: 'text-amber-600 bg-amber-500/10' },
  alto: { label: 'Alto', color: 'text-orange-600 bg-orange-500/10' },
  critico: { label: 'Crítico', color: 'text-destructive bg-destructive/10' },
};

export function OwnerActivationPanel() {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['owner-activation-global'],
    queryFn: async () => {
      // Get all tenants with their settings
      const { data: allTenants } = await supabase
        .from('tenants')
        .select('id, name, created_at, active')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (!allTenants?.length) return [];

      // For each tenant, get activation data via service-level queries
      // We use counts from key tables filtered by tenant
      const results: TenantActivation[] = [];

      for (const tenant of allTenants) {
        const [
          { count: ledgerCount },
          { count: classifiedCount },
          { count: reconciledCount },
          { count: goalsCount },
          { count: importCount },
          { count: receivablesCount },
          { count: payablesCount },
          { count: bankCount },
          { count: costCenterCount },
        ] = await Promise.all([
          supabase.from('fin_ledger_entries' as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          supabase.from('fin_ledger_entries' as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).not('chart_account_id', 'is', null),
          supabase.from('fin_ledger_entries' as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'CONCILIADO'),
          supabase.from('fin_goals' as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),auditStub().select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          supabase.from('fin_receivables' as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          supabase.from('fin_payables' as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          supabase.from('fin_bank_accounts' as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('active', true),
          supabase.from('fin_cost_centers' as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('active', true),
        ]);

        const total = ledgerCount || 0;
        const classified = classifiedCount || 0;
        const reconciled = reconciledCount || 0;
        const hasBank = (bankCount || 0) > 0;
        const hasCostCenter = (costCenterCount || 0) > 0;
        const hasLedger = total > 0;
        const hasGoals = (goalsCount || 0) > 0;
        const hasImport = (importCount || 0) > 0;
        const hasReconciliation = reconciled > 0;

        // Activation score (simplified weights)
        let scorePoints = 0;
        let scoreTotal = 100;
        if (hasBank) scorePoints += 15;
        if (hasCostCenter) scorePoints += 10;
        if (hasImport) scorePoints += 15;
        if (hasLedger) scorePoints += 10;
        if (classified > 0) scorePoints += 15;
        if (hasReconciliation) scorePoints += 15;
        if (hasGoals) scorePoints += 10;
        if ((receivablesCount || 0) > 0 || (payablesCount || 0) > 0) scorePoints += 10;

        const score = Math.round((scorePoints / scoreTotal) * 100);

        // DRE reliability
        const classRate = total > 0 ? (classified / total) * 100 : 0;
        const reconRate = total > 0 ? (reconciled / total) * 100 : 0;
        const dreReliability = Math.round(classRate * 0.6 + reconRate * 0.4);

        // Cash flow reliability
        const futureReliable = ((receivablesCount || 0) > 0 || (payablesCount || 0) > 0) ? 80 : 0;
        const cashFlowReliability = Math.round(futureReliable * 0.5 + reconRate * 0.3 + classRate * 0.2);

        // Risk
        const daysSinceCreation = Math.floor((Date.now() - new Date(tenant.created_at).getTime()) / (1000 * 60 * 60 * 24));
        let risk: TenantActivation['risk'] = 'baixo';
        if (daysSinceCreation > 30 && score < 20) risk = 'critico';
        else if (daysSinceCreation > 30 && score < 40) risk = 'alto';
        else if (daysSinceCreation > 14 && score < 50) risk = 'medio';

        const readyForManagement = dreReliability >= 45 && cashFlowReliability >= 45 && hasGoals && hasReconciliation;

        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          score,
          dreReliability,
          cashFlowReliability,
          risk,
          readyForManagement,
          daysSinceCreation,
          hasLedger,
          hasGoals,
          hasReconciliation,
        });
      }

      return results;
    },
    staleTime: 120000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Ativação Global</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  const avgScore = tenants?.length ? Math.round(tenants.reduce((s, t) => s + t.score, 0) / tenants.length) : 0;
  const readyCount = tenants?.filter(t => t.readyForManagement).length || 0;
  const atRisk = tenants?.filter(t => t.risk === 'alto' || t.risk === 'critico').length || 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{avgScore}%</p>
            <p className="text-[10px] text-muted-foreground">Ativação Média</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{tenants?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Empresas Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShieldCheck className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold">{readyCount}</p>
            <p className="text-[10px] text-muted-foreground">Prontas p/ Gestão</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{atRisk}</p>
            <p className="text-[10px] text-muted-foreground">Em Risco Abandono</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-tenant table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Ativação por Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">DRE</TableHead>
                <TableHead className="text-center">Fluxo</TableHead>
                <TableHead className="text-center">Risco</TableHead>
                <TableHead className="text-center">Gestão</TableHead>
                <TableHead className="text-right">Dias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants?.map(t => (
                <TableRow key={t.tenantId}>
                  <TableCell className="font-medium">{t.tenantName}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-2">
                      <Progress value={t.score} className="h-1.5 flex-1" />
                      <span className="text-xs font-mono w-8 text-right">{t.score}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px]">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      {t.dreReliability}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px]">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {t.cashFlowReliability}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-[10px] ${riskConfig[t.risk].color}`}>
                      {riskConfig[t.risk].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {t.readyForManagement ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {t.daysSinceCreation}d
                  </TableCell>
                </TableRow>
              ))}
              {!tenants?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma empresa ativa
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
