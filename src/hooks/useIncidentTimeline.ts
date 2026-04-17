import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useIncidentOverview() {
  return useQuery({
    queryKey: ['incidents', 'overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_incident_overview');
      if (error) throw error;
      return data as {
        open_incidents: number;
        critical_7d: number;
        reopened_7d: number;
        avg_resolution_seconds: number;
        auto_recovery_pct: number;
        cascade_incidents_7d: number;
        by_module: { module: string; count: number }[];
        last_analysis_at: string;
      };
    },
    refetchInterval: 30000,
  });
}

export function useIncidents(filters?: { status?: string; severity?: string; module?: string }) {
  return useQuery({
    queryKey: ['incidents', 'list', filters],
    queryFn: async () => {
      let q = supabase.from('system_incidents').select('*').order('started_at', { ascending: false }).limit(100);
      if (filters?.status) q = q.eq('current_status', filters.status);
      if (filters?.severity) q = q.eq('severity', filters.severity);
      if (filters?.module) q = q.eq('origin_module_code', filters.module);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
}

export function useIncidentTimeline(incidentId: string | null) {
  return useQuery({
    queryKey: ['incidents', 'timeline', incidentId],
    queryFn: async () => {
      if (!incidentId) return null;
      const { data, error } = await supabase.rpc('get_incident_timeline', { p_incident_id: incidentId });
      if (error) throw error;
      return data as any;
    },
    enabled: !!incidentId,
  });
}

export function useGroupIncidents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('group_and_normalize_incidents', {
        p_window_minutes: 10,
        p_lookback_hours: 24,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Análise concluída: ${data?.incidents_created || 0} novos incidentes`);
      qc.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (e: any) => toast.error(`Falha: ${e.message}`),
  });
}

export function useUpdateIncidentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const update: any = { current_status: status };
      if (status === 'resolved' || status === 'resolved_with_degradation') {
        update.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('system_incidents').update(update).eq('id', id);
      if (error) throw error;
      if (reason) {
        await supabase.from('incident_status_history').insert({
          incident_id: id,
          to_status: status,
          change_reason: reason,
        } as any);
      }
    },
    onSuccess: () => {
      toast.success('Status atualizado');
      qc.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (e: any) => toast.error(`Falha: ${e.message}`),
  });
}
