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

  const fetchPermissions = useCallback(async () => {
    console.log('[Permissions] Fetching for user:', user?.id, user?.email);
    
    if (!user) {
      console.log('[Permissions] No user, clearing permissions');
      setPermissions(null);
      setIsMaster(false);
      setIsOwner(false);
      setIsTenantOwner(false);
      setIsTenantAdmin(false);
      setUserLevel('operational');
      setLoading(false);
      return;
    }

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
      const role = profile?.role;
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
        console.log('[Permissions] IA Config permission:', userPermissions?.find(p => p.module === 'ia_configuracao'));
        
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
  }, [user]);

  useEffect(() => {
    if (authLoading) {
      // Ainda aguardando auth, manter loading
      return;
    }
    
    fetchPermissions();
  }, [user, authLoading, fetchPermissions]);

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

  const hasCriticalPermission = useCallback((key: string): boolean => {
    if (loading) return false;
    if (isMaster) return true;
    // Critical permissions are checked from rbac_critical_permissions table
    // For now, non-admin users default to false; will be loaded via profile_type
    return false;
  }, [loading, isMaster]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchPermissions();
  }, [fetchPermissions]);

  return (
    <PermissionsContext.Provider value={{ permissions, loading, isMaster, isOwner, isTenantOwner, isTenantAdmin, userLevel, hasModuleAccess, hasCriticalPermission, refetch }}>
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
