import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useDependencyImpactOverview() {
  return useQuery({
    queryKey: ['dependency-impact', 'overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dependency_impact_overview');
      if (error) throw error;
      return data as {
        active_cascades: number;
        impacted_modules: number;
        root_cause_module: string | null;
        root_cause_confidence: number;
        avg_severity: 'low' | 'moderate' | 'high' | 'critical';
        critical_count: number;
        high_count: number;
        last_analysis_at: string;
      };
    },
    refetchInterval: 30000,
  });
}

export function useDependencyImpactSnapshots() {
  return useQuery({
    queryKey: ['dependency-impact', 'snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dependency_impact_snapshots')
        .select('*')
        .order('current_impact_score', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
}

export function useActiveImpactEvents() {
  return useQuery({
    queryKey: ['dependency-impact', 'active-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dependency_impact_events')
        .select('*')
        .eq('impact_status', 'active')
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
}

export function useRootCauseAnalyses() {
  return useQuery({
    queryKey: ['dependency-impact', 'rca'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('root_cause_analysis_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });
}

export function useModuleDependencyTree(moduleCode: string | null) {
  return useQuery({
    queryKey: ['dependency-impact', 'tree', moduleCode],
    queryFn: async () => {
      if (!moduleCode) return null;
      const { data, error } = await supabase.rpc('get_module_dependency_tree', { p_module_code: moduleCode });
      if (error) throw error;
      return data as any;
    },
    enabled: !!moduleCode,
  });
}

export function useRunImpactAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('analyze_dependency_impact');
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Análise concluída: ${data?.events_created || 0} eventos detectados`);
      qc.invalidateQueries({ queryKey: ['dependency-impact'] });
    },
    onError: (e: any) => toast.error(`Falha: ${e.message}`),
  });
}

export function useAIRootCauseAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (incidentGroupId: string) => {
      const { data, error } = await supabase.functions.invoke('dependency-impact-ai', {
        body: { incident_group_id: incidentGroupId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`IA: causa-raiz ${data?.root_cause || 'indeterminada'} (${data?.confidence || 0}%)`);
      qc.invalidateQueries({ queryKey: ['dependency-impact', 'rca'] });
    },
    onError: (e: any) => toast.error(`IA falhou: ${e.message}`),
  });
}
