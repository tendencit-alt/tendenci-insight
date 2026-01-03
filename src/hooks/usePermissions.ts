import { useEffect, useState } from 'react';
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

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
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
          const allModules: AppModule[] = [
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

          setPermissions({
            role: profile.role,
            permissions: allModules.map(module => ({
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

          console.log('🔐 Permissões carregadas:', {
            userId: user.id,
            role: profile.role,
            permissions: userPermissions,
            temIAConfig: userPermissions?.some(p => p.module === 'ia_configuracao')
          });
          
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
    };

    fetchPermissions();
  }, [user]);

  const hasModuleAccess = (module: AppModule, action: 'view' | 'create' | 'edit' | 'delete' = 'view') => {
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
  };

  const refetch = async () => {
    setLoading(true);
    // Re-executar o efeito
    if (user) {
      const fetchPermissions = async () => {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;

          const isAdmin = profile?.role === 'admin';
          setIsMaster(isAdmin);

          if (isAdmin) {
            const allModules: AppModule[] = [
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

            setPermissions({
              role: profile.role,
              permissions: allModules.map(module => ({
                module,
                can_view: true,
                can_create: true,
                can_edit: true,
                can_delete: true
              })),
              active: true
            });
          } else {
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
      };

      fetchPermissions();
    }
  };

  return {
    permissions,
    loading,
    isMaster,
    hasModuleAccess,
    refetch
  };
}
