import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const q = (t: string) => (supabase as any).from(t);

export function useCustomerOnboarding() {
  return useQuery({
    queryKey: ['lifecycle-onboarding'],
    queryFn: async () => {
      const { data } = await q('customer_onboarding').select('*, tenants(name)');
      return data || [];
    },
  });
}

export function useCustomerActivation() {
  return useQuery({
    queryKey: ['lifecycle-activation'],
    queryFn: async () => {
      const { data } = await q('customer_activation').select('*, tenants(name)').order('created_at', { ascending: false });
      return data || [];
    },
  });
}

export function useCustomerAdoption() {
  return useQuery({
    queryKey: ['lifecycle-adoption'],
    queryFn: async () => {
      const { data } = await q('customer_adoption').select('*, tenants(name)').order('period_month', { ascending: false });
      return data || [];
    },
  });
}

export function useCustomerHealthScores() {
  return useQuery({
    queryKey: ['lifecycle-health'],
    queryFn: async () => {
      const { data } = await q('customer_health_scores').select('*, tenants(name)');
      return data || [];
    },
  });
}

export function useRetentionEvents() {
  return useQuery({
    queryKey: ['lifecycle-retention'],
    queryFn: async () => {
      const { data } = await q('customer_retention_events').select('*, tenants(name)').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });
}

export function useExpansionOpportunities() {
  return useQuery({
    queryKey: ['lifecycle-expansion'],
    queryFn: async () => {
      const { data } = await q('customer_expansion_opportunities').select('*, tenants(name)').order('created_at', { ascending: false });
      return data || [];
    },
  });
}

export function useLifecycleMetrics() {
  return useQuery({
    queryKey: ['lifecycle-metrics'],
    queryFn: async () => {
      const [{ data: onb }, { data: health }, { data: retention }, { data: expansion }] = await Promise.all([
        q('customer_onboarding').select('progress_pct, tenant_id'),
        q('customer_health_scores').select('total_score, classification'),
        q('customer_retention_events').select('severity, resolved'),
        q('customer_expansion_opportunities').select('status, estimated_value'),
      ]);

      const healthList = health || [];
      const healthy = healthList.filter((h: any) => h.classification === 'healthy').length;
      const attention = healthList.filter((h: any) => h.classification === 'attention').length;
      const risk = healthList.filter((h: any) => h.classification === 'risk').length;
      const critical = healthList.filter((h: any) => h.classification === 'critical').length;

      const onbList = onb || [];
      const avgOnboarding = onbList.length > 0
        ? onbList.reduce((s: number, o: any) => s + Number(o.progress_pct || 0), 0) / onbList.length
        : 0;

      const openRetention = (retention || []).filter((r: any) => !r.resolved).length;
      const criticalRetention = (retention || []).filter((r: any) => !r.resolved && r.severity === 'critical').length;

      const expList = expansion || [];
      const detectedExpansion = expList.filter((e: any) => e.status === 'detected').length;
      const expansionValue = expList.filter((e: any) => e.status === 'detected').reduce((s: number, e: any) => s + Number(e.estimated_value || 0), 0);

      return {
        totalAccounts: healthList.length,
        healthy, attention, risk, critical,
        avgOnboarding,
        openRetention, criticalRetention,
        detectedExpansion, expansionValue,
      };
    },
  });
}
