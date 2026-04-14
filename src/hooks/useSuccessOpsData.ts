import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const q = (t: string) => (supabase as any).from(t);

export function usePlaybooks() {
  return useQuery({
    queryKey: ['success-playbooks'],
    queryFn: async () => {
      const { data } = await q('success_playbooks').select('*').order('priority');
      return data || [];
    },
  });
}

export function useSuccessAlerts() {
  return useQuery({
    queryKey: ['success-alerts'],
    queryFn: async () => {
      const { data } = await q('success_alerts').select('*, tenants(name)').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });
}

export function useSupportTickets() {
  return useQuery({
    queryKey: ['success-tickets'],
    queryFn: async () => {
      const { data } = await q('support_tickets').select('*, tenants(name)').order('created_at', { ascending: false });
      return data || [];
    },
  });
}

export function useInterventions() {
  return useQuery({
    queryKey: ['success-interventions'],
    queryFn: async () => {
      const { data } = await q('customer_interventions').select('*, tenants(name), success_playbooks(name)').order('created_at', { ascending: false });
      return data || [];
    },
  });
}

export function useExpansionSignals() {
  return useQuery({
    queryKey: ['success-expansion-signals'],
    queryFn: async () => {
      const { data } = await q('expansion_signals').select('*, tenants(name)').order('created_at', { ascending: false });
      return data || [];
    },
  });
}

export function useSuccessMetrics() {
  return useQuery({
    queryKey: ['success-metrics'],
    queryFn: async () => {
      const [{ data: tickets }, { data: alerts }, { data: interventions }, { data: signals }] = await Promise.all([
        q('support_tickets').select('status, priority, resolution_time_hours, tenant_id'),
        q('success_alerts').select('severity, acknowledged'),
        q('customer_interventions').select('status'),
        q('expansion_signals').select('status, current_value'),
      ]);

      const tk = tickets || [];
      const openTickets = tk.filter((t: any) => t.status === 'open' || t.status === 'in_progress').length;
      const urgentTickets = tk.filter((t: any) => t.priority === 'urgent' && t.status !== 'closed').length;
      const resolved = tk.filter((t: any) => t.resolution_time_hours != null);
      const avgResolution = resolved.length > 0
        ? resolved.reduce((s: number, t: any) => s + Number(t.resolution_time_hours), 0) / resolved.length
        : 0;

      const al = alerts || [];
      const openAlerts = al.filter((a: any) => !a.acknowledged).length;
      const criticalAlerts = al.filter((a: any) => a.severity === 'critical' && !a.acknowledged).length;

      const iv = interventions || [];
      const pendingInterventions = iv.filter((i: any) => i.status === 'pending').length;

      const sg = signals || [];
      const detectedSignals = sg.filter((s: any) => s.status === 'detected').length;

      return {
        openTickets, urgentTickets, avgResolution,
        openAlerts, criticalAlerts,
        pendingInterventions,
        detectedSignals,
        totalTickets: tk.length,
      };
    },
  });
}
