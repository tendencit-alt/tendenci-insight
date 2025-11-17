import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  module: string;
  redirectTo?: string;
}

export function PermissionGuard({ children, module, redirectTo = '/' }: PermissionGuardProps) {
  const { hasModuleAccess, loading, permissions, isMaster } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('[PermissionGuard] Verificando acesso:', {
      module,
      loading,
      hasAccess: hasModuleAccess(module as any),
      isMaster,
      permissionsLoaded: !!permissions,
      active: permissions?.active
    });

    if (!loading && !hasModuleAccess(module as any)) {
      console.log('[PermissionGuard] Acesso negado - redirecionando');
      toast({
        title: '⛔ Acesso Negado',
        description: 'Você não tem permissão para acessar este módulo.',
        variant: 'destructive',
      });
      
      // Redirecionar para um módulo que o usuário tenha acesso
      if (permissions?.permissions && permissions.permissions.length > 0) {
        const firstAllowedModule = permissions.permissions.find(p => p.can_view);
        if (firstAllowedModule) {
          // Mapear módulo para rota
          const routeMap: Record<string, string> = {
            'dashboard': '/',
            'leads': '/leads',
            'crm': '/kanban',
            'projetos': '/projects',
            'prospeccao': '/prospeccao',
            'arquitetos': '/prospeccao',
            'metas': '/metas',
            'configuracoes': '/settings',
          };
          const targetRoute = routeMap[firstAllowedModule.module] || '/auth';
          console.log('[PermissionGuard] Redirecionando para primeiro módulo permitido:', targetRoute);
          navigate(targetRoute);
          return;
        }
      }
      
      // Se não encontrar nenhum módulo permitido, fazer logout
      console.log('[PermissionGuard] Nenhum módulo permitido - redirecionando para login');
      navigate('/auth');
    }
  }, [loading, hasModuleAccess, module, navigate, redirectTo, toast, permissions, isMaster]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/30">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  const hasAccess = hasModuleAccess(module as any);
  console.log('[PermissionGuard] Decisão final de renderização:', { module, hasAccess });

  if (!hasAccess || !permissions?.active) {
    return null;
  }

  return <>{children}</>;
}
