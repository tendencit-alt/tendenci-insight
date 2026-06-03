import { useQuery } from '@tanstack/react-query';
import { auditStub } from "@/lib/audit-stub";
import { supabase } from '@/integrations/supabase/client';

interface SupportTicket {
  id: string;
  tenant_id: string;
  reported_by: string;
  assigned_to: string | null;
  priority: string;
  module: string | null;
  title: string;
  description: string | null;
  status: string;
  resolution: string | null;
  root_cause: string | null;
  recurrence_count: number;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  tenant?: { name: string };
}

interface SupportHistory {
  id: string;
  ticket_id: string;
  tenant_id: string;
  action_type: string;
  description: string | null;
  performed_by: string;
  metadata: any;
  created_at: string;
}

interface DiagnosticItem {
  type: string;
  message: string;
  module: string;
  tenant_name: string;
  tenant_id: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  suggestion: string;
}

interface CompanyScore {
  tenant_id: string;
  tenant_name: string;
  incident_count: number;
  avg_resolution_hours: number;
  recurrence_rate: number;
  autonomy_level: 'alto' | 'médio' | 'baixo';
  score: number;
}

export function useSupportLayer() {
  const { data: tickets, isLoading: loadingTickets, refetch: refetchTickets } = useQuery({
    queryKey: ['support-tickets-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets' as any)
        .select('*, tenant:tenants(name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as SupportTicket[];
    },
  });

  const { data: history } = useQuery({
    queryKey: ['support-history-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_history' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as SupportHistory[];
    },
  });

  const { data: recentErrors } = useQuery({
    queryKey: ['support-recent-errors'],
    queryFn: async () => {
      const { data, error } = awaitauditStub()
        .select('*, tenant:tenants(name)')
        .in('event_type', ['ERROR', 'AUTOMATION_ERROR', 'INTEGRATION_FAILURE'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as (typeof data extends (infer T)[] ? T & { event_message?: string } : never)[];
    },
  });

  const { data: automationErrors } = useQuery({
    queryKey: ['support-automation-errors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_execution_logs')
        .select('*, tenant:tenants(name)')
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: importErrors } = useQuery({
    queryKey: ['support-import-errors'],
    queryFn: async () => {
      const { data, error } = awaitauditStub()
        .select('*, tenant:tenants(name)')
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Build diagnostics from errors
  const diagnostics: DiagnosticItem[] = [];

  automationErrors?.forEach(e => {
    diagnostics.push({
      type: 'automation_error',
      message: e.error_message || `Automação "${e.rule_name}" falhou`,
      module: 'Automações',
      tenant_name: (e as any).tenant?.name || 'Desconhecido',
      tenant_id: e.tenant_id || '',
      severity: 'critical',
      timestamp: e.created_at || '',
      suggestion: 'Reprocessar automação ou verificar condições da regra',
    });
  });

  importErrors?.forEach(e => {
    diagnostics.push({
      type: 'import_error',
      message: `Importação "${e.file_name}" falhou (${e.error_count || 0} erros)`,
      module: 'Integrações',
      tenant_name: (e as any).tenant?.name || 'Desconhecido',
      tenant_id: e.tenant_id || '',
      severity: 'warning',
      timestamp: e.created_at || '',
      suggestion: 'Verificar formato do arquivo e tentar reimportação',
    });
  });

  recentErrors?.forEach(e => {
    diagnostics.push({
      type: 'system_error',
      message: (e as any).event_message || `Erro em ${e.table_name}`,
      module: e.table_name || 'Sistema',
      tenant_name: (e as any).tenant?.name || 'Desconhecido',
      tenant_id: e.tenant_id || '',
      severity: 'warning',
      timestamp: e.created_at || '',
      suggestion: 'Verificar log de auditoria para detalhes',
    });
  });

  diagnostics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Calculate company scores
  const companyScores: CompanyScore[] = [];
  if (tickets?.length) {
    const byTenant = new Map<string, SupportTicket[]>();
    tickets.forEach(t => {
      const key = t.tenant_id;
      if (!byTenant.has(key)) byTenant.set(key, []);
      byTenant.get(key)!.push(t);
    });

    byTenant.forEach((tix, tenantId) => {
      const resolved = tix.filter(t => t.resolved_at);
      const avgHours = resolved.length > 0
        ? resolved.reduce((sum, t) => {
            const diff = new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime();
            return sum + diff / 3600000;
          }, 0) / resolved.length
        : 0;
      const recurring = tix.filter(t => t.recurrence_count > 0).length;
      const recurrenceRate = tix.length > 0 ? recurring / tix.length : 0;
      const score = Math.max(0, Math.min(100,
        100 - (tix.length * 3) - (avgHours * 0.5) - (recurrenceRate * 30)
      ));
      const autonomy = score >= 70 ? 'alto' : score >= 40 ? 'médio' : 'baixo';

      companyScores.push({
        tenant_id: tenantId,
        tenant_name: tix[0]?.tenant?.name || 'Desconhecido',
        incident_count: tix.length,
        avg_resolution_hours: Math.round(avgHours * 10) / 10,
        recurrence_rate: Math.round(recurrenceRate * 100),
        autonomy_level: autonomy,
        score: Math.round(score),
      });
    });

    companyScores.sort((a, b) => a.score - b.score);
  }

  const stats = {
    totalTickets: tickets?.length || 0,
    openTickets: tickets?.filter(t => t.status === 'open').length || 0,
    inProgressTickets: tickets?.filter(t => t.status === 'in_progress').length || 0,
    resolvedTickets: tickets?.filter(t => t.status === 'resolved').length || 0,
    criticalDiagnostics: diagnostics.filter(d => d.severity === 'critical').length,
    totalDiagnostics: diagnostics.length,
  };

  return {
    tickets,
    history,
    diagnostics,
    companyScores,
    stats,
    loadingTickets,
    refetchTickets,
  };
}
