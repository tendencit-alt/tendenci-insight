import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRunbookOverview() {
  return useQuery({
    queryKey: ['runbooks', 'overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_runbook_overview');
      if (error) throw error;
      return data as {
        total_runbooks: number;
        executions_30d: number;
        success_rate_30d: number;
        escalation_rate_30d: number;
        avg_duration_seconds: number;
        top_runbooks: { runbook_code: string; count: number; success_pct: number }[];
        failing_steps: { action_code: string; fail_count: number }[];
      };
    },
    refetchInterval: 30000,
  });
}

export function useRunbookCatalog() {
  return useQuery({
    queryKey: ['runbooks', 'catalog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('runbook_catalog').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRunbookDetail(code: string | null) {
  return useQuery({
    queryKey: ['runbooks', 'detail', code],
    queryFn: async () => {
      if (!code) return null;
      const [steps, validations, escalations, executions] = await Promise.all([
        supabase.from('runbook_steps').select('*').eq('runbook_code', code).order('step_order'),
        supabase.from('runbook_validation_rules').select('*').eq('runbook_code', code).order('step_order'),
        supabase.from('runbook_escalation_rules').select('*').eq('runbook_code', code),
        supabase.from('runbook_executions').select('*').eq('runbook_code', code).order('started_at', { ascending: false }).limit(20),
      ]);
      return {
        steps: steps.data || [],
        validations: validations.data || [],
        escalations: escalations.data || [],
        executions: executions.data || [],
      };
    },
    enabled: !!code,
  });
}

export function useStartRunbook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ runbook_code, incident_id }: { runbook_code: string; incident_id?: string }) => {
      const { data: execId, error } = await supabase.rpc('start_runbook_execution', {
        p_runbook_code: runbook_code,
        p_incident_id: incident_id ?? null,
        p_triggered_by: 'owner',
      });
      if (error) throw error;
      const { error: invokeErr } = await supabase.functions.invoke('runbook-executor', {
        body: { execution_id: execId },
      });
      if (invokeErr) throw invokeErr;
      return execId;
    },
    onSuccess: () => {
      toast.success('Runbook iniciado');
      qc.invalidateQueries({ queryKey: ['runbooks'] });
    },
    onError: (e: any) => toast.error(`Falha: ${e.message}`),
  });
}

export function useToggleRunbook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('runbook_catalog').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Runbook atualizado');
      qc.invalidateQueries({ queryKey: ['runbooks'] });
    },
    onError: (e: any) => toast.error(`Falha: ${e.message}`),
  });
}
