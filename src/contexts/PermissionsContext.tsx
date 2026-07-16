import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppModule = 
  | 'dashboard'
  | 'configuracoes'
  | 'gestao_usuarios'
  | 'producao'
  | 'fornecedores'
  | 'estoque'
  | 'pedidos'
  | 'financeiro'
  | 'cadastros_financeiros'
  | 'dashboard_executivo'
  | 'comercial'
  | 'operacional'
  | 'controladoria'
  | 'planejamento'
  | 'cadastros'
  | 'relatorios_bi';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'conciliate' | 'export' | 'admin';

export interface ModulePermission {
  module: AppModule;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface UserPermissions {
  role: string;
  permissions: ModulePermission[];
  active: boolean;
}

interface PermissionsContextType {
  permissions: UserPermissions | null;
  loading: boolean;
  isMaster: boolean;
  isOwner: boolean;
  isTenantOwner: boolean;
  isTenantAdmin: boolean;
  userLevel: 'system_owner' | 'tenant_owner' | 'tenant_admin' | 'operational';
  hasModuleAccess: (module: AppModule | string, action?: PermissionAction) => boolean;
  /** Override por rota/aba. null = sem override (caller deve usar fallback de módulo). */
  hasFeatureAccess: (featureKey: string, action?: 'view' | 'create' | 'edit' | 'delete') => boolean | null;
  /** Efetivo: override (se houver) → senão módulo. Recomendado para gating de menu/rota. */
  hasAccess: (module: AppModule | string, featureKey: string | undefined | null, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;
  hasCriticalPermission: (key: string) => boolean;
  checkValueLimit: (module: string, value: number) => Promise<{ allowed: boolean; reason: string; requires_approval?: boolean; max_value?: number }>;
  checkStatusRule: (module: string, status: string, action?: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

const ALL_MODULES: AppModule[] = [
  'dashboard',
  'dashboard_executivo',
  'comercial',
  'operacional',
  'configuracoes',
  'gestao_usuarios',
  'producao',
  'fornecedores',
  'estoque',
  'pedidos',
  'financeiro',
  'cadastros_financeiros',
  'controladoria',
  'planejamento',
  'cadastros',
  'relatorios_bi',
];

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaster, setIsMaster] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isTenantOwner, setIsTenantOwner] = useState(false);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [userLevel, setUserLevel] = useState<'system_owner' | 'tenant_owner' | 'tenant_admin' | 'operational'>('operational');
  const [overridesMap, setOverridesMap] = useState<Record<string, { can_view: boolean | null; can_create: boolean | null; can_edit: boolean | null; can_delete: boolean | null }>>({});

  const fetchPermissions = useCallback(async (retryCount = 0) => {
    if (!user?.id) return;

    console.log(`[Permissions] Fetching for user: ${user.id} (Attempt ${retryCount + 1})`);

    try {
      // 1) Profile + linked profile_type
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_owner, profile_type_id, profile_types(name, display_name)')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[Permissions] Profile error:', profileError);
        // Handle database timeouts or connectivity issues
        if (profileError.message?.includes('timeout') || profileError.message?.includes('failed to connect') || profileError.code === 'PGRST301') {
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`[Permissions] Retrying in ${delay}ms...`);
            setTimeout(() => fetchPermissions(retryCount + 1), delay);
            return;
          }
        }
        throw profileError;
      }

      // Perfil não provisionado (0 linhas): não lançar exceção — tratar explicitamente
      if (!profile) {
        console.warn('[Permissions] Profile not provisioned for user:', user.id);
        setPermissions(null);
        return;
      }

      const ownerFlag = profile?.is_owner === true;
      const profileTypeName = (profile?.profile_types as any)?.name as string | undefined;
      const roleString = profileTypeName ?? (profile?.role as string);

      const tenantOwnerFlag = roleString === 'tenant_owner';
      const tenantAdminFlag =
        roleString === 'administrador' ||
        roleString === 'admin' ||
        roleString === 'tenant_admin';
      const isAdmin = ownerFlag || tenantOwnerFlag || tenantAdminFlag;

      setIsMaster(isAdmin);
      setIsOwner(ownerFlag);
      setIsTenantOwner(tenantOwnerFlag);
      setIsTenantAdmin(tenantAdminFlag);
      setUserLevel(
        ownerFlag ? 'system_owner' :
        tenantOwnerFlag ? 'tenant_owner' :
        tenantAdminFlag ? 'tenant_admin' :
        'operational'
      );

      // 2) Admin / Owner → full access bypass
      if (isAdmin) {
        console.log('[Permissions] Admin/Owner: granting all');
        setPermissions({
          role: roleString,
          permissions: ALL_MODULES.map(module => ({
            module, can_view: true, can_create: true, can_edit: true, can_delete: true,
          })),
          active: true,
        });
        setLoading(false);
        return;
      }

      // 3) Source of truth: profile_type_permissions matrix
      const matrix: Record<string, ModulePermission> = {};
      const fetchMatrix = profile?.profile_type_id ? supabase
        .from('profile_type_permissions')
        .select('module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin')
        .eq('profile_type_id', profile.profile_type_id) : Promise.resolve({ data: [] });

      const fetchOverrides = supabase
        .from('user_permissions')
        .select('module, can_view, can_create, can_edit, can_delete')
        .eq('user_id', user.id);

      const fetchFeatureOverrides = profile?.profile_type_id ? supabase
        .from('profile_type_feature_overrides' as any)
        .select('feature_key, can_view, can_create, can_edit, can_delete')
        .eq('profile_type_id', profile.profile_type_id) : Promise.resolve({ data: [] });

      const [matrixRes, overridesRes, featuresRes] = await Promise.all([fetchMatrix, fetchOverrides, fetchFeatureOverrides]);

      matrixRes.data?.forEach((row: any) => {
        matrix[row.module] = {
          module: row.module,
          can_view: !!row.can_view,
          can_create: !!row.can_create,
          can_edit: !!row.can_edit,
          can_delete: !!row.can_delete,
          ...{ can_approve: !!row.can_approve, can_conciliate: !!row.can_conciliate, can_export: !!row.can_export, can_admin: !!row.can_admin },
        } as ModulePermission;
      });

      overridesRes.data?.forEach((row: any) => {
        const existing = matrix[row.module] ?? {
          module: row.module, can_view: false, can_create: false, can_edit: false, can_delete: false,
        };
        matrix[row.module] = {
          ...existing,
          can_view: existing.can_view || !!row.can_view,
          can_create: existing.can_create || !!row.can_create,
          can_edit: existing.can_edit || !!row.can_edit,
          can_delete: existing.can_delete || !!row.can_delete,
        };
      });

      const ovMap: Record<string, any> = {};
      ((featuresRes.data as any[]) || []).forEach((r: any) => {
        ovMap[r.feature_key] = {
          can_view: r.can_view, can_create: r.can_create,
          can_edit: r.can_edit, can_delete: r.can_delete,
        };
      });
      setOverridesMap(ovMap);

      console.log('[Permissions] Matrix loaded modules:', Object.keys(matrix).length);

      setPermissions({
        role: roleString,
        permissions: Object.values(matrix),
        active: true,
      });
    } catch (error) {
      console.error('[Permissions] Error:', error);
      setPermissions(null);
    } finally {
      console.log('[Permissions] Loading complete');
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) {
      // Ainda aguardando auth, manter loading
      return;
    }

    if (!user?.id) {
      // Sem usuário autenticado: limpa estado e encerra loading sem chamar a query
      setPermissions(null);
      setIsMaster(false);
      setIsOwner(false);
      setIsTenantOwner(false);
      setIsTenantAdmin(false);
      setUserLevel('operational');
      setLoading(false);
      return;
    }

    fetchPermissions();
  }, [user?.id, authLoading, fetchPermissions]);

  const hasModuleAccess = useCallback((module: AppModule | string, action: PermissionAction = 'view'): boolean => {
    // Fail-closed durante o loading (alinhado com useCan); menus/guards já tratam loading explicitamente
    if (loading) return false;
    if (isMaster) return true;
    if (!permissions?.permissions?.length) return false;

    // Alias UI module ids → matrix module ids (profile_type_permissions vocabulary)
    const aliasMap: Record<string, string> = {
      dashboard: 'dashboard_executivo',
      gestao_usuarios: 'configuracoes',
      producao: 'producao',
      estoque: 'operacional',
      pedidos: 'operacional',
      fornecedores: 'operacional',
      cadastros_financeiros: 'cadastros',
    };
    const raw = module.toLowerCase().trim();
    const normalizedModule = aliasMap[raw] ?? raw;

    const modulePermission = permissions.permissions.find(p =>
      p.module?.toLowerCase().trim() === normalizedModule
    );
    if (!modulePermission) return false;

    const actionMap: Record<PermissionAction, string> = {
      view: 'can_view', create: 'can_create', edit: 'can_edit', delete: 'can_delete',
      approve: 'can_approve', conciliate: 'can_conciliate', export: 'can_export', admin: 'can_admin',
    };
    return Boolean((modulePermission as any)[actionMap[action]]);
  }, [loading, permissions, isMaster]);

  const hasCriticalPermission = useCallback((_key: string): boolean => {
    if (loading) return false;
    if (isMaster) return true;
    return false;
  }, [loading, isMaster]);

  const checkValueLimit = useCallback(async (module: string, value: number) => {
    if (isMaster) return { allowed: true, reason: 'admin_bypass' };
    if (!user) return { allowed: false, reason: 'no_user' };
    try {
      const { data } = await supabase.rpc('check_rbac_value_limit', {
        p_user_id: user.id, p_module: module, p_value: value,
      });
      return data as any || { allowed: true, reason: 'no_limit_defined' };
    } catch {
      return { allowed: true, reason: 'error_checking' };
    }
  }, [isMaster, user]);

  const checkStatusRule = useCallback(async (module: string, status: string, action: string = 'edit') => {
    if (isMaster) return false;
    if (!user) return false;
    try {
      const { data } = await supabase.rpc('check_rbac_status_rule', {
        p_user_id: user.id, p_module: module, p_status: status, p_action: action,
      });
      return data as boolean || false;
    } catch {
      return false;
    }
  }, [isMaster, user]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchPermissions();
  }, [fetchPermissions]);

  const hasFeatureAccess = useCallback((featureKey: string, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean | null => {
    if (loading) return null;
    if (isMaster) return true;
    const ov = overridesMap[featureKey];
    if (!ov) return null;
    const v = ov[`can_${action}` as 'can_view' | 'can_create' | 'can_edit' | 'can_delete'];
    return v === null || v === undefined ? null : !!v;
  }, [loading, isMaster, overridesMap]);

  const hasAccess = useCallback((module: AppModule | string, featureKey: string | undefined | null, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean => {
    if (isMaster) return true;
    if (featureKey) {
      const ov = hasFeatureAccess(featureKey, action);
      if (ov !== null) return ov;
    }
    return hasModuleAccess(module, action as PermissionAction);
  }, [isMaster, hasFeatureAccess, hasModuleAccess]);

  return (
    <PermissionsContext.Provider value={{ permissions, loading, isMaster, isOwner, isTenantOwner, isTenantAdmin, userLevel, hasModuleAccess, hasFeatureAccess, hasAccess, hasCriticalPermission, checkValueLimit, checkStatusRule, refetch }}>
      {children}
    </PermissionsContext.Provider>
  );
}

const DEFAULT_PERMISSIONS_CTX: PermissionsContextType = {
  permissions: null,
  loading: true,
  isMaster: false,
  isOwner: false,
  isTenantOwner: false,
  isTenantAdmin: false,
  userLevel: 'operational',
  hasModuleAccess: () => false,
  hasFeatureAccess: () => null,
  hasAccess: () => false,
  hasCriticalPermission: () => false,
  checkValueLimit: async () => ({ allowed: false, reason: 'no_provider' }),
  checkStatusRule: async () => false,
  refetch: async () => {},
};

export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  return context ?? DEFAULT_PERMISSIONS_CTX;
}
