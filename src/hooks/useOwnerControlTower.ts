import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useOwnerKPIs() {
  return useQuery({
    queryKey: ['owner-control-tower-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owner_control_tower_kpis')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useActivationMonitor() {
  return useQuery({
    queryKey: ['owner-activation-monitor'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_owner_activation_monitor');
      if (error) throw error;
      return data as any;
    },
  });
}

export function useLifecycleHeatmap() {
  return useQuery({
    queryKey: ['owner-lifecycle-heatmap'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_owner_lifecycle_heatmap');
      if (error) throw error;
      return data as any;
    },
  });
}

export function useBillingRadar() {
  return useQuery({
    queryKey: ['owner-billing-radar'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_owner_billing_radar');
      if (error) throw error;
      return data as any;
    },
  });
}

export function useChurnRadar() {
  return useQuery({
    queryKey: ['owner-churn-radar'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_owner_churn_radar');
      if (error) throw error;
      return data as any;
    },
  });
}

export function useExpansionSignals() {
  return useQuery({
    queryKey: ['owner-expansion-signals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_owner_expansion_signals');
      if (error) throw error;
      return data as any;
    },
  });
}

export function useSystemHealthRealtime() {
  return useQuery({
    queryKey: ['owner-system-health-realtime'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_owner_system_health_realtime');
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 30000,
  });
}
