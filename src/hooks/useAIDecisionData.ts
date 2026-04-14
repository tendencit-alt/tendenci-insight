import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const q = (t: string) => (supabase as any).from(t);

export function useFinancialDiagnoses() {
  return useQuery({
    queryKey: ['ai-financial-diagnoses'],
    queryFn: async () => {
      const { data } = await q('ai_financial_diagnoses').select('*, tenants(name)').eq('active', true).order('priority').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });
}

export function useOperationalDiagnoses() {
  return useQuery({
    queryKey: ['ai-operational-diagnoses'],
    queryFn: async () => {
      const { data } = await q('ai_operational_diagnoses').select('*, tenants(name)').order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });
}

export function usePriorityActions() {
  return useQuery({
    queryKey: ['ai-priority-actions'],
    queryFn: async () => {
      const { data } = await q('ai_priority_actions').select('*, tenants(name)').order('priority').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });
}

export function useStrategyAlerts() {
  return useQuery({
    queryKey: ['ai-strategy-alerts'],
    queryFn: async () => {
      const { data } = await q('ai_strategy_alerts').select('*, tenants(name)').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });
}

export function useImpactSimulations() {
  return useQuery({
    queryKey: ['ai-impact-simulations'],
    queryFn: async () => {
      const { data } = await q('ai_impact_simulations').select('*, tenants(name)').order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });
}

export function useDecisionMetrics() {
  return useQuery({
    queryKey: ['ai-decision-metrics'],
    queryFn: async () => {
      const [{ data: diags }, { data: actions }, { data: alerts }, { data: sims }, { data: events }] = await Promise.all([
        q('ai_financial_diagnoses').select('severity').eq('active', true),
        q('ai_priority_actions').select('status'),
        q('ai_strategy_alerts').select('severity, acknowledged'),
        q('ai_impact_simulations').select('id'),
        q('ai_decision_events').select('event_type'),
      ]);

      const d = diags || [];
      const a = actions || [];
      const al = alerts || [];
      const ev = events || [];

      return {
        totalDiagnoses: d.length,
        criticalDiagnoses: d.filter((x: any) => x.severity === 'critical').length,
        pendingActions: a.filter((x: any) => x.status === 'pending').length,
        completedActions: a.filter((x: any) => x.status === 'completed').length,
        openAlerts: al.filter((x: any) => !x.acknowledged).length,
        criticalAlerts: al.filter((x: any) => x.severity === 'critical' && !x.acknowledged).length,
        totalSimulations: (sims || []).length,
        suggestedDecisions: ev.filter((x: any) => x.event_type === 'suggested').length,
        executedDecisions: ev.filter((x: any) => x.event_type === 'executed').length,
      };
    },
  });
}
