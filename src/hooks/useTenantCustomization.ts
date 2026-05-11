import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCallback } from 'react';

export interface TenantCustomization {
  id: string;
  tenant_id: string;
  module_aliases: Record<string, string>;
  dre_aliases: Record<string, string>;
  sidebar_config: { order: string[]; hidden: string[] };
  launcher_shortcuts: string[];
  kpi_priorities: string[];
  workflow_config: Record<string, any>;
  segment: string | null;
}

const DEFAULT_MODULE_NAMES: Record<string, string> = {
  pedidos: 'Pedidos',
  producao: 'Produção',
  financeiro: 'Financeiro',
  clientes: 'Clientes',
  projetos: 'Projetos',
  relatorios: 'Relatórios',
  crm: 'CRM',
  arquitetos: 'Parceiros Profissionais',
  compras: 'Compras',
  configuracoes: 'Configurações',
};

const DEFAULT_KPI_OPTIONS = [
  { key: 'margem_contribuicao', label: 'Margem de Contribuição' },
  { key: 'ebitda', label: 'EBITDA' },
  { key: 'resultado_economico', label: 'Resultado Econômico' },
  { key: 'fluxo_caixa_futuro', label: 'Fluxo de Caixa Futuro' },
  { key: 'ticket_medio', label: 'Ticket Médio' },
  { key: 'receita_liquida', label: 'Receita Líquida' },
  { key: 'burn_rate', label: 'Burn Rate' },
  { key: 'runway', label: 'Runway' },
];

const SEGMENT_TEMPLATES: Record<string, Partial<TenantCustomization>> = {
  comercio: {
    kpi_priorities: ['receita_liquida', 'margem_contribuicao', 'ticket_medio', 'fluxo_caixa_futuro'],
    sidebar_config: { order: ['pedidos', 'financeiro', 'clientes', 'relatorios'], hidden: [] },
  },
  servico: {
    kpi_priorities: ['receita_liquida', 'ebitda', 'ticket_medio', 'resultado_economico'],
    sidebar_config: { order: ['pedidos', 'financeiro', 'projetos', 'clientes'], hidden: [] },
  },
  industria: {
    kpi_priorities: ['margem_contribuicao', 'ebitda', 'fluxo_caixa_futuro', 'resultado_economico'],
    sidebar_config: { order: ['pedidos', 'producao', 'financeiro', 'compras'], hidden: [] },
  },
  arquitetura: {
    kpi_priorities: ['ticket_medio', 'margem_contribuicao', 'resultado_economico', 'fluxo_caixa_futuro'],
    sidebar_config: { order: ['projetos', 'parceiros profissionais', 'pedidos', 'financeiro'], hidden: [] },
  },
  moveis_planejados: {
    kpi_priorities: ['margem_contribuicao', 'ebitda', 'ticket_medio', 'fluxo_caixa_futuro'],
    sidebar_config: { order: ['pedidos', 'producao', 'financeiro', 'parceiros profissionais'], hidden: [] },
  },
};

export function useTenantCustomization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: customization, isLoading } = useQuery({
    queryKey: ['tenant-customization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_customizations' as any)
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TenantCustomization | null;
    },
    enabled: !!user,
  });

  const upsert = useMutation({
    mutationFn: async (updates: Partial<TenantCustomization>) => {
      const { data: tenantId } = await supabase.rpc('get_user_tenant_id');
      if (!tenantId) throw new Error('Tenant não encontrado');

      const { error } = await supabase
        .from('tenant_customizations' as any)
        .upsert({
          tenant_id: tenantId,
          ...updates,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'tenant_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-customization'] });
      toast.success('Personalização salva');
    },
    onError: () => toast.error('Erro ao salvar personalização'),
  });

  const saveSnapshot = useMutation({
    mutationFn: async (label: string) => {
      if (!customization) throw new Error('Nenhuma customização para salvar');
      const { data: tenantId } = await supabase.rpc('get_user_tenant_id');
      const { error } = await supabase
        .from('tenant_customization_snapshots' as any)
        .insert({
          tenant_id: tenantId,
          snapshot: customization as any,
          label,
          created_by: user?.id,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => toast.success('Snapshot salvo'),
    onError: () => toast.error('Erro ao salvar snapshot'),
  });

  const { data: snapshots } = useQuery({
    queryKey: ['tenant-customization-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_customization_snapshots' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const restoreSnapshot = useMutation({
    mutationFn: async (snapshotId: string) => {
      const snap = snapshots?.find((s: any) => s.id === snapshotId);
      if (!snap) throw new Error('Snapshot não encontrado');
      const { tenant_id, id, created_at, updated_at, ...config } = snap.snapshot as any;
      await upsert.mutateAsync(config);
    },
    onSuccess: () => toast.success('Configuração restaurada'),
  });

  const getModuleName = useCallback((moduleKey: string) => {
    return customization?.module_aliases?.[moduleKey] || DEFAULT_MODULE_NAMES[moduleKey] || moduleKey;
  }, [customization]);

  const getDreAlias = useCallback((originalName: string) => {
    return customization?.dre_aliases?.[originalName] || originalName;
  }, [customization]);

  const applySegmentTemplate = useCallback((segment: string) => {
    const template = SEGMENT_TEMPLATES[segment];
    if (!template) return;
    upsert.mutate({ ...template, segment } as any);
  }, [upsert]);

  return {
    customization,
    isLoading,
    upsert,
    saveSnapshot,
    snapshots,
    restoreSnapshot,
    getModuleName,
    getDreAlias,
    applySegmentTemplate,
    DEFAULT_MODULE_NAMES,
    DEFAULT_KPI_OPTIONS,
    SEGMENT_TEMPLATES,
  };
}
