import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info, Shield, ShieldAlert, Lock, Target, DollarSign, FileCheck, RotateCcw } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';

const FLAG_LABELS: Record<string, string> = {
  can_view: 'Visualizar (leitura)',
  can_export: 'Exportar dados (CSV/Excel/PDF)',
  can_create: 'Criar novos registros',
  can_edit: 'Alterar registros existentes',
  can_approve: 'Aprovar solicitações e fluxos',
  can_conciliate: 'Conciliar lançamentos financeiros',
  can_delete: 'Remover registros',
  can_admin: 'Configurar / ações administrativas críticas',
};

interface ProfileType {
  id: string;
  name: string;
  display_name: string;
  is_system: boolean;
}

interface ProfileTypePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileType: ProfileType;
  onSuccess: () => void;
}

interface ModulePermission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_conciliate: boolean;
  can_export: boolean;
  can_admin: boolean;
}

interface ScopeRestriction {
  scope_type: string;
  scope_mode: 'all' | 'specific';
  allowed_ids: string[];
}

interface ValueLimit {
  module: string;
  max_value: number | null;
  requires_approval_above: number | null;
}

interface StatusRule {
  id?: string;
  module: string;
  blocked_status: string;
  blocked_action: string;
  reason: string | null;
  active: boolean;
}

const ALL_MODULES = [
  'dashboard_executivo', 'comercial', 'operacional', 'financeiro',
  'controladoria', 'planejamento', 'cadastros', 'relatorios_bi', 'configuracoes',
];

const MODULE_LABELS: Record<string, string> = {
  dashboard_executivo: 'Dashboard Executivo', comercial: 'Comercial', operacional: 'Operacional',
  financeiro: 'Financeiro', controladoria: 'Controladoria', planejamento: 'Planejamento',
  cadastros: 'Cadastros', relatorios_bi: 'Relatórios & BI', configuracoes: 'Configurações',
};

// Simplificado: 4 permissões essenciais por módulo. As permissões avançadas
// (Aprovar, Conciliar, Exportar, Admin) são gerenciadas na aba "Críticas".
// 4 colunas de permissão. Cada coluna controla um conjunto de flags da DB
// (incluindo permissões avançadas/críticas), simplificando a UX para os admins.
const PERMISSION_COLUMNS = [
  {
    key: 'can_view',
    label: 'Ver',
    description: 'Leitura e exportação',
    flags: ['can_view', 'can_export'] as (keyof ModulePermission)[],
  },
  {
    key: 'can_create',
    label: 'Criar',
    description: 'Adicionar novos',
    flags: ['can_create'] as (keyof ModulePermission)[],
  },
  {
    key: 'can_edit',
    label: 'Editar',
    description: 'Alterar / aprovar / conciliar',
    flags: ['can_edit', 'can_approve', 'can_conciliate'] as (keyof ModulePermission)[],
  },
  {
    key: 'can_delete',
    label: 'Excluir',
    description: 'Remover e ações críticas',
    flags: ['can_delete', 'can_admin'] as (keyof ModulePermission)[],
  },
] as const;

const SCOPE_TYPES = [
  { key: 'empresa', label: 'Empresa' },
  { key: 'unidade', label: 'Unidade' },
  { key: 'centro_custo', label: 'Centro de Custo' },
];

const VALUE_MODULES = [
  { key: 'pagamentos', label: 'Pagamentos' },
  { key: 'descontos', label: 'Descontos' },
  { key: 'aprovacoes', label: 'Aprovações' },
  { key: 'compras', label: 'Compras' },
  { key: 'reembolsos', label: 'Reembolsos' },
];

const STATUS_OPTIONS = [
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'conciliado', label: 'Conciliado' },
  { value: 'executado', label: 'Executado' },
  { value: 'encerrado', label: 'Encerrado' },
  { value: 'pago', label: 'Pago' },
  { value: 'recebido', label: 'Recebido' },
];

const ALL_FLAGS: (keyof ModulePermission)[] = [
  'can_view', 'can_create', 'can_edit', 'can_delete',
  'can_approve', 'can_conciliate', 'can_export', 'can_admin',
];

const emptyModulePermission = (): ModulePermission => ({
  can_view: false, can_create: false, can_edit: false, can_delete: false,
  can_approve: false, can_conciliate: false, can_export: false, can_admin: false,
});

const fullModulePermission = (): ModulePermission => ({
  can_view: true, can_create: true, can_edit: true, can_delete: true,
  can_approve: true, can_conciliate: true, can_export: true, can_admin: true,
});

const readOnlyPermission = (): ModulePermission => ({
  ...emptyModulePermission(), can_view: true, can_export: true,
});

const editorPermission = (): ModulePermission => ({
  ...emptyModulePermission(),
  can_view: true, can_create: true, can_edit: true, can_export: true,
});

/**
 * Recommended baseline per profile role. Falls back to read-only for unknown roles.
 * Each baseline assigns one of the helpers above to each of ALL_MODULES.
 */
const getRoleBaseline = (roleName: string): Record<string, ModulePermission> => {
  const r = (roleName || '').toLowerCase();
  const baseline: Record<string, ModulePermission> = {};

  const apply = (fn: (m: string) => ModulePermission) => {
    ALL_MODULES.forEach(m => { baseline[m] = fn(m); });
  };

  if (['master', 'admin', 'owner', 'administrador', 'tenant_owner'].includes(r)) {
    apply(() => fullModulePermission());
  } else if (['gerente', 'manager', 'diretor'].includes(r)) {
    apply(m => {
      const p = editorPermission();
      if (['financeiro', 'controladoria', 'planejamento'].includes(m)) p.can_approve = true;
      if (m === 'configuracoes') return readOnlyPermission();
      return p;
    });
  } else if (['financeiro', 'controller', 'controladoria', 'finance'].includes(r)) {
    apply(m => {
      if (['financeiro', 'controladoria', 'planejamento', 'relatorios_bi'].includes(m)) {
        return { ...editorPermission(), can_approve: true, can_conciliate: true };
      }
      if (m === 'configuracoes') return emptyModulePermission();
      return readOnlyPermission();
    });
  } else if (['vendedor', 'comercial', 'seller', 'sales'].includes(r)) {
    apply(m => {
      if (m === 'comercial') return editorPermission();
      if (['dashboard_executivo', 'relatorios_bi'].includes(m)) return readOnlyPermission();
      return emptyModulePermission();
    });
  } else if (['producao', 'production', 'operacional', 'operations'].includes(r)) {
    apply(m => {
      if (['operacional', 'cadastros'].includes(m)) return editorPermission();
      if (['dashboard_executivo', 'relatorios_bi'].includes(m)) return readOnlyPermission();
      return emptyModulePermission();
    });
  } else if (['visualizador', 'viewer', 'consulta', 'auditor'].includes(r)) {
    apply(() => readOnlyPermission());
  } else {
    // Default fallback: read-only across the board
    apply(() => readOnlyPermission());
  }

  return baseline;
};

/**
 * Validates that the persisted permissions in the DB match the in-memory state
 * across ALL 8 flags (including can_export, can_approve, can_conciliate, can_admin
 * that are now folded into the 4 visible columns).
 * Returns a list of mismatches; empty array means everything is consistent.
 */
const validateModulePermissions = (
  expected: Record<string, ModulePermission>,
  persisted: any[] | null | undefined,
): Array<{ module: string; flag: string; expected: boolean; actual: boolean }> => {
  const mismatches: Array<{ module: string; flag: string; expected: boolean; actual: boolean }> = [];
  ALL_MODULES.forEach(module => {
    const exp = expected[module] || emptyModulePermission();
    const row = persisted?.find((r: any) => r.module === module);
    ALL_FLAGS.forEach(flag => {
      const expectedVal = !!exp[flag];
      const actualVal = !!(row && row[flag]);
      // If we deleted (row missing) but expected all-false, that's fine.
      const isAllFalse = ALL_FLAGS.every(f => !exp[f]);
      if (!row && isAllFalse) return;
      if (expectedVal !== actualVal) {
        mismatches.push({ module, flag, expected: expectedVal, actual: actualVal });
      }
    });
  });
  return mismatches;
};

export function ProfileTypePermissionsDialog({
  open, onOpenChange, profileType, onSuccess,
}: ProfileTypePermissionsDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('modules');
  const [permissions, setPermissions] = useState<Record<string, ModulePermission>>({});
  // criticalPerms state removido — críticas folded em Editar/Excluir
  const [segregationRules, setSegregationRules] = useState<{ id?: string; blocked_action: string; blocked_module: string; reason: string | null; active: boolean }[]>([]);
  const [scopes, setScopes] = useState<Record<string, ScopeRestriction>>({});
  const [valueLimits, setValueLimits] = useState<Record<string, ValueLimit>>({});
  const [statusRules, setStatusRules] = useState<StatusRule[]>([]);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Diff entre estado atual e baseline para a preview do "Restaurar padrões".
  const resetDiff = (() => {
    if (!resetConfirmOpen) return [];
    const baseline = getRoleBaseline(profileType.name);
    const rows: Array<{ module: string; flag: keyof ModulePermission; from: boolean; to: boolean }> = [];
    ALL_MODULES.forEach(module => {
      const cur = permissions[module] || emptyModulePermission();
      const base = baseline[module] || emptyModulePermission();
      ALL_FLAGS.forEach(flag => {
        if (!!cur[flag] !== !!base[flag]) {
          rows.push({ module, flag, from: !!cur[flag], to: !!base[flag] });
        }
      });
    });
    return rows;
  })();

  const resetDiffByModule = resetDiff.reduce<Record<string, typeof resetDiff>>((acc, r) => {
    (acc[r.module] ||= []).push(r);
    return acc;
  }, {});

  const handleResetToDefaults = () => {
    const baseline = getRoleBaseline(profileType.name);
    setPermissions(baseline);
    setResetConfirmOpen(false);
    toast({
      title: 'Padrões aplicados',
      description: `${resetDiff.length} alteração(ões) em ${Object.keys(resetDiffByModule).length} módulo(s). Clique em Salvar para confirmar.`,
    });
  };

  useEffect(() => {
    if (open && profileType) fetchAll();
  }, [open, profileType]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [modRes, critRes, segRes, scopeRes, valRes, statusRes] = await Promise.all([
        supabase.from('profile_type_permissions').select('*').eq('profile_type_id', profileType.id),
        supabase.from('rbac_critical_permissions').select('*').eq('profile_type_id', profileType.id),
        supabase.from('rbac_segregation_rules').select('*').eq('profile_type_id', profileType.id),
        supabase.from('rbac_scope_restrictions' as any).select('*').eq('profile_type_id', profileType.id),
        supabase.from('rbac_value_limits' as any).select('*').eq('profile_type_id', profileType.id),
        supabase.from('rbac_status_rules' as any).select('*').eq('profile_type_id', profileType.id),
      ]);

      // Module permissions
      const permMap: Record<string, ModulePermission> = {};
      ALL_MODULES.forEach(module => {
        const existing = modRes.data?.find((p: any) => p.module === module);
        permMap[module] = existing ? {
          can_view: existing.can_view || false, can_create: existing.can_create || false,
          can_edit: existing.can_edit || false, can_delete: existing.can_delete || false,
          can_approve: existing.can_approve || false, can_conciliate: existing.can_conciliate || false,
          can_export: existing.can_export || false, can_admin: existing.can_admin || false,
        } : emptyModulePermission();
      });
      setPermissions(permMap);

      // Load-time invariant: warn if DB has rows for unknown modules
      const knownModules = new Set(ALL_MODULES);
      const orphanRows = (modRes.data || []).filter((r: any) => !knownModules.has(r.module));
      if (orphanRows.length > 0) {
        console.warn('[Permissions] Orphan module rows ignored:', orphanRows.map((r: any) => r.module));
      }

      // Critical permissions removidas da UI — não são mais carregadas/exibidas.
      setSegregationRules((segRes.data || []) as any[]);

      // Scopes
      const scopeMap: Record<string, ScopeRestriction> = {};
      SCOPE_TYPES.forEach(st => {
        const existing = (scopeRes.data as any[])?.find((s: any) => s.scope_type === st.key);
        scopeMap[st.key] = existing ? {
          scope_type: st.key,
          scope_mode: existing.scope_mode || 'all',
          allowed_ids: existing.allowed_ids || [],
        } : { scope_type: st.key, scope_mode: 'all', allowed_ids: [] };
      });
      setScopes(scopeMap);

      // Value limits
      const valMap: Record<string, ValueLimit> = {};
      VALUE_MODULES.forEach(vm => {
        const existing = (valRes.data as any[])?.find((v: any) => v.module === vm.key);
        valMap[vm.key] = existing ? {
          module: vm.key,
          max_value: existing.max_value,
          requires_approval_above: existing.requires_approval_above,
        } : { module: vm.key, max_value: null, requires_approval_above: null };
      });
      setValueLimits(valMap);

      // Status rules
      setStatusRules((statusRes.data as any[]) || []);
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColumnFlags = (colKey: string): (keyof ModulePermission)[] =>
    PERMISSION_COLUMNS.find(c => c.key === colKey)?.flags as (keyof ModulePermission)[] ?? [colKey as keyof ModulePermission];

  const handleColumnChange = (module: string, colKey: string, value: boolean) => {
    const flags = getColumnFlags(colKey);
    setPermissions(prev => {
      const next = { ...prev[module] };
      flags.forEach(f => { next[f] = value; });
      return { ...prev, [module]: next };
    });
  };

  const handleSelectAll = () => {
    const allChecked = ALL_MODULES.every(m =>
      PERMISSION_COLUMNS.every(col => col.flags.every(f => permissions[m]?.[f]))
    );
    const newPerms = { ...permissions };
    ALL_MODULES.forEach(module => {
      const p = emptyModulePermission();
      if (!allChecked) (Object.keys(p) as (keyof ModulePermission)[]).forEach(k => { p[k] = true; });
      newPerms[module] = p;
    });
    setPermissions(newPerms);
  };

  const handleSelectColumn = (colKey: string) => {
    const flags = getColumnFlags(colKey);
    const allChecked = ALL_MODULES.every(m => flags.every(f => permissions[m]?.[f]));
    const newPerms = { ...permissions };
    ALL_MODULES.forEach(module => {
      const next = { ...newPerms[module] };
      flags.forEach(f => { next[f] = !allChecked; });
      newPerms[module] = next;
    });
    setPermissions(newPerms);
  };

  const handleScopeChange = (scopeType: string, mode: 'all' | 'specific') => {
    setScopes(prev => ({ ...prev, [scopeType]: { ...prev[scopeType], scope_mode: mode } }));
  };

  const handleValueChange = (module: string, field: 'max_value' | 'requires_approval_above', value: string) => {
    const numVal = value === '' ? null : parseFloat(value);
    setValueLimits(prev => ({ ...prev, [module]: { ...prev[module], [field]: numVal } }));
  };

  const addStatusRule = () => {
    setStatusRules(prev => [...prev, {
      module: 'financeiro', blocked_status: 'conciliado', blocked_action: 'edit', reason: null, active: true,
    }]);
  };

  const removeStatusRule = (index: number) => {
    setStatusRules(prev => prev.filter((_, i) => i !== index));
  };

  const updateStatusRule = (index: number, field: string, value: any) => {
    setStatusRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const logPermissionAudit = async (eventType: string, detail: any) => {
    try {
      await supabase.from('rbac_permission_audit' as any).insert({
        event_type: eventType,
        profile_type_id: profileType.id,
        profile_type_name: profileType.display_name,
        changed_by: user?.id,
        change_detail: detail,
      } as any);
    } catch (e) {
      console.error('Audit log error:', e);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Save module permissions
      await supabase.from('profile_type_permissions').delete().eq('profile_type_id', profileType.id);
      const permissionsToInsert = ALL_MODULES
        .filter(module => Object.values(permissions[module]).some(v => v))
        .map(module => ({ profile_type_id: profileType.id, module, ...permissions[module] }));
      if (permissionsToInsert.length > 0) {
        const { error } = await supabase.from('profile_type_permissions').insert(permissionsToInsert);
        if (error) throw error;
      }

      // Validation: re-read and verify all 8 flags persisted correctly per module
      const { data: verifyRows, error: verifyErr } = await supabase
        .from('profile_type_permissions')
        .select('*')
        .eq('profile_type_id', profileType.id);
      if (verifyErr) throw verifyErr;
      const mismatches = validateModulePermissions(permissions, verifyRows);
      if (mismatches.length > 0) {
        console.error('[Permissions] Persistence mismatch:', mismatches);
        await logPermissionAudit('validation_failed', { mismatches });
        toast({
          title: 'Aviso de validação',
          description: `${mismatches.length} flag(s) divergente(s) após salvar. Verifique o console.`,
          variant: 'destructive',
        });
      }

      // Permissões críticas removidas da UI — limpa registros antigos.
      await supabase.from('rbac_critical_permissions').delete().eq('profile_type_id', profileType.id);

      // Save scope restrictions
      await (supabase.from('rbac_scope_restrictions' as any) as any).delete().eq('profile_type_id', profileType.id);
      const scopesToInsert = SCOPE_TYPES.map(st => ({
        profile_type_id: profileType.id,
        scope_type: st.key,
        scope_mode: scopes[st.key]?.scope_mode || 'all',
        allowed_ids: scopes[st.key]?.allowed_ids || [],
      }));
      await (supabase.from('rbac_scope_restrictions' as any) as any).insert(scopesToInsert);

      // Save value limits
      await (supabase.from('rbac_value_limits' as any) as any).delete().eq('profile_type_id', profileType.id);
      const valsToInsert = VALUE_MODULES
        .filter(vm => valueLimits[vm.key]?.max_value !== null || valueLimits[vm.key]?.requires_approval_above !== null)
        .map(vm => ({
          profile_type_id: profileType.id, module: vm.key,
          max_value: valueLimits[vm.key].max_value, requires_approval_above: valueLimits[vm.key].requires_approval_above,
        }));
      if (valsToInsert.length > 0) {
        await (supabase.from('rbac_value_limits' as any) as any).insert(valsToInsert);
      }

      // Save status rules
      await (supabase.from('rbac_status_rules' as any) as any).delete().eq('profile_type_id', profileType.id);
      if (statusRules.length > 0) {
        const statusToInsert = statusRules.map(r => ({
          profile_type_id: profileType.id, module: r.module, blocked_status: r.blocked_status,
          blocked_action: r.blocked_action, reason: r.reason, active: r.active,
        }));
        await (supabase.from('rbac_status_rules' as any) as any).insert(statusToInsert);
      }

      // Audit — count "critical" flags folded into Editar/Excluir columns
      // (can_approve, can_conciliate, can_admin) granted across all modules.
      const CRITICAL_FLAGS: (keyof ModulePermission)[] = ['can_approve', 'can_conciliate', 'can_admin'];
      const criticalBreakdown: Record<string, number> = { can_approve: 0, can_conciliate: 0, can_admin: 0 };
      let criticalTotal = 0;
      ALL_MODULES.forEach(module => {
        const p = permissions[module];
        if (!p) return;
        CRITICAL_FLAGS.forEach(f => {
          if (p[f]) { criticalBreakdown[f]++; criticalTotal++; }
        });
      });

      await logPermissionAudit('update', {
        modules: permissionsToInsert.length,
        critical: criticalTotal,
        critical_breakdown: criticalBreakdown,
        scopes: scopesToInsert,
        value_limits: valsToInsert.length,
        status_rules: statusRules.length,
      });

      toast({ title: 'Permissões salvas', description: `Permissões de "${profileType.display_name}" atualizadas.` });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar permissões:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isMasterType = ['master', 'admin', 'owner', 'administrador', 'tenant_owner'].includes(profileType.name);

  // criticalGroups removido — não há mais aba "Críticas".

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões — {profileType.display_name}
          </DialogTitle>
          <DialogDescription>
            Configure permissões por módulo, escopos, limites de valor e regras de status
          </DialogDescription>
        </DialogHeader>

        {isMasterType && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Usuários Owner/Admin têm acesso total ao sistema, independente das permissões configuradas aqui.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="modules" className="gap-1 text-xs"><Shield className="h-3.5 w-3.5" />Módulos</TabsTrigger>
              <TabsTrigger value="scopes" className="gap-1 text-xs"><Target className="h-3.5 w-3.5" />Escopos</TabsTrigger>
              <TabsTrigger value="values" className="gap-1 text-xs"><DollarSign className="h-3.5 w-3.5" />Valores</TabsTrigger>
              <TabsTrigger value="status" className="gap-1 text-xs"><FileCheck className="h-3.5 w-3.5" />Status</TabsTrigger>
              <TabsTrigger value="segregation" className="gap-1 text-xs"><Lock className="h-3.5 w-3.5" />Segregação</TabsTrigger>
            </TabsList>

            {/* MODULES TAB */}
            <TabsContent value="modules" className="mt-3">
              <ScrollArea className="max-h-[50vh] pr-4">
                <TooltipProvider delayDuration={200}>
                <div className="space-y-1">
                  <div className="grid gap-2 pb-2 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wide"
                    style={{ gridTemplateColumns: '1.4fr repeat(4, 90px)' }}>
                    <div>
                      <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}
                        className="h-auto p-0 text-[11px] hover:text-foreground uppercase">Módulo</Button>
                    </div>
                    {PERMISSION_COLUMNS.map(col => (
                      <Tooltip key={col.key}>
                        <TooltipTrigger asChild>
                          <div className="text-center flex flex-col items-center gap-0.5 cursor-help">
                            <Button type="button" variant="ghost" size="sm"
                              onClick={() => handleSelectColumn(col.key)}
                              className="h-auto p-0 text-[11px] hover:text-foreground inline-flex items-center gap-1">
                              {col.label}
                              <Info className="h-3 w-3 opacity-60" />
                            </Button>
                            <span className="text-[9px] font-normal normal-case tracking-normal text-muted-foreground/70 leading-tight">
                              {col.description}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="font-semibold mb-1">{col.label} inclui:</p>
                          <ul className="text-xs space-y-0.5">
                            {col.flags.map(f => (
                              <li key={f}>• {FLAG_LABELS[f] || f} <span className="opacity-60">({f})</span></li>
                            ))}
                          </ul>
                          <p className="text-[10px] opacity-70 mt-2">Clique no rótulo para marcar/desmarcar a coluna em todos os módulos.</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  {ALL_MODULES.map(module => (
                    <div key={module} className="grid gap-2 py-2 border-b border-border/50 items-center"
                      style={{ gridTemplateColumns: '1.4fr repeat(4, 90px)' }}>
                      <Label className="font-medium text-sm">{MODULE_LABELS[module] || module}</Label>
                      {PERMISSION_COLUMNS.map(col => {
                        const checked = col.flags.every(f => permissions[module]?.[f]);
                        const tooltipText = col.flags.map(f => FLAG_LABELS[f] || f).join(' + ');
                        return (
                          <Tooltip key={col.key}>
                            <TooltipTrigger asChild>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => handleColumnChange(module, col.key, !!v)}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-semibold text-xs mb-1">{col.label}</p>
                              <p className="text-xs">{tooltipText}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
                </TooltipProvider>
              </ScrollArea>
            </TabsContent>

            {/* CRITICAL TAB removida — críticas folded em Editar/Excluir */}

            {/* SCOPES TAB */}
            <TabsContent value="scopes" className="mt-3">
              <ScrollArea className="max-h-[50vh] pr-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Defina o escopo de acesso deste perfil por empresa, unidade e centro de custo.
                  </p>
                  {SCOPE_TYPES.map(st => (
                    <div key={st.key} className="p-4 rounded-lg border border-border/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{st.label}</Label>
                        <Select
                          value={scopes[st.key]?.scope_mode || 'all'}
                          onValueChange={(v) => handleScopeChange(st.key, v as 'all' | 'specific')}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos(as)</SelectItem>
                            <SelectItem value="specific">Específicos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {scopes[st.key]?.scope_mode === 'specific' && (
                        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                          Os IDs das entidades permitidas serão configurados na gestão individual de cada usuário.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* VALUES TAB */}
            <TabsContent value="values" className="mt-3">
              <ScrollArea className="max-h-[50vh] pr-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Defina limites monetários por módulo. Deixe vazio para ilimitado.
                  </p>
                  {VALUE_MODULES.map(vm => (
                    <div key={vm.key} className="p-4 rounded-lg border border-border/50 space-y-3">
                      <Label className="font-medium">{vm.label}</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor máximo (R$)</Label>
                          <Input
                            type="number" placeholder="Ilimitado"
                            value={valueLimits[vm.key]?.max_value ?? ''}
                            onChange={(e) => handleValueChange(vm.key, 'max_value', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Exige aprovação acima de (R$)</Label>
                          <Input
                            type="number" placeholder="Sem limite"
                            value={valueLimits[vm.key]?.requires_approval_above ?? ''}
                            onChange={(e) => handleValueChange(vm.key, 'requires_approval_above', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* STATUS RULES TAB */}
            <TabsContent value="status" className="mt-3">
              <ScrollArea className="max-h-[50vh] pr-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Bloqueie ações em registros com status específicos.
                    </p>
                    <Button variant="outline" size="sm" onClick={addStatusRule}>+ Regra</Button>
                  </div>
                  {statusRules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma regra de status configurada.</div>
                  ) : statusRules.map((rule, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border/50 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Módulo</Label>
                          <Select value={rule.module} onValueChange={(v) => updateStatusRule(i, 'module', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ALL_MODULES.map(m => (
                                <SelectItem key={m} value={m}>{MODULE_LABELS[m] || m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Status bloqueado</Label>
                          <Select value={rule.blocked_status} onValueChange={(v) => updateStatusRule(i, 'blocked_status', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Ação bloqueada</Label>
                          <Select value={rule.blocked_action} onValueChange={(v) => updateStatusRule(i, 'blocked_action', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="edit">Editar</SelectItem>
                              <SelectItem value="delete">Excluir</SelectItem>
                              <SelectItem value="approve">Aprovar</SelectItem>
                              <SelectItem value="execute">Executar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Input
                          placeholder="Motivo (opcional)" value={rule.reason || ''}
                          onChange={(e) => updateStatusRule(i, 'reason', e.target.value)}
                          className="flex-1 mr-3"
                        />
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeStatusRule(i)}>
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* SEGREGATION TAB */}
            <TabsContent value="segregation" className="mt-3">
              <ScrollArea className="max-h-[50vh] pr-4">
                {segregationRules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhuma regra de segregação configurada para este perfil.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {segregationRules.map((rule, i) => (
                      <div key={rule.id || i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-destructive/5">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-[10px]">{rule.blocked_action}</Badge>
                            <Badge variant="outline" className="text-[10px]">{rule.blocked_module}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{rule.reason || 'Sem justificativa'}</p>
                        </div>
                        <Badge variant={rule.active ? 'destructive' : 'secondary'} className="text-[10px]">
                          {rule.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setResetConfirmOpen(true)}
            disabled={saving || loading}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar padrões
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Permissões
            </Button>
          </div>
        </DialogFooter>

        <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurar permissões padrão?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso substituirá todas as permissões de módulo deste perfil pela
                baseline recomendada para <strong>{profileType.display_name}</strong>.
                Escopos, limites de valor e regras de status não serão alterados.
                As mudanças só serão persistidas após clicar em <strong>Salvar Permissões</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetToDefaults}>
                Aplicar padrões
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
