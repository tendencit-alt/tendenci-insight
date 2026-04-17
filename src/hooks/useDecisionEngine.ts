import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDecisionRules() {
  return useQuery({
    queryKey: ['decision-engine-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decision_engine_rules')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useDecisionExecutions(limit = 50) {
  return useQuery({
    queryKey: ['decision-engine-executions', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decision_engine_executions')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useDecisionStats() {
  return useQuery({
    queryKey: ['decision-engine-stats'],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ data: total }, { data: active }, { data: critical }, { data: pending }] =
        await Promise.all([
          supabase.from('decision_engine_executions').select('id', { count: 'exact', head: true }).gte('executed_at', since),
          supabase.from('decision_engine_rules').select('id', { count: 'exact', head: true }).eq('active', true),
          supabase.from('decision_engine_executions').select('id', { count: 'exact', head: true }).eq('confidence_band', 'critical').gte('executed_at', since),
          supabase.from('decision_engine_events').select('id', { count: 'exact', head: true }).eq('processed', false),
        ]);
      return {
        total_7d: (total as any)?.count ?? 0,
        active_rules: (active as any)?.count ?? 0,
        critical_7d: (critical as any)?.count ?? 0,
        pending_events: (pending as any)?.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('decision_engine_rules')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decision-engine-rules'] }),
  });
}

export function useProcessEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('decision-engine-process');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decision-engine-executions'] });
      qc.invalidateQueries({ queryKey: ['decision-engine-stats'] });
    },
  });
}
