import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRecoveryOverview() {
  return useQuery({
    queryKey: ['recovery', 'overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recovery_overview');
      if (error) throw error;
      return data as {
        total_24h: number;
        success_24h: number;
        failed_24h: number;
        pending: number;
        auto_24h: number;
        manual_24h: number;
        success_rate: number;
        avg_duration_ms: number;
        top_recovery_code: string | null;
        top_failing_module: string | null;
      };
    },
    refetchInterval: 30000,
  });
}

export function useRecoveryCatalog() {
  return useQuery({
    queryKey: ['recovery', 'catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recovery_catalog')
        .select('*')
        .eq('active', true)
        .order('target_module');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRecoveryLogs(limit = 50) {
  return useQuery({
    queryKey: ['recovery', 'logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recovery_execution_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
}

export function usePendingAutoRecoveries() {
  return useQuery({
    queryKey: ['recovery', 'pending-auto'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('find_pending_auto_recoveries');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });
}

interface DispatchInput {
  recovery_code: string;
  failure_code: string;
  target_module?: string;
  incident_group_id?: string;
  execution_mode?: 'auto' | 'manual' | 'assisted';
  reason?: string;
}

export function useDispatchRecovery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DispatchInput) => {
      const { data, error } = await supabase.functions.invoke('recovery-dispatcher', {
        body: input,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.result === 'success') {
        toast.success(`Recovery executada (${data.duration_ms}ms)`);
      } else {
        toast.error(`Recovery falhou: ${data?.message || 'erro'}`);
      }
      qc.invalidateQueries({ queryKey: ['recovery'] });
    },
    onError: (e: any) => toast.error(`Falha no dispatcher: ${e.message}`),
  });
}
