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

  const fetchPermissions = useCallback(async () => {
    if (!user?.id) return;

    console.log('[Permissions] Fetching for user:', user.id, user.email);

    try {
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_owner')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[Permissions] Profile error:', profileError);
        throw profileError;
      }

      console.log('[Permissions] Profile loaded:', profile);
      const ownerFlag = profile?.is_owner === true;
      const role = profile?.role as string;
      const tenantOwnerFlag = role === 'tenant_owner';
      const tenantAdminFlag = role === 'tenant_admin' || role === 'admin';
      const isAdmin = tenantAdminFlag || tenantOwnerFlag || ownerFlag;
      
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

      // Se for admin, tem todas as permissões
      if (isAdmin) {
        console.log('[Permissions] User is admin, granting all');
        setPermissions({
          role: profile.role,
          permissions: ALL_MODULES.map(module => ({
            module,
            can_view: true,
            can_create: true,
            can_edit: true,
            can_delete: true
          })),
          active: true
        });
      } else {
        // Buscar permissões específicas do usuário
        const { data: userPermissions, error: permError } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', user.id);

        if (permError) {
          console.error('[Permissions] User permissions error:', permError);
          throw permError;
        }

        console.log('[Permissions] User permissions loaded:', userPermissions?.length, 'items');
        
        setPermissions({
          role: profile.role,
          permissions: userPermissions as ModulePermission[],
          active: true
        });
      }
    } catch (error) {
      console.error('[Permissions] Error:', error);
      setPermissions(null);
    } finally {
      console.log('[Permissions] Loading complete');
      setLoading(false);
    }
  }, [user?.id, user?.email]);

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
    if (loading) return true;
    if (isMaster) return true;
    if (!permissions?.permissions?.length) return false;

    const normalizedModule = module.toLowerCase().trim();
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

  return (
    <PermissionsContext.Provider value={{ permissions, loading, isMaster, isOwner, isTenantOwner, isTenantAdmin, userLevel, hasModuleAccess, hasCriticalPermission, checkValueLimit, checkStatusRule, refetch }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider');
  }
  return context;
}
