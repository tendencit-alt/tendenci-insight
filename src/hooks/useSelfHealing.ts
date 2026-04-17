import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSelfHealingOverview() {
  return useQuery({
    queryKey: ['self-healing', 'overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_self_healing_overview');
      if (error) throw error;
      return data as Record<string, number>;
    },
    refetchInterval: 30000,
  });
}

export function useSelfHealingPolicies() {
  return useQuery({
    queryKey: ['self-healing', 'policies'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('self_healing_policy_registry')
        .select('*')
        .order('action_code');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSelfHealingGuardrailLogs(limit = 100) {
  return useQuery({
    queryKey: ['self-healing', 'guardrail-logs', limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('self_healing_guardrail_logs')
        .select('*')
        .order('evaluated_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
}

export function useSelfHealingEscalations(status: 'open' | 'all' = 'open') {
  return useQuery({
    queryKey: ['self-healing', 'escalations', status],
    queryFn: async () => {
      let q = (supabase as any)
        .from('self_healing_escalations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (status === 'open') q = q.eq('status', 'open');
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
}

export function useSelfHealingStability(limit = 50) {
  return useQuery({
    queryKey: ['self-healing', 'stability', limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('self_healing_stability_checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Record<string, any> }) => {
      const { error } = await (supabase as any)
        .from('self_healing_policy_registry')
        .update(input.patch)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Política atualizada');
      qc.invalidateQueries({ queryKey: ['self-healing'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useResolveEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: 'acknowledged' | 'resolved' | 'dismissed'; note?: string }) => {
      const { error } = await supabase.rpc('resolve_self_healing_escalation' as any, {
        p_id: input.id, p_status: input.status, p_note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Escalonamento atualizado');
      qc.invalidateQueries({ queryKey: ['self-healing'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
