import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const q = (t: string) => (supabase as any).from(t);

export function usePlansWithDetails() {
  return useQuery({
    queryKey: ['billing-plans-details'],
    queryFn: async () => {
      const [{ data: plans }, { data: features }, { data: limits }] = await Promise.all([
        q('tenant_plans').select('*').order('price'),
        q('plan_features').select('*'),
        q('plan_limits').select('*'),
      ]);
      return (plans || []).map((p: any) => ({
        ...p,
        features: (features || []).filter((f: any) => f.plan_id === p.id),
        limits: (limits || []).filter((l: any) => l.plan_id === p.id),
      }));
    },
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ['billing-subscriptions'],
    queryFn: async () => {
      const { data } = await q('subscriptions').select('*, tenants(name), tenant_plans(name, price)');
      return data || [];
    },
  });
}

export function useSubscriptionHistory(subscriptionId?: string) {
  return useQuery({
    queryKey: ['billing-sub-history', subscriptionId],
    queryFn: async () => {
      let query = q('subscription_history').select('*, tenant_plans!subscription_history_from_plan_id_fkey(name)').order('created_at', { ascending: false });
      if (subscriptionId) query = query.eq('subscription_id', subscriptionId);
      const { data } = await query.limit(100);
      return data || [];
    },
  });
}

export function useUsageConsumption() {
  return useQuery({
    queryKey: ['billing-usage'],
    queryFn: async () => {
      const { data } = await q('usage_consumption').select('*, tenants(name)').order('updated_at', { ascending: false });
      return data || [];
    },
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ['billing-invoices'],
    queryFn: async () => {
      const { data } = await q('invoices').select('*, tenants(name)').order('created_at', { ascending: false });
      return data || [];
    },
  });
}

export function useBillingEvents() {
  return useQuery({
    queryKey: ['billing-events'],
    queryFn: async () => {
      const { data } = await q('billing_events').select('*, tenants(name)').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });
}

export function useBillingMetrics() {
  return useQuery({
    queryKey: ['billing-metrics'],
    queryFn: async () => {
      const [{ data: subs }, { data: invoices }] = await Promise.all([
        q('subscriptions').select('*, tenant_plans(price, yearly_price)'),
        q('invoices').select('total, status, created_at'),
      ]);

      const activeSubs = (subs || []).filter((s: any) => s.status === 'active');
      const mrr = activeSubs.reduce((sum: number, s: any) => {
        const price = s.billing_cycle === 'yearly'
          ? (s.tenant_plans?.yearly_price || 0) / 12
          : (s.tenant_plans?.price || 0);
        return sum + Number(price);
      }, 0);

      const totalSubs = (subs || []).length;
      const cancelledSubs = (subs || []).filter((s: any) => s.status === 'cancelled').length;
      const churnRate = totalSubs > 0 ? (cancelledSubs / totalSubs) * 100 : 0;

      const paidInvoices = (invoices || []).filter((i: any) => i.status === 'paid');
      const totalRevenue = paidInvoices.reduce((s: number, i: any) => s + Number(i.total || 0), 0);

      const pastDue = (subs || []).filter((s: any) => s.status === 'past_due').length;
      const inadimplencia = totalSubs > 0 ? (pastDue / totalSubs) * 100 : 0;

      return {
        mrr,
        arr: mrr * 12,
        churnRate,
        totalRevenue,
        activeSubs: activeSubs.length,
        totalSubs,
        cancelledSubs,
        pastDue,
        inadimplencia,
        trialSubs: (subs || []).filter((s: any) => s.status === 'trial').length,
      };
    },
  });
}
