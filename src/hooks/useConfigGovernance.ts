import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCallback } from 'react';

// ─── Types ───
export interface BaseTemplate {
  id: string;
  template_type: string;
  version: number;
  name: string;
  description: string | null;
  snapshot: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface TenantOverride {
  id: string;
  tenant_id: string;
  template_id: string;
  override_type: string;
  target_key: string;
  original_value: string | null;
  custom_value: string | null;
  is_locked: boolean;
  changed_by: string | null;
  created_at: string;
}

export interface StructuralLock {
  id: string;
  module_key: string;
  display_name: string;
  is_locked: boolean;
  reason: string | null;
}

export interface DivergenceEntry {
  id: string;
  tenant_id: string;
  template_type: string;
  divergence_type: string;
  target_key: string;
  original_value: string | null;
  current_value: string | null;
  changed_by: string | null;
  created_at: string;
}

export type DivergenceLevel = 'baixo' | 'medio' | 'alto';

export function useConfigGovernance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const KEY = 'config-governance';

  // ─── Templates ───
  const { data: templates = [] } = useQuery({
    queryKey: [KEY, 'templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_base_templates' as any)
        .select('*')
        .eq('is_active', true)
        .order('template_type');
      if (error) throw error;
      return (data || []) as unknown as BaseTemplate[];
    },
    enabled: !!user,
  });

  // ─── Overrides (own tenant or all for owner) ───
  const { data: overrides = [] } = useQuery({
    queryKey: [KEY, 'overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_tenant_overrides' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as TenantOverride[];
    },
    enabled: !!user,
  });

  // ─── Locks ───
  const { data: locks = [] } = useQuery({
    queryKey: [KEY, 'locks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_structural_locks' as any)
        .select('*')
        .order('module_key');
      if (error) throw error;
      return (data || []) as unknown as StructuralLock[];
    },
    enabled: !!user,
  });

  // ─── Divergence log ───
  const { data: divergenceLog = [] } = useQuery({
    queryKey: [KEY, 'divergence'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_divergence_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as DivergenceEntry[];
    },
    enabled: !!user,
  });

  // ─── Mutations ───
  const invalidateAll = () => qc.invalidateQueries({ queryKey: [KEY] });

  const createTemplate = useMutation({
    mutationFn: async (t: { template_type: string; name: string; description?: string; snapshot: Record<string, any> }) => {
      // Deactivate previous versions
      await supabase
        .from('config_base_templates' as any)
        .update({ is_active: false } as any)
        .eq('template_type', t.template_type)
        .eq('is_active', true);

      const maxVersion = templates
        .filter(x => x.template_type === t.template_type)
        .reduce((m, x) => Math.max(m, x.version), 0);

      const { error } = await supabase
        .from('config_base_templates' as any)
        .insert({ ...t, version: maxVersion + 1, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Template criado'); },
    onError: () => toast.error('Erro ao criar template'),
  });

  const toggleLock = useMutation({
    mutationFn: async ({ id, locked }: { id: string; locked: boolean }) => {
      const { error } = await supabase
        .from('config_structural_locks' as any)
        .update({ is_locked: locked, locked_by: user?.id, locked_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Lock atualizado'); },
    onError: () => toast.error('Erro ao atualizar lock'),
  });

  const createOverride = useMutation({
    mutationFn: async (o: Omit<TenantOverride, 'id' | 'created_at' | 'is_locked'>) => {
      const { error } = await supabase
        .from('config_tenant_overrides' as any)
        .insert({ ...o, changed_by: user?.id } as any);
      if (error) throw error;

      // Log divergence
      await supabase
        .from('config_divergence_log' as any)
        .insert({
          tenant_id: o.tenant_id,
          template_type: templates.find(t => t.id === o.template_id)?.template_type || 'unknown',
          divergence_type: o.override_type === 'rename' ? 'renamed' : 'modified',
          target_key: o.target_key,
          original_value: o.original_value,
          current_value: o.custom_value,
          changed_by: user?.id,
        } as any);
    },
    onSuccess: () => { invalidateAll(); toast.success('Override salvo'); },
    onError: () => toast.error('Erro ao salvar override'),
  });

  const deleteOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('config_tenant_overrides' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Override removido'); },
    onError: () => toast.error('Erro ao remover override'),
  });

  const resetTenantOverrides = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from('config_tenant_overrides' as any)
        .delete()
        .eq('tenant_id', tenantId)
        .eq('is_locked', false);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Overrides resetados para template base'); },
    onError: () => toast.error('Erro ao resetar overrides'),
  });

  // ─── Score divergência ───
  const getDivergenceScore = useCallback((tenantId: string): { level: DivergenceLevel; count: number; pct: number } => {
    const tenantOverrides = overrides.filter(o => o.tenant_id === tenantId);
    const totalPossible = Math.max(templates.reduce((s, t) => s + Object.keys(t.snapshot).length, 0), 1);
    const count = tenantOverrides.length;
    const pct = Math.round((count / totalPossible) * 100);

    let level: DivergenceLevel = 'baixo';
    if (pct > 30) level = 'alto';
    else if (pct > 10) level = 'medio';

    return { level, count, pct: Math.min(pct, 100) };
  }, [overrides, templates]);

  // ─── Diff visual ───
  const getStructuralDiff = useCallback((tenantId: string) => {
    const tenantOvr = overrides.filter(o => o.tenant_id === tenantId);
    return tenantOvr.map(o => ({
      target_key: o.target_key,
      override_type: o.override_type,
      original: o.original_value,
      current: o.custom_value,
      template: templates.find(t => t.id === o.template_id)?.name || '—',
    }));
  }, [overrides, templates]);

  // ─── Is module locked ───
  const isModuleLocked = useCallback((moduleKey: string) => {
    return locks.find(l => l.module_key === moduleKey)?.is_locked ?? true;
  }, [locks]);

  return {
    templates,
    overrides,
    locks,
    divergenceLog,
    createTemplate,
    toggleLock,
    createOverride,
    deleteOverride,
    resetTenantOverrides,
    getDivergenceScore,
    getStructuralDiff,
    isModuleLocked,
  };
}
