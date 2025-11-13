import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPermissions {
  role: 'master' | 'vendedor';
  acesso_leads: boolean;
  acesso_arquitetos: boolean;
  acesso_projetos: boolean;
  acesso_crm_kanban: boolean;
  acesso_metas: boolean;
  acesso_configuracoes: boolean;
  active: boolean;
}

export function usePermissions() {
  const { user, profile } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    if (!user) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    fetchPermissions();
  }, [user, profile]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      
      // Verificar se é admin pelo profile
      const isAdmin = profile?.role === 'admin';
      setIsMaster(isAdmin);

      // Buscar permissões
      const { data, error } = await supabase
        .from('tendenci_user_permissions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPermissions(data as UserPermissions);
        setIsMaster(data.role === 'master' || isAdmin);
      } else {
        // Se não tem permissões, usar defaults baseado no role do profile
        const defaultPermissions: UserPermissions = {
          role: isAdmin ? 'master' : 'vendedor',
          acesso_leads: true,
          acesso_arquitetos: true,
          acesso_projetos: true,
          acesso_crm_kanban: true,
          acesso_metas: true,
          acesso_configuracoes: isAdmin,
          active: true,
        };
        setPermissions(defaultPermissions);
      }
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasModuleAccess = (module: string): boolean => {
    if (!permissions) return false;
    if (isMaster) return true;

    switch (module) {
      case 'leads':
        return permissions.acesso_leads;
      case 'arquitetos':
        return permissions.acesso_arquitetos;
      case 'projetos':
        return permissions.acesso_projetos;
      case 'crm':
        return permissions.acesso_crm_kanban;
      case 'metas':
        return permissions.acesso_metas;
      case 'configuracoes':
        return permissions.acesso_configuracoes;
      default:
        return false;
    }
  };

  return {
    permissions,
    loading,
    isMaster,
    hasModuleAccess,
    refetch: fetchPermissions,
  };
}
