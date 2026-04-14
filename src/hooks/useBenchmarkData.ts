import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const q = (t: string) => (supabase as any).from(t);

export function useBenchmarkClusters() {
  return useQuery({
    queryKey: ['benchmark-clusters'],
    queryFn: async () => {
      const { data } = await q('benchmark_clusters').select('*').eq('active', true).order('name');
      return data || [];
    },
  });
}

export function useBenchmarkMetrics(clusterId?: string) {
  return useQuery({
    queryKey: ['benchmark-metrics', clusterId],
    queryFn: async () => {
      let query = q('benchmark_metrics').select('*, benchmark_clusters(name)').order('category').order('metric_key');
      if (clusterId) query = query.eq('cluster_id', clusterId);
      const { data } = await query.limit(500);
      return data || [];
    },
  });
}

export function useBenchmarkPercentiles(tenantId?: string) {
  return useQuery({
    queryKey: ['benchmark-percentiles', tenantId],
    queryFn: async () => {
      let query = q('benchmark_percentile_scores').select('*, benchmark_clusters(name), tenants(name)').order('category').order('metric_key');
      if (tenantId) query = query.eq('tenant_id', tenantId);
      const { data } = await query.limit(500);
      return data || [];
    },
  });
}

export function useBenchmarkRecommendations() {
  return useQuery({
    queryKey: ['benchmark-recommendations'],
    queryFn: async () => {
      const { data } = await q('benchmark_recommendations').select('*, tenants(name)').order('priority').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });
}

export function useBenchmarkSummary() {
  return useQuery({
    queryKey: ['benchmark-summary'],
    queryFn: async () => {
      const [{ data: clusters }, { data: metrics }, { data: scores }, { data: recs }] = await Promise.all([
        q('benchmark_clusters').select('id').eq('active', true),
        q('benchmark_metrics').select('id, category'),
        q('benchmark_percentile_scores').select('id, category, percentile'),
        q('benchmark_recommendations').select('id, status'),
      ]);
      const s = scores || [];
      const avgPercentile = s.length > 0 ? Math.round(s.reduce((a: number, x: any) => a + (x.percentile || 0), 0) / s.length) : 0;
      const categories = ['financeiro', 'operacional', 'comercial', 'erp_efficiency'];
      const byCategory = Object.fromEntries(categories.map(c => {
        const items = s.filter((x: any) => x.category === c);
        return [c, items.length > 0 ? Math.round(items.reduce((a: number, x: any) => a + (x.percentile || 0), 0) / items.length) : 0];
      }));
      return {
        totalClusters: (clusters || []).length,
        totalMetrics: (metrics || []).length,
        totalScores: s.length,
        avgPercentile,
        byCategory,
        pendingRecs: (recs || []).filter((r: any) => r.status === 'pending').length,
        completedRecs: (recs || []).filter((r: any) => r.status === 'completed').length,
      };
    },
  });
}
