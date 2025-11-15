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
  const { hasModuleAccess, loading, permissions } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !hasModuleAccess(module as any)) {
      toast({
        title: '⛔ Acesso Negado',
        description: 'Você não tem permissão para acessar este módulo.',
        variant: 'destructive',
      });
      navigate(redirectTo);
    }
  }, [loading, hasModuleAccess, module, navigate, redirectTo, toast]);

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

  if (!hasModuleAccess(module as any) || !permissions?.active) {
    return null;
  }

  return <>{children}</>;
}
