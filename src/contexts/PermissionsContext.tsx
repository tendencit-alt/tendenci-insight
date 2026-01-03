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
    if (!user) {
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

      if (profileError) throw profileError;

      const isAdmin = profile?.role === 'admin';
      setIsMaster(isAdmin);

      // Se for admin, tem todas as permissões
      if (isAdmin) {
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

        if (permError) throw permError;

        setPermissions({
          role: profile.role,
          permissions: userPermissions as ModulePermission[],
          active: true
        });
      }
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      setPermissions(null);
    } finally {
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
    // CRÍTICO: Retornar false enquanto ainda está carregando
    if (loading) return false;
    if (!permissions) return false;
    if (isMaster) return true;

    const modulePermission = permissions.permissions.find(p => p.module === module);
    if (!modulePermission) return false;

    switch (action) {
      case 'view':
        return modulePermission.can_view;
      case 'create':
        return modulePermission.can_create;
      case 'edit':
        return modulePermission.can_edit;
      case 'delete':
        return modulePermission.can_delete;
      default:
        return false;
    }
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
