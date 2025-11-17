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
  | 'gestao_usuarios';

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
          console.log('[usePermissions] Usuário é ADMIN - acesso total a todos os módulos');
          
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
            'gestao_usuarios'
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

          console.log('[usePermissions] Permissões carregadas para usuário não-admin:', {
            userId: user.id,
            email: user.email,
            totalPermissions: userPermissions?.length,
            permissions: userPermissions
          });

          setPermissions({
            role: profile.role,
            permissions: userPermissions as ModulePermission[],
            active: true
          });
          
          // Log resumo final
          console.log('╔════════════════════════════════════════════════════════════╗');
          console.log('║          PERMISSÕES CARREGADAS COM SUCESSO                 ║');
          console.log('╠════════════════════════════════════════════════════════════╣');
          console.log(`║ Email: ${user.email?.padEnd(42)} ║`);
          console.log(`║ Role: ${profile.role?.padEnd(43)} ║`);
          console.log('╠════════════════════════════════════════════════════════════╣');
          console.log('║ Módulos com VISUALIZAÇÃO permitida:                        ║');
          userPermissions?.filter(p => p.can_view).forEach(p => {
            console.log(`║   ✓ ${p.module.padEnd(50)} ║`);
          });
          console.log('╠════════════════════════════════════════════════════════════╣');
          console.log('║ Módulos SEM visualização:                                  ║');
          userPermissions?.filter(p => !p.can_view).forEach(p => {
            console.log(`║   ✗ ${p.module.padEnd(50)} ║`);
          });
          console.log('╚════════════════════════════════════════════════════════════╝');
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
    if (!permissions) {
      console.log('[hasModuleAccess] Sem permissões carregadas');
      return false;
    }
    
    if (isMaster) {
      console.log('[hasModuleAccess] Usuário é master - acesso total');
      return true;
    }

    const modulePermission = permissions.permissions.find(p => p.module === module);
    
    if (!modulePermission) {
      console.log('[hasModuleAccess] Módulo não encontrado nas permissões:', {
        module,
        availableModules: permissions.permissions.map(p => p.module)
      });
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

    console.log('[hasModuleAccess] Verificação de acesso:', {
      module,
      action,
      hasAccess,
      permission: modulePermission
    });

    return hasAccess;
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
              'gestao_usuarios'
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
