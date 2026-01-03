import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppModule = 
  | 'dashboard'
  | 'prospeccao'
  | 'arquitetos'
  | 'crm'
  | 'projetos'
  | 'metas'
  | 'leads'
  | 'dashboards_personalizados'
  | 'configuracoes'
  | 'gestao_usuarios'
  | 'producao'
  | 'fornecedores'
  | 'estoque'
  | 'compras'
  | 'pedidos'
  | 'fichas_tecnicas'
  | 'ia_configuracao';

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
  hasModuleAccess: (module: AppModule, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;
  refetch: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

const ALL_MODULES: AppModule[] = [
  'dashboard',
  'prospeccao',
  'arquitetos',
  'crm',
  'projetos',
  'metas',
  'leads',
  'dashboards_personalizados',
  'configuracoes',
  'gestao_usuarios',
  'producao',
  'fornecedores',
  'estoque',
  'compras',
  'pedidos',
  'fichas_tecnicas',
  'ia_configuracao'
];

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaster, setIsMaster] = useState(false);

  const fetchPermissions = useCallback(async () => {
    console.log('[Permissions] Fetching for user:', user?.id, user?.email);
    
    if (!user) {
      console.log('[Permissions] No user, clearing permissions');
      setPermissions(null);
      setIsMaster(false);
      setLoading(false);
      return;
    }

    try {
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[Permissions] Profile error:', profileError);
        throw profileError;
      }

      console.log('[Permissions] Profile loaded:', profile);
      const isAdmin = profile?.role === 'admin';
      setIsMaster(isAdmin);

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

  const hasModuleAccess = useCallback((module: AppModule, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean => {
    // Durante loading, retornar true para permitir renderização do menu
    if (loading) {
      console.log('[Permissions] Still loading, allowing access to:', module);
      return true;
    }
    
    // Se for admin, tem acesso total
    if (isMaster) {
      return true;
    }
    
    // Se não tem permissões carregadas, bloquear
    if (!permissions || !permissions.permissions) {
      console.warn('[Permissions] No permissions loaded for module:', module);
      return false;
    }

    const modulePermission = permissions.permissions.find(p => p.module === module);
    
    if (!modulePermission) {
      console.log('[Permissions] No permission found for module:', module);
      return false;
    }

    let hasAccess = false;
    switch (action) {
      case 'view':
        hasAccess = modulePermission.can_view;
        break;
      case 'create':
        hasAccess = modulePermission.can_create;
        break;
      case 'edit':
        hasAccess = modulePermission.can_edit;
        break;
      case 'delete':
        hasAccess = modulePermission.can_delete;
        break;
      default:
        hasAccess = false;
    }
    
    console.log('[Permissions] Check:', module, action, '=', hasAccess);
    return hasAccess;
  }, [loading, permissions, isMaster]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchPermissions();
  }, [fetchPermissions]);

  return (
    <PermissionsContext.Provider value={{ permissions, loading, isMaster, hasModuleAccess, refetch }}>
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
